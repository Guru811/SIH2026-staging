import sqlite3
import pandas as pd
import pathlib

DB = pathlib.Path(__file__).parent / "mplads.db"


def build_works_sanctioned(con):
    rec = pd.read_sql("SELECT * FROM works_recommended", con)
    completed_ids = set(pd.read_sql("SELECT work_id FROM works_completed", con)["work_id"].dropna())

    rec["work"] = rec.get("WORK_DESCRIPTION", rec.get("ACTIVITY_NAME"))
    rec["ida"] = rec.get("IDA_NAME")
    rec["recommended_date"] = rec["recommendation_date"]

    rs_mask = rec["house"] == "Rajya Sabha"
    rec.loc[rs_mask, "constituency"] = rec.loc[rs_mask, "state"] + " - " + rec.loc[rs_mask, "mp_name"]

    is_done = rec["work_id"].isin(completed_ids)
    rec["work_status"] = rec.get("WORK_STAGE")
    rec.loc[is_done, "work_status"] = "Work Completed"

    cols = ["state", "constituency", "house", "ida", "work", "work_category",
            "sanction_amount", "recommended_amount", "sanction_date",
            "recommended_date", "work_status", "work_id", "mp_name", "ls_term"]
    out = rec[[c for c in cols if c in rec.columns]]
    out.to_sql("works_sanctioned", con, if_exists="replace", index=False)
    return len(out)


def build_expenditure(con):
    exp = pd.read_sql("SELECT * FROM expenditure", con)
    rs_mask = exp["house"] == "Rajya Sabha"
    exp.loc[rs_mask, "constituency"] = exp.loc[rs_mask, "state"] + " - " + exp.loc[rs_mask, "mp_name"]
    exp = exp.rename(columns={
        "vendor": "vendor_name",
        "mp_name": "hon_ble_members_of_parliament",
        "expenditure_amount": "fund_disbursed_amount",
    })
    cols = ["vendor_name", "hon_ble_members_of_parliament", "constituency",
            "state", "fund_disbursed_amount", "expenditure_date", "house",
            "work_id", "ls_term", "payment_status"]
    out = exp[[c for c in cols if c in exp.columns]]
    out.to_sql("expenditure_on_completed_and_on_going_wo", con, if_exists="replace", index=False)
    return len(out)


def run():
    con = sqlite3.connect(DB)
    n1 = build_works_sanctioned(con)
    n2 = build_expenditure(con)
    con.commit()
    con.close()
    return n1, n2


if __name__ == "__main__":
    run()