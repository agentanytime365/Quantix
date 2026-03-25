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

## API Endpoints
- `POST /api/generate-test-cases` — Generate test cases (validates input, checks quota, calls OpenAI)
- `GET /api/usage` — Returns current user's daily usage count

## Key Features
- Test Types: Positive, Negative, Edge
- Testing Types: API, Frontend UI, Backend DB
- Output formats: Standard, Gherkin, Tabular
- Count options: 3, 5, 8, 10
- Daily quota: 5 generations per IP
- Copy as Markdown (per card + all)
- Download CSV
- Usage indicator with progress bar

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
