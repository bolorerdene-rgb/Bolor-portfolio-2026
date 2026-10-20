import pandas as pd
import numpy as np
from common import ROOT, dump, day_label

H = pd.Timedelta
raw = pd.read_csv(ROOT / "projects/03-pump-predictive-maintenance/data/sensor.csv", index_col=0, parse_dates=["timestamp"]).set_index("timestamp")
st = raw.pop("machine_status")
miss = (raw.isna().mean() * 100).round(1)
df = raw.drop(columns=["sensor_15"])                      # 100% empty
df = df.interpolate(limit=60, limit_direction="both").ffill().bfill()
fails = list(st.index[st == "BROKEN"])


def r(x, n=1):
    return round(float(x), n)


# normal operating reference: NORMAL status, excluding the 72 h run-up to every failure
pre = pd.Series(False, index=df.index)
for f in fails:
    pre |= (df.index >= f - H(hours=72)) & (df.index <= f)
clean = (st == "NORMAL") & ~pre
sd = ((df[clean].quantile(.75) - df[clean].quantile(.25)) / 1.349)
keep = sd.index[sd > 0]
sd = sd[keep]
med = df.loc[clean, keep].median()

# drift = how far a sensor's last 30 min sits from its own median of the window 30 h..6 h earlier
fast = df[keep].rolling(30, min_periods=15).mean()
base = df[keep].rolling(24 * 60, min_periods=600).median().shift(6 * 60)
dev = ((fast - base) / sd).abs()
recovering = (st == "RECOVERING").rolling(12 * 60, min_periods=1).max().astype(bool)
mask = recovering | (df.index < df.index[0] + H(hours=30))

RECENT = 12  # an alert only counts as a warning if it is still active in the final 12 hours


def make_flag(thr, k):
    c = (dev > thr).sum(axis=1).where(~mask)
    return c, (c >= k).astype(float).rolling(30, min_periods=1).min().astype(bool)


def episodes(flag_series, ok):
    f = flag_series & ok
    starts = f[f & ~f.shift(fill_value=False)].index
    eps = []
    for s_ in starts:
        if not eps or s_ - eps[-1] > H(hours=6):
            eps.append(s_)
    return eps


ok = clean & ~mask
days_ok = ok.sum() / 1440
out = {"window_h": RECENT}

# ---- sweep of alert settings (shown on the page so nobody has to trust one lucky setting)
sweep = []
for thr in (3, 4, 6):
    for k in (3, 5, 8, 12):
        _, fl = make_flag(thr, k)
        n_ep = len(episodes(fl, ok))
        hit_list = [bool(fl.loc[f - H(hours=RECENT):f].any()) for f in fails]
        wins, have = 0, 0
        for t in pd.date_range(df.index[0] + H(hours=30), df.index[-1] - H(hours=RECENT), freq="3h"):
            if ok.loc[t:t + H(hours=RECENT)].all():
                wins += 1
                have += bool(fl.loc[t:t + H(hours=RECENT)].any())
        sweep.append({"thr": thr, "k": k, "false_per_30d": r(n_ep / days_ok * 30), "hits": sum(hit_list),
                      "chance_pct": r(have / max(wins, 1) * 100, 0), "hit_pct": r(sum(hit_list) / len(fails) * 100, 0),
                      "which": [i + 1 for i, h_ in enumerate(hit_list) if h_]})
out["sweep"] = sweep

# Selection rule, stated up front on the page: most failures caught while the chance rate stays under 20%
eligible = [x for x in sweep if x["chance_pct"] < 20]
chosen = sorted(eligible, key=lambda x: (-x["hits"], x["false_per_30d"]))[0]
out["chosen"] = chosen
THR, K = chosen["thr"], chosen["k"]
cnt, flag = make_flag(THR, K)

