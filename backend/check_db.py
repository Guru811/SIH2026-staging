import sqlite3
con = sqlite3.connect('mplads.db')
tables = con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("TABLES:")
for t in tables:
    print(" ", t[0])
    cols = con.execute(f"PRAGMA table_info({t[0]})").fetchall()
    for c in cols:
        print(f"    {c[1]} ({c[2]})")
con.close()