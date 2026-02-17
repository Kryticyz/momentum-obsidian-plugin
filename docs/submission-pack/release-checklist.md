# Momentum Community Plugin Release Checklist

This checklist is for releasing version `0.1.1` of `momentum`.

## 1. Pre-release validation

- [x] `manifest.json` includes required fields (`id`, `name`, `version`, `minAppVersion`, `description`, `author`, `isDesktopOnly`).
- [x] `README.md` exists at repo root.
- [x] `LICENSE` exists at repo root.
- [x] `description` length is within Obsidian limit (<= 250 chars).
- [x] `description` ends with punctuation.
- [x] `id` is lowercase and does not contain `obsidian`.
- [ ] Test plugin on target platforms and record results for PR checklist.

## 2. Build release artifacts

Run from repo root:

```bash
bun run build
```

Expected files:

- `release/momentum/main.js`
- `release/momentum/manifest.json`
- `release/momentum/styles.css`

## 3. Create git tag and GitHub release

Tag must exactly match `manifest.json.version` (no `v` prefix).

```bash
git tag -a 0.1.1 -m "0.1.1"
git push origin 0.1.1
```

Create a GitHub release for tag `0.1.1` and upload binary assets:

- `release/momentum/main.js`
- `release/momentum/manifest.json`
- `release/momentum/styles.css`

Release title should also be `0.1.1`.

## 4. Submit to Obsidian community plugins

1. Open `https://github.com/obsidianmd/obsidian-releases/edit/master/community-plugins.json`.
2. Append the JSON snippet from `docs/submission-pack/community-plugins-entry.json` to the end of the array.
3. Commit and open a PR.
4. Set PR title to `Add plugin: Momentum`.
5. Paste `docs/submission-pack/obsidian-releases-pr.md` into the PR body.
6. Fill in placeholders and checkboxes truthfully.

## 5. Post-submission

- Wait for validation bot labels (`Ready for review` or `Validation failed`).
- If validation fails, fix issues in the same PR.
- Do not open a new PR for fixes.
