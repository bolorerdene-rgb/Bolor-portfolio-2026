import "./style.css";
import { profile } from "./content.js";

const NAV = [
  { key: "home", href: "./", label: "Home" },
  { key: "olist", href: "olist.html", label: "Delivery vs. Satisfaction" },
  { key: "retail", href: "retail.html", label: "Segments & Retention" },
  { key: "pump", href: "pump.html", label: "Predictive Maintenance" },
];

const SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

export function mountShell(page) {
  const app = document.getElementById("app");
  const toggle = h("button", { class: "icon-btn", type: "button", "aria-label": "Toggle light or dark theme" });
  const paint = () => (toggle.innerHTML = isDark() ? SUN : MOON);
  paint();
  toggle.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    paint();
    window.dispatchEvent(new Event("themechange"));
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    paint();
    window.dispatchEvent(new Event("themechange"));
  });

  const nav = h("nav", { class: "nav", "aria-label": "Main" },
    NAV.map((n) => h("a", { href: n.href, "aria-current": n.key === page ? "page" : null, class: n.key === "home" ? "" : "hide-sm" }, n.label)),
    toggle);
  const header = h("header", { class: "site-header" },
    h("div", { class: "wrap" }, h("a", { class: "brand", href: "./" }, "Bolor", h("span", {}, ".")), nav));
  const main = h("main", { id: "main" });
  const footer = h("footer", { class: "footer" },
    h("div", { class: "wrap" },
      h("span", {}, `© ${new Date().getFullYear()} ${profile.name}`),
      h("span", {}, "Analysis in Python (pandas) · charts in Apache ECharts · data from public Kaggle datasets")));
  app.replaceChildren(header, main, footer);
  return main;
}
