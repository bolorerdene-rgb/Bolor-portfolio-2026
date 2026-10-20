import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def dump(name, obj):
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {path.name}: {path.stat().st_size / 1024:.1f} KB")
