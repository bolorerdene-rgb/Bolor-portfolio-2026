import { h } from "./layout.js";
import { loadJSON } from "./fmt.js";
import { buildKB, suggestionsFor, projectName } from "./kb.js";
import { buildIndex, search, confident, intentOnly, scopeOf } from "./search.js";
import { pageCharts } from "./registry.js";

/* Chat window for the portfolio. It searches text that is already on the site: nothing is generated,
   nothing is sent anywhere, and every answer links back to where it came from. */

const KEYS = ["olist", "retail", "pump"];
let state = null; // built lazily on first open

const CONTACT = "bolorerdene.altanmunkh@gmail.com";

async function load(page) {
  const got = await Promise.allSettled(KEYS.map((k) => loadJSON(k)));
  const data = {};
  got.forEach((r, i) => { if (r.status === "fulfilled") data[KEYS[i]] = r.value; });
  const docs = buildKB(data, pageCharts, page);
  return { docs, index: buildIndex(docs), charts: pageCharts.length };
}

const plain = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

function sourceLink(doc) {
  const a = h("a", { class: "asst-src", href: doc.href }, doc.external ? "Open it ↗" : "See it on the page →");
  if (doc.external) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  return a;
}

function answerCard(doc) {
  return h("div", { class: "asst-card" },
    h("div", { class: "asst-label" }, doc.label),
    h("div", { class: "asst-body", html: doc.body }),
    sourceLink(doc));
}

function related(results, top) {
  const seen = new Set([top.id]);
  const out = [];
  for (const r of results.slice(1)) {
    if (r.score < results[0].score * 0.45 || seen.has(r.doc.id)) continue;
    if (r.doc.kind === top.kind && r.doc.project === top.project && out.length) continue;
    seen.add(r.doc.id);
    out.push(r.doc);
    if (out.length === 3) break;
  }
  return out;
}

const INTRO = {
  struggle: "Here are the problems I ran into, and what I did about each.",
  finding: "Here's what I found.",
  did: "Here's how I went about it.",
};

function listAnswer(kind, scope, docs) {
  let list = docs.filter((d) => d.kind === kind && (!scope || d.project === scope));
  if (!scope) list = ["olist", "retail", "pump"].flatMap((p) => list.filter((d) => d.project === p).slice(0, 2));
  const items = list.map((d) =>
    h("li", {}, h("a", { href: d.href }, d.title), h("span", { class: "asst-meta" }, ` ${projectName(d.project)}`),
      h("div", { class: "asst-snip" }, clip(plain(d.body.replace(/^<p>/, "").replace(/<b>What I did:<\/b>.*/s, "")), 150))));
  return h("div", { class: "asst-card" },
    h("div", { class: "asst-body" }, h("p", {}, INTRO[kind] + (scope ? "" : " A few from each project; open a project to see them all.")), h("ul", { class: "asst-list" }, items)));
}

function fallback(ask, page) {
  const chips = suggestionsFor(page).slice(0, 4);
  return h("div", { class: "asst-card" },
    h("div", { class: "asst-body" },
      h("p", {}, "I couldn't find that in the write-ups on this site, and I'd rather say so than guess. Try asking about a project's findings, the problems I hit, my skills or my background."),
      h("p", {}, "Or ask me directly: ", h("a", { href: `mailto:${CONTACT}` }, CONTACT))),
    h("div", { class: "asst-chips" }, chips.map((c) => h("button", { type: "button", class: "asst-chip", onclick: () => ask(c.q) }, c.label))));
}

export async function toggleAssistant({ page, launcher }) {
  let panel = document.getElementById("asst-panel");
  if (panel) return panel.hidden ? openPanel(panel, launcher) : closePanel(panel, launcher);

  const log = h("div", { class: "asst-log", role: "log", "aria-live": "polite", "aria-label": "Conversation" });
  const input = h("input", { type: "text", class: "asst-input", placeholder: "Ask about a project, my skills, my background…", "aria-label": "Your question", autocomplete: "off", maxlength: "200" });
  const chipBox = h("div", { class: "asst-chips" });
  const form = h("form", { class: "asst-form" }, input, h("button", { type: "submit", class: "asst-send", "aria-label": "Send question" }, "Ask"));
  const close = h("button", { type: "button", class: "icon-btn asst-close", "aria-label": "Close assistant" }, "×");
  panel = h("aside", { id: "asst-panel", class: "asst-panel", role: "dialog", "aria-label": "Ask about my projects", hidden: true },
    h("div", { class: "asst-head" }, h("div", {}, h("strong", {}, "Ask about my projects"),
      h("p", {}, "Answers come from the write-ups and numbers on this site. Nothing is generated or sent anywhere.")), close),
    log, chipBox, form);
  document.body.append(panel);

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const say = (who, node) => { log.append(h("div", { class: `asst-msg ${who}` }, node)); scroll(); };

  const ask = async (q) => {
    q = q.trim();
    if (!q) return;
    say("user", document.createTextNode(q));
    input.value = "";
    if (!state) {
      say("bot", h("div", { class: "asst-card" }, h("div", { class: "asst-body" }, "One moment…")));
      try { state = await load(page); } catch (e) { console.error(e); }
      log.lastElementChild.remove();
    } else if (state.charts !== pageCharts.length) {
      state = await load(page);
    }
    if (!state) { say("bot", fallback(ask, page)); return; }
    const kind = intentOnly(q);
    if (kind) {
      const scope = scopeOf(q, page);
      if (state.docs.some((d) => d.kind === kind)) { say("bot", listAnswer(kind, scope, state.docs)); return; }
    }
    const res = search(state.index, q, { page });
    if (!confident(res, q, state.index)) { say("bot", fallback(ask, page)); return; }
    const top = res[0].doc;
    const card = answerCard(top);
    const more = related(res, top);
    if (more.length) {
      card.append(h("div", { class: "asst-more" }, h("span", {}, "Related: "),
        more.map((d) => h("a", { href: d.href, ...(d.external ? { target: "_blank", rel: "noopener noreferrer" } : {}) }, clip(d.title, 48)))));
    }
    say("bot", card);
  };

  suggestionsFor(page).forEach((c) => chipBox.append(h("button", { type: "button", class: "asst-chip", onclick: () => ask(c.q) }, c.label)));
  form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
  close.addEventListener("click", () => closePanel(panel, launcher));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(panel, launcher); });
  // following an in-page link should reveal the target, so get out of the way
  panel.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && a.getAttribute("href")?.includes("#") && !a.target && new URL(a.href, location.href).pathname === location.pathname) closePanel(panel, launcher, false);
  });

  say("bot", h("div", { class: "asst-card" }, h("div", { class: "asst-body" },
    h("p", {}, page === "home" ? "Hi, I'm Bolor-Erdene's portfolio assistant. Ask about the three projects, the problems I ran into, or my background."
      : "Ask about this project, the other two, or my background."))));
  openPanel(panel, launcher);
}

function openPanel(panel, launcher) {
  panel.hidden = false;
  launcher?.setAttribute("aria-expanded", "true");
  panel.querySelector(".asst-input").focus();
}

function closePanel(panel, launcher, refocus = true) {
  panel.hidden = true;
  launcher?.setAttribute("aria-expanded", "false");
  if (refocus) launcher?.focus();
}
