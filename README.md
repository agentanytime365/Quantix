# Quantix — AI-Powered QA Test Case Generator

Quantix is a full-stack web application that turns plain-English user stories into structured, professional QA test cases in seconds. Designed for QA engineers, developers, and product teams who need consistent, automation-ready test coverage without manual effort.

---

## Features

### Core Generation
- **AI Test Case Generation** — Paste a user story and receive fully structured test cases via a configurable multi-provider LLM backend
- **Test Types** — Positive, Negative, and Edge case coverage
- **Testing Layers** — API, Frontend UI, and Backend DB scenarios
- **Output Formats** — Standard (plain English steps) and Gherkin BDD (`Given / When / Then`)
- **Test Case Count** — Generate 3, 5, 8, or 10 test cases per run
- **Daily Quota** — 3 generations per IP per day in production; 50 per day in development (resets daily)

### Context Enrichment
Upload supporting documents alongside your user story to get richer, more specific test cases:
- **Supported Formats** — PDF, DOCX, TXT, PNG, JPG (up to 3 files, 5 MB each)
- **Document Parsing** — Multi-level PDF fallback chain handles malformed and encrypted PDFs; DOCX and TXT parsed directly
- **Image Analysis** — LLM vision analysis extracts UI flows, field labels, and validation rules from screenshots
- **Context Extraction** — A dedicated summarisation step distils uploaded content into structured flows, validations, and edge cases, which are injected into the generation prompt
- **Context Cache** — MD5-keyed in-memory cache avoids re-processing identical files across requests

### Expandable Test Case Cards
- Each test case renders as a collapsible card showing ID, priority, type badges, step count, and title
- Click any card header to expand the full step table with smooth animation and a rotating chevron
- Individual Copy button on each card with a green tick confirmation state

### Export & Automation Ready
- **Copy as Markdown** — Copy all test cases to clipboard in Markdown format
- **CSV Export** — Jira (Zephyr) ready format for direct import; one row per step
- **Playwright Export** — Executable `.spec.js` test scripts, generated instantly (no extra AI call)
- **Cypress Export** — Ready-to-run `.cy.js` test scripts, generated instantly
- **Postman Export** — Importable `.json` collection with requests, test data, and assertions, generated instantly
- **Jira Import Guide** — Built-in modal with step-by-step Zephyr CSV import instructions and field mapping

#### Split-Panel Export Layout
When the **Automation Ready Output** toggle is enabled before generating:
- The export section splits into two equal panels — **Manual Export** (left) and **Automation Scripts** (right)
- Automation export buttons (Playwright, Cypress, Postman) only appear when the toggle was on at generation time — toggling after the fact does not surface exports that were not generated

### Feedback System
- Thumbs up / thumbs down rating with optional free-text comment per generated batch
- Results submitted to `POST /api/feedback`

### UI & UX
- **Dark Glass Theme** — Premium dark UI with teal/blue gradients, frosted glass cards, and blur effects
- **Light Mode** — Full light mode override, toggled with ☀️/🌙 button, persisted to `localStorage`
- **Animated Loader** — Skeleton card with cycling messages during generation
- **Character Counter** — Live 0/2000 counter on the user story input
- **Gherkin Syntax Highlighting** — Colour-coded `Given`, `When`, `Then`, `And`, `But` keywords
- **New Test Case Button** — Single reset button that clears all state and scrolls to top; appears above Generate and in the results header
- **Usage Badge** — Shows remaining daily generations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| AI | Configurable — default: Google Gemini 2.5 Flash |
| Styling | Plain CSS (CSS custom properties, dark/light themes) |
| File Parsing | pdf-parse v1.1.1, mammoth (DOCX) |
| Icons | lucide-react |
| HTTP | Axios |
| File Downloads | Blob / `URL.createObjectURL` |

---

## Project Structure

```
quantix/
├── client/
│   └── src/
│       ├── App.jsx                        # Full React frontend — form, results, export, modals, theme
│       ├── styles.css                     # Dark glass theme, light mode, all component styles
│       └── components/
│           └── ExpandableTestCases.jsx    # Collapsible test case card grid
├── server/
│   ├── index.js                           # Express entry point (serves API + static build)
│   ├── routes.js                          # All API routes
│   └── services/
│       ├── llmProvider.js                 # LLM provider registry — reads LLM_PROVIDER env var
│       ├── openaiService.js               # Test case generation (provider-agnostic prompt layer)
│       ├── parser.js                      # Safe JSON parser with truncation repair
│       ├── quotaService.js                # IP-based daily usage tracking
│       ├── csvService.js                  # CSV export formatter
│       ├── automationReady/
│       │   ├── templateConverter.js       # Pattern-based step classifier (no AI call)
│       │   ├── playwrightService.js       # Playwright script builder
│       │   ├── cypressService.js          # Cypress script builder
│       │   └── postmanService.js          # Postman collection builder
│       └── context/
│           ├── documentProcessor.js       # PDF/DOCX/TXT extraction (4-level PDF fallback)
│           ├── imageAnalyzer.js           # LLM vision analysis for screenshots
│           ├── contextBuilder.js          # Structured context extraction via LLM summarisation
│           └── contextCache.js            # MD5-keyed in-memory dedup cache
└── package.json
```

---

## Environment Variables

### LLM Provider (configurable — no code changes needed)

| Variable | Required | Description |
|---|---|---|
| `LLM_PROVIDER` | No | Which AI provider to use. Default: `gemini`. Options: `gemini`, `openai`, `azure`, `anthropic`, `groq`, `ollama` |
| `LLM_MODEL` | No | Override the default model for the active provider |
| `LLM_BASE_URL` | Azure only | Base URL for Azure OpenAI deployments |

