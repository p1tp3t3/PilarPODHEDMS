import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
import joblib
import numpy as np
import re
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM



def make_json_safe(data):
    if isinstance(data, dict):
        return {k: make_json_safe(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [make_json_safe(v) for v in data]
    elif isinstance(data, (np.integer, np.int64)):
        return int(data)
    elif isinstance(data, (np.floating, np.float64)):
        return float(data)
    elif pd.isna(data):
        return None
    else:
        return data


class EarlyInterventionViolationPredictor:
    # Shared across every instance (there's only ever one — config_model.py
    # constructs a single singleton) rather than per-instance, so the model
    # is only ever loaded once regardless of how many times this class gets
    # instantiated.
    #
    # google/flan-t5-small and flan-t5-base were tried first (seq2seq,
    # text2text-generation) and both failed in practice: -small either
    # echoed the prompt back verbatim or produced incoherent fragments,
    # -base degenerated into repeating the same sentence dozens of times
    # regardless of repetition_penalty/no_repeat_ngram_size — neither is
    # reliable for this kind of open-ended "write N recommendations" task.
    # Qwen2.5-0.5B-Instruct (a genuinely instruction-tuned causal chat
    # model, not a legacy seq2seq checkpoint) produced clean, well-formatted,
    # distinct recommendations on the same prompt in testing, so it's a
    # causal LM + chat template rather than AutoModelForSeq2SeqLM.
    _recommendation_tokenizer = None
    _recommendation_model = None

    def __init__(self, file):
        self.file = file
        self.df = pd.read_csv(f"./dataset/{self.file}.csv")
        self.model_name = f'./model_training/notebook/early-intervention-violation-predictor-model'
        self.model = None

        # Loads (and downloads, on first run) the recommendation model right
        # away instead of on the first /python/model/predict request, so
        # that request doesn't unexpectedly eat the ~60-90s weight-loading
        # cost — it's paid once, up front, when the Flask app boots (this
        # class is instantiated once as a singleton in config_model.py).
        print('[EarlyInterventionViolationPredictor] loading recommendation model...')
        self._get_recommendation_model()
        print('[EarlyInterventionViolationPredictor] recommendation model ready')

    @classmethod
    def _get_recommendation_model(cls):
        if cls._recommendation_model is None:
            model_id = "Qwen/Qwen2.5-0.5B-Instruct"
            cls._recommendation_tokenizer = AutoTokenizer.from_pretrained(model_id)
            if torch.cuda.is_available():
                # device_map="auto" (needs accelerate) spreads the model
                # across GPU(s) when one's actually available.
                cls._recommendation_model = AutoModelForCausalLM.from_pretrained(
                    model_id,
                    device_map="auto",
                )
            else:
                # On a CPU-only machine, device_map="auto" has nothing to
                # optimize for and — with this transformers/accelerate
                # version combo — can leave some weights stranded on the
                # "meta" device instead of materializing them on cpu
                # ("Tensor on device cpu is not on the expected device
                # meta!"). Loading straight onto cpu avoids that dispatch
                # path entirely.
                cls._recommendation_model = AutoModelForCausalLM.from_pretrained(model_id)
        return cls._recommendation_tokenizer, cls._recommendation_model

    @staticmethod
    def _parse_recommendation_list(text):
        """Splits a numbered-list response ("1. **Title**: body...") into
        one string per item, joining any wrapped continuation lines and
        stripping markdown bold — falls back to raw non-empty lines, then
        to sentence splitting, if the model didn't use numbering at all."""
        items = []
        current = []
        for raw_line in text.split("\n"):
            line = raw_line.strip()
            if not line:
                continue
            match = re.match(r"^\d+[.)]\s*(.*)", line)
            if match:
                if current:
                    items.append(" ".join(current).strip())
                current = [match.group(1)]
            elif current:
                current.append(line)
        if current:
            items.append(" ".join(current).strip())

        if not items:
            items = [line.strip(" -•\t") for line in text.split("\n") if line.strip()]
        if len(items) <= 1 and text.strip():
            items = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

        items = [re.sub(r"\*\*(.*?)\*\*", r"\1", item).strip() for item in items]
        items = [i for i in items if i]

        # The model sometimes numbers its own preamble ("1. Recommendations:")
        # or a closing summary sentence ("7. These actions can help...") as
        # if they were genuine list items — neither is an actual
        # recommendation, so both get dropped rather than shown as one.
        items = [i for i in items if not re.match(r"(?i)^recommendations?\s*:?\s*$", i)]
        summary_prefixes = ("these ", "this approach", "overall,", "overall ", "in summary", "in conclusion")
        items = [i for i in items if not i.lower().startswith(summary_prefixes)]

        return items

    def train_model(self, save = False):
        df = self.df
        target = 'will_repeat_the_same_violation'
        cat_cols = ["violation_type"]
        num_cols = [
            "past_repeat_same_violation_count",
            "recent_same_violation_count",
            "months_since_last_same_violation"
        ]

        X = df[cat_cols + num_cols].copy()
        y = df[target].astype(int).copy()

        def build_pipeline():
            preprocess = ColumnTransformer(
                transformers=[
                    ("num", StandardScaler(), num_cols),
                    ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
                ],
                remainder="drop",
            )
            return Pipeline(steps=[
                ("preprocess", preprocess),
                ("clf", LogisticRegression())
            ])

        # Held-out evaluation first — the model previously had no validation
        # step at all (fit straight on 100% of the data), so there was no
        # way to know its real accuracy short of testing it by hand.
        self.last_eval = None
        if len(df) >= 20 and y.nunique() > 1:
            Xtr, Xte, ytr, yte = train_test_split(
                X, y, test_size=0.25, random_state=42, stratify=y
            )
            eval_model = build_pipeline()
            eval_model.fit(Xtr, ytr)
            pred = eval_model.predict(Xte)
            proba = eval_model.predict_proba(Xte)[:, 1]

            self.last_eval = {
                "accuracy": float(accuracy_score(yte, pred)),
                "roc_auc": float(roc_auc_score(yte, proba)),
                "test_size": int(len(yte)),
            }
            print(
                f"[eval] held-out accuracy={self.last_eval['accuracy']:.4f} "
                f"roc_auc={self.last_eval['roc_auc']:.4f} "
                f"(n={self.last_eval['test_size']})"
            )
            print(classification_report(yte, pred))
        else:
            print('[eval] skipped: not enough rows/class variety for a held-out split')

        # Final model deployed for predict()/get_insights() is fit on ALL
        # available data — the split above is only for reporting how well
        # it's likely to generalize, not for holding data back from it.
        model = build_pipeline()
        model.fit(X, y)
        self.model = model
        print('model trained successfully')
        if save:
            self.save_model()

    def predict(self, data):
        model = joblib.load(self.model_name)
        # A null/missing numeric feature (e.g. a source complaint with no
        # offense_issued_at date) becomes NaN here, which LogisticRegression
        # rejects outright — fill with 0 ("no signal") rather than let one
        # bad upstream field crash the whole prediction.
        input = pd.DataFrame([data]).fillna(0)

        return make_json_safe(model.predict(input)[0])

    def get_insights(self, data, pred):
        insights = []
        violation_type = data.get("violation_type", "Unknown")

        prob = None
        try:
            model = joblib.load(self.model_name)
            X_in = pd.DataFrame([data]).fillna(0)
            if hasattr(model, "predict_proba"):
                prob = float(model.predict_proba(X_in)[:, 1][0])
        except Exception:
            prob = None

        # `.get(key, 0)` only substitutes when the key is *missing* — a
        # present-but-None value (e.g. a source complaint with no
        # offense_issued_at date) still slips through and breaks int(None).
        past_repeat = int(data.get("past_repeat_same_violation_count") or 0)
        recent_same = int(data.get("recent_same_violation_count") or 0)
        months_since = int(data.get("months_since_last_same_violation") or 0)

        insights.append(f"Violation type selected: {violation_type}.")

        if past_repeat > 0:
            insights.append(f"Student has repeated this violation before ({past_repeat} time(s)). This increases risk.")
        else:
            insights.append("No past repeats of the same violation were recorded, which generally reduces risk.")

        if recent_same > 0:
            insights.append(f"There were recent occurrences of the same violation ({recent_same}). Recency increases risk.")
        else:
            insights.append("No recent occurrences of the same violation were recorded, which lowers short-term risk.")

        # months_since only means anything once there's a PAST occurrence to
        # measure against — for a genuine first offense (past_repeat == 0)
        # it's pinned to a neutral sentinel (120) by getModelInput()/the
        # training data, not a real "several months clean" reading, so
        # describing it as a risk factor here would be misleading either way.
        if past_repeat == 0:
            insights.append("This is the student's first recorded occurrence of this violation, so recency history isn't applicable yet.")
        else:
            if months_since <= 1:
                insights.append("The last same violation was very recent (≤ 1 month), which increases repeat risk.")
            elif months_since <= 3:
                insights.append("The last same violation was within 2–3 months, which indicates moderate risk.")
            else:
                insights.append("The last same violation was several months ago, which reduces repeat risk.")

        if prob is not None:
            verdict = "high" if prob >= 0.65 else ("moderate" if prob >= 0.45 else "low")
            insights.append(f"Model probability estimate: {prob:.4f} ({verdict} risk under the current threshold logic).")

        if int(pred) == 1:
            insights.append("Final decision: Student is flagged for early intervention (predicted repeat).")
        else:
            insights.append("Final decision: Student is not flagged (predicted not to repeat).")

        return insights

    def get_recommendation(self, data, pred, insights=None):
        # Was generated client-side via an OpenRouter call (student-violation.jsx)
        # with the model's own insights as context — moved server-side onto a
        # local transformers model instead, so the feature no longer depends
        # on an external API key/network call.
        # `insights` can be passed in by a caller that already computed them
        # (main.py does) to avoid recomputing/reloading the model twice.
        if insights is None:
            insights = self.get_insights(data, pred)

        return self._ai_recommendation(data, pred, insights) or []

    def _ai_recommendation(self, data, pred, insights):
        try:
            violation_type = data.get("violation_type", "the violation")
            verdict = "will likely repeat" if int(pred) == 1 else "is unlikely to repeat"

            prompt = (
                f"A student's discipline record was analyzed by a predictive model for the violation "
                f"\"{violation_type}\". Prediction: the student {verdict} this violation. "
                f"Model insights: {' '.join(insights)} "
                "List at least 5 short, actionable recommendations (6 or more is fine) for a school "
                "prefect or counselor deciding how to handle this student. Number them 1 to 6+ and keep "
                "each one to a single short sentence. Do not include a title/heading before the list or "
                "a summary sentence after it — output only the numbered items, nothing else."
            )


            tokenizer, model = self._get_recommendation_model()
            messages = [{"role": "user", "content": prompt}]
            chat_input = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = tokenizer(chat_input, return_tensors="pt", truncation=True, max_length=512)
            # device_map="auto" may place the model on GPU — inputs need to
            # live on the same device before generate() runs.
            inputs = {k: v.to(model.device) for k, v in inputs.items()}
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    # Raised alongside the higher recommendation count target
                    # below — 200 tokens was cutting a 6-item list off mid-way.
                    max_new_tokens=320,
                    do_sample=False,
                    repetition_penalty=1.2,
                )
            generated = outputs[0][inputs["input_ids"].shape[1]:]
            text = tokenizer.decode(generated, skip_special_tokens=True).strip()

            # No hard 5-item cap — 3 is the floor, 6+ is expected/fine. Only
            # guard against a truly degenerate/runaway parse.
            recommendations = self._parse_recommendation_list(text)
            return recommendations[:10] if recommendations else None
        except Exception as e:
            print(f"[get_recommendation] transformers generation failed: {e}")
            return None

    def append(self, data):
        csv_path = f"./dataset/{self.file}.csv"
        self.df = pd.read_csv(csv_path)
        
        if not isinstance(data, dict):
            raise TypeError("data must be a dict")

        required = {
            "violation_type",
            "past_repeat_same_violation_count",
            "recent_same_violation_count",
            "months_since_last_same_violation",
        }
        missing = required - set(data.keys())
        if missing:
            raise ValueError(f"Missing required fields: {sorted(missing)}")

        cleaned = {}

        vt = data.get("violation_type")
        if vt is None:
            raise ValueError("violation_type cannot be None")
        vt = str(vt).strip()
        if vt == "":
            raise ValueError("violation_type cannot be empty")
        cleaned["violation_type"] = vt

        def to_int(val, field):
            try:
                if val is None or (isinstance(val, float) and np.isnan(val)):
                    return 0
                return int(float(val))
            except Exception:
                raise ValueError(f"{field} must be a number (int-like). Got: {val}")

        cleaned["past_repeat_same_violation_count"] = to_int(
            data.get("past_repeat_same_violation_count"), "past_repeat_same_violation_count"
        )
        cleaned["recent_same_violation_count"] = to_int(
            data.get("recent_same_violation_count"), "recent_same_violation_count"
        )
        cleaned["months_since_last_same_violation"] = to_int(
            data.get("months_since_last_same_violation"), "months_since_last_same_violation"
        )

        y = 0 if cleaned['past_repeat_same_violation_count'] < 2 else self.predict(data)

        cleaned["will_repeat_the_same_violation"] = y

        nonneg_fields = [
            "past_repeat_same_violation_count",
            "recent_same_violation_count",
            "months_since_last_same_violation",
        ]
        for f in nonneg_fields:
            if cleaned[f] < 0:
                raise ValueError(f"{f} must be >= 0")

        if cleaned["months_since_last_same_violation"] > 120:
            raise ValueError("months_since_last_same_violation seems too large (>120 months).")

        new_row = pd.DataFrame([cleaned])
        self.df = pd.concat([self.df, new_row], ignore_index=True)

        self.df.to_csv(csv_path, index=False)
        self.df = pd.read_csv(csv_path)
        
    def save_model(self):
        joblib.dump(self.model, self.model_name)
        print('model has been updated')