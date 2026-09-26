import argparse
import subprocess
import sys
import ingest
import build_legacy_tables

STEPS = ["layer1b.py", "layer_duplicate.py", "layer3.py", "weather.py", "layer1.py", "layer4.py"]


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", help="path to a raw JSON dump folder; omit to fetch live")
    args = parser.parse_args()

    if args.raw:
        import backfill_from_raw
        backfill_from_raw.run(args.raw)
    else:
        ingest.run()

    build_legacy_tables.run()

    for step in STEPS:
        result = subprocess.run([sys.executable, step])
        if result.returncode != 0:
            sys.exit(result.returncode)


if __name__ == "__main__":
    run()