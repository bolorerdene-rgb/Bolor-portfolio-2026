import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart, HeatmapChart, TreemapChart } from "echarts/charts";
import {
  GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent,
  MarkPointComponent, VisualMapComponent, DatasetComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { h } from "./layout.js";
import { n0, loadJSON } from "./fmt.js";

echarts.use([
  BarChart, LineChart, ScatterChart, HeatmapChart, TreemapChart, GridComponent, TooltipComponent,
  LegendComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, VisualMapComponent,
  DatasetComponent, CanvasRenderer,
]);

export { n0, loadJSON };
export const money = (v) => "$" + n0(Math.round(v));
export const compact = (v) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

/* Read the current theme's design tokens from CSS so charts follow light/dark. */
export function tok() {
  const s = getComputedStyle(document.documentElement);
  const g = (n) => s.getPropertyValue(n).trim();
  return {
    ink: g("--ink"), ink2: g("--ink2"), muted: g("--muted"), grid: g("--grid"), axis: g("--axis"),
    surface: g("--surface"), accent: g("--accent"), gray: g("--gray"),
    s: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => g(`--s${i}`)),
    q: [0, 1, 2, 3, 4].map((i) => g(`--q${i}`)),
    o: [0, 1, 2, 3, 4, 5].map((i) => g(`--o${i}`)),
    dvNeg: g("--dv-neg"), dvMid: g("--dv-mid"), dvPos: g("--dv-pos"),
  };
}

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function base(t, extra = {}) {
  return {
    animationDuration: 350,
    textStyle: { fontFamily: FONT, color: t.ink2 },
    tooltip: {
      confine: true,
      backgroundColor: t.surface,
      borderColor: t.axis,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: t.ink, fontSize: 12, fontFamily: FONT },
      extraCssText: "box-shadow:0 6px 20px rgba(0,0,0,.14);border-radius:8px;",
      axisPointer: { lineStyle: { color: t.axis, width: 1 }, crossStyle: { color: t.axis }, shadowStyle: { color: "rgba(127,127,127,.08)" } },
    },
    ...extra,
  };
}

export const catAxis = (t, extra = {}) => ({
  type: "category",
  axisLine: { lineStyle: { color: t.axis } },
  axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 11 },
  ...extra,
});
export const valAxis = (t, extra = {}) => ({
  type: "value",
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 11 },
  splitLine: { lineStyle: { color: t.grid } },
  ...extra,
});
export const legendStyle = (t, extra = {}) => ({
  top: 0, left: 0, itemWidth: 14, itemHeight: 3, icon: "roundRect",
  textStyle: { color: t.ink2, fontSize: 12 }, ...extra,
});

/* Tooltip building blocks: value leads, name follows, a short line key marks the series. */
export const tipHead = (text) => `<div style="color:#898781;font-size:11px;margin-bottom:4px">${text}</div>`;
export const tipRow = (color, name, value) =>
  `<div style="display:flex;align-items:center;gap:8px;margin-top:2px"><i style="width:10px;height:3px;border-radius:2px;background:${color};display:inline-block"></i>` +
  `<b style="font-size:13px">${value}</b><span style="opacity:.7">${name}</span></div>`;

const registry = new Set();

export function mountChart(el, build) {
  const chart = echarts.init(el, null, { renderer: "canvas" });
  const item = { chart, build, render: () => chart.setOption(build(tok()), true) };
  item.render();
  registry.add(item);
  new ResizeObserver(() => chart.resize()).observe(el);
  return item;
}

export function refreshAll() {
  registry.forEach((i) => i.render());
}
window.addEventListener("themechange", refreshAll);

export function buildTable(spec) {
  const thead = h("thead", {}, h("tr", {}, spec.cols.map((c) => h("th", { class: c.num ? "num" : "" }, c.label))));
  const tbody = h("tbody", {}, spec.rows.map((r) =>
    h("tr", {}, r.map((v, i) => h("td", { class: spec.cols[i].num ? "num" : "" }, v == null ? "n/a" : v)))));
  return h("table", {}, thead, tbody);
}

/* A dashboard card: title states the finding, subtitle says how to read it, and every
   chart has a "Table" twin so no value is reachable only through hover. */
export function addCard(parent, { title, sub, height = 320, cls = "", build, table }) {
  const plot = h("div", { class: "plot", style: `height:${height}px` });
  const wrap = h("div", { class: "tablewrap", hidden: true });
  const btn = h("button", { class: "tbl-btn", type: "button", "aria-pressed": "false", "aria-label": `Show data table for: ${title}` }, "Table");
  const card = h("section", { class: `card ${cls}` },
    h("div", { class: "card-head" }, h("div", {}, h("h3", {}, title), sub ? h("p", { class: "sub" }, sub) : null), table ? btn : null),
    plot, wrap);
  parent.append(card);
  const item = mountChart(plot, build);
  const fill = () => { if (table && !wrap.hidden) wrap.replaceChildren(buildTable(table())); };
  btn.addEventListener("click", () => {
    wrap.hidden = !wrap.hidden;
    btn.setAttribute("aria-pressed", String(!wrap.hidden));
    plot.style.display = wrap.hidden ? "" : "none";
    fill();
    if (wrap.hidden) item.chart.resize();
  });
  return {
    el: card, chart: item.chart,
    update() {
      plot.classList.add("busy");
      requestAnimationFrame(() => { item.render(); fill(); plot.classList.remove("busy"); });
    },
  };
}

export function tiles(parent, list) {
  parent.append(h("div", { class: "tiles" }, list.map((t) =>
    h("div", { class: "tile" }, h("div", { class: "v" }, t.value), h("div", { class: "l" }, t.label), t.note ? h("div", { class: "n" }, t.note) : null))));
}

export function listOf(items, tag = "ul") {
  return h(tag, {}, items.map((x) => h("li", { html: x })));
}

export function struggles(parent, items) {
  parent.append(h("div", { class: "struggles" }, items.map((s, i) =>
    h("article", { class: "struggle" },
      h("h3", {}, h("span", {}, String(i + 1).padStart(2, "0")), s.title),
      h("p", { html: s.problem }),
      h("p", { class: "fix", html: `<b>What I did:</b> ${s.fix}` })))));
}

/* Blend two #rrggbb colors; t=0 gives a, t=1 gives b. Used to step diverging scales. */
export function mix(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [A, B] = [p(a), p(b)];
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
