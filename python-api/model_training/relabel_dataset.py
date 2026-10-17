"""
Recomputes will_repeat_the_same_violation in dataset/student_violations.csv
with the same risk-point table generate_dataset.py uses (see
label_probability() there), so relabelling and generating can never drift.

Run from the python-api/ directory: python model_training/relabel_dataset.py
"""
import os
import shutil
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_dataset import BACKUP_PATH, CSV_PATH, draw_labels, risk_points, RISK_TIERS  # noqa: E402


def main():
    shutil.copyfile(CSV_PATH, BACKUP_PATH)

    df = pd.read_csv(CSV_PATH)
    before_rate = df["will_repeat_the_same_violation"].mean()
    df["will_repeat_the_same_violation"] = draw_labels(df)
    df.to_csv(CSV_PATH, index=False)

    print(f"backup written to {BACKUP_PATH}")
    print(f"positive rate: before={before_rate:.4f} after={df['will_repeat_the_same_violation'].mean():.4f}")
    print("mean probability by total risk-point bucket:")
    print(risk_points(df).map(RISK_TIERS).groupby(risk_points(df)).mean().round(4).to_string())


if __name__ == "__main__":
    main()
