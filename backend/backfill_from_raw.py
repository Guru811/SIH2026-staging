import sys
import json
import argparse
import pathlib
from datetime import datetime, UTC
import ingest

FILE_MAP = {
    ("lok_sabha", "18"): "18",
    ("lok_sabha", "17"): "17",
    ("rajya_sabha", None): "rs",
}


def run(raw_dir):
    raw_dir = pathlib.Path(raw_dir)
    tables = {}
    for data_type, transform in ingest.TRANSFORMS.items():
        frames = []
        for (house, ls_term), prefix in FILE_MAP.items():
            path = raw_dir / f"{prefix}_{data_type}.json"
            records = json.loads(path.read_text(encoding="utf-8"))
            house_label = "Lok Sabha" if house == "lok_sabha" else "Rajya Sabha"
            frames.append(transform(records, house_label, ls_term))
        import pandas as pd
        tables[data_type] = pd.concat(frames, ignore_index=True)
    ingest.write_db(tables, "snapshot")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("raw_dir")
    args = parser.parse_args()
    run(args.raw_dir)