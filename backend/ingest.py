import requests
import pandas as pd
import sqlite3
import pathlib
import json
import time
import re
from datetime import datetime, UTC

DB = pathlib.Path(__file__).parent / "mplads.db"
SESSION_FILE = pathlib.Path(__file__).parent / "session.json"

BASE_URL = "https://mplads.mospi.gov.in"
DASHBOARD_URL = f"{BASE_URL}/digigov/dashboard.html"
API_URL = f"{BASE_URL}/rest/PreLoginDashboardData/getTilesReportData"

HEADERS = {
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Content-Type": "application/json; charset=UTF-8",
    "Origin": BASE_URL,
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
}

DATA_TYPE_KEYS = {
    "works_completed": "Works Completed",
    "works_recommended": "Works Recommended",
    "expenditure": "Expenditure on Completed and On-going Works as on Date",
    "allocated_limit": "Allocated Limit for Hon'ble MPs",
}

HOUSE_COMBOS = {
    ("lok_sabha", "18"): "0,0,0,2,7",
    ("lok_sabha", "17"): "0,0,0,2,5",
    ("rajya_sabha", None): "0,0,0,1",
}


def load_session():
    if SESSION_FILE.exists():
        session = json.loads(SESSION_FILE.read_text())
        if time.time() - session["timestamp"] < 4 * 3600:
            return session["cookies"]
    return None


def save_session(cookies):
    SESSION_FILE.write_text(json.dumps({"cookies": cookies, "timestamp": time.time()}))


def init_session():
    resp = requests.get(DASHBOARD_URL, headers=HEADERS, timeout=30)
    cookies = "; ".join(f"{k}={v}" for k, v in resp.cookies.get_dict().items())
    save_session(cookies)
    return cookies


def fetch(house, data_type, ls_term, cookies, retries=3):
    combo = HOUSE_COMBOS[(house, ls_term)]
    key = DATA_TYPE_KEYS[data_type]
    payload = {"combo": combo, "key": key}
    headers = {**HEADERS, "Cookie": cookies}
    last_err = None
    for attempt in range(retries):
        try:
            resp = requests.post(API_URL, json=payload, headers=headers, timeout=180)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, str):
                data = json.loads(data)
            if isinstance(data, list):
                return data
            for k, v in data.items():
                if key.lower() in k.lower() or k.lower() in key.lower():
                    return v
            return next(iter(data.values()), [])
        except Exception as e:
            last_err = e
            time.sleep(2 ** attempt)
    raise last_err


def parse_amount(val):
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in {"n/a", "null", "--", "-"}:
        return None
    s = s.replace("₹", "").replace(",", "").strip()
    digits = "".join(c for c in s if c.isdigit() or c == ".")
    if not digits:
        return None
    num = float(digits)
    lower = s.lower()
    if "crore" in lower or lower.endswith("cr"):
        num *= 1e7
    elif "lakh" in lower or "lac" in lower:
        num *= 1e5
    return num


def parse_date(series):
    return pd.to_datetime(series, format="%d-%b-%Y", errors="coerce")


def normalize_constituency(val):
    if not val:
        return val
    c = str(val).strip()
    c = re.sub(r"_[A-Z]{2,3}$", "", c)
    c = re.sub(r"\s*\((SC|ST|GEN)\)\s*$", "", c, flags=re.I)
    return c.strip()


def base_clean(records, house, ls_term):
    df = pd.DataFrame(records)
    if df.empty:
        return df
    df = df[df["STATE_NAME"].astype(str).str.len() > 1]
    df = df[df["MP_NAME"].astype(str).str.len() > 1]
    df = df[~df["STATE_NAME"].str.lower().str.contains("total", na=False)]
    df["house"] = house
    df["ls_term"] = ls_term
    if "CONSTITUENCY" in df:
        df["constituency"] = df["CONSTITUENCY"].apply(normalize_constituency)
        df = df.drop(columns=["CONSTITUENCY"])
    if "WORK_ID" in df:
        df = df.rename(columns={"WORK_ID": "work_ref"})
    if "CONSTITUENCY_ID" in df:
        df = df.rename(columns={"CONSTITUENCY_ID": "constituency_id"})
    if "WORK_RECOMMENDATION_DTL_ID" in df:
        df = df.rename(columns={"WORK_RECOMMENDATION_DTL_ID": "work_id"})
    df = df.rename(columns={"STATE_NAME": "state", "MP_NAME": "mp_name"})
    return df.loc[:, ~df.columns.duplicated()]


