import { h } from "./layout.js";
import { loadJSON, n0 } from "./fmt.js";
import { addCard, base, catAxis, valAxis, legendStyle, tipHead, tipRow, mix } from "./charts.js";
import { projectPage, showError } from "./projectPage.js";
import { olistText } from "./content.js";

const f1 = (v) => (v == null ? "n/a" : v.toFixed(2));

async function init() {
  const d = await loadJSON("olist");
  const k = d.kpis;
  const { filters, dash } = projectPage("olist", olistText, d, [
    { value: n0(k.delivered_orders), label: "Delivered orders analyzed", note: "2016 to 2018" },
    { value: `${k.avg_score} / 5`, label: "Average review score" },
    { value: `${k.late_pct}%`, label: "Delivered after the promised date" },
    { value: `${(k.score_on_time - k.score_late).toFixed(2)} stars`, label: "Score gap, on time vs. late" },
    { value: `${k.median_days_early} days`, label: "Median delivery before the promise", note: "estimates are padded" },
  ]);

  let state = "ALL";
  const labels = d.buckets.map((b) => b.bucket);

  // ----- filter row (scopes the first three charts) -----
  const select = h("select", { id: "state", "aria-label": "Customer state" },
    h("option", { value: "ALL" }, "All states"),
    d.states.map((s) => h("option", { value: s.state }, `${s.state} (${n0(s.orders)} orders)`)));
  filters.append(
    h("label", {}, "Customer state", select),
    h("span", { class: "hint" }, "Scopes the first three charts. Click a bar in the state chart to filter by it."));

  const bucketRows = () => state === "ALL" ? d.buckets.map((b) => ({ ...b })) : d.buckets_by_state[state].map((b, i) => ({ bucket: labels[i], ...b }));
  const dist = () => (state === "ALL" ? d.score_dist : d.score_dist_by_state[state]);
  const histCounts = () => (state === "ALL" ? d.delay_hist.all : d.delay_hist.by_state[state]);
  const scope = () => (state === "ALL" ? "all states" : state);

  const cards = [];

  cards.push(addCard(dash, {
    title: "Satisfaction holds until a delivery is a few days late, then falls hard",
    sub: "Average review score by how far delivery landed from the promised date. Blue = on or ahead of the promise, orange = late.",
    height: 330,
    build: (t) => {
      const rows = bucketRows();
      const early = rows.map((r, i) => (i < 3 ? r.avg_score : null));
      const late = rows.map((r, i) => (i >= 3 ? r.avg_score : null));
      const mk = (name, data, color) => ({
        name, type: "bar", stack: "s", data, barWidth: "46%", itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: t.ink, fontSize: 12, fontWeight: 600, formatter: (p) => (p.value == null ? "" : p.value.toFixed(2)) },
        emphasis: { itemStyle: { color } },
      });
      return {
        ...base(t),
        legend: legendStyle(t),
        grid: { top: 36, left: 40, right: 12, bottom: 28 },
        xAxis: catAxis(t, { data: labels, axisLabel: { color: t.muted, fontSize: 11, interval: 0, formatter: (v) => v.replace(" d ", " d\n") } }),
        yAxis: valAxis(t, { min: 0, max: 5, interval: 1 }),
        tooltip: {
          ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
          formatter: (ps) => {
            const p = ps.find((x) => x.value != null); if (!p) return "";
            const r = rows[p.dataIndex];
            return tipHead(`${p.name} · ${scope()}`) + tipRow(p.color, "average score", f1(r.avg_score)) +
              `<div style="margin-top:4px;opacity:.7">${n0(r.orders)} orders</div>`;
          },
        },
        series: [mk("On time or early", early, t.s[0]), mk("Late", late, t.s[1])],
      };
    },
    table: () => ({
      cols: [{ label: "Delivery vs. promise" }, { label: "Orders", num: 1 }, { label: "Avg score", num: 1 }],
      rows: bucketRows().map((r) => [r.bucket, n0(r.orders), f1(r.avg_score)]),
    }),
  }));

  cards.push(addCard(dash, {
    title: "Late orders turn 5 star customers into 1 star customers",
    sub: "Share of reviews at each star rating, on time vs. late orders (100% each).",
    height: 330,
    build: (t) => {
      const D = dist();
      const colors = [t.dvNeg, mix(t.dvNeg, t.dvMid, 0.55), t.dvMid, mix(t.dvPos, t.dvMid, 0.45), t.dvPos];
      const groups = ["On time", "Late"].filter((g) => D[g]);
      return {
        ...base(t),
        legend: legendStyle(t, { itemWidth: 14, itemHeight: 8, data: [1, 2, 3, 4, 5].map((n) => `${n} star${n > 1 ? "s" : ""}`) }),
        grid: { top: 40, left: 64, right: 16, bottom: 26 },
        xAxis: valAxis(t, { max: 100, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
        yAxis: catAxis(t, { data: groups, inverse: true, axisLabel: { color: t.ink2, fontSize: 12 } }),
        tooltip: {
          ...base(t).tooltip, trigger: "item",
          formatter: (p) => tipHead(`${p.name} orders · ${scope()}`) + tipRow(p.color, p.seriesName, `${p.value}%`) +
            `<div style="margin-top:4px;opacity:.7">${n0(D[p.name + "_n"])} reviews</div>`,
        },
        series: [1, 2, 3, 4, 5].map((n, i) => ({
          name: `${n} star${n > 1 ? "s" : ""}`, type: "bar", stack: "d", barWidth: 38,
          data: groups.map((g) => D[g][i]),
          itemStyle: { color: colors[i], borderColor: t.surface, borderWidth: 2 },
          label: { show: true, color: i === 2 ? t.ink : "#fff", fontSize: 11, formatter: (p) => (p.value >= 6 ? `${Math.round(p.value)}%` : "") },
          emphasis: { focus: "series" },
        })),
      };
    },
    table: () => {
      const D = dist();
      return {
        cols: [{ label: "Orders" }, ...[1, 2, 3, 4, 5].map((n) => ({ label: `${n}★ %`, num: 1 })), { label: "Reviews", num: 1 }],
        rows: ["On time", "Late"].map((g) => [g, ...(D[g] ? D[g].map((v) => v.toFixed(1)) : Array(5).fill(null)), D[g] ? n0(D[g + "_n"]) : null]),
      };
    },
  }));

  cards.push(addCard(dash, {
    title: "Most orders arrive almost two weeks early; the late tail is thin but costly",
    sub: "Orders by days from the promised date (negative = early). Delivery estimates are padded, so a late order is the exception.",
    height: 300, cls: "w12",
    build: (t) => {
      const counts = histCounts();
      const from = d.delay_hist.from;
      const last = from.length - 1;
      const cats = from.map((x, i) => (i === last ? `${x}+` : i === 0 ? `≤${x + 2}` : String(x)));
      return {
        ...base(t),
        grid: { top: 24, left: 52, right: 16, bottom: 36 },
        xAxis: catAxis(t, { data: cats, name: "Days vs. promised date", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: t.muted }, axisLabel: { color: t.muted, fontSize: 11, interval: 2 } }),
        yAxis: valAxis(t, { name: "Orders", nameTextStyle: { color: t.muted, align: "left" } }),
        tooltip: {
          ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
          formatter: (ps) => {
            const p = ps[0]; const i = p.dataIndex; const lo = from[i];
            const range = i === from.length - 1 ? `${lo}+ days late` : i === 0 ? `${-(lo + 2)}+ days early` : `${lo} to ${lo + 2} days vs. promise`;
            return tipHead(`${range} · ${scope()}`) + tipRow(p.color, "orders", n0(p.value));
          },
        },
        series: [{
          type: "bar", barWidth: "88%",
          data: counts.map((v, i) => ({ value: v, itemStyle: { color: from[i] >= 0 ? t.s[1] : t.s[0], borderRadius: [3, 3, 0, 0] } })),
          markLine: {
            symbol: "none", silent: true, lineStyle: { color: t.ink2, width: 1, type: "solid" },
            label: { formatter: "Promised date", color: t.ink2, fontSize: 11, position: "end" },
            data: [{ xAxis: from.indexOf(0) - 0.5 }],
          },
        }],
      };
    },
    table: () => ({
      cols: [{ label: "Days vs. promise (from)", num: 1 }, { label: "Orders", num: 1 }],
      rows: d.delay_hist.from.map((x, i) => [i === d.delay_hist.from.length - 1 ? `${x}+` : i === 0 ? `≤${x + 2}` : x, n0(histCounts()[i])]),
    }),
  }));

  // ----- second group: whole dataset -----
  dash.append(h("h3", { class: "section-title", style: "grid-column:1/-1;margin-top:18px;font-size:20px" }, "Across the whole marketplace"));

  const months = d.monthly.map((m) => m.month);
  cards.push(addCard(dash, {
    title: "The months with late delivery spikes (Nov 2017, Feb to Mar 2018) are the months with the lowest review scores",
    sub: "Three views of the same months, stacked so each keeps its own scale.",
    height: 520, cls: "w12",
    build: (t) => {
      const grid = (top, height) => ({ top, height, left: 54, right: 16 });
      const ax = (i, show) => catAxis(t, { gridIndex: i, data: months, axisLabel: { show, color: t.muted, fontSize: 11, interval: 2 } });
      const ay = (i, name, extra = {}) => valAxis(t, { gridIndex: i, name, nameLocation: "end", nameGap: 8, nameTextStyle: { color: t.ink2, fontSize: 12, align: "left" }, ...extra });
      return {
        ...base(t),
        axisPointer: { link: [{ xAxisIndex: "all" }] },
        grid: [grid(34, 110), grid(214, 110), grid(394, 90)],
        xAxis: [ax(0, false), ax(1, false), ax(2, true)],
        yAxis: [ay(0, "Orders per month"), ay(1, "Late deliveries (%)", { axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }), ay(2, "Avg review score", { min: 3, max: 5, interval: 1 })],
        tooltip: {
          ...base(t).tooltip, trigger: "axis",
          formatter: (ps) => {
            const m = d.monthly[ps[0].dataIndex];
            return tipHead(m.month) + tipRow(t.s[0], "orders", n0(m.orders)) + tipRow(t.s[1], "late", `${m.late_pct}%`) + tipRow(t.s[2], "avg score", f1(m.avg_score));
          },
        },
        series: [
          { type: "bar", xAxisIndex: 0, yAxisIndex: 0, data: d.monthly.map((m) => m.orders), barWidth: "52%", itemStyle: { color: t.s[0], borderRadius: [3, 3, 0, 0] } },
          { type: "line", xAxisIndex: 1, yAxisIndex: 1, data: d.monthly.map((m) => m.late_pct), symbol: "circle", symbolSize: 6, lineStyle: { width: 2, color: t.s[1] }, itemStyle: { color: t.s[1], borderColor: t.surface, borderWidth: 2 } },
          { type: "line", xAxisIndex: 2, yAxisIndex: 2, data: d.monthly.map((m) => m.avg_score), symbol: "circle", symbolSize: 6, lineStyle: { width: 2, color: t.s[2] }, itemStyle: { color: t.s[2], borderColor: t.surface, borderWidth: 2 } },
        ],
      };
    },
    table: () => ({
      cols: [{ label: "Month" }, { label: "Orders", num: 1 }, { label: "Late %", num: 1 }, { label: "Avg score", num: 1 }],
      rows: d.monthly.map((m) => [m.month, n0(m.orders), m.late_pct, f1(m.avg_score)]),
    }),
  }));

  const low = d.categories.slice(0, 10);
  cards.push(addCard(dash, {
    title: "Which product categories are rated lowest?",
    sub: `The ten lowest rated categories with 400+ rated orders. Axis starts at 3 to make the gaps visible.`,
    height: 360,
    build: (t) => ({
      ...base(t),
      grid: { top: 12, left: 8, right: 30, bottom: 26, containLabel: true },
      xAxis: valAxis(t, { min: 3, max: 4.6, interval: 0.4 }),
      yAxis: catAxis(t, { data: low.map((c) => c.category), inverse: true, axisLabel: { color: t.ink2, fontSize: 12, width: 120, overflow: "break" }, splitLine: { show: true, lineStyle: { color: t.grid } } }),
      tooltip: {
        ...base(t).tooltip, trigger: "item",
        formatter: (p) => { const c = low[p.dataIndex]; return tipHead(c.category) + tipRow(t.s[0], "avg score", f1(c.avg_score)) + `<div style="margin-top:4px;opacity:.7">${n0(c.orders)} orders · ${c.late_pct}% late · freight ${c.freight_pct}% of spend</div>`; },
      },
      series: [{ type: "scatter", data: low.map((c) => c.avg_score), symbolSize: 14, itemStyle: { color: t.s[0], borderColor: t.surface, borderWidth: 2 }, label: { show: true, position: "right", color: t.ink2, fontSize: 11, formatter: (p) => f1(p.value) } }],
    }),
    table: () => ({
      cols: [{ label: "Category" }, { label: "Orders", num: 1 }, { label: "Avg score", num: 1 }, { label: "Late %", num: 1 }, { label: "Freight % of spend", num: 1 }],
      rows: d.categories.map((c) => [c.category, n0(c.orders), f1(c.avg_score), c.late_pct, c.freight_pct]),
    }),
  }));

  const byLate = [...d.states].sort((a, z) => z.late_pct - a.late_pct);
  const stateCard = addCard(dash, {
    title: "Late deliveries cluster in the northeast and in Rio de Janeiro",
    sub: "Late delivery rate by customer state. Orange = the state selected in the filter. Click a bar to filter.",
    height: 360,
    build: (t) => ({
      ...base(t),
      grid: { top: 16, left: 44, right: 12, bottom: 28 },
      xAxis: catAxis(t, { data: byLate.map((s) => s.state), axisLabel: { color: t.muted, fontSize: 10, interval: 0 } }),
      yAxis: valAxis(t, { axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
      tooltip: {
        ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => { const s = byLate[ps[0].dataIndex]; return tipHead(`${s.state} · ${n0(s.orders)} orders`) + tipRow(t.s[0], "late", `${s.late_pct}%`) + tipRow(t.s[2], "avg score", f1(s.avg_score)) + tipRow(t.gray, "avg delivery days", s.avg_days); },
      },
      series: [{
        type: "bar", barWidth: "62%",
        data: byLate.map((s) => ({ value: s.late_pct, itemStyle: { color: s.state === state ? t.s[1] : t.s[0], borderRadius: [3, 3, 0, 0] } })),
      }],
    }),
    table: () => ({
      cols: [{ label: "State" }, { label: "Orders", num: 1 }, { label: "Late %", num: 1 }, { label: "Avg score", num: 1 }, { label: "Avg delivery (days)", num: 1 }],
      rows: byLate.map((s) => [s.state, n0(s.orders), s.late_pct, f1(s.avg_score), s.avg_days]),
    }),
  });
  cards.push(stateCard);

  // simple least-squares trend for the seller scatter
  const pts = d.sellers;
  const mx = pts.reduce((a, p) => a + p[1], 0) / pts.length, my = pts.reduce((a, p) => a + p[2], 0) / pts.length;
  const slope = pts.reduce((a, p) => a + (p[1] - mx) * (p[2] - my), 0) / pts.reduce((a, p) => a + (p[1] - mx) ** 2, 0);
  const icpt = my - slope * mx;
  const xmax = Math.max(...pts.map((p) => p[1]));
  cards.push(addCard(dash, {
    title: "Sellers who ship late get worse reviews",
    sub: `Each dot is a seller with 40+ rated orders (${pts.length} sellers); dot size = order volume. The grey line is a straight line fit: roughly ${Math.abs(slope * 10).toFixed(2)} stars lost per 10 points of late rate.`,
    height: 380, cls: "w12",
    build: (t) => ({
      ...base(t),
      grid: { top: 16, left: 52, right: 20, bottom: 40 },
      xAxis: valAxis(t, { name: "Seller late delivery rate (%)", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted }, min: 0, splitLine: { show: false }, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
      yAxis: valAxis(t, { name: "Avg review score", nameTextStyle: { color: t.muted, align: "left" }, min: 1, max: 5, interval: 1 }),
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => (p.seriesType === "scatter" ? tipHead(`Seller with ${n0(p.value[2])} orders`) + tipRow(t.s[0], "avg score", f1(p.value[1])) + `<div style="margin-top:4px;opacity:.7">${p.value[0]}% of orders late</div>` : "") },
      series: [
        {
          type: "scatter", data: pts.map((p) => [p[1], p[2], p[0]]),
          symbolSize: (v) => Math.max(10, Math.min(30, Math.sqrt(v[2]) * 1.1)),
          itemStyle: { color: t.s[0], opacity: 0.55, borderColor: t.surface, borderWidth: 1.5 },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        { type: "line", silent: true, symbol: "none", lineStyle: { color: t.ink2, width: 2 }, data: [[0, icpt], [xmax, icpt + slope * xmax]], z: 1 },
      ],
    }),
    table: () => ({
      cols: [{ label: "Orders", num: 1 }, { label: "Late %", num: 1 }, { label: "Avg score", num: 1 }],
      rows: [...pts].sort((a, z) => z[0] - a[0]).map((p) => [n0(p[0]), p[1], f1(p[2])]),
    }),
  }));

  // wiring
  const refresh = () => {
    select.value = state;
    cards.slice(0, 3).forEach((c) => c.update());
    stateCard.update();
  };
  select.addEventListener("change", () => { state = select.value; refresh(); });
  stateCard.chart.on("click", (p) => {
    const s = byLate[p.dataIndex]?.state;
    state = state === s ? "ALL" : s;
    refresh();
  });
}

init().catch(showError);
