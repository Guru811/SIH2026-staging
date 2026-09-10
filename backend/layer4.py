import sqlite3
import pandas as pd

def compute_integrity_index():
    con = sqlite3.connect("mplads.db")

    l1 = pd.read_sql("SELECT constituency, state, house, financial_risk_score, anomaly_flag, sanction_amount, work_status FROM layer1_scores", con)
    l1b = pd.read_sql("SELECT constituency, delay_risk_score FROM layer1b_delay_scores WHERE constituency IS NOT NULL", con)
    l3 = pd.read_sql("""
        SELECT e.constituency, v.collusion_flags
        FROM expenditure_on_completed_and_on_going_wo e
        JOIN layer3_vendor_scores v ON e.vendor_name = v.vendor_name
        WHERE e.constituency IS NOT NULL
    """, con)
    dup = pd.read_sql("SELECT constituency, duplicate_flag, max_similarity FROM layer_duplicate_scores WHERE constituency IS NOT NULL", con)
    spend = pd.read_sql("SELECT constituency, spending_risk_score FROM layer_spending_pattern WHERE constituency IS NOT NULL", con)

    try:
        weather = pd.read_sql("SELECT constituency, extreme_days FROM weather_alibi WHERE constituency IS NOT NULL", con)
        has_weather = True
    except:
        has_weather = False

    con.close()

    # Layer 1
    l1_agg = l1.groupby(["constituency","state","house"]).agg(
        avg_financial_risk  = ("financial_risk_score","mean"),
        max_financial_risk  = ("financial_risk_score","max"),
        n_projects          = ("financial_risk_score","count"),
        n_flagged           = ("anomaly_flag", lambda x: (x==-1).sum()),
        total_sanctioned    = ("sanction_amount","sum"),
        n_completed         = ("work_status", lambda x: (x=="Work Completed").sum()),
    ).reset_index()
    l1_agg["flag_rate"]      = (l1_agg["n_flagged"] / l1_agg["n_projects"].clip(1)) * (1 - 1/l1_agg["n_projects"].clip(2))
    l1_agg["completion_rate"] = l1_agg["n_completed"] / l1_agg["n_projects"].clip(1)

    # Layer 1b
    l1b_agg = l1b.groupby("constituency").agg(
        avg_delay_risk = ("delay_risk_score","mean"),
        max_delay_risk = ("delay_risk_score","max"),
    ).reset_index()

    # Layer 3
    l3_agg = l3.groupby("constituency").agg(
        avg_collusion = ("collusion_flags","mean"),
        max_collusion = ("collusion_flags","max"),
    ).reset_index()

    # SBERT duplicates
    dup_agg = dup.groupby("constituency").agg(
        duplicate_count    = ("duplicate_flag","sum"),
        avg_similarity     = ("max_similarity","mean"),
    ).reset_index()
    dup_agg["duplicate_rate"] = dup_agg["duplicate_count"] / dup_agg["duplicate_count"].clip(1)

    # Spending patterns
    spend_agg = spend.groupby("constituency").agg(
        avg_spending_risk = ("spending_risk_score","mean"),
        max_spending_risk = ("spending_risk_score","max"),
    ).reset_index()

    # Weather
    if has_weather:
        weather_agg = weather.groupby("constituency")["extreme_days"].sum().reset_index()
        weather_agg["weather_discount"] = (weather_agg["extreme_days"] * 0.05).clip(0, 10)
    else:
        weather_agg = pd.DataFrame(columns=["constituency","weather_discount"])

    # Merge all
    idx = l1_agg
    idx = idx.merge(l1b_agg,   on="constituency", how="left")
    idx = idx.merge(l3_agg,    on="constituency", how="left")
    idx = idx.merge(dup_agg,   on="constituency", how="left")
    idx = idx.merge(spend_agg, on="constituency", how="left")
    idx = idx.merge(weather_agg[["constituency","weather_discount"]], on="constituency", how="left")

    idx["avg_delay_risk"]     = idx["avg_delay_risk"].fillna(50)
    idx["avg_collusion"]      = idx["avg_collusion"].fillna(0)
    idx["duplicate_count"]    = idx["duplicate_count"].fillna(0)
    idx["avg_spending_risk"]  = idx["avg_spending_risk"].fillna(0)
    idx["weather_discount"]   = idx["weather_discount"].fillna(0)

    # Composite integrity score — all 5 layers
    idx["integrity_score"] = (
        100
        - idx["avg_financial_risk"] * 0.25    # Layer 1 — IsolationForest
        - idx["avg_delay_risk"]     * 0.20    # Layer 1b — XGBoost
        - idx["flag_rate"]          * 15      # Layer 1 flag rate
        - idx["avg_collusion"]      * 8       # Layer 3 — Louvain
        - idx["duplicate_count"]    * 0.5     # SBERT duplicates
        - idx["avg_spending_risk"]  * 0.10    # Spending pattern
        + idx["completion_rate"]    * 8       # reward
        + idx["weather_discount"]             # weather alibi
    ).clip(0, 100).round(2)

    idx["risk_band"] = pd.cut(
        idx["integrity_score"],
        bins=[0, 40, 60, 80, 100],
        labels=["CRITICAL","HIGH","MEDIUM","LOW"]
    )

    con = sqlite3.connect("mplads.db")
    idx.to_sql("layer4_integrity", con, if_exists="replace", index=False)
    con.close()

    print(f"Constituencies scored: {len(idx)}")
    print(f"\nRisk bands:\n{idx['risk_band'].value_counts()}")
    print(f"\nBottom 10:")
    print(idx[["constituency","state","integrity_score","risk_band",
               "avg_financial_risk","avg_delay_risk","duplicate_count","avg_spending_risk"]]
          .nsmallest(10,"integrity_score").to_string())

if __name__ == "__main__":
    compute_integrity_index()