const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DESIGN_KEYWORDS = /\bui\b|\bux\b|product design|interaction design|visual design/i;

const EMPLOYMENT_LABELS = {
  "full time": "Full-time",
  "part time": "Part-time",
  "contract": "Contract",
  "internship": "Internship",
  "freelance": "Freelance",
};

const SOURCES = [
  { path: "remote-design-jobs-in-canada", country: "Canada" },
  { path: "remote-design-jobs-in-united-states", country: "USA" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmploymentType(raw) {
  if (!raw) return "Unspecified";
  const key = raw.toLowerCase().trim();
  return EMPLOYMENT_LABELS[key] || raw.trim();
}

function parseSalary(text) {
  if (!text) return { text: null, value: null };
  const clean = text.replace(/^[^\w$]*/, "").trim();
  const matches = clean.match(/[\d,.]+\s*[kK]?/g);
  if (!matches) return { text: clean, value: null };
  let max = 0;
  for (const m of matches) {
    let n = parseFloat(m.replace(/,/g, ""));
    if (/[kK]$/.test(m.trim())) n *= 1000;
    if (n > max) max = n;
  }
  return { text: clean, value: max || null };
}

function parseRelativeDate(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(minute|hour|day|week|month)/i);
  if (!match) return new Date().toISOString();
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const msPerUnit = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() - amount * msPerUnit[unit]).toISOString();
}

async function scrapeDailyRemote(sourcePath, countryLabel) {
  const url = `https://dailyremote.com/${sourcePath}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ui-jobs-board-personal-scraper/1.0)" },
  });
  if (!res.ok) throw new Error(`DailyRemote (${countryLabel}): HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];
  $("article.js-card").each((_, el) => {
    const card = $(el);
    const titleLink = card.find("h2.job-position a").first();
    const title = titleLink.text().trim();
    if (!title || !DESIGN_KEYWORDS.test(title)) return;

    const href = titleLink.attr("href");
    if (!href) return;
    const jobUrl = new URL(href, "https://dailyremote.com").toString();

    const nameSpans = card
      .find(".company-name")
      .first()
      .find("span")
      .map((i, s) => $(s).text().trim())
      .get()
      .filter((t) => t && t !== "·" && t !== "&middot;");
    const employmentType = normalizeEmploymentType(nameSpans[0] || "");
    const postedText = nameSpans[nameSpans.length - 1] || "";

    let salaryText = null;
    let salaryValue = null;
    card.find(".job-meta .card-tag").each((i, tagEl) => {
      const tagText = $(tagEl).text().trim();
      if (tagText.includes("$")) {
        const parsed = parseSalary(tagText);
        salaryText = parsed.text;
        salaryValue = parsed.value;
      }
    });

    const dataId = card.attr("data-id") || jobUrl;

    jobs.push({
      id: `dailyremote-${dataId}`,
      title,
      company: "Hidden by DailyRemote (view on site)",
      url: jobUrl,
      remoteType: "remote",
      employmentType,
      country: countryLabel,
      salaryText,
      salaryValue,
      date: parseRelativeDate(postedText),
      source: "DailyRemote",
    });
  });

  return jobs;
}

async function main() {
  const allJobs = [];
  let anySucceeded = false;
  for (const { path: sourcePath, country } of SOURCES) {
    try {
      const jobs = await scrapeDailyRemote(sourcePath, country);
      console.log(`DailyRemote (${country}): ${jobs.length} matching jobs`);
      allJobs.push(...jobs);
      anySucceeded = true;
    } catch (err) {
      console.error(`Failed to scrape DailyRemote (${country}):`, err.message);
    }
    await sleep(1500);
  }

  if (!anySucceeded) {
    console.error("All sources failed - leaving existing scraped-jobs.json untouched.");
    return;
  }

  const outPath = path.join(__dirname, "..", "scraped-jobs.json");
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), jobs: allJobs }, null, 2));
  console.log(`Wrote ${allJobs.length} jobs to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
