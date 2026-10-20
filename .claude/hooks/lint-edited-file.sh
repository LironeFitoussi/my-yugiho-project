#!/usr/bin/env bash
# PostToolUse hook: lint the file Claude just edited; exit 2 feeds errors back to Claude.
file="$(jq -r '.tool_input.file_path // empty')"
case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out="$(npx --no-install eslint --fix "$file" 2>&1)"; then
  echo "$out" >&2
  exit 2
fi
