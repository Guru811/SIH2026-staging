import sqlite3
con = sqlite3.connect('mplads.db')
tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print(tables)
print(con.execute("SELECT * FROM ingest_meta").fetchall())
for t in ['allocated_limit', 'expenditure', 'works_completed', 'works_recommended']:
    n = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(t, n)