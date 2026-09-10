import sqlite3
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import shap


def explain_top_risks(model, X, features):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    for i in range(len(X)):
        contributions = dict(zip(features, shap_values[i]))
        ranked = sorted(contributions.items(), key=lambda x: -abs(x[1]))
        print(f"\nProject {i+1} — top SHAP drivers:")
        for feat, val in ranked:
            print(f"  {feat}: {val:+.3f} ({'↑ delay' if val > 0 else '↓ delay'})")


def run_layer1b():
    con = sqlite3.connect("mplads.db")
    df = pd.read_sql("""
        SELECT sanction_date, recommended_date, work_status,
               sanction_amount, work_category, state, constituency, ida
        FROM works_sanctioned
        WHERE sanction_date IS NOT NULL
        AND work_status NOT IN ('41,68,85,88,792.88', '17,10,69,77,734.87')
    """, con)
    con.close()

    df["completed"] = (df["work_status"] == "Work Completed").astype(int)
    df["sanction_date"]    = pd.to_datetime(df["sanction_date"], errors="coerce")
    df["recommended_date"] = pd.to_datetime(df["recommended_date"], errors="coerce")

    today = pd.Timestamp("2026-09-05")
    df["rec_to_sanction_days"] = (df["sanction_date"] - df["recommended_date"]).dt.days.fillna(0).clip(0, 1000)
    df["days_since_sanction"]  = (today - df["sanction_date"]).dt.days.fillna(0).clip(0, 2000)
    df["sanction_amount"]      = pd.to_numeric(df["sanction_amount"], errors="coerce").fillna(0)
    df["category_code"]        = df["work_category"].astype("category").cat.codes
    df["state_code"]           = df["state"].astype("category").cat.codes

    features = ["sanction_amount", "rec_to_sanction_days", "days_since_sanction", "category_code", "state_code"]
    X = df[features]
    y = df["completed"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42, eval_metric="logloss")
    model.fit(X_train, y_train)

    print("Classification Report:")
    print(classification_report(y_test, model.predict(X_test)))

    df["delay_probability"] = model.predict_proba(X)[:, 0]
    df["delay_risk_score"]  = (df["delay_probability"] * 100).round(2)

    con = sqlite3.connect("mplads.db")
    df[["ida", "constituency", "state", "work_status",
        "sanction_amount", "days_since_sanction",
        "rec_to_sanction_days", "delay_risk_score"]].to_sql(
        "layer1b_delay_scores", con, if_exists="replace", index=False)
    con.close()

    print(f"\nScored: {len(df)}")
    print(f"\nTop 10 delay risks:")
    print(df[["state","constituency","work_status","days_since_sanction","delay_risk_score"]]
          .nlargest(10, "delay_risk_score").to_string())

    return model, X, df, features


if __name__ == "__main__":
    model, X, df, features = run_layer1b()
    top5 = df.nlargest(5, "delay_risk_score")
    explain_top_risks(model, X.loc[top5.index], features)