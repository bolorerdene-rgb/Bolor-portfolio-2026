import { h } from "./layout.js";
import { loadJSON, n0 } from "./fmt.js";
import { addCard, base, catAxis, valAxis, legendStyle, tipHead, tipRow, compact } from "./charts.js";
import { projectPage, showError } from "./projectPage.js";
import { retailText } from "./content.js";

const gbp = (v) => "£" + n0(Math.round(v));
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function init() {
  const d = await loadJSON("retail");
  const k = d.kpis;
  const { filters, dash } = projectPage("retail", retailText, d, [
    { value: "£" + compact(k.revenue), label: "Revenue from identified customers", note: `${k.start} to ${k.end}` },
    { value: n0(k.customers), label: "Customers" },
    { value: n0(k.orders), label: "Orders" },
    { value: gbp(k.aov), label: "Average order value" },
    { value: `${k.uk_share}%`, label: "Revenue from the UK" },
  ]);

  const segNames = d.segments.map((s) => s.segment);
  let hi = "ALL";

  const select = h("select", { id: "seg", "aria-label": "Highlight a customer segment" },
    h("option", { value: "ALL" }, "All segments"), segNames.map((s) => h("option", { value: s }, s)));
  filters.append(
    h("label", {}, "Highlight segment", select),
    h("span", { class: "hint" }, "Re-colors the segment chart and the customer scatter. Click a bar to highlight a segment."));

  const cards = [];

  // ---------- 1. Cleaning ----------
  const steps = d.cleaning.slice(1).map((c, i) => ({ step: c.step, removed: d.cleaning[i].rows - c.rows, left: c.rows }));
  addCard(dash, {
    title: "Missing customer IDs, not bad rows, were the biggest loss in cleaning",
    sub: `Rows removed at each step, from ${n0(d.cleaning[0].rows)} raw rows down to ${n0(d.cleaning.at(-1).rows)} (${k.rows_kept_pct}% kept).`,
    height: 280,
    build: (t) => ({
      ...base(t),
      grid: { top: 8, left: 8, right: 64, bottom: 24, containLabel: true },
      xAxis: valAxis(t, { splitNumber: 3, axisLabel: { color: t.muted, fontSize: 11, formatter: (v) => compact(v) } }),
      yAxis: catAxis(t, { data: steps.map((s) => s.step.replace(" removed", "")), inverse: true, axisLabel: { color: t.ink2, fontSize: 12, width: 130, overflow: "break" } }),
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(steps[p.dataIndex].step) + tipRow(t.s[0], "rows removed", n0(p.value)) + `<div style="margin-top:4px;opacity:.7">${n0(steps[p.dataIndex].left)} rows left</div>` },
      series: [{ type: "bar", barWidth: 18, data: steps.map((s) => s.removed), itemStyle: { color: t.s[0], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: t.ink2, fontSize: 12, formatter: (p) => n0(p.value) } }],
    }),
    table: () => ({
      cols: [{ label: "Step" }, { label: "Rows removed", num: 1 }, { label: "Rows left", num: 1 }],
      rows: [[d.cleaning[0].step, null, n0(d.cleaning[0].rows)], ...steps.map((s) => [s.step, n0(s.removed), n0(s.left)])],
    }),
  });

  // ---------- 2. Monthly revenue ----------
  const mths = d.monthly;
  addCard(dash, {
    title: "Revenue builds into a November peak more than twice the spring months",
    sub: "Monthly revenue from identified customers. The shaded final month is incomplete: the data stops on 9 December 2011.",
    height: 280,
    build: (t) => ({
      ...base(t),
      grid: { top: 16, left: 56, right: 16, bottom: 28 },
      xAxis: catAxis(t, { data: mths.map((m) => m.month), boundaryGap: false, axisLabel: { color: t.muted, fontSize: 11, interval: 1 } }),
      yAxis: valAxis(t, { axisLabel: { color: t.muted, fontSize: 11, formatter: (v) => "£" + compact(v) } }),
      tooltip: { ...base(t).tooltip, trigger: "axis", formatter: (ps) => { const m = mths[ps[0].dataIndex]; return tipHead(m.month + (m.partial ? " (partial month)" : "")) + tipRow(t.s[0], "revenue", gbp(m.revenue)) + `<div style="margin-top:4px;opacity:.7">${n0(m.orders)} orders · ${n0(m.customers)} customers</div>`; } },
      series: [{
        type: "line", data: mths.map((m) => m.revenue), symbol: "circle", symbolSize: 7,
        lineStyle: { width: 2, color: t.s[0] }, itemStyle: { color: t.s[0], borderColor: t.surface, borderWidth: 2 },
        areaStyle: { color: t.s[0], opacity: 0.08 },
        markArea: { silent: true, itemStyle: { color: t.grid, opacity: 0.7 }, data: [[{ xAxis: mths.length - 2 }, { xAxis: mths.length - 1 }]] },
      }],
    }),
    table: () => ({
      cols: [{ label: "Month" }, { label: "Revenue", num: 1 }, { label: "Orders", num: 1 }, { label: "Customers", num: 1 }],
      rows: mths.map((m) => [m.month + (m.partial ? " (partial)" : ""), gbp(m.revenue), n0(m.orders), n0(m.customers)]),
    }),
  });

  // ---------- 3. Segments ----------
  const segCard = addCard(dash, {
    title: `${d.segments[0].segment} are ${d.segments[0].cust_share}% of customers and ${d.segments[0].rev_share}% of revenue`,
    sub: "Share of customers vs. share of revenue for each RFM segment, ordered from most to least engaged.",
    height: 340,
    build: (t) => {
      const dim = (name) => (hi === "ALL" || hi === name ? 1 : 0.28);
      const mk = (label, key, color) => ({
        name: label, type: "bar", barWidth: 16, barGap: "25%", itemStyle: { color },
        data: d.segments.map((s) => ({ value: s[key], itemStyle: { color, opacity: dim(s.segment), borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: "top", color: t.ink2, fontSize: 10, formatter: (p) => `${p.value}%` },
      });
      return {
        ...base(t),
        legend: legendStyle(t),
        grid: { top: 38, left: 44, right: 12, bottom: 30 },
        xAxis: catAxis(t, { data: segNames, axisLabel: { color: t.ink2, fontSize: 11, interval: 0 } }),
        yAxis: valAxis(t, { max: 80, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
        tooltip: {
          ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
          formatter: (ps) => {
            const s = d.segments[ps[0].dataIndex];
            return tipHead(`${s.segment} · ${n0(s.customers)} customers`) + tipRow(t.s[0], "of customers", `${s.cust_share}%`) + tipRow(t.s[1], "of revenue", `${s.rev_share}%`) +
              `<div style="margin-top:4px;opacity:.7">Last order ${s.recency} days ago · ${s.frequency} orders · ${gbp(s.monetary)} each</div>`;
          },
        },
        series: [mk("Share of customers", "cust_share", t.s[0]), mk("Share of revenue", "rev_share", t.s[1])],
      };
    },
    table: () => ({
      cols: [{ label: "Segment" }, { label: "Customers", num: 1 }, { label: "% customers", num: 1 }, { label: "Revenue", num: 1 }, { label: "% revenue", num: 1 }, { label: "Avg days since last order", num: 1 }, { label: "Avg orders", num: 1 }, { label: "Avg spend", num: 1 }],
      rows: d.segments.map((s) => [s.segment, n0(s.customers), s.cust_share, gbp(s.revenue), s.rev_share, s.recency, s.frequency, gbp(s.monetary)]),
    }),
  });
  cards.push(segCard);

  // ---------- 4. Pareto ----------
  addCard(dash, {
    title: `The top 20% of customers bring in ${d.pareto_facts.top20_share}% of revenue`,
    sub: "Cumulative share of revenue when customers are ranked from highest to lowest spend.",
    height: 340,
    build: (t) => ({
      ...base(t),
      grid: { top: 16, left: 48, right: 20, bottom: 40 },
      xAxis: valAxis(t, { min: 0, max: 100, interval: 20, splitLine: { show: false }, name: "Customers, ranked by spend", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted }, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
      yAxis: valAxis(t, { min: 0, max: 100, interval: 20, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
      tooltip: { ...base(t).tooltip, trigger: "axis", formatter: (ps) => tipHead(`Top ${ps[0].value[0]}% of customers`) + tipRow(t.s[0], "of revenue", `${ps[0].value[1]}%`) },
      series: [
        { type: "line", data: [[0, 0], [100, 100]], silent: true, symbol: "none", lineStyle: { color: t.axis, width: 1 }, z: 1 },
        {
          type: "line", data: d.pareto, symbol: "none", lineStyle: { width: 2.5, color: t.s[0] }, areaStyle: { color: t.s[0], opacity: 0.08 }, z: 3,
          markPoint: { symbol: "circle", symbolSize: 11, itemStyle: { color: t.s[1], borderColor: t.surface, borderWidth: 2 }, label: { show: true, position: "right", offset: [6, 14], color: t.ink, fontSize: 12, fontWeight: 600, formatter: "20% → " + d.pareto_facts.top20_share + "%" }, data: [{ coord: [20, d.pareto[20][1]] }] },
        },
      ],
    }),
    table: () => ({ cols: [{ label: "Top % of customers", num: 1 }, { label: "Cumulative % of revenue", num: 1 }], rows: d.pareto.filter((_, i) => i % 5 === 0).map((p) => [p[0], p[1]]) }),
  });

  // ---------- 5. Cohort heatmap ----------
  const co = d.cohort;
  addCard(dash, {
    title: "About one in five new customers returns the next month, and retention then holds steady",
    sub: "Share of each monthly cohort (rows) still buying N months after their first purchase. The first cohort (Dec 2010) also contains established customers, so its retention is flattered.",
    height: 430, cls: "w12",
    build: (t) => ({
      ...base(t),
      grid: { top: 10, left: 76, right: 16, bottom: 100 },
      xAxis: { type: "category", data: Array.from({ length: 12 }, (_, i) => i), name: "Months since first purchase", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.muted, fontSize: 11 }, splitArea: { show: false } },
      yAxis: { type: "category", data: co.cohorts.map((c, i) => `${c} (${n0(co.sizes[i])})`), inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.ink2, fontSize: 11 } },
      visualMap: { min: 0, max: 45, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 14, itemHeight: 180, text: ["45%+", "0%"], textStyle: { color: t.ink2, fontSize: 11 }, inRange: { color: [t.q[0], t.q[1], t.q[2], t.q[3]] }, outOfRange: { color: t.q[3] } },
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(`${co.cohorts[p.value[1]]} cohort · month ${p.value[0]}`) + tipRow(t.s[0], "still buying", `${p.value[2]}%`) + `<div style="margin-top:4px;opacity:.7">${n0(co.sizes[p.value[1]])} customers in the cohort</div>` },
      series: [{
        type: "heatmap", data: co.cells,
        itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 3 },
        label: { show: window.innerWidth > 700, fontSize: 10, formatter: (p) => Math.round(p.value[2]), color: t.ink },
        emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 1 } },
      }],
    }),
    table: () => {
      const grid = {}; co.cells.forEach(([p, y, v]) => { (grid[y] ||= {})[p] = v; });
      return { cols: [{ label: "Cohort" }, { label: "Size", num: 1 }, ...Array.from({ length: 12 }, (_, i) => ({ label: `M${i}`, num: 1 }))], rows: co.cohorts.map((c, y) => [c, n0(co.sizes[y]), ...Array.from({ length: 12 }, (_, p) => grid[y]?.[p] ?? null)]) };
    },
  });

  // ---------- 6. RFM scatter ----------
  const scatterCard = addCard(dash, {
    title: "Top customers are recent and high-spending (top left); lapsed ones are low-spending (bottom right)",
    sub: `A sample of 700 customers. Horizontal axis: days since last order. Vertical axis: total spend in £. Both are log scales. With no segment chosen: blue = Champions, orange = At Risk or Hibernating, grey = the rest.`,
    height: 380, cls: "w12",
    build: (t) => {
      const grp = (p) => {
        const name = segNames[p[3]];
        if (hi === "ALL") return name === "Champions" ? 0 : name === "At Risk" || name === "Hibernating" ? 1 : 2;
        return name === hi ? 0 : 2;
      };
      const names = hi === "ALL" ? ["Champions", "At Risk / Hibernating", "Other segments"] : [hi, "", "Other segments"];
      const cols = [t.s[0], t.s[1], t.gray];
      return {
        ...base(t),
        legend: legendStyle(t, { icon: "circle", itemWidth: 9, itemHeight: 9, data: names.filter(Boolean) }),
        grid: { top: 40, left: 62, right: 20, bottom: 44 },
        xAxis: valAxis(t, { type: "log", min: 1, name: "Days since last order", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted }, splitLine: { show: false } }),
        yAxis: valAxis(t, { type: "log", min: 10, axisLabel: { color: t.muted, fontSize: 11, formatter: (v) => "£" + compact(v) } }),
        tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(segNames[p.value[3]]) + tipRow(p.color, "total spend", gbp(p.value[1])) + `<div style="margin-top:4px;opacity:.7">Last order ${p.value[0]} days ago · ${p.value[2]} orders</div>` },
        series: [2, 1, 0].map((g) => ({
          name: names[g], type: "scatter", symbolSize: 11, z: g === 2 ? 1 : 3,
          itemStyle: { color: cols[g], opacity: g === 2 ? 0.45 : 0.85, borderColor: t.surface, borderWidth: 1.5 },
          data: d.rfm_points.filter((p) => grp(p) === g).map((p) => [p[0], p[2], p[1], p[3]]),
        })),
      };
    },
    table: () => ({
      cols: [{ label: "Segment" }, { label: "Days since last order", num: 1 }, { label: "Orders", num: 1 }, { label: "Total spend", num: 1 }],
      rows: [...d.rfm_points].sort((a, z) => z[2] - a[2]).slice(0, 60).map((p) => [segNames[p[3]], p[0], p[1], gbp(p[2])]),
    }),
  });
  cards.push(scatterCard);

  // ---------- 7. Returns ----------
  const ret = d.returns.slice(0, -1);
  addCard(dash, {
    title: "Returns and cancellations typically cost 3–9% of gross sales, with a January spike",
    sub: "Value of cancelled invoices as a % of that month's gross sales, from the raw table before cleaning. December 2011 is left out: it is a 9-day month and mostly books returns from November.",
    height: 300,
    build: (t) => ({
      ...base(t),
      grid: { top: 16, left: 46, right: 16, bottom: 28 },
      xAxis: catAxis(t, { data: ret.map((r) => r.month), axisLabel: { color: t.muted, fontSize: 11, interval: 1 } }),
      yAxis: valAxis(t, { axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
      tooltip: { ...base(t).tooltip, trigger: "axis", formatter: (ps) => { const r = ret[ps[0].dataIndex]; return tipHead(r.month) + tipRow(t.s[1], "of gross sales returned", `${r.return_pct}%`) + `<div style="margin-top:4px;opacity:.7">${gbp(r.returned)} of ${gbp(r.gross)}</div>`; } },
      series: [{ type: "line", data: ret.map((r) => r.return_pct), symbol: "circle", symbolSize: 7, lineStyle: { width: 2, color: t.s[1] }, itemStyle: { color: t.s[1], borderColor: t.surface, borderWidth: 2 } }],
    }),
    table: () => ({ cols: [{ label: "Month" }, { label: "Gross sales", num: 1 }, { label: "Returned", num: 1 }, { label: "Return %", num: 1 }], rows: d.returns.map((r) => [r.month, gbp(r.gross), gbp(r.returned), r.return_pct]) }),
  });

  // ---------- 8. Countries ----------
  addCard(dash, {
    title: `Outside the UK (${k.uk_share}% of revenue), the Netherlands and Ireland lead`,
    sub: "Revenue from the ten largest non-UK countries.",
    height: 300,
    build: (t) => ({
      ...base(t),
      grid: { top: 8, left: 8, right: 56, bottom: 24, containLabel: true },
      xAxis: valAxis(t, { axisLabel: { color: t.muted, fontSize: 11, formatter: (v) => "£" + compact(v) } }),
      yAxis: catAxis(t, { data: d.countries.map((c) => (c.country === "EIRE" ? "Ireland (EIRE)" : c.country)), inverse: true, axisLabel: { color: t.ink2, fontSize: 12 } }),
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(p.name) + tipRow(t.s[0], "revenue", gbp(p.value)) },
      series: [{ type: "bar", barWidth: 14, data: d.countries.map((c) => c.revenue), itemStyle: { color: t.s[0], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: t.ink2, fontSize: 11, formatter: (p) => "£" + compact(p.value) } }],
    }),
    table: () => ({ cols: [{ label: "Country" }, { label: "Revenue", num: 1 }], rows: d.countries.map((c) => [c.country, gbp(c.revenue)]) }),
  });

  // ---------- 9. Weekday x hour ----------
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);
  addCard(dash, {
    title: "Orders peak around midday, Thursday is the busiest day, and there are no Saturday orders at all",
    sub: "Number of invoices by weekday and hour of day.",
    height: 330, cls: "w12",
    build: (t) => ({
      ...base(t),
      grid: { top: 8, left: 46, right: 16, bottom: 74 },
      xAxis: { type: "category", data: hours.map((x) => `${x}:00`), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.muted, fontSize: 11 } },
      yAxis: { type: "category", data: DAYS, inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.ink2, fontSize: 12 } },
      visualMap: { min: 0, max: 900, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 14, itemHeight: 180, text: ["900+", "0"], textStyle: { color: t.ink2, fontSize: 11 }, inRange: { color: [t.q[0], t.q[1], t.q[2], t.q[3]] }, outOfRange: { color: t.q[3] } },
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(`${DAYS[p.value[1]]} · ${p.value[0]}:00`) + tipRow(t.s[0], "invoices", n0(p.value[2])) },
      series: [{ type: "heatmap", data: d.heatmap.filter((c) => c[0] >= 6 && c[0] <= 20).map((c) => [c[0] - 6, c[1], c[2]]), itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 1 } } }],
    }),
    table: () => {
      const g = {}; d.heatmap.forEach(([hr, dw, n]) => { (g[dw] ||= {})[hr] = n; });
      return { cols: [{ label: "Day" }, ...hours.map((x) => ({ label: `${x}h`, num: 1 }))], rows: DAYS.map((nm, i) => [nm, ...hours.map((x) => (g[i]?.[x] ?? 0))]) };
    },
  });

  // ---------- wiring ----------
  const refresh = () => { select.value = hi; segCard.update(); scatterCard.update(); };
  select.addEventListener("change", () => { hi = select.value; refresh(); });
  segCard.chart.on("click", (p) => {
    const name = segNames[p.dataIndex];
    hi = hi === name ? "ALL" : name;
    refresh();
  });
}

init().catch(showError);
