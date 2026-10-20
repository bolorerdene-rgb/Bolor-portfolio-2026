import { h } from "./layout.js";
import { loadJSON, n0 } from "./fmt.js";
import { addCard, base, catAxis, valAxis, legendStyle, tipHead, tipRow, mountChart, buildTable } from "./charts.js";
import { projectPage, showError } from "./projectPage.js";
import { pumpText } from "./content.js";

const usd = (v) => "$" + n0(Math.round(v));

async function init() {
  const d = await loadJSON("pump");
  const k = d.kpis;
  const hits = d.failures.filter((f) => f.hit);
  const coveredH = hits.reduce((a, f) => a + f.recovery_h, 0);

  const { filters, dash } = projectPage("pump", pumpText, d, [
    { value: n0(k.rows), label: "Sensor readings", note: `${k.sensors} sensors · ${k.days} days · every minute` },
    { value: String(k.failures), label: "Failures in the period" },
    { value: `${k.down_h} h`, label: "Time broken or recovering", note: `${k.down_pct}% of the period` },
    { value: `${d.chosen.hits} of ${k.failures}`, label: "Failures flagged ahead of time", note: `${d.chosen.chance_pct}% chance rate` },
    { value: `${d.chosen.false_per_30d}`, label: "False alerts per 30 days" },
  ]);

  let fid = 5;
  const select = h("select", { id: "fail", "aria-label": "Failure to inspect" },
    d.failures.map((f) => h("option", { value: f.id, selected: f.id === fid }, `#${f.id} · ${f.time}`)));
  filters.append(
    h("label", {}, "Failure to inspect", select),
    h("span", { class: "hint" }, "Scopes the sensor trace chart. The other charts always show all seven failures."));

  // ---------- 1. Recovery time per failure ----------
  const maxRec = [...d.failures].sort((a, z) => z.recovery_h - a.recovery_h)[0];
  addCard(dash, {
    title: `One outage was ${Math.round((maxRec.recovery_h / k.down_h) * 100)}% of all downtime${maxRec.hit ? ", and the alert caught it" : ", and the alert missed it"}`,
    sub: `Hours from the moment of failure until the pump returned to normal, for each of the seven failures. Blue = an alert was active in the final ${d.window_h} hours, grey = none was.`,
    height: 320,
    build: (t) => {
      const mk = (name, flag, color) => ({
        name, type: "bar", stack: "r", barWidth: 30,
        data: d.failures.map((f) => (f.hit === flag ? f.recovery_h : null)),
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: t.ink2, fontSize: 11, formatter: (p) => (p.value == null ? "" : `${p.value} h`) },
      });
      return {
        ...base(t),
        legend: legendStyle(t),
        grid: { top: 38, left: 48, right: 12, bottom: 30 },
        xAxis: catAxis(t, { data: d.failures.map((f) => f.time.split(" ").slice(0, 2).join(" ")), axisLabel: { color: t.ink2, fontSize: 11 } }),
        yAxis: valAxis(t),
        tooltip: {
          ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
          formatter: (ps) => {
            const f = d.failures[ps[0].dataIndex];
            return tipHead(`Failure #${f.id} · ${f.time}`) + tipRow(f.hit ? t.s[0] : t.gray, "to recover", `${f.recovery_h} h`) +
              `<div style="margin-top:4px;opacity:.7">${f.hit ? `Alert first raised ${f.lead_h} h before and still active in the final ${d.window_h} h` : `No alert active in the final ${d.window_h} h`}</div>`;
          },
        },
        series: [mk("Alert active before failure", true, t.s[0]), mk("No alert", false, t.gray)],
      };
    },
    table: () => ({
      cols: [{ label: "#" }, { label: "Failure time" }, { label: "Recovery (h)", num: 1 }, { label: "Alert lead (h)", num: 1 }],
      rows: d.failures.map((f) => [f.id, f.time, f.recovery_h, f.hit ? f.lead_h : "none"]),
    }),
  });

  // ---------- 2. Tuning tradeoff ----------
  const sw = [...d.sweep].sort((a, z) => a.false_per_30d - z.false_per_30d);
  addCard(dash, {
    title: "Loosening the rule catches more failures, but only by firing constantly",
    sub: `Each pair of dots is one alert setting (drift threshold × number of sensors needed). Blue = failures flagged; orange = how often an alert is on in a random normal ${d.window_h} hour window. A setting only means something when blue sits well above orange.`,
    height: 320,
    build: (t) => {
      const isChosen = (s) => s.thr === d.chosen.thr && s.k === d.chosen.k;
      return {
        ...base(t),
        legend: legendStyle(t, { icon: "circle", itemWidth: 9, itemHeight: 9 }),
        grid: { top: 40, left: 52, right: 24, bottom: 44 },
        xAxis: valAxis(t, { name: "False alerts per 30 days (fewer is better)", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted }, splitLine: { show: false }, min: 0, max: 35, interval: 5 }),
        yAxis: valAxis(t, { min: 0, max: 100, interval: 25, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
        tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => { const s = sw[p.dataIndex]; return tipHead(`Drift > ${s.thr} SD on ${s.k}+ sensors`) + tipRow(p.color, p.seriesName, `${p.value[1]}%`) + `<div style="margin-top:4px;opacity:.7">${s.false_per_30d} false alerts / 30 days · ${s.hits} of ${k.failures} failures</div>`; } },
        series: [
          {
            name: "Failures flagged ahead", type: "scatter", symbolSize: (v, p) => (isChosen(sw[p.dataIndex]) ? 16 : 11),
            data: sw.map((s) => [s.false_per_30d, s.hit_pct]), itemStyle: { color: t.s[0], borderColor: t.surface, borderWidth: 2 },
            label: { show: true, position: "top", color: t.ink, fontSize: 11, fontWeight: 600, formatter: (p) => (isChosen(sw[p.dataIndex]) ? "chosen" : "") },
          },
          {
            name: `Chance of an alert in a random normal ${d.window_h} h window`, type: "scatter", symbolSize: 11,
            data: sw.map((s) => [s.false_per_30d, s.chance_pct]), itemStyle: { color: t.s[1], borderColor: t.surface, borderWidth: 2 },
          },
        ],
      };
    },
    table: () => ({
      cols: [{ label: "Drift threshold (SD)", num: 1 }, { label: "Sensors needed", num: 1 }, { label: "False alerts / 30 d", num: 1 }, { label: "Failures flagged", num: 1 }, { label: "Chance rate %", num: 1 }],
      rows: sw.map((s) => [s.thr, s.k, s.false_per_30d, `${s.hits} of ${k.failures}`, s.chance_pct]),
    }),
  });

  // ---------- 3. Sensor trace explorer ----------
  const ex = d.explorer;
  const explorer = addCard(dash, {
    title: "Inside the last 72 hours: each failure leaves a different trail",
    sub: "Vertical axis: how far each of six sensors sits from its normal level, in standard deviations. Horizontal axis: hours counting back from the failure. Click legend names to show or hide sensors.",
    height: 380, cls: "w12",
    build: (t) => {
      const e = ex.data[String(fid)];
      const f = d.failures.find((x) => x.id === fid);
      return {
        ...base(t),
        legend: legendStyle(t, { selected: Object.fromEntries(ex.sensors.map((s, i) => [s, i < 4])) }),
        grid: { top: 42, left: 52, right: 24, bottom: 42 },
        xAxis: valAxis(t, { min: -72, max: 2, interval: 12, splitLine: { show: false }, name: "Hours before the failure", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted }, axisLabel: { color: t.muted, fontSize: 11, formatter: (v) => (v === 0 ? "failure" : `${v} h`) } }),
        yAxis: valAxis(t),
        tooltip: {
          ...base(t).tooltip, trigger: "axis", axisPointer: { type: "line" },
          formatter: (ps) => tipHead(`Failure #${f.id} · ${Math.abs(ps[0].value[0])} h before`) + ps.map((p) => tipRow(p.color, p.seriesName, p.value[1])).join(""),
        },
        series: ex.sensors.map((s, i) => ({
          name: s, type: "line", showSymbol: false, smooth: false, lineStyle: { width: 2, color: t.s[i] }, itemStyle: { color: t.s[i] },
          data: e.t.map((x, j) => [x, e[s][j]]),
          markLine: i === 0 ? { symbol: "none", silent: true, lineStyle: { color: t.ink2, width: 1, type: "solid" }, label: { formatter: "Failure", color: t.ink2, fontSize: 11, position: "insideEndTop" }, data: [{ xAxis: 0 }] } : undefined,
        })),
      };
    },
    table: () => {
      const e = ex.data[String(fid)];
      return { cols: [{ label: "Hours before", num: 1 }, ...ex.sensors.map((s) => ({ label: s, num: 1 }))], rows: e.t.map((x, j) => [x, ...ex.sensors.map((s) => e[s][j])]) };
    },
  });
  select.addEventListener("change", () => { fid = Number(select.value); explorer.update(); });

  // ---------- 4. Small multiples: drift count before each failure ----------
  const maxCount = Math.ceil(Math.max(...d.drift_traces.flat().map((p) => p[1]), d.alert_k + 2) / 10) * 10;
  const minis = h("div", { class: "minis" });
  const tableWrap = h("div", { class: "tablewrap", hidden: true });
  const toggle = h("button", { class: "tbl-btn", type: "button", "aria-pressed": "false", "aria-label": "Show data table for the alert traces" }, "Table");
  const smCard = h("section", { class: "card w12" },
    h("div", { class: "card-head" },
      h("div", {}, h("h3", {}, `With ${d.alert_k}+ sensors drifting at once, an alert was active in the final ${d.window_h} hours before ${hits.length} of ${k.failures} failures`),
        h("p", { class: "sub" }, `Number of sensors drifting from their own baseline in the 72 hours before each failure. Same scale in every panel. The orange line is the alert level (${d.alert_k} sensors); the shaded strip is the final ${d.window_h} hours, where an alert has to be active to count.`)),
      toggle),
    minis, tableWrap,
    h("div", { class: "legend-inline" }, h("span", {}, h("i", { style: "background:var(--s1)" }), "Alert active in the final hours"), h("span", {}, h("i", { style: "background:var(--gray)" }), "No alert")));
  dash.append(smCard);
  d.failures.forEach((f, i) => {
    const plot = h("div", { style: "height:120px" });
    minis.append(h("div", { class: "mini" },
      h("div", { class: "mh" }, h("b", {}, `#${f.id} · ${f.time.split(" ").slice(0, 2).join(" ")}`),
        h("span", { class: `badge ${f.hit ? "hit" : "miss"}` }, f.hit ? `${f.lead_h} h warning` : "no warning")), plot));
    mountChart(plot, (t) => ({
      ...base(t),
      grid: { top: 8, left: 28, right: 6, bottom: 20 },
      xAxis: valAxis(t, { min: -72, max: 0, interval: 24, splitLine: { show: false }, axisLabel: { color: t.muted, fontSize: 10, formatter: (v) => (v === 0 ? "0" : `${v}`) } }),
      yAxis: valAxis(t, { min: 0, max: maxCount, interval: 10, axisLabel: { color: t.muted, fontSize: 10 } }),
      tooltip: { ...base(t).tooltip, trigger: "axis", formatter: (ps) => tipHead(`${Math.abs(ps[0].value[0])} h before failure #${f.id}`) + tipRow(f.hit ? t.s[0] : t.gray, "sensors drifting", ps[0].value[1]) },
      series: [{
        type: "line", data: d.drift_traces[i], showSymbol: false, lineStyle: { width: 1.5, color: f.hit ? t.s[0] : t.gray }, areaStyle: { color: f.hit ? t.s[0] : t.gray, opacity: 0.12 },
        markLine: { symbol: "none", silent: true, lineStyle: { color: t.s[1], width: 1, type: "solid" }, label: { show: false }, data: [{ yAxis: d.alert_k }] },
        markArea: { silent: true, itemStyle: { color: t.grid, opacity: 0.9 }, data: [[{ xAxis: -d.window_h }, { xAxis: 0 }]] },
      }],
    }));
  });
  toggle.addEventListener("click", () => {
    tableWrap.hidden = !tableWrap.hidden;
    toggle.setAttribute("aria-pressed", String(!tableWrap.hidden));
    minis.style.display = tableWrap.hidden ? "" : "none";
    if (!tableWrap.hidden) {
      tableWrap.replaceChildren(buildTable({
        cols: [{ label: "#" }, { label: "Failure time" }, { label: "Max sensors drifting", num: 1 }, { label: "Alert lead (h)", num: 1 }],
        rows: d.failures.map((f, i) => [f.id, f.time, Math.max(...d.drift_traces[i].map((p) => p[1])), f.hit ? f.lead_h : "none"]),
      }));
    } else window.dispatchEvent(new Event("resize"));
  });

  // ---------- 5. Heatmap of sensor shifts ----------
  const sh = d.shift;
  const best = Object.entries(sh.n_shifted).sort((a, z) => z[1] - a[1])[0];
  addCard(dash, {
    title: `No sensor is a reliable tell: the most consistent moved clearly in only ${best[1]} of ${k.failures} failures`,
    sub: "Change in each sensor over the last 3 hours before a failure vs. its level 12 to 48 hours earlier, in standard deviations. Blue = rose, red = fell.",
    height: 400,
    build: (t) => ({
      ...base(t),
      grid: { top: 8, left: 74, right: 12, bottom: 84 },
      xAxis: { type: "category", data: sh.failures, position: "bottom", axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.ink2, fontSize: 11 }, name: "Failure date", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: t.muted } },
      yAxis: { type: "category", data: sh.sensors, inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.ink2, fontSize: 11 } },
      visualMap: { min: -25, max: 25, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 14, itemHeight: 170, text: ["rose", "fell"], textStyle: { color: t.ink2, fontSize: 11 }, inRange: { color: [t.dvNeg, t.dvMid, t.dvPos] } },
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(`${sh.sensors[p.value[1]]} · failure ${sh.failures[p.value[0]]}`) + tipRow(p.value[2] >= 0 ? t.dvPos : t.dvNeg, "SD change", p.value[2]) },
      series: [{
        type: "heatmap", data: sh.cells, itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 3 },
        label: { show: true, fontSize: 10, color: t.ink, formatter: (p) => (Math.abs(p.value[2]) >= 2 ? Math.round(p.value[2]) : "") },
        emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 1 } },
      }],
    }),
    table: () => ({
      cols: [{ label: "Sensor" }, ...sh.failures.map((f) => ({ label: f, num: 1 }))],
      rows: sh.sensors.map((s, si) => [s, ...sh.failures.map((_, j) => sh.cells.find((c) => c[0] === j && c[1] === si)[2])]),
    }),
  });

  // ---------- 6. Data quality ----------
  addCard(dash, {
    title: `${k.empty_sensor} is completely empty, and sensor_50 is missing over a third of its readings`,
    sub: "Share of readings missing, for the sensors with the most gaps. All other sensors are missing under 0.1%.",
    height: 400,
    build: (t) => ({
      ...base(t),
      grid: { top: 8, left: 8, right: 52, bottom: 26, containLabel: true },
      xAxis: valAxis(t, { max: 100, axisLabel: { color: t.muted, fontSize: 11, formatter: "{value}%" } }),
      yAxis: catAxis(t, { data: d.missing.map((m) => m.sensor), inverse: true, axisLabel: { color: t.ink2, fontSize: 11 } }),
      tooltip: { ...base(t).tooltip, trigger: "item", formatter: (p) => tipHead(p.name) + tipRow(t.s[0], "readings missing", `${p.value}%`) },
      series: [{ type: "bar", barWidth: 14, data: d.missing.map((m) => m.pct), itemStyle: { color: t.s[0], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: t.ink2, fontSize: 11, formatter: (p) => `${p.value}%` } }],
    }),
    table: () => ({ cols: [{ label: "Sensor" }, { label: "% missing", num: 1 }], rows: d.missing.map((m) => [m.sensor, m.pct]) }),
  });

  // ---------- 7. Downtime cost calculator ----------
  const inputs = {
    cost: h("input", { type: "number", min: "0", step: "500", value: "5000", id: "c-cost" }),
    share: h("input", { type: "range", min: "0", max: "100", step: "5", value: "50", id: "c-share" }),
    inspH: h("input", { type: "number", min: "0", step: "0.5", value: "2", id: "c-insp" }),
    rate: h("input", { type: "number", min: "0", step: "10", value: "120", id: "c-rate" }),
  };
  const shareLabel = h("span", {}, "50%");
  const out = { covered: h("b"), avoid: h("b"), saved: h("b"), alerts: h("b"), falseCost: h("b"), net: h("div", { class: "total" }) };
  const row = (label, el) => h("div", { class: "row" }, h("span", {}, label), el);
  const falseAlerts = (d.chosen.false_per_30d * k.days) / 30;
  const recalc = () => {
    const cost = +inputs.cost.value || 0, share = +inputs.share.value / 100, ih = +inputs.inspH.value || 0, rate = +inputs.rate.value || 0;
    const avoidH = coveredH * share, saved = avoidH * cost, fcost = falseAlerts * ih * rate;
    shareLabel.textContent = `${Math.round(share * 100)}%`;
    out.covered.textContent = `${coveredH.toFixed(1)} h`;
    out.avoid.textContent = `${avoidH.toFixed(1)} h`;
    out.saved.textContent = usd(saved);
    out.alerts.textContent = `${falseAlerts.toFixed(1)} alerts`;
    out.falseCost.textContent = "−" + usd(fcost);
    out.net.textContent = (saved - fcost >= 0 ? "" : "−") + usd(Math.abs(saved - fcost));
  };
  Object.values(inputs).forEach((i) => i.addEventListener("input", recalc));
  recalc();
  dash.append(h("section", { class: "card w12" },
    h("div", { class: "card-head" }, h("div", {},
      h("h3", {}, "What is the warning worth? An adjustable downtime cost model"),
      h("p", { class: "sub" }, `The ${coveredH.toFixed(0)} downtime hours come from the data. The dollar inputs on the left are illustrative placeholders, so replace them with a real plant's numbers.`))),
    h("div", { class: "calc", style: "margin-top:16px" },
      h("div", { class: "inputs" },
        h("label", {}, "Cost of one hour of downtime ($)", inputs.cost),
        h("label", {}, h("span", {}, "Share of that downtime avoidable with early warning: ", shareLabel), inputs.share),
        h("label", {}, "Technician hours to check out one false alert", inputs.inspH),
        h("label", {}, "Technician cost per hour ($)", inputs.rate)),
      h("div", { class: "out" },
        row(`Downtime hours in the ${hits.length} flagged failures`, out.covered),
        row("Hours avoidable with warning", out.avoid),
        row("Downtime cost avoided", out.saved),
        row(`False alerts over ${k.days} days`, out.alerts),
        row("Cost of chasing false alerts", out.falseCost),
        h("div", { class: "row", style: "border:0;align-items:end" }, h("span", {}, "Net value over the period"), out.net)))));
}

init().catch(showError);
