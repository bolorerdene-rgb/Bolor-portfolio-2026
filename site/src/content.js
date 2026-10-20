// All page copy lives here so it can be edited in one place.
// Profile, skills, experience and education come from the CV (Bolor-Erdene Altanmunkh - 8.pdf).
import { n0 } from "./fmt.js";

export const profile = {
  name: "Bolor-Erdene Altanmunkh",
  role: "Data Analyst",
  headline: "I turn messy operational data into decisions.",
  lede:
    "Data analyst with a University of Arizona degree in Information Science and five years in industrial pump service and project management. " +
    "I analyze the data behind customers, orders and equipment, and I show my work in live dashboards instead of slide decks.",
  about: [
    "I work in SQL, Python, Power BI and ETL pipelines, with a focus on data cleaning, exploratory analysis, and turning complex engineering " +
      "and operational data into actionable insights. My background in industrial systems and project management means I'm used to " +
      "working across teams and asking what a number means for the people running the operation.",
    "The three projects below use real, messy public datasets. Each one has an interactive dashboard, a plain-language summary " +
      "of what I did, and an honest account of what went wrong along the way.",
  ],
  facts: [
    ["Based in", "Los Angeles, California"],
    ["Degree", "B.S. Information Science (Data Emphasis), University of Arizona, May 2026"],
    ["Open to", "Data analyst and business intelligence roles"],
    ["Email", "bolorerdene.altanmunkh@gmail.com"],
  ],
  links: [
    { label: "Email me", href: "mailto:bolorerdene.altanmunkh@gmail.com", primary: true },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/bolor-altanmunkh/" },
  ],
};

export const skills = [
  { group: "Languages", items: ["Python (pandas, NumPy)", "SQL", "R", "C / C++"] },
  { group: "Data tools", items: ["Power BI", "Tableau", "Excel", "ETL pipelines"] },
  { group: "Concepts", items: ["Data cleaning", "Exploratory data analysis", "Data modeling", "Data warehousing", "Business intelligence", "Data reporting", "Data visualization"] },
  { group: "Used in this portfolio", items: ["Apache ECharts", "JavaScript", "Git", "Cohort & RFM analysis", "Time-series & anomaly detection"] },
  { group: "Domain knowledge", items: ["Industrial pumps & service", "Predictive maintenance", "Project management", "Customer experience", "E-commerce metrics"] },
];

export const experience = [
  {
    when: "Feb 2026 – Present",
    title: "SALT Center Tutor",
    org: "University of Arizona · Tucson, Arizona",
    bullets: [
      "One-on-one tutoring in Python, SQL and data engineering concepts, including data cleaning and exploratory data analysis.",
      "Support 10+ students weekly in programming, business intelligence and data analysis.",
      "Translate complex technical topics into structured, actionable learning steps and clear data reporting practices.",
    ],
  },
  {
    when: "2022 – 2025",
    title: "Senior Service Engineer",
    org: "MZE LLC · Ulaanbaatar, Mongolia",
    bullets: [
      "Led the initiative to achieve Grundfos Authorized Service Partner certification for the organization.",
      "Built Mongolia's first certified pump service center, expanding national service capability.",
      "Developed a pump testing station for performance and quality validation.",
      "Turned complex operational data into visual insights that informed engineering and business decisions.",
      "Worked with international partners to improve service standards and processes.",
    ],
  },
  {
    when: "2020 – 2022",
    title: "Project Manager",
    org: "MZE LLC · Ulaanbaatar, Mongolia",
    bullets: [
      "Managed engineering projects, coordinating between clients and technical teams.",
      "Improved operational efficiency through structured communication and planning.",
      "Aligned project deliverables with stakeholder expectations across teams.",
    ],
  },
  {
    when: "2018 – 2019",
    title: "Teaching Assistant, C Programming",
    org: "University of Arizona · Tucson, Arizona",
    bullets: [
      "Led lab sessions and supported students in learning core programming concepts.",
      "Evaluated assignments and gave structured feedback.",
    ],
  },
];

export const education = [
  {
    when: "May 2026",
    title: "B.S. Information Science, Data Emphasis",
    org: "University of Arizona, Information Science College · Tucson, Arizona",
    bullets: ["GPA 3.8 / 4.0", "Magna Cum Laude", "Distinguished Undergraduate Scholar Award", "Dean's Distinguished Student List"],
  },
];

