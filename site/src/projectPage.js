import { h, mountShell } from "./layout.js";
import { tiles, listOf, struggles } from "./charts.js";
import { projects } from "./content.js";

/* Shared skeleton for the three dashboard pages:
   hero -> KPI tiles -> what I did / what I found -> dashboard -> struggles -> prev/next. */
export function projectPage(key, text, data, kpis) {
  const main = mountShell(key);
  const wrap = h("div", { class: "wrap" });
  main.append(wrap);

  wrap.append(
    h("div", { class: "p-hero" },
      h("div", { class: "crumb" }, h("a", { href: "./" }, "Home"), " / ", text.crumb),
      h("h1", {}, text.title),
      h("p", { class: "headline" }, text.headline(data)),
      h("ul", { class: "tags" }, text.tags.map((t) => h("li", { class: "tag" }, t)))));

  tiles(wrap, kpis);

  wrap.append(h("div", { class: "story" },
    h("section", { class: "panel", id: "did" }, h("h2", {}, "What I did"), listOf(text.did(data), "ol")),
    h("section", { class: "panel", id: "found" }, h("h2", {}, "What I found"), listOf(text.findings(data)))));

  const filters = h("div", { class: "filters", role: "group", "aria-label": "Dashboard filters" });
  const dash = h("div", { class: "dash" });
  wrap.append(h("h2", { class: "section-title", style: "margin-top:44px", id: "dashboard" }, "Live dashboard"), filters, dash);

  wrap.append(
    h("h2", { class: "section-title", style: "margin-top:56px", id: "struggles" }, "What went wrong, and what I did about it"),
    h("p", { class: "section-sub" }, "Every dataset fought back. These are the problems that changed how I analyzed it."));
  struggles(wrap, text.struggles(data));

  const i = projects.findIndex((p) => p.key === key);
  const prev = projects[(i + projects.length - 1) % projects.length];
  const next = projects[(i + 1) % projects.length];
  wrap.append(h("nav", { class: "pn", "aria-label": "Other projects" },
    h("a", { class: "btn", href: prev.href }, "← ", prev.title),
    h("a", { class: "btn", href: next.href }, next.title, " →")));

  return { main, wrap, filters, dash };
}

export function showError(err) {
  console.error(err);
  const app = document.getElementById("app");
  app.append(h("p", { style: "padding:40px;color:#e34948" }, "Could not load the dashboard data. Run the analysis scripts to generate site/public/data."));
}
