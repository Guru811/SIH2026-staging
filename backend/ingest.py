import pandas as pd
import sqlite3
import pathlib

DATA = pathlib.Path("../data")
DB = pathlib.Path("mplads.db")

def load(path, house):
    df = pd.read_csv(path, low_memory=False)
    df.columns = (df.columns.str.strip().str.lower()
                  .str.replace(r"[^\w]+", "_", regex=True).str.strip("_"))
    df = df.replace("null", pd.NA)
    df["house"] = house
    return df

def clean_money(df, cols):
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.replace(r"[^\d.]", "", regex=True),
                errors="coerce")
    return df

def clean_dates(df, cols):
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
    return df

lok   = load(DATA / "lok_sabha_combined.csv",   "Lok Sabha")
rajya = load(DATA / "rajya_sabha_combined.csv", "Rajya Sabha")
df    = pd.concat([lok, rajya], ignore_index=True)

clean_money(df, ["sanction_amount", "fund_disbursed_amount", "amount_disbursed",
                  "recommended_amount", "allocated_amount", "consent_amount"])
clean_dates(df, ["sanction_date", "recommended_date", "expenditure_date",
                  "completion_date", "date_of_consent"])

con = sqlite3.connect(DB)

# Save each report type as its own table
for rt, group in df.groupby("report_type"):
    tbl = rt.lower().strip().replace(" ", "_").replace("-", "_")[:40]
    group.to_sql(tbl, con, if_exists="replace", index=False)
    print(f"Saved {len(group):>6} rows -> table '{tbl}'")

con.close()
print("Done.")