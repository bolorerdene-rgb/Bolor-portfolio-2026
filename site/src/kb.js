/* The assistant's knowledge base: every document is text that already appears on this site
   (write-ups, CV content) or a plain restatement of numbers from the dashboards' own JSON.
   Nothing here is generated at question time. */
import { n0 } from "./fmt.js";
import {
  profile, skills, experience, education, projects, externalProjects, olistText, retailText, pumpText,
} from "./content.js";

const strip = (html) => html.replace(/<[^>]+>/g, "");
const firstBold = (html) => (html.match(/<b>(.*?)<\/b>/) || [])[1];
const clip = (s, n = 8) => { const w = s.split(/\s+/); return w.slice(0, n).join(" ") + (w.length > n ? "…" : ""); };

const TEXTS = { olist: olistText, retail: retailText, pump: pumpText };
const NAMES = { olist: "Delivery vs. satisfaction", retail: "Segments & retention", pump: "Predictive maintenance" };
const TITLE_OF = Object.fromEntries(projects.map((p) => [p.key, p.title]));

export const projectName = (k) => NAMES[k];

/* Each doc: { id, kind, project, title, label, body (trusted HTML), text (searchable plain text), href, keys } */
export function buildKB(data, charts = [], page = "home") {
  const docs = [];
  const add = (d) => docs.push({ keys: [], ...d, text: d.text ?? strip(d.body) });

  // ---------- about me ----------
  add({
    id: "about", kind: "about", title: "Who is Bolor-Erdene?", label: "About me", href: "./#about",
    body: `<p>${profile.lede}</p><p>${profile.about[0]}</p>`,
    keys: ["who are you", "introduce yourself", "tell me about yourself", "background", "summary", "data analyst", "bio"],
  });
  add({
    id: "contact", kind: "contact", title: "How to contact me", label: "Contact", href: "./#about",
    body: `<p>You can email me at <a href="mailto:${profile.links[0].href.slice(7)}">${profile.links[0].href.slice(7)}</a> or message me on <a href="${profile.links[1].href}" target="_blank" rel="noopener noreferrer">LinkedIn</a>. ` +
      `I'm based in ${profile.facts[0][1]} and open to data analyst and business intelligence roles.</p>`,
    keys: ["contact", "email", "linkedin", "reach", "hire", "hiring", "available", "location", "where are you based", "open to work", "job search"],
  });
  education.forEach((e, i) => add({
    id: `edu-${i}`, kind: "education", title: e.title, label: "Education", href: "./#education",
    body: `<p><b>${e.title}</b>, ${e.org}, ${e.when}.</p><p>${e.bullets.join(". ")}.</p>`,
    keys: ["degree", "school", "university", "gpa", "graduate", "college", "honors", "major"],
  }));
  experience.forEach((e, i) => add({
    id: `exp-${i}`, kind: "experience", title: `${e.title}, ${e.org.split(" · ")[0]}`, label: "Experience", href: "./#experience",
    body: `<p><b>${e.title}</b>, ${e.org} (${e.when}).</p><ul>${e.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`,
    keys: ["job", "work", "career", "employer", "role", "previous", "history"],
  }));
  add({
    id: "skills-all", kind: "skills", title: "My skills at a glance", label: "Skills", href: "./#skills",
    body: `<ul>${skills.map((g) => `<li><b>${g.group}:</b> ${g.items.join(", ")}</li>`).join("")}</ul>`,
    keys: ["skills", "tools", "technologies", "tech stack", "what do you know", "proficient"],
  });
  skills.forEach((g, i) => add({
    id: `skill-${i}`, kind: "skills", title: g.group, label: "Skills", href: "./#skills",
    body: `<p><b>${g.group}:</b> ${g.items.join(", ")}.</p>`,
  }));
  externalProjects.forEach((p, i) => add({
    id: `ext-${i}`, kind: "project", title: p.title, label: "Other project", href: p.href, external: true,
    body: `<p><b>${p.title}</b> (${p.n}). ${p.blurb}</p>`,
    keys: ["biosphere", "llm", "language model", "chatbot", "university project", "web app", "ai"],
  }));
  add({
    id: "pump-background", kind: "about", title: "Why I know pumps", label: "About me", href: "./#experience",
    body: "<p>Before moving into data, I spent about five years at MZE LLC in Ulaanbaatar: first as a project manager, then as Senior Service Engineer. " +
      "I led the work to make the company a Grundfos Authorized Service Partner, built Mongolia's first certified pump service center and developed a pump testing station. " +
      "That's why the predictive-maintenance project asks what a technician would ask: how much warning, and how many false alarms.</p>",
    keys: ["why pumps", "know about pumps", "pump expertise", "domain knowledge", "grundfos", "industrial", "engineering", "mongolia", "why this dataset", "mze"],
  });
  add({
    id: "fit", kind: "about", title: "Am I a good fit?", label: "About me", href: "./#projects",
    body: "<p>I'd rather show than claim, so here is where I'd point you. For customer-experience work, <a href=\"olist.html\">Delivery vs. satisfaction</a> ties late deliveries to review scores across nine joined tables. " +
      "For retention and e-commerce work, <a href=\"retail.html\">Segments & retention</a> cleans a messy ledger and segments customers by value. " +
      "For operations and engineering teams, my pump-service background and the <a href=\"pump.html\">Predictive maintenance</a> project are the closest match. Email me if you'd like to talk it through.</p>",
    keys: ["good fit", "why should we hire you", "why hire you", "strengths", "biggest strength", "weakness", "suited", "right for the role", "qualified", "customer experience analyst", "dtc", "ecommerce analyst", "business analyst"],
  });
  add({
    id: "ml", kind: "about", title: "Machine learning in these projects", label: "About me", href: "pump.html#struggle-2",
    body: "<p>In these three projects, the only model I tested was a PCA reconstruction-error model on the pump data. It flagged at most 2 of 7 failures, so I went with a transparent drift-count rule instead, because with seven failures an accuracy score from a fitted model would flatter itself. The other two projects are joins, segmentation and cohort analysis in pandas.</p>",
    keys: ["machine learning", "ml", "model", "modeling", "predictive model", "pca", "scikit", "algorithm", "data science", "statistics", "have you used machine learning", "artificial intelligence"],
  });
  add({
    id: "site", kind: "about", title: "How this portfolio was built", label: "About this site", href: "./",
    body: "<p>Each project starts as a Python (pandas) script that cleans a public Kaggle dataset and writes a small JSON summary. " +
      "The site is a static page that draws those summaries as interactive charts with Apache ECharts, hosted on Netlify. " +
      "Every chart has a table view, and light and dark themes. I wrote all the analysis and the write-ups; every number you see is computed from the data.</p>" +
      "<p>This assistant is a search over the text on these pages. It doesn't generate answers, so it can only tell you what I've actually written.</p>",
    keys: ["how was this built", "how did you build this website", "technology", "netlify", "echarts", "python", "javascript", "assistant", "chatbot", "how does this work", "source"],
  });

  add({
    id: "start", kind: "about", title: "Where to start", label: "Projects", href: "./#projects",
    body: "<p>If you only have a minute, open <a href=\"olist.html\">Delivery vs. satisfaction</a> for the clearest chart (reviews fall off a cliff once a delivery is a week late). " +
      "<a href=\"retail.html\">Segments & retention</a> shows data cleaning and customer value work. " +
      "<a href=\"pump.html\">Predictive maintenance</a> is the one that draws most on my pump-service background, and the one where I report a result smaller than the first one I got.</p>",
    keys: ["which project", "where should i start", "best project", "recommend", "first", "favorite", "most impressive", "projects", "portfolio", "what projects do you have", "list"],
  });

  // ---------- the three projects ----------
  const hasData = (k) => !!data[k];
  projects.forEach((p) => {
    if (!hasData(p.key)) return;
    const d = data[p.key], t = TEXTS[p.key], label = NAMES[p.key];
    const s = p.stat(d);
    add({
      id: `${p.key}-overview`, kind: "overview", project: p.key, title: p.title, label: `${label} · Overview`, href: p.href,
      body: `<p><b>${p.title}.</b> ${p.blurb}</p><p>${t.headline(d)}</p>`,
      keys: [p.key, "summary", "overview", "project", "main result", "headline", "tell me about", ...p.tags],
    });
    t.did(d).forEach((x, i) => add({
      id: `${p.key}-did-${i}`, kind: "did", project: p.key, title: clip(strip(firstBold(x) || x), 9), label: `${label} · What I did`,
      href: `${p.href}#did`, body: `<p>${x}</p>`,
    }));
    t.findings(d).forEach((x, i) => add({
      id: `${p.key}-find-${i}`, kind: "finding", project: p.key, title: clip(strip(firstBold(x) || x), 9), label: `${label} · What I found`,
      href: `${p.href}#found`, body: `<p>${x}</p>`,
    }));
    t.struggles(d).forEach((x, i) => add({
      id: `${p.key}-struggle-${i}`, kind: "struggle", project: p.key, title: strip(x.title), label: `${label} · What went wrong`,
      href: `${p.href}#struggle-${i + 1}`,
      body: `<p>${x.problem}</p><p><b>What I did:</b> ${x.fix}</p>`,
    }));
    if (page === p.key) charts.forEach((c) => add({
      id: `${p.key}-${c.id}`, kind: "chart", project: p.key, title: strip(c.title), label: `${label} · Chart on this page`,
      href: `#${c.id}`, body: `<p><b>${c.title}</b></p><p>${c.sub}</p>`,
    }));
  });

  // ---------- numbers restated from each dashboard's JSON ----------
  if (data.olist) {
    const d = data.olist;
    add({
      id: "olist-buckets", kind: "data", project: "olist", title: "Review score by delivery time", label: `${NAMES.olist} · Numbers`, href: "olist.html#dashboard",
      body: "<p>Average review score by how far delivery landed from the promised date:</p><ul>" +
        d.buckets.map((b) => `<li><b>${b.bucket}:</b> ${b.avg_score} stars (${n0(b.orders)} orders, ${b.low_pct}% gave 1–2 stars)</li>`).join("") + "</ul>",
      keys: ["late delivery", "review score", "stars", "cliff", "how much does late delivery hurt", "satisfaction"],
    });
    const big = d.states.filter((s) => s.orders >= 1000).sort((a, z) => z.late_pct - a.late_pct).slice(0, 5);
    add({
      id: "olist-states", kind: "data", project: "olist", title: "Which states have the most late deliveries", label: `${NAMES.olist} · Numbers`, href: "olist.html#dashboard",
      body: `<p>Among states with 1,000+ orders, the highest late-delivery rates are ` +
        big.map((s) => `<b>${s.state}</b> (${s.late_pct}%, ${s.avg_days} days on average)`).join(", ") +
        `. Brazil overall is ${d.kpis.late_pct}% late. The dashboard has a state filter.</p>`,
      keys: ["region", "geography", "slowest", "where", "state", "worst", "north", "northeast"],
    });
    const lowC = d.categories.slice(0, 3);
    add({
      id: "olist-cats", kind: "data", project: "olist", title: "Lowest-rated product categories", label: `${NAMES.olist} · Numbers`, href: "olist.html#dashboard",
      body: `<p>The lowest-rated categories (400+ rated orders) are ` + lowC.map((c) => `<b>${c.category}</b> (${c.avg_score} stars, ${c.late_pct}% late)`).join(", ") + ".</p>",
      keys: ["product", "category", "worst rated", "lowest rated"],
    });
    add({
      id: "olist-data", kind: "data", project: "olist", title: "What data this project uses", label: `${NAMES.olist} · Data`, href: "olist.html",
      body: `<p>The Olist Brazilian e-commerce public dataset from Kaggle: nine related tables covering ${n0(d.facts.orders_total)} orders from 2016 to 2018 (orders, items, customers, sellers, products, payments, reviews, geolocation and a category translation table). I analyzed the ${n0(d.kpis.delivered_orders)} delivered orders.</p>`,
      keys: ["dataset", "data source", "kaggle", "where is the data from", "how many orders", "how big", "tables"],
    });
  }
  if (data.retail) {
    const d = data.retail;
    add({
      id: "retail-rfm", kind: "data", project: "retail", title: "What RFM segmentation is", label: `${NAMES.retail} · Method`, href: "retail.html#did",
      body: "<p>RFM scores every customer on three things: <b>Recency</b> (how recently they bought), <b>Frequency</b> (how often) and <b>Monetary value</b> (how much they spent). Each is scored 1–5, and the combinations are grouped into six named segments, from Champions down to Hibernating.</p>",
      keys: ["rfm", "recency", "frequency", "monetary", "what is rfm", "explain", "segmentation", "how are segments defined"],
    });
    add({
      id: "retail-segments", kind: "data", project: "retail", title: "The six customer segments", label: `${NAMES.retail} · Numbers`, href: "retail.html#dashboard",
      body: "<ul>" + d.segments.map((s) => `<li><b>${s.segment}:</b> ${s.cust_share}% of customers, ${s.rev_share}% of revenue (average ${s.recency} days since last order, ${s.frequency} orders)</li>`).join("") + "</ul>",
      keys: ["champions", "at risk", "hibernating", "loyal", "segments", "who are the best customers", "most valuable"],
    });
    add({
      id: "retail-cleaning", kind: "data", project: "retail", title: "How I cleaned the retail data", label: `${NAMES.retail} · Numbers`, href: "retail.html#dashboard",
      body: "<p>Rows left after each cleaning step:</p><ol>" + d.cleaning.map((c, i) => `<li>${c.step}: ${n0(c.rows)} rows${i ? ` (−${n0(d.cleaning[i - 1].rows - c.rows)})` : ""}</li>`).join("") + "</ol>",
      keys: ["cleaning", "data cleaning", "preprocessing", "dirty data", "duplicates", "missing customer id", "returns", "how many rows"],
    });
    add({
      id: "retail-data", kind: "data", project: "retail", title: "What data this project uses", label: `${NAMES.retail} · Data`, href: "retail.html",
      body: `<p>A public Kaggle dataset of transactions from a UK online retailer, ${d.kpis.start} to ${d.kpis.end}: ${n0(d.cleaning[0].rows)} raw rows. After cleaning, ${n0(d.kpis.customers)} identified customers and ${n0(d.kpis.orders)} orders remain, worth about £${n0(d.kpis.revenue)}.</p>`,
      keys: ["dataset", "data source", "kaggle", "where is the data from", "how many rows", "how big"],
    });
  }
  if (data.pump) {
    const d = data.pump, k = d.kpis;
    add({
      id: "pump-failures", kind: "data", project: "pump", title: "The seven failures, one by one", label: `${NAMES.pump} · Numbers`, href: "pump.html#dashboard",
      body: "<ul>" + d.failures.map((f) => `<li><b>${f.time}:</b> ${f.recovery_h} h to recover; ` +
        (f.hit ? `alert active ${f.lead_h} h before${f.capped ? " (capped at the window)" : ""}` : "no alert before it") + "</li>").join("") + "</ul>",
      keys: ["which failures", "each failure", "caught", "missed", "detected", "false negative", "table"],
    });
    add({
      id: "pump-sweep", kind: "data", project: "pump", title: "Alert settings I tried", label: `${NAMES.pump} · Numbers`, href: "pump.html#dashboard",
      body: `<p>I tested nine alert settings (drift threshold × number of sensors drifting). The one I chose (${d.chosen.thr} SD on ${d.chosen.k}+ sensors) flags ${d.chosen.hits} of ${k.failures} failures at ${d.chosen.false_per_30d} false alerts a month, with an alert on in ${d.chosen.chance_pct}% of random normal windows.</p><ul>` +
        d.sweep.map((s) => `<li>${s.thr} SD, ${s.k}+ sensors: ${s.hits} of ${k.failures} flagged, ${s.false_per_30d} false alerts per 30 days, ${s.chance_pct}% chance rate</li>`).join("") + "</ul>",
      keys: ["settings", "threshold", "false alarm", "false positive", "tuning", "precision", "accuracy", "chance", "alert rule"],
    });
    const hits = d.failures.filter((f) => f.hit);
    const coveredH = hits.reduce((a, f) => a + f.recovery_h, 0);
    const falseAlerts = (d.chosen.false_per_30d * k.days) / 30;
    const net = coveredH * 0.5 * 5000 - falseAlerts * 2 * 120;
    add({
      id: "pump-calc", kind: "data", project: "pump", title: "What the warning is worth (cost model)", label: `${NAMES.pump} · Calculator`, href: "pump.html#dashboard",
      body: `<p>The page has an adjustable downtime-cost calculator. The ${coveredH.toFixed(0)} downtime hours in the failures the alert flagged come from the data. Dollar inputs are placeholders: with $5,000 per hour of downtime, half of it avoidable, and 2 technician hours at $120 per false alert, the net value is about $${n0(Math.round(net))} over the ${k.days} days. Change the inputs to a real plant's numbers to get a real answer.</p>`,
      keys: ["cost", "money", "savings", "roi", "value", "business impact", "dollars", "worth", "calculator", "how much would it save"],
    });
    add({
      id: "pump-data", kind: "data", project: "pump", title: "What data this project uses", label: `${NAMES.pump} · Data`, href: "pump.html",
      body: `<p>A public Kaggle dataset of pump sensor readings: ${n0(k.rows)} readings from ${k.sensors} sensors, one per minute, from ${k.start} to ${k.end} (${k.days} days), with a status label of normal, recovering or broken. It records ${k.failures} failures. My five years in pump service shaped what I looked for.</p>`,
      keys: ["dataset", "data source", "kaggle", "where is the data from", "how many rows", "how big", "grundfos", "why pumps"],
    });
  }
  return docs;
}

