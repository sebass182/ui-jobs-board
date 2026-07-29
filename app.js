const DESIGN_KEYWORDS = /\bui\b|\bux\b|product design|interaction design|visual design/i;

const EMPLOYMENT_LABELS = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
  "full-time": "Full-time",
  "part-time": "Part-time",
  "full time": "Full-time",
  "part time": "Part-time",
};

let allJobs = [];

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function normalizeEmploymentType(raw) {
  if (!raw) return "Unspecified";
  const key = String(raw).toLowerCase().trim();
  return EMPLOYMENT_LABELS[key] || raw;
}

function guessRemoteType({ remoteFlag, tags = [], location = "" }) {
  const haystack = `${tags.join(" ")} ${location}`.toLowerCase();
  if (haystack.includes("hybrid")) return "hybrid";
  if (remoteFlag === true) return "remote";
  if (remoteFlag === false) return "onsite";
  return "unknown";
}

function extractCountry(location) {
  if (!location) return "Unspecified";
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || location.trim();
}

function isDesignRole(title, extraText = "") {
  return DESIGN_KEYWORDS.test(title) || DESIGN_KEYWORDS.test(extraText);
}

async function fetchJobicy() {
  const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=100&tag=design");
  if (!res.ok) throw new Error(`Jobicy: ${res.status}`);
  const data = await res.json();
  return data.jobs
    .filter((j) => isDesignRole(j.jobTitle, (j.jobIndustry || []).join(" ")))
    .map((j) => {
      const hasSalary = typeof j.salaryMin === "number" && j.salaryMin > 0;
      const salaryValue = hasSalary ? (j.salaryMax || j.salaryMin) : null;
      const period = j.salaryPeriod ? `/${j.salaryPeriod.replace("yearly", "yr").replace("hourly", "hr")}` : "";
      const salaryText = hasSalary
        ? `${j.salaryCurrency || ""} ${j.salaryMin.toLocaleString()}${j.salaryMax && j.salaryMax !== j.salaryMin ? ` - ${j.salaryMax.toLocaleString()}` : ""}${period}`.trim()
        : null;
      return {
        id: `jobicy-${j.id}`,
        title: j.jobTitle,
        company: j.companyName,
        url: j.url,
        remoteType: guessRemoteType({ remoteFlag: true, tags: j.jobIndustry, location: j.jobGeo }),
        employmentType: normalizeEmploymentType((j.jobType || [])[0]),
        country: extractCountry(j.jobGeo),
        salaryText,
        salaryValue,
        date: j.pubDate ? new Date(j.pubDate) : null,
        source: "Jobicy",
      };
    });
}

async function fetchArbeitnow() {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!res.ok) throw new Error(`Arbeitnow: ${res.status}`);
  const data = await res.json();
  return data.data
    .filter((j) => isDesignRole(j.title, (j.tags || []).join(" ")))
    .map((j) => ({
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      url: j.url,
      remoteType: guessRemoteType({ remoteFlag: j.remote, tags: j.tags, location: j.location }),
      employmentType: normalizeEmploymentType((j.job_types || [])[0]),
      country: extractCountry(j.location),
      salaryText: null,
      salaryValue: null,
      date: j.created_at ? new Date(j.created_at * 1000) : null,
      source: "Arbeitnow",
    }));
}

function populateFilterOptions(jobs) {
  const typeSelect = document.getElementById("filter-type");
  const countrySelect = document.getElementById("filter-country");

  const types = [...new Set(jobs.map((j) => j.employmentType))].sort();
  const countries = [...new Set(jobs.map((j) => j.country))].sort();

  typeSelect.innerHTML = '<option value="">Any employment type</option>' +
    types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

  countrySelect.innerHTML = '<option value="">Any country</option>' +
    countries.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function applyFiltersAndRender() {
  const search = document.getElementById("search").value.trim().toLowerCase();
  const location = document.getElementById("filter-location").value;
  const type = document.getElementById("filter-type").value;
  const country = document.getElementById("filter-country").value;
  const onlyWithSalary = document.getElementById("filter-salary").checked;
  const sortBy = document.getElementById("sort-by").value;

  let filtered = allJobs.filter((j) => {
    if (search && !`${j.title} ${j.company}`.toLowerCase().includes(search)) return false;
    if (location && j.remoteType !== location) return false;
    if (type && j.employmentType !== type) return false;
    if (country && j.country !== country) return false;
    if (onlyWithSalary && !j.salaryValue) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
    if (sortBy === "salary") return (b.salaryValue || 0) - (a.salaryValue || 0);
    return (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
  });

  render(filtered);
}

function render(jobs) {
  const container = document.getElementById("results");
  const status = document.getElementById("status");
  status.textContent = `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`;

  container.innerHTML = jobs.map((j) => `
    <div class="job-card">
      <h3><a href="${encodeURI(j.url)}" target="_blank" rel="noopener">${escapeHtml(j.title)}</a></h3>
      <div class="job-company">${escapeHtml(j.company || "Unknown company")}</div>
      <div class="job-meta">
        <span class="tag ${escapeHtml(j.remoteType)}">${escapeHtml(j.remoteType)}</span>
        <span class="tag">${escapeHtml(j.employmentType)}</span>
        <span class="tag">${escapeHtml(j.country)}</span>
        <span class="tag">${escapeHtml(j.salaryText || "Salary n/a")}</span>
        <span class="tag">${escapeHtml(j.source)}</span>
      </div>
      <div class="job-date">${j.date ? escapeHtml(j.date.toLocaleDateString()) : ""}</div>
    </div>
  `).join("");
}

async function loadJobs() {
  const status = document.getElementById("status");
  status.textContent = "Loading jobs...";
  document.getElementById("results").innerHTML = "";

  const results = await Promise.allSettled([fetchJobicy(), fetchArbeitnow()]);
  allJobs = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    console.warn("Some sources failed to load:", failed.map((r) => r.reason));
  }

  if (allJobs.length === 0) {
    status.textContent = "No jobs found (sources may be unavailable right now).";
    return;
  }

  populateFilterOptions(allJobs);
  applyFiltersAndRender();
}

["search", "filter-location", "filter-type", "filter-country", "filter-salary", "sort-by"].forEach((id) => {
  document.getElementById(id).addEventListener("input", applyFiltersAndRender);
});
document.getElementById("refresh").addEventListener("click", loadJobs);

loadJobs();
