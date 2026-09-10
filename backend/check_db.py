import json
with open("../data/empowered_indian_stats.json") as f:
    ei = json.load(f)
    ei = ei["data"]
print(ei.keys())
print(ei)