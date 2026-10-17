import pandas as pd
from sklearn.preprocessing import FunctionTransformer, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate, cross_val_predict
from sklearn.metrics import (
    accuracy_score, roc_auc_score, classification_report,
    precision_score, recall_score, f1_score, confusion_matrix, roc_curve,
    brier_score_loss,
)
import joblib
import json
import os
import shutil
from datetime import datetime, timezone
import numpy as np
import re
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM



FIRST_OFFENSE_MONTHS = 120

RAW_COLUMNS = [
    "violation_type",
    "past_repeat_same_violation_count",
    "recent_same_violation_count",
    "months_since_last_same_violation",
]


def engineer_features(X):
    """What the model actually learns from — the first step of the saved
    pipeline, so training, predict(), get_insights() and predict_batch()
    always agree. violation_type is deliberately NOT used: the labels never
    depend on it, and one-hot encoding 80 types only added noise (the same
    history scored anywhere from 19% to 71% depending on the type).
    months_since_last uses 120 as a first-offense marker, which a linear
    model would read as "very long ago", so it becomes explicit flags."""
    X = pd.DataFrame(X).copy()
    past = pd.to_numeric(X["past_repeat_same_violation_count"], errors="coerce").fillna(0)
    recent = pd.to_numeric(X["recent_same_violation_count"], errors="coerce").fillna(0)
    months = pd.to_numeric(X["months_since_last_same_violation"], errors="coerce").fillna(FIRST_OFFENSE_MONTHS)
    return pd.DataFrame({
        "past_repeat_same_violation_count": past,
        "recent_same_violation_count": recent,
        "first_offense": (months >= FIRST_OFFENSE_MONTHS).astype(int),
        "months_0_1": (months <= 1).astype(int),
        "months_2_3": ((months >= 2) & (months <= 3)).astype(int),
    })


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
        # Last training run's metrics, kept next to the model so they
        # survive a restart (the maintenance page reads them).
        self.meta_path = f'./model_training/notebook/early-intervention-violation-predictor-meta.json'
        self.model = None
        self.last_eval = None

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

        X = df[RAW_COLUMNS].copy()
        y = df[target].astype(int).copy()

        def build_pipeline():
            return Pipeline(steps=[
                ("features", FunctionTransformer(engineer_features)),
                ("scale", StandardScaler()),
                ("clf", LogisticRegression(max_iter=1000)),
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

            # ROC curve thinned to ~60 points so the payload stays small.
            fpr, tpr, _ = roc_curve(yte, proba)
            step = max(1, len(fpr) // 60)
            keep = list(range(0, len(fpr), step))
            if keep[-1] != len(fpr) - 1:
                keep.append(len(fpr) - 1)

            self.last_eval = {
                "accuracy": float(accuracy_score(yte, pred)),
                "roc_auc": float(roc_auc_score(yte, proba)),
                "precision": float(precision_score(yte, pred, zero_division=0)),
                "recall": float(recall_score(yte, pred, zero_division=0)),
                "f1": float(f1_score(yte, pred, zero_division=0)),
                "test_size": int(len(yte)),
                # [[true negative, false positive], [false negative, true positive]]
                "confusion_matrix": confusion_matrix(yte, pred, labels=[0, 1]).tolist(),
                "roc_curve": {
                    "fpr": [round(float(fpr[i]), 4) for i in keep],
                    "tpr": [round(float(tpr[i]), 4) for i in keep],
                },
                "cv": self._cross_validate(build_pipeline, X, y),
                "calibration": self._calibration(build_pipeline, X, y),
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
            self._save_meta()
        return self.last_eval

    def predict(self, data):
        model = joblib.load(self.model_name)
        # A null/missing numeric feature (e.g. a source complaint with no
        # offense_issued_at date) becomes NaN here, which LogisticRegression
        # rejects outright — fill with 0 ("no signal") rather than let one
        # bad upstream field crash the whole prediction.
        input = pd.DataFrame([data]).fillna(0)

        return make_json_safe(model.predict(input)[0])

    def predict_batch(self, rows):
        """Scores many rows at once (e.g. every enrolled student's
        violations for the prefect's watch list): loads the model once and
        returns [{key, prediction, probability}] — no insights or
        recommendations, which are per-student and slow."""
        if not rows:
            return []
        model = joblib.load(self.model_name)
        frame = pd.DataFrame(rows)
        for column in RAW_COLUMNS:
            if column not in frame:
                frame[column] = None
        proba = model.predict_proba(frame[RAW_COLUMNS])[:, 1]
        return [
            {
                "key": row.get("key"),
                "prediction": int(p >= 0.5),
                "probability": round(float(p), 4),
            }
            for row, p in zip(rows, proba)
        ]

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

    @staticmethod
    def _calibration(build_pipeline, X, y, k=5, bins=10):
        """How well predicted probabilities match reality, from out-of-fold
        predictions (each row scored by a model that never saw it): Brier
        score plus a reliability table — per probability bin, the mean
        predicted risk vs the share that actually repeated."""
        k = min(k, int(y.value_counts().min()))
        if k < 2:
            return None
        proba = cross_val_predict(
            build_pipeline(), X, y,
            cv=StratifiedKFold(n_splits=k, shuffle=True, random_state=42),
            method="predict_proba",
        )[:, 1]
        edges = np.linspace(0, 1, bins + 1)
        idx = np.clip(np.digitize(proba, edges[1:-1]), 0, bins - 1)
        table = []
        for b in range(bins):
            mask = idx == b
            if mask.any():
                table.append({
                    "bin": f"{edges[b]:.1f}-{edges[b + 1]:.1f}",
                    "predicted": float(proba[mask].mean()),
                    "observed": float(y[mask].mean()),
                    "count": int(mask.sum()),
                })
        gaps = [abs(t["predicted"] - t["observed"]) for t in table if t["count"] >= 20]
        return {
            "brier": float(brier_score_loss(y, proba)),
            "max_gap": float(max(gaps)) if gaps else None,
            "bins": table,
        }

    @staticmethod
    def _cross_validate(build_pipeline, X, y, k=5):
        """Stratified k-fold scores (per fold + mean/std) for the
        maintenance page's cross-validation chart. None when a class has
        too few rows to split k ways."""
        k = min(k, int(y.value_counts().min()))
        if k < 2:
            return None
        metrics = ["accuracy", "roc_auc", "precision", "recall", "f1"]
        res = cross_validate(
            build_pipeline(), X, y,
            cv=StratifiedKFold(n_splits=k, shuffle=True, random_state=42),
            scoring=metrics,
        )
        folds = [
            {"fold": i + 1, **{m: float(res[f"test_{m}"][i]) for m in metrics}}
            for i in range(k)
        ]
        return {
            "k": k,
            "folds": folds,
            "mean": {m: float(np.mean(res[f"test_{m}"])) for m in metrics},
            "std": {m: float(np.std(res[f"test_{m}"])) for m in metrics},
        }

    # ------------------------------------------------------------------
    # Maintenance page support
    # ------------------------------------------------------------------
    REQUIRED_COLUMNS = [
        "violation_type",
        "past_repeat_same_violation_count",
        "recent_same_violation_count",
        "months_since_last_same_violation",
        "will_repeat_the_same_violation",
    ]

    def csv_path(self):
        return f"./dataset/{self.file}.csv"

    def _save_meta(self):
        meta = {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "rows": int(len(self.df)),
            "eval": self.last_eval,
        }
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f)

    def status(self):
        df = pd.read_csv(self.csv_path())
        target = df["will_repeat_the_same_violation"].astype(int)
        meta = {}
        if os.path.exists(self.meta_path):
            with open(self.meta_path, encoding="utf-8") as f:
                meta = json.load(f)
        trained_at = meta.get("trained_at")
        if not trained_at and os.path.exists(self.model_name):
            trained_at = datetime.fromtimestamp(os.path.getmtime(self.model_name), timezone.utc).isoformat()
        return {
            "name": "Early Intervention Violation Predictor",
            "algorithm": "Logistic Regression",
            "dataset_rows": int(len(df)),
            "will_repeat": int((target == 1).sum()),
            "will_not_repeat": int((target == 0).sum()),
            "violation_types": int(df["violation_type"].nunique()),
            "model_exists": os.path.exists(self.model_name),
            "trained_at": trained_at,
            "trained_rows": meta.get("rows"),
            "eval": meta.get("eval"),
        }

    def replace_dataset(self, new_df):
        """Validates an uploaded dataset, keeps a .bak of the current one,
        swaps it in and retrains. Raises ValueError with a readable message."""
        missing = [c for c in self.REQUIRED_COLUMNS if c not in new_df.columns]
        if missing:
            raise ValueError("Missing column(s): " + ", ".join(missing))
        new_df = new_df[self.REQUIRED_COLUMNS].dropna()
        if len(new_df) < 20:
            raise ValueError("The dataset needs at least 20 complete rows.")
        labels = set(new_df["will_repeat_the_same_violation"].astype(int).unique())
        if not labels <= {0, 1} or len(labels) < 2:
            raise ValueError("will_repeat_the_same_violation must contain both 0 and 1 values.")
        for c in self.REQUIRED_COLUMNS[1:]:
            new_df[c] = pd.to_numeric(new_df[c], errors="raise").astype(int)

        shutil.copyfile(self.csv_path(), self.csv_path() + ".bak")
        new_df.to_csv(self.csv_path(), index=False)
        self.df = pd.read_csv(self.csv_path())
        return self.train_model(True)
        print('model has been updated')