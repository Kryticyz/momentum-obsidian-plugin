# Workspace Layout

This repository hosts the Obsidian community plugin plus non-plugin components used by the broader project.

## Directories

- `community-plugin/` — Obsidian plugin source code, tests, and plugin-specific build config.
- `release/project-insights/` — Generated release artifacts (`main.js`, `manifest.json`, `styles.css`).
- `apps/dashboard-frontend/` — React + Vite dashboard UI.
- `services/dashboard-backend/` — Go API and static file server for dashboard data.
- `docs/` — Technical docs and submission assets.

## Plugin Workflow

Run from repo root:

```bash
bun run build
bun run test
bun run dev
```

These commands proxy into `community-plugin/` and keep release artifacts under `release/project-insights/`.

## Dashboard Workflow

Backend:

```bash
cd services/dashboard-backend
go test ./...
go run .
```

Frontend:

```bash
cd apps/dashboard-frontend
npm install
npm run dev
npm run build
```

The frontend build outputs to `services/dashboard-backend/frontend/dist/` so the backend can serve the SPA.

## Release Notes

Obsidian community plugin metadata remains at repo root:

- `manifest.json`
- `versions.json`
- `README.md`
- `LICENSE`

This keeps repository compatibility with Obsidian community plugin submission and update checks.
