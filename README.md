# UI Designer Jobs

A static web page that pulls current UI / UX / Product Designer job listings
in Canada and the US and lets you filter and sort them by work setup
(remote / on-site / hybrid), employment type, country, and salary.

No backend, no build step — open `index.html` (or host it) and it fetches
fresh listings straight from the source APIs in your browser.

## Data sources

- [Jobicy](https://jobicy.com/) — remote jobs API, tag-filtered for design roles, fetched live in the browser
- [Arbeitnow](https://www.arbeitnow.com/) — job board API, filtered client-side for UI/UX/product design roles, fetched live in the browser
- [DailyRemote](https://dailyremote.com/) — scraped from their public Canada/US design-jobs listing pages (see `scraper/`), committed as `scraped-jobs.json`. Company names are intentionally left as "Hidden by DailyRemote" since that's how they're gated on the listing page itself.

Coverage depends on what each service currently has listed, so this won't be
exhaustive — it's meant as a quick daily-glance dashboard rather than a full
job search engine.

Note: "hybrid" and "on-site" listings will be rare since these sources lean
heavily toward remote-only postings.

### Sites intentionally not scraped

- **LinkedIn, Indeed** — both explicitly prohibit automated scraping in their
  robots.txt / Terms of Service.
- **RemoteRocketship** — blocks non-browser requests behind a Cloudflare bot
  challenge.
- **4dayweek.io** — its only source of job data is `/api/jobs`, which its
  robots.txt explicitly disallows crawling.

### Why DailyRemote isn't on a schedule

DailyRemote returns HTTP 403 for GitHub Actions' IP ranges specifically (it
works fine from a normal residential connection). Rather than try to route
around that block, `scraped-jobs.json` is refreshed by manually running the
scraper (`workflow_dispatch` in GitHub Actions, or `node scrape.js` locally)
from time to time — it's a periodic snapshot, not a live feed.

## Running locally

Any static file server works. For example, with the bundled PowerShell
script:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8123.

You can also just open `index.html` directly in a browser, though some
browsers restrict `fetch` from `file://` pages.

## Hosting on GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, enable **Pages** for the `main` branch (root folder).
3. Your board will be live at `https://<username>.github.io/<repo>/`.
