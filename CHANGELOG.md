# Changelog — Quantix

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking change or complete redesign
- **MINOR** — new feature or significant improvement
- **PATCH** — bug fix, copy change, or small tweak

> **Process:** Before every publish, add a new `## [vX.Y.Z]` section at the top of this file describing what changed. Keep the `[Unreleased]` section for changes not yet published.

---

## [Unreleased]

---

## [4.0.0] — 2026-03-31

> Published to https://quantix-qa.replit.app/

### Added
- **Split-panel export layout** — When Automation Ready Output toggle is enabled, the export section renders as two equal columns: Manual Export (left) and Automation Scripts (right) with green-styled buttons
- **Export gate logic** — Automation Scripts panel (Playwright / Cypress / Postman) only appears when the toggle was enabled **at generation time**; toggling after the fact does not unlock exports that were not generated
- **Production quota corrected to 3/day** — Used `REPLIT_DEPLOYMENT=1` env var (set automatically by Replit on every deployment) to reliably detect production; previous `NODE_ENV` check was not being set and caused all users to get the 50/day dev limit
- **Dynamic quota error message** — Error message now reads the actual `limitPerDay` from the server response instead of hardcoding a number

### Fixed
- **Stale closure bug in `handleGenerate`** — `automationReady` was missing from the `useCallback` dependency array, causing the function to always read the initial `false` value regardless of toggle state; automation scripts now correctly reflect the toggle at generation time

---

## [3.0.0] — 2026-03-31

> Published to https://quantix-qa.replit.app/

### Added
- **Context Enrichment** — Upload PDFs, DOCX, TXT documents or UI screenshots (up to 3 files, 5 MB each) alongside the user story; an LLM summarisation step extracts flows, validations, and edge cases which are injected into the generation prompt for richer, more specific test cases
- **Expandable test case cards** — Results render as collapsible cards; each card shows ID, priority, type badges, and step count; click to expand the full step table with smooth animation and a rotating chevron; individual Copy button with green tick confirmation
- **New Test Case button** — Single reset button that clears all state (user story, files, context, results, toggles, feedback) and scrolls to top; appears above Generate when content exists and in the results header
- **Feedback system** — Thumbs up / thumbs down rating with optional free-text comment per generated batch; submitted to `POST /api/feedback`
- **Automation export improvements** — `multitype` action expands multi-field test data into one line per field in Playwright and Cypress; Postman infers request body from all test data across steps (not just explicit API request steps)
- **Extended selector coverage** — Automation layer supports origin, destination, departureDate, cvv, and other domain fields

### Changed
- **Context panel label** updated to "+ Add files like BRD, Design docs or Screenshots"
- **Drop zone text** is now dynamic — shows "Add more files" after the first upload
- **File list** replaced with pill-shaped chips with remove buttons
- **Clear/reset UX** — replaced separate "Clear" and "✕ Clear Results" buttons with the single unified New Test Case button

### Fixed
- **PDF parsing** — Four-level fallback chain: standard parser → tolerant renderer → first-page-only → raw binary BT/ET regex extraction; handles "Invalid number: - (charCode 45)" and similar tokeniser errors
- **pdf-parse version** locked to v1.1.1 (newer versions export a class, not a function)

---

## [2.0.0] — 2026-03-26

> Published to https://quantix-qa.replit.app/

### Added
- **Multi-provider LLM backend** — Configurable via `LLM_PROVIDER` env var; supports Gemini (default), OpenAI, Azure OpenAI, Anthropic Claude, Groq, and local Ollama — no code changes required to switch
- **Automation Ready exports** — Playwright (`.spec.js`), Cypress (`.cy.js`), and Postman (`.json`) scripts generated instantly via pattern-based step classifier (no second AI call)
- **Automation Ready toggle** — Optional toggle before generation; optimises steps with selectors, actions, and test data hints for automation export
- **Jira (Zephyr) CSV export** — One row per step, compatible with Zephyr Scale direct import
- **Jira Import Guide modal** — Step-by-step instructions and field mapping for Zephyr CSV import
- **Demo video** — Animated product demo with voiceover narration available at `/demo`
- **Safe JSON parser** — Strips `<thinking>` tags, uses `indexOf/lastIndexOf`, and repairs truncated JSON from LLM responses
- **Token limit** increased to 16,000 for main generation to avoid truncated responses
- **IP detection improved** — Reads `x-forwarded-for` header for accurate quota tracking behind proxies
- **Quota env override** — `DAILY_QUOTA_LIMIT` env var lets operators override the per-day limit without code changes

### Changed
- **Default LLM provider** switched to Google Gemini 2.5 Flash
- **Quota** set to environment-aware: production 5/day, development 50/day (via `NODE_ENV`)

---

## [1.0.0] — 2026-03-25

> First publish to https://quantix-qa.replit.app/

### Added
- **AI test case generation** — Paste a user story, pick test types (Positive / Negative / Edge), testing layers (API / Frontend UI / Backend DB), count (3 / 5 / 8 / 10), and format (Standard / Gherkin)
- **Gherkin BDD output** — `Given / When / Then / And / But` syntax with colour-coded keyword highlighting in results
- **Test data included** in each step for both Standard and Gherkin formats
- **CSV export** — Download all test cases as a CSV file
- **Copy as Markdown** — Copy individual test cases or all results to clipboard
- **Dark glass premium theme** — Dark UI with teal/blue gradients, frosted glass cards, and blur effects
- **Light mode** — Full light mode override toggled with ☀️/🌙 button, persisted to `localStorage`
- **Animated loader** — Skeleton card with cycling messages during generation
- **Character counter** — Live 0/2000 counter on the user story input
- **Usage badge** — Shows remaining daily generations
- **Daily quota** — IP-based in-memory quota tracking
- **`GET /api/provider`** endpoint — Returns active LLM provider, model, and JSON mode support

---

## Version Summary

| Version | Date | Highlight |
|---|---|---|
| 1.0.0 | 2026-03-25 | Initial launch — AI generation, Gherkin, dark glass UI |
| 2.0.0 | 2026-03-26 | Multi-provider LLM, Automation Ready exports, Jira CSV, demo video |
| 3.0.0 | 2026-03-31 | Context Enrichment, expandable cards, feedback system, New Test Case |
| 4.0.0 | 2026-03-31 | Split-panel export UI, automation gate fix, prod quota 3/day |
