import sqlite3
import pandas as pd
import json
from datetime import datetime, UTC

DB = "mplads.db"

def fetch_and_store():
    con = sqlite3.connect(DB)

    # Drop old table to recreate with new schema
    con.execute("DROP TABLE IF EXISTS national_stats")
    con.commit()

    with open("../data/empowered_indian_stats.json") as f:
        ei = json.load(f)
    ei = ei["data"]

    stats = {
    # National picture (all 774 MPs, both houses) — source: EmpoweredIndian
    "national_total_allocated":   ei.get("totalAllocated", 0),
    "national_total_expenditure": ei.get("totalExpenditure", 0),
    "national_fund_utilization":  ei.get("utilizationPercentage", 0),
    "national_total_mps":         ei.get("totalMPs", 0),
    "national_works_completed":   ei.get("totalWorksCompleted", 0),
    "national_works_pending":     ei.get("pendingWorks", 0),
    "national_completion_rate":   ei.get("completionRate", 0),
    "national_payment_gap":       ei.get("paymentGap", 0),

    # Zero Artifacts ML scope (350 Lok Sabha constituencies only)
    "ml_mps_covered":             350,
    "ml_states_covered":          32,
    "ml_projects_analysed":       29000,
    "flagged_anomalies":          int(pd.read_sql("SELECT COUNT(*) as n FROM layer1_scores WHERE anomaly_flag = -1", con).iloc[0,0]),
    "critical_constituencies":    int(pd.read_sql("SELECT COUNT(*) as n FROM layer4_integrity WHERE risk_band = 'CRITICAL'", con).iloc[0,0]),
    "duplicate_works":            int(pd.read_sql("SELECT COUNT(*) as n FROM layer_duplicate_scores WHERE duplicate_flag = 1", con).iloc[0,0]),
    "high_risk_vendors":          int(pd.read_sql("SELECT COUNT(*) as n FROM layer3_vendor_scores WHERE collusion_flags >= 2", con).iloc[0,0]),
    "march_rush_mps":             int(pd.read_sql("SELECT COUNT(*) as n FROM layer_spending_pattern WHERE march_rush_flag = 1", con).iloc[0,0]),
    "fetched_at":                 datetime.now(UTC).isoformat(),
    }

    pd.DataFrame([stats]).to_sql("national_stats", con, if_exists="append", index=False)
    con.close()

    print("Stats updated:")
    for k, v in stats.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    fetch_and_store()