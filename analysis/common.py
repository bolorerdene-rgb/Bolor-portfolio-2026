import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def dump(name, obj):
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {path.name}: {path.stat().st_size / 1024:.1f} KB")


def month_label(period):
    """'2017-01' or a Period -> 'Jan 2017'."""
    import pandas as pd
    return pd.Period(str(period), "M").strftime("%b %Y")


def day_label(ts, year=True):
    """Timestamp -> 'Apr 12, 2018' (or 'Apr 12')."""
    base = f"{ts:%b} {ts.day}"
    return f"{base}, {ts.year}" if year else base
