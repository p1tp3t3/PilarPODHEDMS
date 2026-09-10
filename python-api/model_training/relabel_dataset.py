"""
Recomputes will_repeat_the_same_violation in dataset/student_violations.csv
using an explicit, reviewable risk-point table over the 3 features the model
actually trains on (past_repeat_same_violation_count, recent_same_violation_count,
months_since_last_same_violation) — clean_streak_length and
ongoing_same_violation_count were removed from the pipeline entirely.

Every bucket boundary and tier probability below is a plain, hand-set value
you can read and edit directly — there is no hidden formula/coefficients.

Run from the python-api/ directory: python model_training/relabel_dataset.py
"""
import shutil

import numpy as np
import pandas as pd

CSV_PATH = "./dataset/student_violations.csv"
BACKUP_PATH = "./dataset/student_violations.csv.bak"

SEED = 42


def past_repeat_points(v):  # 1-7 (includes the current occurrence)
    if v <= 1:
        return 0  # first offense
    if v <= 3:
        return 1
    if v <= 5:
        return 2
    return 3  # 6-7


def recent_points(v):  # 0-4
    if v == 0:
        return 0
    if v <= 2:
        return 1
    return 2


def months_points(v):  # 0-24 real range, 120 = first-offense sentinel
    if v >= 120:
        return 0  # not applicable
    if v <= 1:
        return 2  # very recent
    if v <= 3:
        return 1
    return 0  # distant


RISK_TIERS = {
    0: 0.05,
    1: 0.15,
    2: 0.30,
    3: 0.45,
    4: 0.60,
    5: 0.75,
    6: 0.85,
    7: 0.95,
}


def main():
    shutil.copyfile(CSV_PATH, BACKUP_PATH)

    df = pd.read_csv(CSV_PATH)

    points = (
        df["past_repeat_same_violation_count"].apply(past_repeat_points)
        + df["recent_same_violation_count"].apply(recent_points)
        + df["months_since_last_same_violation"].apply(months_points)
    )
    prob = points.map(RISK_TIERS)

    rng = np.random.default_rng(SEED)
    label = rng.binomial(1, prob)

    before_rate = df["will_repeat_the_same_violation"].mean()
    df["will_repeat_the_same_violation"] = label
    after_rate = df["will_repeat_the_same_violation"].mean()

    df.to_csv(CSV_PATH, index=False)

    print(f"backup written to {BACKUP_PATH}")
    print(f"positive rate: before={before_rate:.4f} after={after_rate:.4f}")
    print("mean probability by total risk-point bucket:")
    summary = pd.DataFrame({"points": points, "prob": prob})
    print(summary.groupby("points")["prob"].mean().round(4).to_string())


if __name__ == "__main__":
    main()
