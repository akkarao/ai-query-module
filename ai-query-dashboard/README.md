# AI Query Dashboard UI

The frontend is a light-theme React dashboard for asking questions and displaying AI-generated answer cards over payment and operational data.

## What it does

- Sends natural-language prompts to the backend API.
- Displays results as cards with text, metrics, tables, and charts.
- Lets users edit, minimize, maximize, and delete cards.
- Saves cards into MongoDB through the backend API.
- Reuses saved cards for repeated queries.
- Supports search and a clean single-mode visual design with light styling.

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind-inspired custom styling
- Recharts for chart rendering
- Lucide icons

## Project structure

```text
src/
  App.tsx        - main UI and card rendering logic
  App.css       - dashboard styling
  main.tsx      - app bootstrap
  index.css     - base global styles
```

## Run locally

```bash
cd ai-query-dashboard
npm install
npm run dev
```

The app is expected to run on:

- http://localhost:5173

The backend API is expected to be running on:

- http://localhost:8080

## Build

```bash
npm run build
```

## API expectations

The front end calls these endpoints on the backend:

- POST /api/query
- GET /api/cards
- POST /api/cards
- DELETE /api/cards/{id}

The query response is expected to be a render specification object containing fields like type, title, summary, data, xKey, yKey, and related visual metadata.

## Notes

The dashboard is intentionally designed to render generic result payloads rather than hard-coded domain views, so the backend can return different answer types as needed.
