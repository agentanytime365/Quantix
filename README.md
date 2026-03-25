# Quantix — AI-Powered QA Test Case Generator

Quantix is a full-stack web application that generates structured QA test cases from plain-English user stories using OpenAI GPT-4o. Built for QA engineers, developers, and product teams who need consistent, professional test coverage without manual effort.

---

## Features

### Core
- **AI Test Case Generation** — Paste a user story, choose your options, and receive structured test cases in seconds via GPT-4o
- **Test Types** — Positive, Negative, and Edge case coverage
- **Testing Layers** — API, Frontend UI, and Backend DB scenarios
- **Output Formats** — Standard (plain English) and Gherkin BDD (`Given / When / Then`)
- **Test Case Count** — Generate 3, 5, 8, or 10 test cases per run
- **Daily Quota** — 5 free generations per IP per day (in-memory, resets daily)

### Export & Automation Ready
- **CSV Export** — Jira (Zephyr) ready format for direct import; one row per step
  - Headers: `Test Case ID, Title, Type, Testing Types, Priority, Description, Step #, Step, Test Data, Expected Result`
- **JSON Export** — Full structured test case data
- **Playwright Export** — Executable `.spec.ts` test scripts, instantly generated
- **Cypress Export** — Ready-to-run `.cy.js` test scripts, instantly generated
- **Postman Export** — Importable `.json` collection with requests and assertions, instantly generated
- **Jira Import Guide** — Built-in modal with step-by-step Zephyr CSV import instructions and field mapping

### UI & UX
- **Dark Glass Theme** — Premium dark UI with teal/blue gradients, frosted glass cards, and blur effects
- **Light Mode** — Full light mode override, toggled with ☀️/🌙 button, persisted to `localStorage`
- **Animated Loader** — Skeleton card with cycling messages during generation ("Analyzing user story…", "Generating structured steps…", etc.)
- **Character Counter** — Live 0/2000 counter on the user story input
- **Gherkin Syntax Highlighting** — Colour-coded `Given`, `When`, `Then`, `And`, `But` keywords in results
- **Copy to Clipboard** — One-click copy for individual test cases
- **Usage Badge** — Shows remaining daily generations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| AI | Configurable — default: Google Gemini 2.5 Flash |
| Styling | Plain CSS (CSS custom properties, dark/light themes) |
| HTTP | Axios |
| File Downloads | Blob / `URL.createObjectURL` |

---

## Project Structure

```
quantix/
├── client/
│   └── src/
│       ├── App.jsx          # Full React frontend — form, results, export, modals, theme
│       └── styles.css       # Dark glass theme, light mode, all component styles
├── server/
│   ├── index.js             # Express server entry point (serves API + static build)
│   ├── routes.js            # All API routes (including GET /api/provider)
│   └── services/
│       ├── llmProvider.js            # LLM provider registry — reads LLM_PROVIDER env var
│       ├── openaiService.js          # Test case generation (provider-agnostic)
│       ├── parser.js                 # Safe JSON parser for AI responses
│       ├── quotaService.js           # IP-based daily usage tracking
│       └── automationReady/
│           ├── templateConverter.js  # Instant step converter (no AI call)
│           ├── playwrightService.js  # Playwright script builder
│           ├── cypressService.js     # Cypress script builder
│           └── postmanService.js     # Postman collection builder
└── package.json
```

---

## Environment Variables

### LLM Provider (configurable — no code changes needed)

| Variable | Required | Description |
|---|---|---|
| `LLM_PROVIDER` | No | Which AI provider to use. Default: `gemini`. Options: `gemini`, `openai`, `azure`, `anthropic`, `groq`, `ollama` |
| `LLM_MODEL` | No | Override the default model for the active provider (e.g. `gpt-4-turbo`, `claude-opus-4-5`) |
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

### Switching providers

```
# Use OpenAI GPT-4o instead of Gemini
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

### Checking the active provider

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
npm run build    # builds client/dist
node server/index.js  # serves both API and frontend on a single port
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
  "format": "Gherkin"
}
```

**Response:** `{ testCases: [...], usage: { usedToday, limitPerDay } }`

---

### `GET /api/usage`
Get the current daily quota usage for the requesting IP.

**Response:** `{ usage: { usedToday, limitPerDay } }`

---

### `POST /api/automation-ready/playwright`
### `POST /api/automation-ready/cypress`
### `POST /api/automation-ready/postman`
Generate an automation script instantly from test cases (no AI call — sub-second response).

**Body:**
```json
{ "testCases": [...] }
```

**Response:** `{ code: "..." }` — downloadable script or collection content.

---

## Automation Ready — How It Works

The export pipeline converts test cases to automation scripts **instantly** using a pattern-based step classifier — no second AI call is made. The converter:

1. Reads each step's `step`, `testData`, and `expectedResult` fields
2. Classifies the action (`navigate`, `click`, `type`, `select`, `assert`, `api_request`) from keywords
3. Infers CSS selectors from context ("email field" → `#email`, "submit button" → `button[type=submit]`)
4. Infers API endpoints for Postman ("login" → `/api/auth/login`, "payment" → `/api/payment`)
5. Passes structured steps to the framework code generator

This approach makes all three exports respond in under one second.

---

## Output Format — CSV (Jira / Zephyr)

Each test case step is exported as a separate CSV row:

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

To gate exports behind a paid plan, add an authentication or subscription middleware to the `/api/automation-ready/*` routes in `server/routes.js`.

---

## Version History

| Version | Description |
|---|---|
| v1 | WhatsApp-inspired light theme (backed up as `styles.whatsapp-backup.css`) |
| v2 | Dark glass premium theme with teal/blue gradients |
| Current | Automation Ready exports, Jira modal, cycling loader, instant exports |
