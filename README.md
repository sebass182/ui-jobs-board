# UI Designer Jobs

A static web page that pulls current UI / UX / Product Designer job listings
from public job-board APIs and lets you filter and sort them by work setup
(remote / on-site / hybrid), employment type, country, and salary.

No backend, no build step — open `index.html` (or host it) and it fetches
fresh listings straight from the source APIs in your browser.

## Data sources

- [Jobicy](https://jobicy.com/) — remote jobs API, tag-filtered for design roles
- [Arbeitnow](https://www.arbeitnow.com/) — job board API, filtered client-side for UI/UX/product design roles

Both are free public APIs with no key required. Coverage depends on what
each service currently has listed, so this won't be exhaustive — it's meant
as a quick daily-glance dashboard rather than a full job search engine.

Note: "hybrid" and "on-site" listings will be rare since both sources
lean heavily toward remote-only postings.

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
