"""
Generates dataset/student_violations.csv for the Early Intervention Violation
Predictor — only rows that are possible under the school's rules:

  * a violation is never repeated more times than its own penalty ladder
    allows (dataset/violation_levels.csv, exported from the system with
    `php artisan ml:export-violations`; 1-6 levels, 6 at most),
  * a first offense (past = 1) has no recent repeats and the first-offense
    marker months = 120 (exactly what the app sends),
  * "recent" (repeats in the last 90 days) never exceeds the total, and the
    months since the last one agree with it: recent > 0 -> 0-2 months,
    recent = 0 -> 3-24 months.

Labels come from label_probability(): a plain, hand-set risk-point table
(below) mapped to a probability, then drawn with a fixed seed. Every value
is readable and editable here; relabel_dataset.py reuses the same function.

Run from python-api/:  python model_training/generate_dataset.py
"""
import os
import shutil

import numpy as np
import pandas as pd

CSV_PATH = "./dataset/student_violations.csv"
BACKUP_PATH = "./dataset/student_violations.csv.bak"
LEVELS_PATH = "./dataset/violation_levels.csv"

ROWS = 2000
SEED = 42
MAX_LEVEL = 6
FIRST_OFFENSE_MONTHS = 120
PAST_DECAY = 0.8  # P(past = k) proportional to PAST_DECAY ** (k - 1)

COLUMNS = [
    "violation_type",
    "past_repeat_same_violation_count",
    "recent_same_violation_count",
    "months_since_last_same_violation",
    "will_repeat_the_same_violation",
]


# ---------------------------------------------------------------- labels --

def past_repeat_points(v):  # 1-6 (includes the current occurrence)
    if v <= 1:
        return 0  # first offense
    if v <= 3:
        return 1
    if v <= 5:
        return 2
    return 3  # 6


def recent_points(v):  # repeats in the last 90 days
    if v == 0:
        return 0
    if v <= 2:
        return 1
    return 2


def months_points(v):  # 0-24, 120 = first-offense marker
    if v >= FIRST_OFFENSE_MONTHS:
        return 0
    if v <= 1:
        return 2  # very recent
    if v == 2:
        return 1
    return 0  # 3+ months ago


RISK_TIERS = {0: 0.05, 1: 0.15, 2: 0.30, 3: 0.45, 4: 0.60, 5: 0.75, 6: 0.85, 7: 0.95}


def risk_points(df):
    return (
        df["past_repeat_same_violation_count"].apply(past_repeat_points)
        + df["recent_same_violation_count"].apply(recent_points)
        + df["months_since_last_same_violation"].apply(months_points)
    )


def label_probability(df):
    return risk_points(df).map(RISK_TIERS)


def draw_labels(df, seed=SEED):
    rng = np.random.default_rng(seed)
    return rng.binomial(1, label_probability(df))


# ------------------------------------------------------------- generation --

def generate(levels, rows=ROWS, seed=SEED):
    rng = np.random.default_rng(seed)
    records = []
    for _ in range(rows):
        violation = levels.iloc[rng.integers(len(levels))]
        max_level = int(min(MAX_LEVEL, max(1, violation["max_level"])))

        weights = np.array([PAST_DECAY ** k for k in range(max_level)])
        past = int(rng.choice(np.arange(1, max_level + 1), p=weights / weights.sum()))

        if past == 1:
            recent, months = 0, FIRST_OFFENSE_MONTHS
        else:
            recent = int(rng.integers(0, min(past, 4) + 1))
            months = int(rng.integers(0, 3)) if recent > 0 else int(rng.integers(3, 25))

        records.append({
            "violation_type": violation["violation_type"],
            "past_repeat_same_violation_count": past,
            "recent_same_violation_count": recent,
            "months_since_last_same_violation": months,
        })

    df = pd.DataFrame(records)
    df["will_repeat_the_same_violation"] = draw_labels(df, seed)
    return df[COLUMNS]


def validate(df, levels):
    """Raises AssertionError on any row the school's rules make impossible."""
    limit = df["violation_type"].map(dict(zip(levels["violation_type"], levels["max_level"])))
    past = df["past_repeat_same_violation_count"]
    recent = df["recent_same_violation_count"]
    months = df["months_since_last_same_violation"]
    first = past == 1

    checks = {
        "unknown violation": limit.isna(),
        "past above the violation's ladder": past > limit,
        "past above 6": past > MAX_LEVEL,
        "recent above past": recent > past,
        "first offense with recent repeats": first & (recent > 0),
        "first offense without the 120 marker": first & (months != FIRST_OFFENSE_MONTHS),
        "repeat with the first-offense marker": ~first & (months == FIRST_OFFENSE_MONTHS),
        "recent repeat but last one 3+ months ago": ~first & (recent > 0) & (months > 2),
        "no recent repeat but last one within 3 months": ~first & (recent == 0) & (months < 3),
    }
    failed = {name: int(mask.sum()) for name, mask in checks.items() if mask.any()}
    assert not failed, f"invalid rows: {failed}"


def main():
    levels = pd.read_csv(LEVELS_PATH)
    levels["violation_type"] = levels["violation_type"].str.strip()

    df = generate(levels)
    validate(df, levels)

    if os.path.exists(CSV_PATH):
        shutil.copyfile(CSV_PATH, BACKUP_PATH)
        print(f"backup of the previous dataset written to {BACKUP_PATH}")
    df.to_csv(CSV_PATH, index=False)

    print(f"wrote {len(df)} valid rows to {CSV_PATH} ({df['violation_type'].nunique()} violation types)")
    print(f"positive rate: {df['will_repeat_the_same_violation'].mean():.1%}")
    print("rows per past count:", df["past_repeat_same_violation_count"].value_counts().sort_index().to_dict())
    summary = pd.DataFrame({"points": risk_points(df), "y": df["will_repeat_the_same_violation"]})
    print("risk points -> rows, label probability, observed repeat rate")
    print(summary.groupby("points").agg(rows=("y", "size"), observed=("y", "mean"))
          .assign(probability=lambda t: t.index.map(RISK_TIERS)).round(3).to_string())


if __name__ == "__main__":
    main()
