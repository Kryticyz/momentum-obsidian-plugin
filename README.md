# Momentum (Obsidian Plugin)

MVP plugin for:
- Snapshotting active projects into daily and weekly notes.
- Tracking project time with start/stop timer commands.
- Exporting time data to JSONL for external dashboards.

## Active Project Rules
A note is treated as an active project when frontmatter includes:

```yaml
tags:
  - project
status: active
end: YYYY-MM-DD
```

Optional subproject relationship:

```yaml
up: [[Parent Project Name]]
```

## Supported Note Names
- Daily note: `YYYY-MM-DD.md`
- Weekly note: `Weekly Note YYYY-MM-DD.md` (Sunday week start)

## Inserted Sections
- `## Active Projects`
- `## Time Logs`

If the headings already exist, the plugin regenerates managed content in those sections.
Time log entries are preserved during regeneration.

## Time Log Line Format
```markdown
- 09:10-09:45 [[Project A]] (35m) "what was done"
```

This same format is used for timer-generated entries and manual entries.

## Commands
- `Momentum: Start project timer`
- `Momentum: Start project timer in the past`
- `Momentum: Adjust active timer start time`
- `Momentum: Stop project timer and log entry`
- `Momentum: Open timer side panel`
- `Momentum: Debug timer project scan`
- `Momentum: Debug timer state`
- `Momentum: Regenerate project snapshot in current note`
- `Momentum: Export time entries to JSONL`

Backdated start accepts either duration input (`45`, `90m`, `1h30m`) or exact local time (`09:40`, `9:40am`).
The plugin shows a confirmation summary before applying a parsed backdated/adjusted start.

`## Time Logs` includes a rendered button control block in reading mode.
The plugin also shows a clickable timer in the status bar.

## Settings
- Due date field (default: `end`)
- Timezone (default: `Australia/Sydney`)
- Daily note folder (default: vault root)
- Export path (default: `.obsidian/momentum/time-entries.jsonl`)
- Export target (`JSONL file` or `Backend refresh URL`)
- Backend refresh URL (default: `http://localhost:8080`, uses `POST /refresh`)
- Auto insert snapshots on note creation
- Note-create hook delay (for templater timing)

## Repository Layout

- Plugin source: `src/`
- Release artifacts: `release/momentum/`
- Tests: `test/`
- Plugin stylesheet: `styles.css`

## Development

```bash
bun run build
bun test
```

Build output is written to:
- `release/momentum/main.js`
- `release/momentum/manifest.json`
- `release/momentum/styles.css`

Optional for type tooling:

```bash
bun install
```

## Maintainer Local Install (Obsidian Desktop)

1. Build the plugin output:

```bash
bun run build
```

2. Link this output into your local vault plugins folder:

```bash
bun run install:link -- "/absolute/path/to/your/vault"
```

This creates/updates:
- `<vault>/.obsidian/plugins/momentum` -> `release/momentum`

Optional (env var form):

```bash
OBSIDIAN_VAULT_PATH="/absolute/path/to/your/vault" bun run install:link
```

3. Load in Obsidian:
- Open the target vault.
- Go to `Settings` -> `Community plugins`.
- Disable `Restricted mode` if enabled.
- Click `Reload plugins`.
- Enable `Momentum`.

## Maintainer Dev Loop

Use watch mode during development:

```bash
bun run dev
```

Then in Obsidian:
- Use `Reload plugins` after changes.
- If you update `manifest.json` or `styles.css`, run `bun run build` once to recopy those files to `release/momentum`.
