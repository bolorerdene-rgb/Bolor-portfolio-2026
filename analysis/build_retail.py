import pandas as pd
import numpy as np
from common import ROOT, dump

raw = pd.read_csv(ROOT / "projects/02-uk-retail-rfm/data/uk_retail.csv", encoding="latin1")
raw["InvoiceDate"] = pd.to_datetime(raw.InvoiceDate, format="%m/%d/%Y %H:%M")
raw["revenue"] = raw.Quantity * raw.UnitPrice
raw["cancel"] = raw.InvoiceNo.astype(str).str.startswith("C")


def r(x, n=2):
    return round(float(x), n)


out = {}
steps = [("Raw rows", len(raw))]

# Returns/cancellations are measured on the raw table, before they are dropped
raw["month"] = raw.InvoiceDate.dt.to_period("M").astype(str)
gross = raw[~raw.cancel & (raw.revenue > 0)].groupby("month").revenue.sum()
ret = -raw[raw.cancel].groupby("month").revenue.sum()
out["returns"] = [{"month": m, "gross": int(gross[m]), "returned": int(ret.get(m, 0)),
                   "return_pct": r(ret.get(m, 0) / gross[m] * 100, 1)} for m in gross.index]

n0 = len(raw)
df = raw.drop_duplicates()
steps.append(("Exact duplicates removed", len(df)))
df = df[~df.cancel]
steps.append(("Cancellation invoices removed", len(df)))
df = df[(df.Quantity > 0) & (df.UnitPrice > 0)]
steps.append(("Negative qty / zero price removed", len(df)))
non_product = ["POST", "D", "M", "DOT", "CRUK", "BANK CHARGES", "AMAZONFEE", "S", "B", "C2", "PADS", "m"]
df = df[~df.StockCode.astype(str).isin(non_product)]
steps.append(("Postage / fees / manual adjustments removed", len(df)))
full = df.copy()                       # sales incl. guest checkouts
df = df.dropna(subset=["CustomerID"])
steps.append(("Missing CustomerID removed", len(df)))
out["cleaning"] = [{"step": s, "rows": int(n)} for s, n in steps]
df["CustomerID"] = df.CustomerID.astype(int)
df["month"] = df.InvoiceDate.dt.to_period("M").astype(str)

last_full = "2011-11"  # December 2011 stops on the 9th
out["kpis"] = {
    "revenue": int(df.revenue.sum()), "customers": int(df.CustomerID.nunique()),
    "orders": int(df.InvoiceNo.nunique()),
    "aov": r(df.groupby("InvoiceNo").revenue.sum().mean(), 1),
    "uk_share": r(df[df.Country == "United Kingdom"].revenue.sum() / df.revenue.sum() * 100, 1),
    "start": str(df.InvoiceDate.min().date()), "end": str(df.InvoiceDate.max().date()),
    "missing_id_pct": r(raw.CustomerID.isna().mean() * 100, 1),
    "missing_id_rev_pct": r(full[full.CustomerID.isna()].revenue.sum() / full.revenue.sum() * 100, 1),
    "rows_kept_pct": r(len(df) / n0 * 100, 1),
}

mo = df.groupby("month").agg(revenue=("revenue", "sum"), orders=("InvoiceNo", "nunique"), customers=("CustomerID", "nunique"))
out["monthly"] = [{"month": m, "revenue": int(v.revenue), "orders": int(v.orders), "customers": int(v.customers),
                   "partial": m > last_full} for m, v in mo.iterrows()]

# ---------- RFM ----------
snap = df.InvoiceDate.max().normalize() + pd.Timedelta(days=1)
cust = df.groupby("CustomerID").agg(recency=("InvoiceDate", lambda s: (snap - s.max()).days),
                                    frequency=("InvoiceNo", "nunique"), monetary=("revenue", "sum"))
