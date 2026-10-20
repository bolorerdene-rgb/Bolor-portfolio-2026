import { h, mountShell } from "./layout.js";
import { loadJSON } from "./fmt.js";
import { profile, skills, experience, education, projects, externalProjects } from "./content.js";

const main = mountShell("home");

const chipList = (items) =>
  h("ul", { class: "chips" }, items.map((t) => h("li", { class: "chip" }, t)));

const timeline = (rows) =>
  h("div", { class: "timeline" }, rows.map((r) =>
    h("article", { class: "tl-item" },
      h("div", { class: "tl-when" }, r.when),
      h("div", {}, h("h3", {}, r.title), h("div", { class: "org" }, r.org),
        h("ul", {}, r.bullets.map((b) => h("li", {}, b)))))));

main.append(
  h("section", { class: "hero" }, h("div", { class: "wrap hero-grid" },
    h("div", { class: "hero-text" },
      h("div", { class: "eyebrow" }, `${profile.role} · portfolio`),
      h("h1", {}, profile.headline),
      h("p", { class: "lede" }, profile.lede),
      h("div", { class: "cta" },
        h("a", { class: "btn primary", href: "#projects" }, "See the live dashboards"),
        profile.links.map((l) => h("a", { class: "btn", href: l.href }, l.label)))),
    h("figure", { class: "hero-photo" },
      h("img", { src: "./images/Bolor-Erdene-Altanmunkh.jpg", alt: `Portrait of ${profile.name}`, width: "1066", height: "1600", decoding: "async" })))),

  h("hr", { class: "rule" }),
  h("section", { class: "block", id: "about" }, h("div", { class: "wrap" },
    h("h2", {}, "About"),
    h("div", { class: "about-grid", style: "margin-top:18px" },
      h("div", {}, profile.about.map((p) => h("p", {}, p))),
      h("aside", { class: "facts" }, h("dl", {}, profile.facts.map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, v)))))))),

  h("hr", { class: "rule" }),
  h("section", { class: "block", id: "projects" }, h("div", { class: "wrap" },
    h("h2", {}, "Projects"),
    h("p", { class: "section-sub" }, "Three real datasets, three different questions. Each opens a live dashboard with a plain-language write-up and the problems I ran into."),
    h("div", { class: "proj-grid", id: "proj-grid" },
      projects.map((p) =>
        h("a", { class: "proj-card", href: p.href, "data-key": p.key },
          h("span", { class: "num" }, p.n),
          h("h3", {}, p.title),
          h("div", { class: "big", "data-big": p.key }, "…", h("small", {}, "")),
          h("p", {}, p.blurb),
          h("ul", { class: "tags" }, p.tags.map((t) => h("li", { class: "tag" }, t))),
          h("span", { class: "go" }, "Open dashboard →"))),
      externalProjects.map((p) =>
        h("a", { class: "proj-card", href: p.href, target: "_blank", rel: "noopener noreferrer" },
          h("span", { class: "num" }, p.n),
          h("h3", {}, p.title),
          h("p", {}, p.blurb),
          h("ul", { class: "tags" }, p.tags.map((t) => h("li", { class: "tag" }, t))),
          h("span", { class: "go" }, "Open live site ↗")))))),

  h("hr", { class: "rule" }),
  h("section", { class: "block", id: "skills" }, h("div", { class: "wrap" },
    h("h2", {}, "Skills"),
    h("p", { class: "section-sub" }, "What I work with day to day, and what I used to build the projects above."),
    h("div", { class: "skill-grid" }, skills.map((g) => h("div", { class: "skill-card" }, h("h3", {}, g.group), chipList(g.items)))))),

  h("hr", { class: "rule" }),
  h("section", { class: "block", id: "experience" }, h("div", { class: "wrap" },
    h("h2", {}, "Experience"), h("div", { style: "margin-top:18px" }, timeline(experience)))),

  h("hr", { class: "rule" }),
  h("section", { class: "block", id: "education" }, h("div", { class: "wrap" },
    h("h2", {}, "Education"), h("div", { style: "margin-top:18px" }, timeline(education)))));

// Fill each project card's headline number from the same JSON that drives its dashboard.
projects.forEach(async (p) => {
  try {
    const d = await loadJSON(p.key);
    const s = p.stat(d);
    const el = main.querySelector(`[data-big="${p.key}"]`);
    el.firstChild.textContent = s.big;
    el.querySelector("small").textContent = s.small;
  } catch (e) {
    console.error(e);
  }
});
