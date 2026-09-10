import sqlite3
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

def run_layer1():
    con = sqlite3.connect("mplads.db")
    df = pd.read_sql("SELECT * FROM works_sanctioned", con)
    con.close()

    df["sanction_amount"] = pd.to_numeric(df["sanction_amount"], errors="coerce")

    # Cost deviation from category median — flags inflated project costs
    cat_median = df.groupby("work_category")["sanction_amount"].transform("median")
    df["cost_deviation"] = (df["sanction_amount"] - cat_median).abs() / (cat_median + 1)

    # Disbursement ratio — how much of sanctioned was recommended
    df["recommended_amount"] = pd.to_numeric(df["recommended_amount"], errors="coerce")
    df["recommend_ratio"] = (
        df["recommended_amount"] / df["sanction_amount"].replace(0, pd.NA)
    ).clip(0, 5).fillna(0)

    features = ["sanction_amount", "cost_deviation", "recommend_ratio"]
    sub = df[df["sanction_amount"].notna()].copy()
    X = StandardScaler().fit_transform(sub[features].fillna(0))

    iso = IsolationForest(contamination=0.05, random_state=42, n_estimators=200)
    sub["anomaly_flag"]  = iso.fit_predict(X)
    sub["raw_score"]     = iso.decision_function(X)

    s = sub["raw_score"]
    sub["financial_risk_score"] = ((s - s.max()) / (s.min() - s.max() + 1e-9) * 100).clip(0, 100)

    con = sqlite3.connect("mplads.db")
    sub.to_sql("layer1_scores", con, if_exists="replace", index=False)
    con.close()

    print(f"Scored:   {len(sub)}")
    print(f"Flagged:  {(sub['anomaly_flag'] == -1).sum()}")
    print(f"\nTop 10 highest risk:")
    print(sub[["state","constituency","work_category","sanction_amount",
           "financial_risk_score","work_status"]]
      .nlargest(10, "financial_risk_score").to_string())

    print(f"\nScore distribution:\n{sub['financial_risk_score'].describe()}")
    print(f"\nFlagged sample:\n{sub[sub['anomaly_flag']==-1][['state','constituency','sanction_amount','financial_risk_score']].head(5)}")

def compute_project_risk_score():
    con = sqlite3.connect("mplads.db")

    l1 = pd.read_sql("SELECT rowid, ida, constituency, state, financial_risk_score, anomaly_flag FROM layer1_scores", con)
    l1b = pd.read_sql("SELECT ida, constituency, delay_risk_score FROM layer1b_delay_scores", con)
    dup = pd.read_sql("SELECT ida, constituency, max_similarity, duplicate_flag FROM layer_duplicate_scores", con)

    con.close()

    df = l1.merge(l1b[["ida","delay_risk_score"]], on="ida", how="left")
    df = df.merge(dup[["ida","max_similarity","duplicate_flag"]], on="ida", how="left")

    df["delay_risk_score"]  = pd.to_numeric(df["delay_risk_score"],  errors="coerce").fillna(50)
    df["max_similarity"]    = pd.to_numeric(df["max_similarity"],    errors="coerce").fillna(0)
    df["duplicate_flag"]    = df["duplicate_flag"].fillna(0)
    df["financial_risk_score"] = pd.to_numeric(df["financial_risk_score"], errors="coerce").fillna(0)

    # Composite 0-100 risk score per project
    df["composite_risk_score"] = (
        df["financial_risk_score"] * 0.40 +
        df["delay_risk_score"]     * 0.35 +
        df["max_similarity"]       * 100 * 0.25
    ).clip(0, 100).round(2)

    df["risk_band"] = pd.cut(
        df["composite_risk_score"],
        bins=[0, 30, 60, 80, 100],
        labels=["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    )

    con = sqlite3.connect("mplads.db")
    df[["ida","constituency","state","financial_risk_score","delay_risk_score",
        "max_similarity","duplicate_flag","composite_risk_score","risk_band"]].to_sql(
        "project_risk_scores", con, if_exists="replace", index=False
    )
    con.close()

    print(f"Projects scored: {len(df)}")
    print(f"\nRisk bands:\n{df['risk_band'].value_counts()}")
    print(f"\nTop 10 highest risk projects:")
    print(df[["ida","constituency","state","composite_risk_score","risk_band"]]
          .nlargest(10,"composite_risk_score").to_string())

if __name__ == "__main__":
    run_layer1()
    compute_project_risk_score()