cust["R"] = pd.qcut(cust.recency.rank(method="first", ascending=False), 5, labels=[1, 2, 3, 4, 5]).astype(int)
cust["F"] = pd.qcut(cust.frequency.rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
cust["M"] = pd.qcut(cust.monetary.rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)


def seg(x):
    if x.R >= 4 and x.F >= 4: return "Champions"
    if x.R >= 3 and x.F >= 3: return "Loyal"
    if x.R >= 4: return "New & Promising"
    if x.R == 3: return "About to Sleep"
    if x.F >= 3: return "At Risk"
    return "Hibernating"


cust["segment"] = cust.apply(seg, axis=1)
order = ["Champions", "Loyal", "New & Promising", "About to Sleep", "At Risk", "Hibernating"]
tot = cust.monetary.sum()
out["segments"] = [{"segment": s, "customers": int(len(g)), "revenue": int(g.monetary.sum()),
                    "rev_share": r(g.monetary.sum() / tot * 100, 1), "cust_share": r(len(g) / len(cust) * 100, 1),
                    "recency": r(g.recency.mean(), 0), "frequency": r(g.frequency.mean(), 1),
                    "monetary": int(g.monetary.mean())} for s in order for g in [cust[cust.segment == s]]]
samp = cust.sample(700, random_state=7)
out["rfm_points"] = [[int(v.recency), int(v.frequency), int(v.monetary), order.index(v.segment)] for _, v in samp.iterrows()]

srt = cust.monetary.sort_values(ascending=False).values
cum = np.cumsum(srt) / srt.sum() * 100
idx = np.linspace(0, len(srt) - 1, 101).astype(int)
out["pareto"] = [[i, r(cum[j], 1)] for i, j in enumerate(idx)]
out["pareto_facts"] = {"top20_share": r(cum[int(len(srt) * 0.2) - 1], 1), "top10_share": r(cum[int(len(srt) * 0.1) - 1], 1)}

# ---------- Cohort retention ----------
df["cohort"] = df.groupby("CustomerID").InvoiceDate.transform("min").dt.to_period("M")
df["period"] = (df.InvoiceDate.dt.to_period("M") - df.cohort).apply(lambda x: x.n)
coh = df[df.cohort <= "2011-11"].groupby(["cohort", "period"]).CustomerID.nunique().unstack(fill_value=0)
size = coh[0]
ret_tab = coh.div(size, axis=0) * 100
cohorts = [str(c) for c in ret_tab.index]
cells = []
for yi, c in enumerate(ret_tab.index):
    for p in range(ret_tab.shape[1]):
        last_obs = (pd.Period("2011-11", "M") - c).n
        if p <= last_obs:
            cells.append([p, yi, r(ret_tab.loc[c, p], 1)])
out["cohort"] = {"cohorts": cohorts, "sizes": [int(x) for x in size], "cells": cells}
out["cohort_facts"] = {
    "m1_avg": r(ret_tab[1].iloc[:-1].mean(), 1), "m3_avg": r(ret_tab[3].dropna()[ret_tab[3].dropna() > 0].mean(), 1),
    "m12_dec10": r(ret_tab.loc[pd.Period("2010-12", "M"), 12], 1),
    "dec10_size": int(size.iloc[0]),
}

# ---------- Where / what / when ----------
cn = df[df.Country != "United Kingdom"].groupby("Country").revenue.sum().sort_values(ascending=False).head(10)
out["countries"] = [{"country": k, "revenue": int(v)} for k, v in cn.items()]
tp = df.groupby("Description").agg(revenue=("revenue", "sum"), units=("Quantity", "sum")).sort_values("revenue", ascending=False).head(10)
out["products"] = [{"name": k.title(), "revenue": int(v.revenue), "units": int(v.units)} for k, v in tp.iterrows()]
inv = df.groupby("InvoiceNo").agg(dt=("InvoiceDate", "first"), rev=("revenue", "sum"))
inv["dow"] = inv.dt.dt.dayofweek
inv["hour"] = inv.dt.dt.hour
hm = inv.groupby(["dow", "hour"]).size()
out["heatmap"] = [[int(h), int(d), int(n)] for (d, h), n in hm.items()]
out["days_traded"] = sorted(int(x) for x in inv.dow.unique())
dump("retail", out)
print(out["kpis"]); print(out["cleaning"]); print(out["pareto_facts"], out["cohort_facts"])
print([ (s["segment"], s["cust_share"], s["rev_share"]) for s in out["segments"]])
print("weekdays traded:", out["days_traded"])
