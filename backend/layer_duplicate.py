import sqlite3
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

def run_sbert_duplicate_detection():
    con = sqlite3.connect("mplads.db")
    df = pd.read_sql("""
        SELECT ida, constituency, state, house,
               work, work_category, sanction_amount
        FROM works_sanctioned
        WHERE work IS NOT NULL
    """, con)
    con.close()

    print("Loading SBERT model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Encode all work descriptions
    print(f"Encoding {len(df)} work descriptions...")
    embeddings = model.encode(df["work"].tolist(), batch_size=256, show_progress_bar=True)

    # Pairwise cosine similarity — do per constituency to keep it O(n) manageable
    results = []
    for constituency, group in df.groupby("constituency"):
        idx = group.index.tolist()
        if len(idx) < 2:
            continue
        emb = embeddings[idx]
        sim_matrix = cosine_similarity(emb)
        np.fill_diagonal(sim_matrix, 0)

        for i, orig_idx in enumerate(idx):
            max_sim = sim_matrix[i].max()
            most_similar = idx[int(sim_matrix[i].argmax())]
            results.append({
                "ida": df.loc[orig_idx, "ida"],
                "constituency": constituency,
                "state": df.loc[orig_idx, "state"],
                "work": df.loc[orig_idx, "work"],
                "work_category": df.loc[orig_idx, "work_category"],
                "sanction_amount": df.loc[orig_idx, "sanction_amount"],
                "max_similarity": round(float(max_sim), 3),
                "most_similar_ida": df.loc[most_similar, "ida"],
                "duplicate_flag": max_sim >= 0.95 and df.loc[orig_idx, "ida"] != df.loc[most_similar, "ida"],  # raised from 0.85
            })

    results_df = pd.DataFrame(results)

    con = sqlite3.connect("mplads.db")
    results_df.to_sql("layer_duplicate_scores", con, if_exists="replace", index=False)
    con.close()

    flagged = results_df[results_df["duplicate_flag"]]
    print(f"\nTotal works scored: {len(results_df)}")
    print(f"Duplicate/overlap flagged: {len(flagged)}")
    print(f"\nTop duplicates:")
    print(flagged[["constituency","work","max_similarity","most_similar_ida"]]
          .nlargest(10, "max_similarity").to_string())

    return results_df


def run_march_rush_detection():
    con = sqlite3.connect("mplads.db")
    exp = pd.read_sql("""
        SELECT constituency, state,
               hon_ble_members_of_parliament as mp,
               fund_disbursed_amount, expenditure_date
        FROM expenditure_on_completed_and_on_going_wo
        WHERE expenditure_date IS NOT NULL
        AND fund_disbursed_amount IS NOT NULL
    """, con)
    con.close()

    exp["expenditure_date"] = pd.to_datetime(exp["expenditure_date"], errors="coerce")
    exp["month"] = exp["expenditure_date"].dt.month
    exp["is_march"] = exp["month"] == 3
    exp["fund_disbursed_amount"] = pd.to_numeric(exp["fund_disbursed_amount"], errors="coerce").fillna(0)

    # Per MP: what % of total spending happened in March
    mp_total = exp.groupby("mp")["fund_disbursed_amount"].sum()
    significant_mps = mp_total[mp_total > 500000].index  # only MPs spending >5 lakh total
    exp = exp[exp["mp"].isin(significant_mps)]
    mp_march = exp[exp["is_march"]].groupby("mp")["fund_disbursed_amount"].sum()

    march_ratio = (mp_march / mp_total).fillna(0).reset_index()
    march_ratio.columns = ["mp", "march_spending_ratio"]

    # Flag MPs spending >60% of total in March
    march_ratio["march_rush_flag"] = march_ratio["march_spending_ratio"] > 0.6

    # Also flag: single-month bulk spending (any month >80% of annual)
    mp_monthly = exp.groupby(["mp", "month"])["fund_disbursed_amount"].sum()
    mp_monthly_ratio = (mp_monthly / mp_total).fillna(0).reset_index()
    mp_monthly_ratio.columns = ["mp", "month", "monthly_ratio"]
    bulk_flag = mp_monthly_ratio[mp_monthly_ratio["monthly_ratio"] > 0.9][["mp"]].drop_duplicates()
    bulk_flag["bulk_spending_flag"] = True

    # Merge
    result = march_ratio.merge(bulk_flag, on="mp", how="left")
    result["bulk_spending_flag"] = result["bulk_spending_flag"].fillna(False)

    # Add constituency/state
    mp_meta = exp.groupby("mp")[["constituency","state"]].first().reset_index()
    result = result.merge(mp_meta, on="mp", how="left")

    result["spending_risk_score"] = (
    result["march_spending_ratio"] * 70 +          # march rush is main signal
    result["bulk_spending_flag"].astype(int) * 
    result["march_spending_ratio"] * 30            # bulk only adds if march is also high
    ).clip(0, 100).round(2)

    con = sqlite3.connect("mplads.db")
    result.to_sql("layer_spending_pattern", con, if_exists="replace", index=False)
    con.close()

    print(f"\nMPs analysed: {len(result)}")
    print(f"March rush flagged: {result['march_rush_flag'].sum()}")
    print(f"Bulk spending flagged: {result['bulk_spending_flag'].sum()}")
    print(f"\nTop 10 spending pattern risks:")
    print(result[["mp","constituency","state","march_spending_ratio",
                  "bulk_spending_flag","spending_risk_score"]]
          .nlargest(10, "spending_risk_score").to_string())

    return result


if __name__ == "__main__":
    run_sbert_duplicate_detection()
    run_march_rush_detection()