# ---- failures table: lead time = start of the alert episode that is still active in the final window
rec_rows = (st == "RECOVERING")
failures = []
for i, f in enumerate(fails):
    nxt = st.loc[f:][st.loc[f:] == "NORMAL"].index[0]
    rec_h = (nxt - f).total_seconds() / 3600
    w = flag.loc[f - H(hours=72):f]
    bridged = w.astype(float).rolling(360, min_periods=1).max().astype(bool)   # join gaps shorter than 6 h
    recent_hit = bool(w.loc[f - H(hours=RECENT):].any())
    lead, capped = None, False
    if recent_hit:
        last_true = w[w].index[-1]
        run_start = last_true
        pos = bridged.index.get_loc(last_true)
        while pos > 0 and bridged.iloc[pos - 1]:
            pos -= 1
        run_start = w.index[pos]
        first_true = w.loc[run_start:][w.loc[run_start:]].index[0]
        lead = (f - first_true).total_seconds() / 3600
        capped = pos == 0
    failures.append({"id": i + 1, "time": f.strftime("%b %d %H:%M"), "date": day_label(f, year=False),
                     "recovery_h": r(rec_h), "lead_h": None if lead is None else r(lead),
                     "capped": capped, "hit": recent_hit,
                     "max_drift": int(cnt.loc[f - H(hours=72):f].max())})
out["failures"] = failures

# ---- drift-count trace in the 72 h before each failure (10-minute resolution)
traces = []
for f in fails:
    s = cnt.loc[f - H(hours=72):f].iloc[::10]
    traces.append([[r((x - f).total_seconds() / 3600, 2), int(v) if v == v else 0] for x, v in s.items()])
out["drift_traces"] = traces
out["alert_k"] = K

# ---- per-failure sensor shift heatmap
shift = {}
for i, f in enumerate(fails):
    last = df.loc[f - H(hours=3):f, keep].mean()
    ref = df.loc[f - H(hours=48):f - H(hours=12), keep].median()
    shift[i] = (last - ref) / sd
T = pd.DataFrame(shift)
score = (T.abs() > 1.5).sum(axis=1) * 1000 + T.abs().clip(upper=50).sum(axis=1)
top = list(score.sort_values(ascending=False).index[:12])
out["shift"] = {"sensors": top, "failures": [f["date"] for f in failures],
                "cells": [[j, si, r(max(-25, min(25, T.loc[s, j])))] for si, s in enumerate(top) for j in range(len(fails))],
                "n_shifted": {s: int((T.loc[s].abs() > 1.5).sum()) for s in top}}

# ---- hourly normalised traces around each failure for the explorer
trace_sensors = list(top[:6])
ex = {}
for i, f in enumerate(fails):
    seg = df.loc[f - H(hours=72):f + H(hours=2), trace_sensors]
    z = ((seg - med[trace_sensors]) / sd[trace_sensors]).clip(-25, 25)
    z = z.iloc[::30]
    ex[str(i + 1)] = {"t": [r((x - f).total_seconds() / 3600, 2) for x in z.index],
                      **{s: [r(v, 2) for v in z[s]] for s in trace_sensors}}
out["explorer"] = {"sensors": trace_sensors, "data": ex}

# ---- status + data quality
vc = st.value_counts()
out["status"] = [{"name": k.title(), "value": int(v)} for k, v in vc.items()]
mm = miss[miss > 0].sort_values(ascending=False).head(12)
out["missing"] = [{"sensor": k, "pct": float(v)} for k, v in mm.items()]
down_h = (vc.get("RECOVERING", 0) + vc.get("BROKEN", 0)) / 60
out["kpis"] = {
    "rows": int(len(raw)), "sensors": 52, "start": day_label(raw.index[0]), "end": day_label(raw.index[-1]),
    "days": int(round(len(raw) / 1440)), "failures": len(fails), "down_h": r(down_h),
    "down_pct": r(down_h * 60 / len(raw) * 100, 1),
    "avg_recovery_h": r(np.mean([x["recovery_h"] for x in failures])),
    "max_recovery_h": r(max(x["recovery_h"] for x in failures)),
    "min_recovery_h": r(min(x["recovery_h"] for x in failures)),
    "empty_sensor": "sensor_15", "sensors_with_gaps": int((miss > 0).sum()),
}
dump("pump", out)
print(out["kpis"]); print(chosen)
for s in sweep: print(s)
for f in failures: print(f)
print(out["shift"]["n_shifted"])
