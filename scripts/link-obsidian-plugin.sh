#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'EOF'
Usage:
  bun run install:link -- /absolute/path/to/vault

You can also set OBSIDIAN_VAULT_PATH instead of passing an argument.
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

INPUT_PATH="${1:-${OBSIDIAN_VAULT_PATH:-}}"
if [[ -z "$INPUT_PATH" ]]; then
  print_usage
  exit 1
fi

if [[ ! -d "$INPUT_PATH" ]]; then
  echo "Error: path does not exist or is not a directory: $INPUT_PATH" >&2
  exit 1
fi

ABS_INPUT_PATH="$(cd "$INPUT_PATH" && pwd)"
if [[ "$ABS_INPUT_PATH" == */.obsidian ]]; then
  VAULT_PATH="$(dirname "$ABS_INPUT_PATH")"
  OBSIDIAN_DIR="$ABS_INPUT_PATH"
else
  VAULT_PATH="$ABS_INPUT_PATH"
  OBSIDIAN_DIR="$VAULT_PATH/.obsidian"
fi

PLUGIN_ID="$(sed -n 's/^[[:space:]]*"id":[[:space:]]*"\([^"]*\)".*/\1/p' "$PROJECT_ROOT/manifest.json" | head -n1)"
if [[ -z "$PLUGIN_ID" ]]; then
  echo "Error: could not read plugin id from $PROJECT_ROOT/manifest.json" >&2
  exit 1
fi

BUILD_DIR="$PROJECT_ROOT/release/$PLUGIN_ID"
if [[ ! -f "$BUILD_DIR/main.js" || ! -f "$BUILD_DIR/manifest.json" ]]; then
  echo "Build output missing. Running build..."
  (cd "$PROJECT_ROOT" && bun run build)
fi

PLUGINS_DIR="$OBSIDIAN_DIR/plugins"
TARGET="$PLUGINS_DIR/$PLUGIN_ID"
mkdir -p "$PLUGINS_DIR"

if [[ -e "$TARGET" && ! -L "$TARGET" ]]; then
  echo "Error: target exists and is not a symlink: $TARGET" >&2
  echo "Remove or rename it, then run this command again." >&2
  exit 1
fi

ln -sfn "$BUILD_DIR" "$TARGET"

echo "Vault: $VAULT_PATH"
echo "Linked: $TARGET -> $BUILD_DIR"
