# Quantix — AI-Powered Test Case Generator

## Overview
Quantix is a full-stack web app that uses OpenAI to generate structured QA test cases from user stories. Users paste a user story, pick test types, testing types, count, and format — then get structured test cases instantly.

## Architecture

### Frontend (`/client`)
- React 18 + Vite (port 5000, webview)
- Single-page app: `client/src/App.jsx` + `client/src/styles.css`
- Proxies `/api/*` requests to backend on port 3001

### Backend (`/server`)
- Node.js + Express (port 3001)
- Modular services architecture:
  - `server/services/openaiService.js` — OpenAI API calls (gpt-4o-mini, temp 0.2, lazy client init)
  - `server/services/quotaService.js` — In-memory quota tracking (5/day per IP)
  - `server/services/parser.js` — Safe JSON parsing for AI responses
  - `server/services/csvService.js` — CSV export utility
  - `server/services/context/documentProcessor.js` — PDF/DOCX/TXT text extraction
  - `server/services/context/imageAnalyzer.js` — LLM vision analysis for UI screenshots
  - `server/services/context/contextBuilder.js` — Structured context extraction via LLM summarisation
  - `server/services/context/contextCache.js` — MD5-keyed in-memory cache (avoids re-processing identical files)

## API Endpoints
- `POST /api/generate-test-cases` — Generate test cases (validates input, checks quota, calls LLM). Accepts optional `context` object for Context Enrichment.
- `POST /api/upload` — Upload 1–3 files (PDF/DOCX/TXT/PNG/JPG, max 5 MB each). Extracts and returns structured `context` via LLM summarisation.
- `GET /api/usage` — Returns current user's daily usage count
- `GET /api/provider` — Returns active LLM provider info
- `POST /api/automation-ready/:tool` — Export to Playwright / Cypress / Postman
- `POST /api/feedback` — Submit positive/negative rating with comment

## Key Features
- Test Types: Positive, Negative, Edge
- Testing Types: API, Frontend UI, Backend DB
- Output formats: Standard, Gherkin
- Count options: 3, 5, 8, 10
- Daily quota: 5/day (prod), 50/day (dev) per IP
- Copy as Markdown (per card + all)
- Download CSV / Jira import
- Automation-ready export (Playwright / Cypress / Postman)
- Feedback system (👍/👎 + comment)
- Dark/light mode
- **Context Enrichment** — upload PDFs, DOCX, TXT docs or UI screenshots; LLM extracts flows/validations/edge cases which are injected into the generation prompt for more specific test cases

## Environment Variables
- `OPENAI_API_KEY` — Required. OpenAI API key (set via Replit Secrets)
- `SERVER_PORT` — Optional. Backend port (default: 3001)

## Running
```bash
npm run dev   # starts both server and client concurrently
```

## Dependencies
- Root: `express`, `cors`, `dotenv`, `openai`, `concurrently`
- Client: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`