def transform_allocated_limit(records, house, ls_term):
    df = base_clean(records, house, ls_term)
    if df.empty:
        return df
    df["allocated_amount"] = df["ALLOCATED_AMT"].apply(parse_amount)
    return df


def transform_expenditure(records, house, ls_term):
    df = base_clean(records, house, ls_term)
    if df.empty:
        return df
    amt_col = "FUND_DISBURSED_AMT" if "FUND_DISBURSED_AMT" in df else "EXPENDITURE_AMOUNT"
    df["expenditure_amount"] = df[amt_col].apply(parse_amount)
    df["expenditure_date"] = parse_date(df["EXPENDITURE_DATE"])
    df["work"] = df.get("ACTIVITY_NAME")
    df["vendor"] = df.get("VENDOR_NAME")
    df["payment_status"] = df.get("WORK_STATUS", df.get("PAYMENT_STATUS"))
    return df


def transform_works_completed(records, house, ls_term):
    df = base_clean(records, house, ls_term)
    if df.empty:
        return df
    df["completed_date"] = parse_date(df["ACTUAL_END_DATE"])
    df["final_amount"] = df["ACTUAL_AMOUNT"].apply(parse_amount)
    df["work_category"] = df.get("WORK_CATEGORY")
    return df


def transform_works_recommended(records, house, ls_term):
    df = base_clean(records, house, ls_term)
    if df.empty:
        return df
    df["recommended_amount"] = df["RECOMMENDED_AMOUNT"].apply(parse_amount)
    if "SANCTION_AMOUNT" in df:
        df["sanction_amount"] = df["SANCTION_AMOUNT"].apply(parse_amount)
    if "SANCTION_DATE" in df:
        df["sanction_date"] = parse_date(df["SANCTION_DATE"])
    df["recommendation_date"] = parse_date(df["RECOMMENDATION_DATE"])
    df["work_category"] = df.get("WORK_CATEGORY")
    return df


TRANSFORMS = {
    "allocated_limit": transform_allocated_limit,
    "expenditure": transform_expenditure,
    "works_completed": transform_works_completed,
    "works_recommended": transform_works_recommended,
}

HOUSES = [("lok_sabha", "18"), ("lok_sabha", "17"), ("rajya_sabha", None)]


def fetch_all(cookies):
    tables = {}
    for data_type, transform in TRANSFORMS.items():
        frames = []
        for house, ls_term in HOUSES:
            records = fetch(house, data_type, ls_term, cookies)
            house_label = "Lok Sabha" if house == "lok_sabha" else "Rajya Sabha"
            frames.append(transform(records, house_label, ls_term))
            time.sleep(1)
        tables[data_type] = pd.concat(frames, ignore_index=True)
    return tables


def dedupe_case_insensitive(df):
    best = {}
    for c in df.columns:
        key = c.lower()
        if key not in best or (best[key].isupper() and not c.isupper()):
            best[key] = c
    return df.loc[:, list(dict.fromkeys(best.values()))]


def write_db(tables, status):
    con = sqlite3.connect(DB)
    for name, df in tables.items():
        if df is not None and not df.empty:
            dedupe_case_insensitive(df).to_sql(name, con, if_exists="replace", index=False)
    con.execute(
        "CREATE TABLE IF NOT EXISTS ingest_meta (id INTEGER PRIMARY KEY AUTOINCREMENT, fetched_at TEXT, status TEXT)"
    )
    con.execute(
        "INSERT INTO ingest_meta (fetched_at, status) VALUES (?, ?)",
        (datetime.now(UTC).isoformat(), status),
    )
    con.commit()
    con.close()


def run():
    cookies = load_session() or init_session()
    try:
        tables = fetch_all(cookies)
        write_db(tables, "live")
    except Exception:
        cookies = init_session()
        tables = fetch_all(cookies)
        write_db(tables, "live")


if __name__ == "__main__":
    run()