/* Work hosted elsewhere, linked from the homepage. */
export const externalProjects = [
  {
    href: "http://149.165.152.35/",
    n: "University of Arizona · Jan – May 2026",
    title: "Biosphere 3 Project",
    blurb: "A live data dashboard web application to visualize, analyze and report on real-world data, with an interactive large language model dialogue page for exploring data-driven interactions.",
    tags: ["Web dashboard", "Data reporting", "LLM dialogue page"],
  },
];

export const projects = [
  {
    key: "olist",
    href: "olist.html",
    n: "Project 01",
    title: "Delivery speed vs. customer satisfaction",
    blurb: "Nine relational tables from a Brazilian marketplace, joined into one story about how late deliveries wreck review scores.",
    tags: ["Python", "Multi-table joins", "Customer experience", "Segmentation by state & category"],
    stat: (d) => ({ big: `${d.kpis.score_on_time} → ${d.kpis.score_late}`, small: "average review score, on-time vs. late orders" }),
  },
  {
    key: "retail",
    href: "retail.html",
    n: "Project 02",
    title: "Who is worth retaining? RFM & cohorts",
    blurb: "A deliberately messy UK retail ledger, cleaned and turned into customer segments, retention curves and a revenue concentration story.",
    tags: ["Python", "Data cleaning", "RFM", "Cohort retention"],
    stat: (d) => {
      const c = d.segments[0];
      return { big: `${c.cust_share}% → ${c.rev_share}%`, small: "of customers (Champions) vs. their share of revenue" };
    },
  },
  {
    key: "pump",
    href: "pump.html",
    n: "Project 03",
    title: "Can sensors warn us before a pump fails?",
    blurb: "52 sensors, 5 months, 7 failures. An early-warning rule, tested against chance and priced in downtime hours.",
    tags: ["Python", "Time series", "Predictive maintenance", "Cost model"],
    stat: (d) => {
      const covered = d.failures.filter((f) => f.hit).reduce((a, f) => a + f.recovery_h, 0);
      return { big: `${d.chosen.hits} of ${d.kpis.failures}`, small: `failures flagged ahead of time, covering ${Math.round((covered / d.kpis.down_h) * 100)}% of downtime hours (the rest gave no warning)` };
    },
  },
];

/* ======================================================================
   Project write-ups. Each function receives the project's JSON so every
   number in the prose is computed from the same data as the charts.
   ====================================================================== */

