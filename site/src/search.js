/* Tiny retrieval engine for the portfolio assistant: BM25 over the site's own text,
   plus a few intent boosts. No model, no network; it can only return text that exists on the site. */

const STOP = new Set(("a an and are as at be been but by can could did do does for from had has have how i if in into is it its " +
  "me my of on or our so than that the their them then there these they this to up us was we were what when where which who why will with would you your " +
  "tell about please show give didn don isn doesn t s actually really much many also just go went get got").split(" "));

export function stem(w) {
  if (w.length < 4) return w;
  return w.replace(/ies$/, "y").replace(/(ing|ed|es|s)$/, "");
}

export function tokens(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, " ").replace(/[^a-z0-9%]+/g, " ").split(" ")
    .filter((t) => t && !STOP.has(t)).map(stem);
}

/* Words that mean roughly the same thing here. A query word pulls in its group at half weight. */
const GROUPS = [
  "problem challenge struggle difficult hard hardest issue wrong mistake obstacle trouble fail failed",
  "find found finding result conclusion insight learn learned takeaway discover outcome",
  "did do how method approach step process built build made create technique",
  "skill tool tech technology stack language software proficient",
  "contact email reach hire hiring linkedin message touch available",
  "school degree gpa university college graduate education study studied honors",
  "job experience career employer employment role position company history background",
  "clean cleaning dirty messy missing duplicate quality handle null",
  "location located based city live reside",
  "teach taught tutor tutoring teaching teacher mentor",
  "customer client shopper buyer",
  "late delay delayed slow overdue",
  "review rating score star satisfaction",
  "sensor pump machine equipment",
  "fail failure break broken outage downtime",
  "warn warning alert alarm predict prediction early",
  "catch caught detect detected flag flagged miss missed spot",
  "retention retain return repeat churn loyal",
  "revenue sales money spend spending income",
  "segment group cluster tier",
  "chart graph plot visual dashboard visualization",
  "cost saving save value worth roi",
  "ai llm chatbot language-model",
].map((g) => g.split(" ").map(stem));

const groupOf = new Map();
GROUPS.forEach((g, i) => g.forEach((w) => { if (!groupOf.has(w)) groupOf.set(w, []); groupOf.get(w).push(i); }));

/* Query words that point at one project. */
const PROJECT_WORDS = {
  olist: "olist brazil brazilian delivery deliver shipping parcel marketplace seller state late review satisfaction order",
  retail: "retail uk rfm cohort retention segment champion customer revenue invoice cancellation return britain",
  pump: "pump sensor failure maintenance predictive alert drift downtime grundfos machine breakdown",
};
const projectOf = new Map();
for (const [k, v] of Object.entries(PROJECT_WORDS)) v.split(" ").map(stem).forEach((w) => { if (!projectOf.has(w)) projectOf.set(w, new Set()); projectOf.get(w).add(k); });

/* Tool names that mean "look at my skills", not at a project that happens to use them. */
const TOOL_WORDS = new Set("python sql tableau excel etl pandas numpy bi powerbi javascript git echarts jupyter".split(" ").map(stem));

const KIND_WORDS = [
  ["struggle", "problem challenge struggle difficult hard hardest issue wrong mistake obstacle trouble fail went"],
  ["finding", "find found finding result conclusion insight learn takeaway discover outcome"],
  ["did", "how method approach step process built build technique"],
  ["skills", "skill tool tech technology stack language software proficient"],
  ["contact", "contact email reach hire hiring touch available message"],
  ["chart", "chart graph plot visual visualization figure heatmap"],
];

const FILLER = new Set(["project", "page", "dashboard", "one", "thing", "part", "main", "biggest", "most", "were", "ran", "run", "hit", "face", "faced", "encounter", "encountered", "hardest", "toughest"].map(stem));

