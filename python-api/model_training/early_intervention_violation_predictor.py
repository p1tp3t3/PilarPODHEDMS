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
    def __init__(self, file):
        self.file = file
        self.df = pd.read_csv(f"./dataset/{self.file}.csv")
        self.model_name = f'./model_training/notebook/early-intervention-violation-predictor-model'
        # Last training run's metrics, kept next to the model so they
        # survive a restart (the maintenance page reads them).
        self.meta_path = f'./model_training/notebook/early-intervention-violation-predictor-meta.json'
        self.model = None
        self.last_eval = None

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
        returns [{key, prediction, probability}] — no insights, which are
        per-student."""
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

    # Plain-language names for the model's features (engineer_features),
    # used to say which one weighed most on a prediction.
    # (when the flag/count is present, when it is zero)
    _FACTOR_NAMES = {
        "past_repeat_same_violation_count": ("the number of times the student has committed this violation", "the student having no earlier record of this violation"),
        "recent_same_violation_count": ("the repeat offenses in the last 90 days", "the lack of any repeat offense in the last 90 days"),
        "first_offense": ("this being the student's first offense", "this not being the student's first offense"),
        "months_0_1": ("the last offense being less than 2 months ago", "the last offense not being in the past 2 months"),
        "months_2_3": ("the last offense being 2 to 3 months ago", "the last offense not being 2 to 3 months ago"),
    }

    def _strongest_factor(self, data, pred):
        """The feature that pushed this prediction hardest toward its verdict
        (coefficient x scaled value), or None. Never exposes a percentage."""
        try:
            model = joblib.load(self.model_name)
            clf = model.named_steps["clf"]
            X = model[:-1].transform(pd.DataFrame([data]))
            raw = engineer_features(pd.DataFrame([data])).iloc[0]
            names = list(raw.index)
            contrib = np.asarray(X)[0] * clf.coef_[0]
            sign = 1 if int(pred) == 1 else -1
            i = int(np.argmax(contrib * sign))
            if contrib[i] * sign <= 0:
                return None
            present, absent = self._FACTOR_NAMES.get(names[i], (None, None))
            return present if raw.iloc[i] > 0 else absent
        except Exception:
            return None

    def get_insights(self, data, pred):
        """Plain-language reasons behind the verdict, for the Prefect of
        Discipline: each a "Label: two or three sentences" line, written in
        school terms (no mention of models, data or scores). Built from the
        same record the verdict uses; the probability is deliberately left
        out (the page shows only Likely / Unlikely)."""
        insights = []
        violation_type = data.get("violation_type") or "this violation"
        likely = int(pred) == 1

        # `.get(key, 0)` only substitutes when the key is *missing*; a
        # present-but-None value still slips through and breaks int(None).
        # past = every resolved record of this violation, the latest included.
        # recent = how many of them fell in the last 90 days.
        # months = months since the latest one; 120 marks a first offense.
        total = int(data.get("past_repeat_same_violation_count") or 0)
        recent = int(data.get("recent_same_violation_count") or 0)
        months = data.get("months_since_last_same_violation")
        months = FIRST_OFFENSE_MONTHS if months is None else int(months)
        first = total <= 1 or months >= FIRST_OFFENSE_MONTHS
        earlier = max(total - recent, 0)  # offenses before the last 90 days

        def times(n):
            return "once" if n == 1 else ("twice" if n == 2 else f"{n} times")

        # 1. Offense history.
        if first:
            insights.append(
                f"Offense history: This is the student's first resolved record of \"{violation_type}\". "
                "There is no earlier record of the same violation to suggest a habit, and a single incident "
                "is often a one-time lapse in judgment rather than a pattern of behaviour. "
                "A first offense is usually best handled through guidance and a clear reminder of the rules."
            )
        else:
            level = (
                "an established, repeated pattern rather than an isolated incident"
                if total >= 4 else
                "a repeat offense, which shows the behaviour has not yet been corrected"
            )
            insights.append(
                f"Offense history: The student has been recorded for \"{violation_type}\" {times(total)}, "
                f"and the latest incident counts as their {self._ordinal(total)} offense. This is {level}. "
                "Each repeated offense makes another one more likely, because the behaviour is becoming familiar to the student."
            )

        # 2. Recent activity (last 90 days).
        if first:
            insights.append(
                "Recent activity: With only one record so far, there is no repeat activity in the last 90 days to look at yet. "
                "How the student behaves in the coming weeks will show whether this stays a single incident."
            )
        elif recent == 0:
            insights.append(
                "Recent activity: None of these offenses happened in the last 90 days. "
                "This suggests the behaviour has slowed down or stopped for now, possibly because earlier "
                "interventions or sanctions are having an effect."
            )
        else:
            share = "All of them" if recent >= total else f"{recent} of the {total}"
            weight = (
                "This is a cluster of offenses in a short time, a strong sign that the behaviour is ongoing "
                "and has not responded to earlier action."
                if recent >= 3 else
                "This shows the behaviour is still active and has not yet stopped."
            )
            insights.append(
                f"Recent activity: {share} happened within the last 90 days. {weight}"
            )

        # 3. Time since the last offense.
        if not first:
            if months <= 0:
                when = "less than a month ago"
            elif months == 1:
                when = "about a month ago"
            else:
                when = f"about {months} months ago"
            if months <= 1:
                meaning = ("This is very recent, and the weeks right after an offense are when a repeat is most likely. "
                           "Prompt follow-up during this period has the best chance of preventing another incident.")
            elif months <= 3:
                meaning = ("This is fairly recent, so the chance of a repeat has not yet had time to fade. "
                           "Regular check-ins over the next few weeks are still worthwhile.")
            else:
                meaning = ("Several months without a repeat lowers the chance of another offense, "
                           "although the student's earlier record still matters and should not be ignored.")
            insights.append(f"Last offense: The most recent offense was {when}. {meaning}")

        # 4. Earlier versus recent offenses (is it growing or fading?).
        if not first:
            if earlier == 0:
                trend = ("Every recorded offense happened within the last 90 days, with none before that. "
                         "The behaviour started recently and has quickly repeated, so it is increasing rather than fading.")
            elif recent == 0:
                trend = (f"All {times(total)} of the offenses happened more than 90 days ago, with nothing since. "
                         "The behaviour appears to be fading, which is a good sign if it continues.")
            elif recent > earlier:
                trend = (f"More offenses happened in the last 90 days ({recent}) than before that ({earlier}). "
                         "The behaviour is becoming more frequent, not less.")
            elif recent == earlier:
                trend = (f"The offenses are evenly split between the last 90 days ({recent}) and the time before that ({earlier}). "
                         "The behaviour is continuing at a steady rate.")
            else:
                trend = (f"Fewer offenses happened in the last 90 days ({recent}) than before that ({earlier}). "
                         "The behaviour is slowing down, although it has not stopped completely.")
            insights.append(f"Earlier and recent offenses: {trend}")

        # 5. Overall pattern.
        if first:
            pattern = ("A single incident with no pattern yet. There is nothing to compare it with, "
                       "so the focus is on making sure it does not become a habit.")
        elif recent >= total and total >= 2:
            pattern = ("Every offense is recent, so the behaviour appears to be escalating. "
                       "Without intervention, further incidents are likely in the near future.")
        elif recent > 0:
            pattern = ("The offenses are spread out over time and are still continuing. "
                       "This suggests a lasting habit rather than a passing phase.")
        else:
            pattern = ("There were earlier offenses followed by a quiet period since. "
                       "The student may have improved, but a return to the old behaviour is still possible.")
        insights.append(f"Pattern: {pattern}")

        # 6. What mattered most for this result.
        factor = self._strongest_factor(data, pred)
        if factor:
            insights.append(
                f"Main reason for this result: Of everything in the student's record, {factor} mattered most "
                "in reaching this result."
            )

        # 7. What to watch next.
        if likely:
            watch = ("Pay close attention to the student's conduct and attendance over the coming weeks, "
                     "especially in the places and situations where the earlier offenses happened. "
                     "Any new incident should be documented and acted on promptly.")
        elif first:
            watch = ("Keep an eye on the student's conduct for the rest of the semester. "
                     "If the same violation happens again, it should be treated as the start of a pattern.")
        else:
            watch = ("Continue routine monitoring of the student's conduct. "
                     "If a new offense is recorded, the student's earlier history should be taken into account.")
        insights.append(f"What to watch: {watch}")

        # 8. What it means.
        if likely:
            insights.append(
                "Result: The student is recommended for early intervention. They are likely to commit "
                f"\"{violation_type}\" again unless something changes, so timely follow-up by the "
                "Prefect of Discipline is advised."
            )
        else:
            insights.append(
                "Result: The student does not need early intervention at this time. They are unlikely to commit "
                f"\"{violation_type}\" again soon, so routine monitoring is enough for now."
            )

        return insights

    @staticmethod
    def _ordinal(n):
        if 10 <= n % 100 <= 20:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"

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