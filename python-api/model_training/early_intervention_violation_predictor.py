import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
import joblib
import numpy as np

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
        self.model = None
    
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

    def get_recommendation(self, data, pred):
        recommendations = []

        # `.get(key, 0)` only substitutes when the key is *missing* — a
        # present-but-None value (e.g. a source complaint with no
        # offense_issued_at date) still slips through and breaks int(None).
        past_repeat = int(data.get("past_repeat_same_violation_count") or 0)
        recent_same = int(data.get("recent_same_violation_count") or 0)
        months_since = int(data.get("months_since_last_same_violation") or 0)

        if int(pred) == 1:
            recommendations.append("Schedule a brief check-in with the student within 24–72 hours.")
            recommendations.append("Review the student’s violation history and identify triggers/patterns.")
            recommendations.append("Notify relevant staff (advisor/counselor/discipline lead) for coordinated support.")

            if recent_same > 0:
                recommendations.append("Since violations are recent, implement a short-term monitoring plan (weekly follow-ups).")

            if past_repeat > 0:
                recommendations.append("Since the student has repeated before, create a targeted behavior contract with clear goals and check-ins.")

            if months_since <= 1:
                recommendations.append("Risk is elevated due to recent history; intervene sooner and document actions.")
        else:
            recommendations.append("Continue routine monitoring—no immediate intervention required.")
            recommendations.append("Provide positive reinforcement and encourage maintaining good behavior.")

        return recommendations
    
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