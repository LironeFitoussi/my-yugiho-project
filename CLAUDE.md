@AGENTS.md

## Claude Code notes

- Project permissions and hooks live in `.claude/settings.json`; put personal overrides in `.claude/settings.local.json` (git-ignored).
- For Next.js APIs, grep `node_modules/next/dist/docs/` instead of relying on memory — this repo is on Next 16.
- Prefer the `Plan` agent / plan mode for anything spanning multiple features or touching the DynamoDB key design.