### API Keys (one per provider)

| Variable | Provider | Notes |
|---|---|---|
| `GEMINI_API_KEY` | `gemini` (default) | Google AI Studio key |
| `OPENAI_API_KEY` | `openai` | OpenAI platform key |
| `AZURE_OPENAI_API_KEY` | `azure` | Azure OpenAI key (also set `LLM_BASE_URL` + `LLM_MODEL`) |
| `ANTHROPIC_API_KEY` | `anthropic` | Anthropic Console key |
| `GROQ_API_KEY` | `groq` | Groq Cloud key |
| _(none)_ | `ollama` | Local Ollama — no key needed |

### Switching Providers

```bash
# Use OpenAI GPT-4o
LLM_PROVIDER=openai

# Use Anthropic Claude
LLM_PROVIDER=anthropic

# Use Azure OpenAI
LLM_PROVIDER=azure
LLM_BASE_URL=https://my-instance.openai.azure.com/openai/deployments/my-deployment
LLM_MODEL=my-deployment-name

# Use Groq (fast Llama inference)
LLM_PROVIDER=groq

# Use local Ollama
LLM_PROVIDER=ollama
LLM_MODEL=llama3
```

### Checking the Active Provider

```
GET /api/provider
→ { "provider": "gemini", "label": "Google Gemini", "model": "gemini-2.5-flash", "supportsJsonMode": true }
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- An API key for your chosen provider (default: Google Gemini — set `GEMINI_API_KEY`)

### Install & Run (Development)

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

- Backend runs on **port 3001**
- Frontend (Vite) runs on **port 5000**

### Build & Run (Production)

```bash
npm run build        # builds client/dist
node server/index.js # serves both API and static frontend on a single port
```

---

## API Reference

### `POST /api/generate-test-cases`
Generate AI-powered test cases.

**Body:**
```json
{
  "userStory": "As a user, I want to log in with my email and password...",
  "testTypes": ["positive", "negative", "edge"],
  "testingTypes": ["api", "frontend_ui", "backend_db"],
  "count": 5,
  "format": "Gherkin",
  "context": { ... }
}
```

The optional `context` field is produced by `POST /api/upload` and injected into the generation prompt for enriched output.

**Response:** `{ testCases: [...], usage: { usedToday, limitPerDay } }`

---

### `POST /api/upload`
Upload 1–3 documents or images for Context Enrichment.

**Body:** `multipart/form-data` with field `files[]`

**Response:** `{ context: { flows, validations, edgeCases, testData, ... } }`

---

### `GET /api/usage`
Get the current daily quota for the requesting IP.

**Response:** `{ usage: { usedToday, limitPerDay } }`

---

### `GET /api/provider`
Get the active LLM provider details.

**Response:** `{ provider, label, model, supportsJsonMode }`

---

### `POST /api/automation-ready/playwright`
### `POST /api/automation-ready/cypress`
### `POST /api/automation-ready/postman`
Generate an automation script from test cases (no AI call — sub-second response).

**Body:** `{ "testCases": [...] }`

**Response:** `{ code: "..." }` — script or collection content ready for download.

---

### `POST /api/feedback`
Submit a rating for the generated batch.

**Body:** `{ "rating": "positive" | "negative", "comment": "...", "testCases": [...] }`

---

## Automation Ready — How It Works

The export pipeline converts test cases to automation scripts **instantly** using a pattern-based step classifier — no second AI call is made. The converter:

1. Reads each step's `step`, `testData`, and `expectedResult` fields
2. Classifies the action (`navigate`, `click`, `type`, `select`, `assert`, `api_request`) from keywords
3. Expands multi-field `testData` into individual typed steps (`multitype` action)
4. Infers CSS selectors from context ("email field" → `#email`, "submit button" → `button[type=submit]`)
5. Infers API endpoints for Postman ("login" → `/api/auth/login`, "payment" → `/api/payment`)
6. Generates assertion logic from expected results (URL redirect, error message, visibility checks)

All three exports respond in under one second.

---

## CSV Export Format (Jira / Zephyr)

Each test case step is exported as a separate row:

| Column | Description |
|---|---|
| Test Case ID | e.g. `TC-001` |
| Title | Test case title |
| Type | `positive`, `negative`, or `edge` |
| Testing Types | e.g. `api, frontend_ui` |
| Priority | `low`, `medium`, or `high` |
| Description | One-sentence summary |
| Step # | Step number within the test case |
| Step | The action to perform |
| Test Data | Input data for this step |
| Expected Result | Observable outcome of this step |

---

## Premium Feature Flag

All Automation Ready code is marked with:

```js
// FEATURE: AUTOMATION_READY (Premium)
```

To gate exports behind a paid plan, add authentication or subscription middleware to the `/api/automation-ready/*` routes in `server/routes.js`.

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for the full release history with detailed change descriptions.

| Version | Date | Highlight |
|---|---|---|
| 1.0.0 | 2026-03-25 | Initial launch — AI generation, Gherkin, dark glass UI |
| 2.0.0 | 2026-03-26 | Multi-provider LLM, Automation Ready exports, Jira CSV, demo video |
| 3.0.0 | 2026-03-31 | Context Enrichment, expandable cards, feedback system, New Test Case |
| 4.0.0 | 2026-03-31 | Split-panel export UI, automation gate fix, prod quota corrected to 3/day |