/* "What went wrong?", "What did you find?", "How did you do it?" with no subject: answer with a list, not one guess. */
export function intentOnly(query) {
  const qt = tokens(query);
  if (!qt.length) return null;
  const qset = new Set(qt);
  for (const [kind, words] of KIND_WORDS) {
    if (!["struggle", "finding", "did"].includes(kind)) continue;
    const kw = new Set(words.split(" ").map(stem));
    if (qt.some((t) => kw.has(t)) && qt.every((t) => kw.has(t) || FILLER.has(t) || projectOf.has(t) || (groupOf.get(t) || []).some((gi) => GROUPS[gi].some((w) => kw.has(w))))) return kind;
  }
  return null;
}

/* Which project does the question mean? A named one wins; otherwise "this project" means the page we're on. */
export function scopeOf(query, page) {
  const named = new Set();
  tokens(query).forEach((t) => (projectOf.get(t) || []).forEach((p) => named.add(p)));
  if (named.size === 1) return [...named][0];
  if (!named.size && ["olist", "retail", "pump"].includes(page)) return page;
  return null;
}

export function buildIndex(docs) {
  const N = docs.length;
  const df = new Map();
  const rows = docs.map((d) => {
    const body = tokens(d.text);
    const title = tokens(d.title);
    const all = [...title, ...title, ...tokens((d.keys || []).join(" ")), ...body];
    const tf = new Map();
    all.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
    return { d, tf, len: all.length };
  });
  const avg = rows.reduce((a, r) => a + r.len, 0) / N;
  return { rows, df, N, avg };
}

const K1 = 1.2, B = 0.75;

export function search(index, query, ctx = {}) {
  const qt = tokens(query);
  if (!qt.length) return [];
  const weights = new Map();
  qt.forEach((t) => weights.set(t, Math.max(weights.get(t) || 0, 1)));
  qt.forEach((t) => (groupOf.get(t) || []).forEach((gi) => GROUPS[gi].forEach((s) => { if (!weights.has(s)) weights.set(s, 0.5); })));

  const qProjects = new Set();
  qt.forEach((t) => (projectOf.get(t) || []).forEach((p) => qProjects.add(p)));
  const qKinds = new Set();
  const qset = new Set(qt);
  KIND_WORDS.forEach(([kind, words]) => { if (words.split(" ").map(stem).some((w) => qset.has(w))) qKinds.add(kind); });

  const toolQuery = qt.some((t) => TOOL_WORDS.has(t));
  const wantsOverview = qProjects.size === 1 && /\b(tell me about|about the|overview|summary|summari[sz]e|describe)\b/i.test(query);
  const thisRef = !qProjects.size && ["olist", "retail", "pump"].includes(ctx.page) && /\b(this|here|current)\b/i.test(query) ? ctx.page : null;

  const out = [];
  for (const r of index.rows) {
    let score = 0, hit = 0;
    weights.forEach((w, t) => {
      const f = r.tf.get(t);
      if (!f) return;
      const idf = Math.log(1 + (index.N - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
      score += w * idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * r.len) / index.avg)));
      if (w === 1) hit++;
    });
    if (!score) continue;
    const d = r.d;
    if (thisRef) score *= d.project === thisRef ? 3 : 0.4;
    else if (qProjects.size) score *= d.project && qProjects.has(d.project) ? 1.6 : d.project ? 0.8 : 1;
    else if (ctx.page && d.project === ctx.page) score *= 1.25;
    if (qKinds.has(d.kind)) score *= d.kind === "chart" ? 3 : 1.5;
    if (toolQuery && d.kind === "skills") score *= 2.2;
    if (wantsOverview && d.kind === "overview" && qProjects.has(d.project)) score *= 1.8;
    if (d.kind === "overview") score *= 1.05;
    score *= 1 + 0.15 * Math.min(hit, 4);
    out.push({ doc: d, score });
  }
  return out.sort((a, z) => z.score - a.score);
}

/* Is the best hit good enough to show as an answer rather than "I don't know"?
   Also refuse when half the question's words appear nowhere on the site ("do you like pizza"). */
export function confident(results, query, index) {
  if (!results.length) return false;
  const qt = tokens(query);
  const n = qt.length;
  if (index && n >= 2 && qt.filter((t) => !index.df.has(t)).length / n >= 0.5 && results[0].score < 6.5) return false;
  return results[0].score >= (n <= 1 ? 3.5 : 4.5);
}
