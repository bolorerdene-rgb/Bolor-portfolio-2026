import pandas as pd
import numpy as np
from common import ROOT, dump

D = ROOT / "projects" / "01-olist-ecommerce" / "data"

orders = pd.read_csv(
    D / "olist_orders_dataset.csv",
    parse_dates=["order_purchase_timestamp", "order_delivered_customer_date", "order_estimated_delivery_date"],
)
customers = pd.read_csv(D / "olist_customers_dataset.csv")
items = pd.read_csv(D / "olist_order_items_dataset.csv")
products = pd.read_csv(D / "olist_products_dataset.csv")
reviews = pd.read_csv(D / "olist_order_reviews_dataset.csv", parse_dates=["review_answer_timestamp"])
payments = pd.read_csv(D / "olist_order_payments_dataset.csv")
translation = pd.read_csv(D / "product_category_name_translation.csv")

# Reviews: some orders have more than one review, keep the most recent answer
reviews = reviews.sort_values("review_answer_timestamp").drop_duplicates("order_id", keep="last")

# One row per order from the item table (first item decides category and seller)
first_item = items.sort_values("order_item_id").drop_duplicates("order_id", keep="first")
first_item = first_item.merge(products[["product_id", "product_category_name"]], on="product_id", how="left")
first_item = first_item.merge(translation, on="product_category_name", how="left")
first_item["category"] = first_item["product_category_name_english"].fillna("unknown")
order_value = items.groupby("order_id").agg(price=("price", "sum"), freight=("freight_value", "sum")).reset_index()

df = (
    orders.merge(customers[["customer_id", "customer_state"]], on="customer_id", how="left")
    .merge(reviews[["order_id", "review_score"]], on="order_id", how="left")
    .merge(first_item[["order_id", "seller_id", "category"]], on="order_id", how="left")
    .merge(order_value, on="order_id", how="left")
)

assert len(df) == len(orders), "a join changed the number of orders"
assert df.order_id.is_unique

d = df[(df.order_status == "delivered") & df.order_delivered_customer_date.notna()].copy()
d["delay"] = (d.order_delivered_customer_date - d.order_estimated_delivery_date).dt.total_seconds() / 86400
d["days"] = (d.order_delivered_customer_date - d.order_purchase_timestamp).dt.total_seconds() / 86400
d["late"] = d.delay > 0
d["month"] = d.order_purchase_timestamp.dt.to_period("M").astype(str)

edges = [-9999, -14, -7, 0, 3, 7, 9999]
labels = ["14+ d early", "7-14 d early", "0-7 d early", "1-3 d late", "3-7 d late", "7+ d late"]
d["bucket"] = pd.cut(d.delay, edges, labels=labels)

rated = d.dropna(subset=["review_score"])


def r(x, n=2):
    return round(float(x), n)


out = {}
out["kpis"] = {
    "delivered_orders": int(len(d)),
    "rated_orders": int(len(rated)),
    "avg_score": r(rated.review_score.mean()),
    "late_pct": r(d.late.mean() * 100, 1),
    "avg_delivery_days": r(d.days.mean(), 1),
    "median_days_early": r(-d.delay.median(), 1),
    "score_on_time": r(rated[~rated.late].review_score.mean()),
    "score_late": r(rated[rated.late].review_score.mean()),
    "gmv": int(d.price.sum()),
}

g = rated.groupby("bucket", observed=True).review_score
out["buckets"] = [
    {"bucket": b, "avg_score": r(g.mean()[b]), "orders": int(g.size()[b]),
     "low_pct": r((rated[rated.bucket == b].review_score <= 2).mean() * 100, 1)}
    for b in labels
]

# Score distribution on-time vs late (share of each star rating), overall and per state
def star_dist(frame):
    res = {}
    for name, sub in (("On time", frame[~frame.late]), ("Late", frame[frame.late])):
        if len(sub) < 15:
            res[name] = None
            continue
        vc = sub.review_score.value_counts(normalize=True).reindex([1, 2, 3, 4, 5]).fillna(0) * 100
        res[name] = [r(v, 1) for v in vc]
        res[name + "_n"] = int(len(sub))
    return res


