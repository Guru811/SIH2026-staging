from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd

app = FastAPI(title="Zero Artifacts — MPLADS API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def query(sql, params=()):
    con = sqlite3.connect("mplads.db")
    df = pd.read_sql(sql, con, params=params)
    con.close()
    return df.where(pd.notnull(df), None)


@app.get("/api/top-risks")
def top_risks(limit: int = 20):
    df = query("""
        SELECT state, constituency, work_category,
               sanction_amount, financial_risk_score, work_status
        FROM layer1_scores
        WHERE financial_risk_score IS NOT NULL
        ORDER BY financial_risk_score DESC
        LIMIT ?
    """, (limit,))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")


@app.get("/api/integrity-index")
def integrity_index():
    df = query("""
        SELECT constituency, state, house, integrity_score, risk_band,
               avg_financial_risk, avg_delay_risk, flag_rate, 
               n_projects, completion_rate, avg_collusion, total_sanctioned
        FROM layer4_integrity
        ORDER BY integrity_score ASC
    """)
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")


@app.get("/api/projects/{constituency}")
def constituency_projects(constituency: str):
    df = query("""
        SELECT state, constituency, work, work_category,
               sanction_amount, work_status, financial_risk_score, anomaly_flag
        FROM layer1_scores
        WHERE constituency LIKE ?
        ORDER BY financial_risk_score DESC
        LIMIT 100
    """, (f"%{constituency}%",))
    return df.to_dict(orient="records")


@app.get("/api/states")
def states():
    df = query("SELECT DISTINCT state FROM layer4_integrity ORDER BY state")
    return df["state"].tolist()

@app.get("/api/vendor-risks")
def vendor_risks(limit: int = 200):
    df = query("""
        SELECT vendor_name,
               num_constituencies as constituencies_served,
               total_disbursed,
               collusion_flags,
               CASE
                   WHEN collusion_flags >= 4 THEN 'CRITICAL'
                   WHEN collusion_flags >= 2 THEN 'HIGH'
                   WHEN collusion_flags = 1 THEN 'MEDIUM'
                   ELSE 'LOW'
               END as risk_level
        FROM layer3_vendor_scores
        ORDER BY collusion_flags DESC, total_disbursed DESC
        LIMIT ?
    """, (limit,))
    return df.to_dict(orient="records")


@app.get("/api/vendor-graph")
def vendor_graph():
    df = query("""
        SELECT e.vendor_name, e.hon_ble_members_of_parliament as mp,
               COUNT(*) as weight, SUM(e.fund_disbursed_amount) as amount
        FROM expenditure_on_completed_and_on_going_wo e
        JOIN layer3_vendor_scores v ON e.vendor_name = v.vendor_name
        WHERE v.collusion_flags >= 2
        AND e.vendor_name IS NOT NULL
        AND e.hon_ble_members_of_parliament IS NOT NULL
        GROUP BY e.vendor_name, e.hon_ble_members_of_parliament
    """)
    nodes = list(set(df["vendor_name"].tolist() + df["mp"].tolist()))
    links = df.to_dict(orient="records")
    return {"nodes": [{"id": n} for n in nodes], "links": links}

@app.get("/api/delay-risks")
def delay_risks(limit: int = 20):
    df = query("""
        SELECT state, constituency, work_status,
               days_since_sanction, rec_to_sanction_days,
               sanction_amount, delay_risk_score
        FROM layer1b_delay_scores
        WHERE delay_risk_score IS NOT NULL
        ORDER BY delay_risk_score DESC
        LIMIT ?
    """, (limit,))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")

@app.get("/api/weather-alibi")
def weather_alibi(limit: int = 20):
    df = query("""
        SELECT constituency, state, delay_risk_score,
               extreme_days, weather_alibi_discount,
               adjusted_delay_score, alibi_applied
        FROM weather_alibi
        WHERE alibi_applied = 1
        ORDER BY weather_alibi_discount DESC
        LIMIT ?
    """, (limit,))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")


@app.get("/api/weather/{constituency}")
def constituency_weather(constituency: str):
    df = query("""
        SELECT date, rainfall_mm, weathercode, is_extreme
        FROM weather_events
        WHERE constituency LIKE ?
        ORDER BY date DESC
        LIMIT 365
    """, (f"%{constituency}%",))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")

@app.get("/api/duplicates")
def duplicates(limit: int = 20):
    df = query("""
        SELECT constituency, state, work, work_category,
               sanction_amount, max_similarity, most_similar_ida
        FROM layer_duplicate_scores
        WHERE duplicate_flag = 1
        ORDER BY max_similarity DESC
        LIMIT ?
    """, (limit,))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")


@app.get("/api/spending-patterns")
def spending_patterns(limit: int = 500):
    df = query("""
        SELECT mp, constituency, state,
               march_spending_ratio, bulk_spending_flag,
               spending_risk_score, march_rush_flag
        FROM layer_spending_pattern
        WHERE march_rush_flag = 1 OR bulk_spending_flag = 1
        ORDER BY spending_risk_score DESC
        LIMIT ?
    """, (limit,))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")

@app.get("/api/project-risks")
def project_risks(limit: int = 20):
    df = query("""
        SELECT l1.constituency, l1.state, l1.work as work_description,
               l1.work as work_id, l1.work_category as category,
               l1.sanction_amount, l1.work_status,
               l1.financial_risk_score,
               COALESCE(lb.delay_risk_score, 0) as delay_risk_score,
               COALESCE(lb.days_since_sanction, 0) as days_since_sanction,
               COALESCE(lb.weather_alibi_discount, 0) as weather_alibi_applied,
               (l1.financial_risk_score * 0.6 + COALESCE(lb.delay_risk_score, 0) * 0.4) as composite_risk_score,
               l4.risk_band
        FROM layer1_scores l1
        LEFT JOIN layer1b_delay_scores lb ON l1.work = lb.work AND l1.constituency = lb.constituency
        LEFT JOIN layer4_integrity l4 ON l1.constituency = l4.constituency
        WHERE l1.financial_risk_score IS NOT NULL
        ORDER BY composite_risk_score DESC
        LIMIT ?
    """, (limit,))
    df = df.fillna("").replace([float("inf"), float("-inf")], "")
    return df.to_dict(orient="records")

@app.get("/api/national-stats")
@app.get("/api/national-stats")
def national_stats():
    try:
        df = query("SELECT * FROM national_stats ORDER BY fetched_at DESC LIMIT 1")
        if len(df) > 0:
            df = df.fillna(0).replace([float("inf"), float("-inf")], 0)
            return df.to_dict(orient="records")[0]
    except:
        pass

    # Live fallback — clearly scoped to your 350 constituencies
    return {
        "national_total_allocated":   0,
        "national_total_expenditure": 0,
        "national_fund_utilization":  0,
        "national_total_mps":         774,
        "national_works_completed":   0,
        "national_works_pending":     0,
        "national_completion_rate":   0,
        "national_payment_gap":       0,
        "ml_mps_covered":             350,
        "ml_states_covered":          int(query("SELECT COUNT(DISTINCT state) as n FROM layer4_integrity").iloc[0,0]),
        "ml_projects_analysed":       int(query("SELECT COUNT(*) as n FROM layer1_scores").iloc[0,0]),
        "flagged_anomalies":          int(query("SELECT COUNT(*) as n FROM layer1_scores WHERE anomaly_flag = -1").iloc[0,0]),
        "critical_constituencies":    int(query("SELECT COUNT(*) as n FROM layer4_integrity WHERE risk_band = 'CRITICAL'").iloc[0,0]),
        "duplicate_works":            int(query("SELECT COUNT(*) as n FROM layer_duplicate_scores WHERE duplicate_flag = 1").iloc[0,0]),
        "high_risk_vendors":          int(query("SELECT COUNT(*) as n FROM layer3_vendor_scores WHERE collusion_flags >= 2").iloc[0,0]),
        "march_rush_mps":             int(query("SELECT COUNT(*) as n FROM layer_spending_pattern WHERE march_rush_flag = 1").iloc[0,0]),
        "fetched_at":                 "live",
    }

@app.get("/api/summary")
def summary():
    stats = {
        "total_projects": int(query("SELECT COUNT(*) as n FROM layer1_scores").iloc[0,0]),
        "flagged_anomalies": int(query("SELECT COUNT(*) as n FROM layer1_scores WHERE anomaly_flag = -1").iloc[0,0]),
        "constituencies_scored": int(query("SELECT COUNT(*) as n FROM layer4_integrity").iloc[0,0]),
        "critical_constituencies": int(query("SELECT COUNT(*) as n FROM layer4_integrity WHERE integrity_score < 50").iloc[0,0]),
        "high_risk_vendors": int(query("SELECT COUNT(*) as n FROM layer3_vendor_scores WHERE collusion_flags >= 2").iloc[0,0]),
        "high_delay_risk": int(query("SELECT COUNT(*) as n FROM layer1b_delay_scores WHERE delay_risk_score > 95").iloc[0,0]),
        "states_covered": int(query("SELECT COUNT(DISTINCT state) as n FROM layer4_integrity").iloc[0,0]),
        "duplicate_works": int(query("SELECT COUNT(*) as n FROM layer_duplicate_scores WHERE duplicate_flag = 1").iloc[0,0]),
        "march_rush_mps": int(query("SELECT COUNT(*) as n FROM layer_spending_pattern WHERE march_rush_flag = 1").iloc[0,0]),
        "bulk_spending_mps": int(query("SELECT COUNT(*) as n FROM layer_spending_pattern WHERE bulk_spending_flag = 1").iloc[0,0]),
        "weather_alibi_applied": int(query("SELECT COUNT(*) as n FROM weather_alibi WHERE alibi_applied = 1").iloc[0,0]),
        "constituencies_weather_covered": int(query("SELECT COUNT(DISTINCT constituency) as n FROM weather_events").iloc[0,0]),
    }
    return stats