/* Short chip labels; the full question is what actually gets asked. */
export function suggestionsFor(page) {
  const by = {
    home: [
      ["Pump project results", "What did you find in the pump project?"],
      ["My background", "Tell me about your background"],
      ["Which project first?", "Which project should I look at first?"],
      ["Hardest problem", "What was the hardest problem you hit?"],
      ["Skills & tools", "Which tools and languages do you use?"],
      ["Contact", "How can I contact you?"],
    ],
    olist: [
      ["Late delivery vs. reviews", "How much does late delivery hurt reviews?"],
      ["Slowest states", "Which states have the most late deliveries?"],
      ["Joining nine tables", "How did you join the nine tables?"],
      ["What went wrong", "What went wrong in this project?"],
    ],
    retail: [
      ["What is RFM?", "What is RFM?"],
      ["Who are the Champions?", "Who are the Champions?"],
      ["Data cleaning", "How did you clean the data?"],
      ["What went wrong", "What went wrong in this project?"],
    ],
    pump: [
      ["Did the alert work?", "Did the alert actually work?"],
      ["Missed failures", "Why didn't it catch every failure?"],
      ["What is it worth?", "What would the warning be worth?"],
      ["What went wrong", "What went wrong in this project?"],
    ],
  };
  return (by[page] || by.home).map(([label, q]) => ({ label, q }));
}