out["score_dist"] = star_dist(rated)
out["score_dist_by_state"] = {st: star_dist(sub) for st, sub in rated.groupby("customer_state")}

# State filter data for the interactive dashboard
bs = {}
for st, sub in rated.groupby("customer_state"):
    gg = sub.groupby("bucket", observed=True).review_score
    bs[st] = [{"avg_score": r(gg.mean().get(b, np.nan)) if b in gg.mean().index and gg.size()[b] >= 15 else None,
               "orders": int(gg.size().get(b, 0))} for b in labels]
out["buckets_by_state"] = bs

m = d[(d.month >= "2017-01") & (d.month <= "2018-08")].groupby("month")
mr = rated[(rated.month >= "2017-01") & (rated.month <= "2018-08")].groupby("month")
out["monthly"] = [
    {"month": k, "orders": int(m.size()[k]), "late_pct": r(m.late.mean()[k] * 100, 1),
     "avg_score": r(mr.review_score.mean()[k])}
    for k in m.size().index
]

c = rated.groupby("category").agg(orders=("order_id", "count"), avg_score=("review_score", "mean"),
                                  late_pct=("late", lambda s: s.mean() * 100), freight_ratio=("freight", "sum"),
                                  price=("price", "sum"))
c["freight_pct"] = c.freight_ratio / (c.price + c.freight_ratio) * 100
c = c[(c.orders >= 400) & (c.index != "unknown")].sort_values("avg_score")
out["categories"] = [
    {"category": k.replace("_", " "), "orders": int(v.orders), "avg_score": r(v.avg_score),
     "late_pct": r(v.late_pct, 1), "freight_pct": r(v.freight_pct, 1)}
    for k, v in c.iterrows()
]

s = rated.groupby("customer_state").agg(orders=("order_id", "count"), avg_score=("review_score", "mean"),
                                        late_pct=("late", lambda x: x.mean() * 100), days=("days", "mean"))
out["states"] = [
    {"state": k, "orders": int(v.orders), "avg_score": r(v.avg_score), "late_pct": r(v.late_pct, 1),
     "avg_days": r(v.days, 1)}
    for k, v in s.sort_values("orders", ascending=False).iterrows()
]

sel = rated.groupby("seller_id").agg(orders=("order_id", "count"), avg_score=("review_score", "mean"),
                                     late_pct=("late", lambda x: x.mean() * 100))
sel = sel[sel.orders >= 40]
out["sellers"] = [[int(v.orders), r(v.late_pct, 1), r(v.avg_score)] for _, v in sel.iterrows()]

# Histogram of delivery delay (days vs the promised date), overall and per state
edges_h = np.arange(-40, 31, 2)


def hist_counts(frame):
    return [int(x) for x in np.histogram(frame.delay.clip(-40, 30), bins=edges_h)[0]]


out["delay_hist"] = {"from": [int(x) for x in edges_h[:-1]], "all": hist_counts(d),
                     "by_state": {st: hist_counts(sub) for st, sub in d.groupby("customer_state")}}

pay = payments.groupby("payment_type").payment_value.sum().sort_values(ascending=False)
out["payments"] = [{"type": k.replace("_", " "), "value": int(v)} for k, v in pay.items() if v > 0 and k != "not_defined"]

# Data-quality facts quoted in the write-up
out["facts"] = {
    "orders_total": int(len(orders)),
    "orders_not_delivered": int((orders.order_status != "delivered").sum()),
    "delivered_missing_date": int(((orders.order_status == "delivered") & orders.order_delivered_customer_date.isna()).sum()),
    "orders_multi_review": int((pd.read_csv(D / "olist_order_reviews_dataset.csv").groupby("order_id").size() > 1).sum()),
    "orders_no_review": int(d.review_score.isna().sum()),
    "products_no_category": int(products.product_category_name.isna().sum()),
    "geo_rows": 1000163,
}
dump("olist", out)
print(out["kpis"])
print(out["facts"])