export const olistText = {
  title: "Delivery speed vs. customer satisfaction",
  crumb: "Project 01 · Olist Brazilian e-commerce",
  tags: ["Python · pandas", "9 relational tables", "~96k delivered orders", "2016–2018"],
  headline: (d) =>
    `Orders that arrive late average ${d.kpis.score_late} stars. Orders that arrive on time average ${d.kpis.score_on_time}. ` +
    `The damage is a cliff, not a slope: past a week late, the average is ${d.buckets[5].avg_score}.`,
  did: (d) => [
    `<b>Joined nine tables into one row per delivered order</b> (${n0(d.kpis.delivered_orders)} orders): value, category and seller from the order's first item, state from the customer table, and the latest review.`,
    `<b>Measured delivery against the promised date</b>, not against the purchase date. A 20-day delivery to a remote state isn't "late" if that's what the customer was promised.`,
    `<b>Split the gap into six buckets</b> rather than one late/on-time flag, because the interesting part is how fast satisfaction falls.`,
    `<b>Cut the same measure</b> by state, product category, seller and month, then built the dashboard below. The state filter re-scopes the delivery charts.`,
  ],
  findings: (d) => {
    const b = d.buckets;
    const bigStates = d.states.filter((s) => s.orders >= 1000).sort((a, z) => z.late_pct - a.late_pct);
    const worst = bigStates[0];
    const sp = d.states.find((s) => s.state === "SP");
    const worstCat = d.categories[0];
    return [
      `<b>${d.kpis.late_pct}% of orders arrive late</b>, yet they drag the overall average to ${d.kpis.avg_score}. A small group does a lot of damage.`,
      `Up to 3 days late still holds ${b[3].avg_score} stars. Between 3 and 7 days it falls to ${b[4].avg_score}, and beyond a week to ${b[5].avg_score}, where ${b[5].low_pct}% of customers leave 1 or 2 stars.`,
      `<b>${worst.state}</b> has the highest late rate among large states (${worst.late_pct}%), against ${sp.late_pct}% in São Paulo.`,
      `The lowest-rated large category is <b>${worstCat.category}</b> (${worstCat.avg_score} stars), but its late rate (${worstCat.late_pct}%) is close to the ${d.kpis.late_pct}% overall, so delivery alone doesn't explain it.`,
    ];
  },
  struggles: (d) => [
    {
      title: "Joins that quietly multiply rows",
      problem: "The items table has one row per item, so joining it straight onto orders and reviews duplicates orders and inflates every count and average.",
      fix: "I collapsed items to one row per order before joining, and checked row counts after every join. The trade-off: category and seller come from the first item, so multi-category orders are simplified.",
    },
    {
      title: `${n0(d.facts.orders_multi_review)} orders have more than one review`,
      problem: "Some customers reviewed the same order twice. Averaging or counting both would give those orders extra weight.",
      fix: "I kept the most recent review per order, on the assumption that the later one reflects how things ended.",
    },
    {
      title: "\"Late\" is rare because the promise is padded",
      problem: `Typical orders arrive ${d.kpis.median_days_early} days before the estimate, so only ${d.kpis.late_pct}% are late. A single late flag hides how much room there is between early and truly bad.`,
      fix: "I bucketed the delivery gap into six bands. That's where the cliff past three days late became visible. The on-time orders are not one group either.",
    },
    {
      title: "Missing pieces everywhere",
      problem: `${n0(d.facts.orders_not_delivered)} orders were never delivered, ${d.facts.delivered_missing_date} \"delivered\" orders had no delivery date, ${n0(d.facts.orders_no_review)} delivered orders had no review, and ${n0(d.facts.products_no_category)} products had no category.`,
      fix: "I limited the analysis to delivered orders with dates, and rated orders for score metrics. Products without a category are excluded from the category chart rather than guessed.",
    },
    {
      title: "Correlation is not proof",
      problem: "Remote states have both longer shipping and more late orders, and only some customers leave reviews. So late delivery and low scores travel together, but I haven't shown that lateness alone causes the drop.",
      fix: "I describe the pattern and its size, and I say plainly that it isn't a controlled estimate. A next step would be comparing similar orders (same state, same category) with and without a delay.",
    },
  ],
};

