# Project Insights (Obsidian Plugin)

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
- `Project Insights: Start project timer`
- `Project Insights: Stop project timer and log entry`
- `Project Insights: Open timer side panel`
- `Project Insights: Debug timer project scan`
- `Project Insights: Debug timer state`
- `Project Insights: Regenerate project snapshot in current note`
- `Project Insights: Export time entries to JSONL`

`## Time Logs` includes a rendered button control block in reading mode.
The plugin also shows a clickable timer in the status bar.

## Settings
- Due date field (default: `end`)
- Timezone (default: `Australia/Sydney`)
- Daily note folder (default: vault root)
- Export path (default: `.obsidian/project-insights/time-entries.jsonl`)
- Auto insert snapshots on note creation
- Note-create hook delay (for templater timing)

## Repository Layout

- Plugin source: `src/`
- Release artifacts: `release/project-insights/`
- Tests: `test/`
- Plugin stylesheet: `styles.css`

## Development

```bash
bun run build
bun test
```

Build output is written to:
- `release/project-insights/main.js`
- `release/project-insights/manifest.json`
- `release/project-insights/styles.css`

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
OBSIDIAN_VAULT_PATH="/absolute/path/to/your/vault" bun run install:link
```

This creates/updates:
- `<vault>/.obsidian/plugins/project-insights` -> `release/project-insights`

3. Load in Obsidian:
- Open the target vault.
- Go to `Settings` -> `Community plugins`.
- Disable `Restricted mode` if enabled.
- Click `Reload plugins`.
- Enable `Project Insights`.

## Maintainer Dev Loop

Use watch mode during development:

```bash
bun run dev
```

Then in Obsidian:
- Use `Reload plugins` after changes.
- If you update `manifest.json` or `styles.css`, run `bun run build` once to recopy those files to `release/project-insights`.
