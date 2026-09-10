import sqlite3
import pandas as pd
import networkx as nx
from community import community_louvain

def build_vendor_graph():
    con = sqlite3.connect("mplads.db")
    
    # expenditure table has vendor_name, not projects
    df = pd.read_sql("""
        SELECT vendor_name, hon_ble_members_of_parliament, 
               constituency, state, fund_disbursed_amount
        FROM expenditure_on_completed_and_on_going_wo
        WHERE vendor_name IS NOT NULL 
        AND vendor_name != 'null'
        AND vendor_name != 'nan'
    """, con)
    con.close()

    print(f"Expenditure rows with vendor: {len(df)}")

    df["fund_disbursed_amount"] = pd.to_numeric(df["fund_disbursed_amount"], errors="coerce").fillna(0)

    # Build bipartite graph: vendor <-> MP
    G = nx.Graph()
    for _, row in df.iterrows():
        vendor = str(row["vendor_name"]).strip()
        mp     = str(row["hon_ble_members_of_parliament"]).strip()
        amount = row["fund_disbursed_amount"]
        if not vendor or not mp or vendor == "nan" or mp == "nan":
            continue
        if G.has_edge(vendor, mp):
            G[vendor][mp]["weight"]  += 1
            G[vendor][mp]["amount"]  += amount
        else:
            G.add_edge(vendor, mp, weight=1, amount=amount)

    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # Louvain community detection
    partition = community_louvain.best_partition(G, weight="weight")

    # Cluster sizes
    from collections import Counter
    cluster_sizes = Counter(partition.values())

    # Flag 1: vendors appearing in many constituencies (rotation signal)
    vendor_constituency = df.groupby("vendor_name")["constituency"].nunique()
    multi_constituency_vendors = vendor_constituency[vendor_constituency > 3].index.tolist()

    # Flag 2: vendors with very high total disbursement to one MP (concentration signal)
    vendor_mp_amount = df.groupby(["vendor_name","hon_ble_members_of_parliament"])["fund_disbursed_amount"].sum()
    vendor_total     = df.groupby("vendor_name")["fund_disbursed_amount"].sum()
    concentration    = (vendor_mp_amount / vendor_total).reset_index()
    concentration.columns = ["vendor_name","mp","concentration_ratio"]
    high_concentration = concentration[
    (concentration["concentration_ratio"] > 0.95) &
    (concentration["vendor_name"].map(vendor_total) > 2000000)  # only flag if >20 lakh total
    ]

    # Flag 3: tiny closed clusters (vendor+MP working exclusively together)
    suspicious_nodes = {n for n, c in partition.items() if cluster_sizes[c] <= 3}

    # Save results
    results = []
    for vendor in df["vendor_name"].unique():
        if str(vendor) == "nan":
            continue
        results.append({
            "vendor_name": vendor,
            "cluster_id": partition.get(vendor, -1),
            "num_constituencies": int(vendor_constituency.get(vendor, 0)),
            "total_disbursed": float(vendor_total.get(vendor, 0)),
            "multi_constituency_flag": vendor in multi_constituency_vendors,
            "high_concentration_flag": vendor in high_concentration["vendor_name"].values,
            "small_cluster_flag": vendor in suspicious_nodes,
        })

    results_df = pd.DataFrame(results)
    results_df["collusion_flags"] = (
        results_df["multi_constituency_flag"].astype(int) +
        results_df["high_concentration_flag"].astype(int) +
        results_df["small_cluster_flag"].astype(int)
    )

    con = sqlite3.connect("mplads.db")
    results_df.to_sql("layer3_vendor_scores", con, if_exists="replace", index=False)
    con.close()

    print(f"\nMulti-constituency vendors (>3): {len(multi_constituency_vendors)}")
    print(f"High concentration vendors:      {len(high_concentration)}")
    print(f"Small cluster nodes:             {len(suspicious_nodes)}")
    print(f"\nTop 10 by collusion flags:")
    print(results_df.nlargest(10, "collusion_flags")[
        ["vendor_name","num_constituencies","total_disbursed","collusion_flags"]
    ].to_string())

    return G, partition, results_df

if __name__ == "__main__":
    build_vendor_graph()