export const retailText = {
  title: "Who is worth retaining? RFM segments & cohort retention",
  crumb: "Project 02 · UK online retailer, Dec 2010 – Dec 2011",
  tags: ["Python · pandas", "541,909 raw rows", "RFM", "Cohort analysis"],
  headline: (d) =>
    `A quarter of customers (${d.segments[0].cust_share}%) generate ${d.segments[0].rev_share}% of revenue. The top 20% of customers bring in ${d.pareto_facts.top20_share}%. Knowing who they are is the most valuable thing this data can tell a retention team.`,
  did: (d) => [
    `<b>Cleaned ${n0(d.cleaning[0].rows)} rows down to ${n0(d.cleaning.at(-1).rows)}</b> real sales lines (${d.kpis.rows_kept_pct}%), logging how many rows each rule removed.`,
    `<b>Scored every customer on Recency, Frequency and Monetary value</b> (1–5 each) and grouped them into six named segments.`,
    `<b>Grouped customers by the month of their first purchase</b> and tracked how many came back in each later month.`,
    `<b>Added the context a retention team would ask about:</b> revenue concentration, return rates, geography, and when orders are placed.`,
  ],
  findings: (d) => {
    const avgRet = d.returns.slice(0, -1).reduce((a, r) => a + r.return_pct, 0) / (d.returns.length - 1);
    const dec = d.cohort.cells.find((c) => c[0] === 11 && c[1] === 0);
    const m1s = d.cohort.cells.filter((c) => c[0] === 1 && c[1] >= 1).map((c) => c[2]);
    const m1 = m1s.reduce((a, b) => a + b, 0) / m1s.length;
    return [
      `<b>${d.segments[0].segment}</b> are ${d.segments[0].cust_share}% of customers and ${d.segments[0].rev_share}% of revenue. The bottom segment, ${d.segments[5].segment}, is ${d.segments[5].cust_share}% of customers but only ${d.segments[5].rev_share}% of revenue.`,
      `On average <b>${m1.toFixed(0)}%</b> of a new monthly cohort buys again the next month (leaving out the first cohort). After that, retention holds roughly level rather than collapsing.`,
      `Of the ${n0(d.cohort_facts.dec10_size)} customers in the first (Dec 2010) cohort, ${dec ? dec[2] : "–"}% were still buying 11 months later.`,
      `Returns and cancellations cost roughly <b>${avgRet.toFixed(1)}%</b> of gross sales in an average month.`,
    ];
  },
  struggles: (d) => {
    const c = d.cleaning;
    const rm = (i) => n0(c[i - 1].rows - c[i].rows);
    return [
      {
        title: `A quarter of the rows have no customer`,
        problem: `${d.kpis.missing_id_pct}% of raw rows have no CustomerID (${d.kpis.missing_id_rev_pct}% of sales revenue). RFM needs a customer, so these rows can't be scored.`,
        fix: "I excluded them from customer-level work and said so. Every KPI on this page covers identified customers only, so revenue is understated compared with the full ledger.",
      },
      {
        title: "Cancellations aren't just negative numbers",
        problem: `Returns appear as separate invoices starting with "C" and negative quantities. They can't be matched back to the original sale, so I couldn't net them off a specific customer.`,
        fix: `I measured the return rate on the raw table first, then removed cancellations (${rm(2)} rows) from the sales analysis. The trade-off is that per-customer revenue is gross, not net of returns.`,
      },
      {
        title: "Rows that aren't sales at all",
        problem: `${rm(1)} exact duplicate rows, ${rm(3)} lines with zero price or negative quantity, and ${rm(4)} lines for postage, bank charges and manual adjustments.`,
        fix: "I removed each class with its own rule and recorded the row counts, so the cleaning is auditable (see the cleaning chart).",
      },
      {
        title: "Frequency ties broke my quintiles",
        problem: "Most customers placed only a handful of orders, so \"top 20% by frequency\" has huge ties, and quantile cuts fail on duplicate bin edges.",
        fix: "I ranked customers with ties broken by order of appearance before cutting into fifths. Scores are balanced, but individual boundaries are approximate. I treat segments as groups, not hard rules.",
      },
      {
        title: "The last month isn't a month",
        problem: "The data ends on 9 December 2011. Plotted naively, December looks like a collapse in sales.",
        fix: "I shaded the partial month on the revenue chart and left it out of the cohort grid.",
      },
      {
        title: "The first cohort isn't really new",
        problem: "The dataset begins in December 2010, so that cohort is simply everyone who bought that month, including long-standing customers. Its retention is flattered.",
        fix: "I flagged it on the chart. I also noticed the retailer has no Saturday trading in this data, which I report rather than explain away.",
      },
    ];
  },
};

const dayOf = (f) => f.time.split(" ").slice(0, 2).join(" ");
const pumpHits = (d) => d.failures.filter((f) => f.hit);
const pumpCoveredPct = (d) => Math.round((pumpHits(d).reduce((a, f) => a + f.recovery_h, 0) / d.kpis.down_h) * 100);

