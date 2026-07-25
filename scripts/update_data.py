#!/usr/bin/env python3
"""Refresh data/prices.json with live USD prices from CoinGecko.

Runs daily via GitHub Actions so the calculator always has recent
fallback prices even if the visitor's browser cannot reach CoinGecko.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MINING = ROOT / "data" / "mining.json"
PRICES = ROOT / "data" / "prices.json"


def main() -> int:
    mining = json.loads(MINING.read_text(encoding="utf-8"))
    ids = sorted({c["coinGeckoId"] for c in mining["coins"].values() if c.get("coinGeckoId")})
    url = "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=usd".format(",".join(ids))
    req = urllib.request.Request(url, headers={"User-Agent": "rollercoin-calculator-bot"})
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))

    out = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "coingecko",
        "usd": {cid: data[cid]["usd"] for cid in ids if cid in data and "usd" in data[cid]},
    }
    PRICES.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {len(out['usd'])} prices at {out['updatedAt']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