export const pumpText = {
  title: "Can sensors warn us before a pump fails?",
  crumb: "Project 03 · Industrial pump sensors, Apr – Aug 2018",
  tags: ["Python · pandas · NumPy", "52 sensors", "220k readings", "7 failures"],
  headline: (d) =>
    `A drift alert on the pump's sensors gave advance warning on ${pumpHits(d).length} of ${d.kpis.failures} failures, including the longest outage. ` +
    `Those ${pumpHits(d).length} account for ${pumpCoveredPct(d)}% of downtime hours, at about ${d.chosen.false_per_30d} false alerts a month. ` +
    `The other ${d.kpis.failures - pumpHits(d).length} left no usable trace.`,
  did: (d) => [
    `<b>Built the failure timeline.</b> The data has ${d.kpis.failures} BROKEN events, each followed by a RECOVERING period. I treated that recovery time as the cost of a failure.`,
    `<b>Defined "normal"</b> from healthy operation only, leaving out the 72 hours before every failure so the baseline couldn't absorb the warning signs.`,
    `<b>Tried the simple things first.</b> Single-sensor thresholds almost never fired before a failure, and a multivariate PCA model flagged at most 2 of 7.`,
    `<b>Settled on a drift count:</b> how many of the working sensors sit more than ${d.chosen.thr} standard deviations away from their own trailing 24-hour baseline. Alert when ${d.chosen.k} or more do so for 30 minutes.`,
    `<b>Counted a warning only if the alert was still active in the final ${d.window_h} hours</b> before the failure, so a stale spike from days earlier couldn't take credit.`,
    `<b>Judged it against chance</b> and converted the result into downtime hours and an adjustable cost model.`,
  ],
  findings: (d) => {
    const ns = d.shift.n_shifted;
    const best = Object.entries(ns).sort((a, z) => z[1] - a[1])[0];
    const hits = pumpHits(d);
    const missed = d.failures.filter((f) => !f.hit);
    const long = [...d.failures].sort((a, z) => z.recovery_h - a.recovery_h)[0];
    const loose = d.sweep.find((s) => s.thr === 3 && s.k === 3);
    return [
      `<b>No single sensor is the tell.</b> The most consistent, ${best[0]}, moved clearly in only ${best[1]} of ${d.kpis.failures} failures. Each failure has its own signature.`,
      `<b>${hits.length} of ${d.kpis.failures}</b> failures were flagged in advance (${hits.map((f) => `${dayOf(f)}, ${f.lead_h} h ahead`).join("; ")}), versus a ${d.chosen.chance_pct}% chance of an alert in a random normal ${d.window_h}-hour window.`,
      long.hit
        ? `The longest outage (${long.recovery_h} h on ${dayOf(long)}) was one of them, flagged ${long.lead_h} hours ahead. That single event is most of the downtime, so it carries most of the value.`
        : `The longest outage (${long.recovery_h} h on ${dayOf(long)}) was <b>not</b> flagged, which matters because it is most of the downtime.`,
      `The other ${missed.length} (${missed.map(dayOf).join(", ")}) show no sustained drift in the final ${d.window_h} hours. With these sensors alone they would have been surprises.`,
      loose ? `Loosening the rule to ${loose.k}+ sensors at ${loose.thr} SD flags ${loose.hits} of ${d.kpis.failures} but fires ${loose.false_per_30d} times a month, and an alert is on in ${loose.chance_pct}% of random normal windows. That is noise.` : "",
    ].filter(Boolean);
  },
  struggles: (d) => {
    const maxFalse = Math.max(...d.sweep.map((s) => s.false_per_30d));
    const maxChance = Math.max(...d.sweep.map((s) => s.chance_pct));
    return [
      {
        title: "Only seven failures",
        problem: "Seven events is far too few to train and honestly test a classifier. A model could memorise them and report a flattering accuracy.",
        fix: "I used a transparent rule, evaluated it on all seven, and say clearly that n = 7. I would not quote an accuracy figure from this.",
      },
      {
        title: "My first two approaches failed",
        problem: "Per-sensor thresholds almost never fired before a failure, and a PCA reconstruction-error model flagged at most 2 of 7.",
        fix: "Looking at what actually moved before each failure showed the signal is spread thinly across many sensors. That pushed me to count drifting sensors rather than watch any single one.",
      },
      {
        title: "My first result flattered the alert",
        problem: `I first counted an alert anywhere in the 72 hours before a failure and got 5 of 7. Then I plotted the traces. Two of those "warnings" were short spikes at the very start of the window (one within hours of the pump restarting from its previous outage) that had faded long before the failure.`,
        fix: `I tightened the rule so the alert must still be active in the final ${d.window_h} hours. The score fell to ${pumpHits(d).length} of ${d.kpis.failures}. I would rather report the smaller, honest number.`,
      },
      {
        title: "A warning that fires all the time proves nothing",
        problem: `At the loosest setting the alert fires ${maxFalse} times a month and is on in ${maxChance}% of random normal windows, so it "catches" failures by luck.`,
        fix: `I measured that chance rate for every setting, then picked the one that catches the most failures while keeping the chance rate under 20%. The whole sweep is on the page.`,
      },
      {
        title: "I tuned on the same seven failures",
        problem: `I chose the setting after seeing these failures, so ${pumpHits(d).length} of ${d.kpis.failures} is optimistic. There is no unseen data to test on.`,
        fix: "I show every setting I tried rather than one lucky result. A real deployment would have to be validated on future failures first.",
      },
      {
        title: "Dead and patchy sensors",
        problem: `${d.kpis.empty_sensor} is completely empty and ${d.kpis.sensors_with_gaps - 1} other sensors have notable gaps, one missing over a third of its readings.`,
        fix: "I dropped the empty sensor and filled only short gaps (up to one hour), so I wasn't inventing hours of data.",
      },
      {
        title: "No cost data, and not a full year",
        problem: `The dataset covers ${d.kpis.days} days, not a year, and has no cost information.`,
        fix: "Downtime hours come from the data. Dollar figures come from inputs you can change in the calculator, and I label them as assumptions.",
      },
    ];
  },
};
