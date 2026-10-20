<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Yu-Gi-Oh! Collection Manager — Agent Guide

Single-user, collection-first PWA for tracking a physical Yu-Gi-Oh! card collection. **`prd.md` is the source of truth** for requirements — read the relevant section before implementing a feature, and don't add scope it excludes (no deck building, gameplay, trading, multi-user).

## Stack

Next.js 16 (App Router, `src/`) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Zod · AWS SDK v3 (DynamoDB) · Auth.js + Google OAuth · YGOPRODeck API v7 · Vitest + Playwright · Render (hosting) · Terraform (AWS infra).

## Commands

| Task | Command |
| --- | --- |
| Dev server (port 3000) | `npm run dev` |
| Lint / typecheck | `npm run lint` · `npm run typecheck` |
| Build | `npm run build` |
| DynamoDB Local (port 8000, data in `.dynamodb/`) | `npm run db:local` |
| Query local DB | `aws dynamodb list-tables --endpoint-url http://localhost:8000` |
| Infra | `cd infra && terraform fmt && terraform validate && terraform plan` |
| Render | `render services`, `render deploys list` (CLI v2, needs `render login`) |

## Tooling (devcontainer)

Installed by `.devcontainer/devcontainer.json` features and `.devcontainer/install-tools.sh`:

| Tool | Version | Use |
| --- | --- | --- |
| Node.js / npm | 24 / 11 | app runtime; `npm` is the package manager (pnpm, yarn also present — don't use) |
| Git + GitHub CLI (`gh`) | latest | repo, PRs, Actions, secrets |
| AWS CLI v2 (`aws`) | latest | DynamoDB, IAM, CloudWatch |
| Terraform | latest | AWS infra in `infra/` (the chosen IaC) |
| AWS CDK (`cdk`) | 2.1146.0 | installed, but Terraform is the IaC of record — don't mix |
| Render CLI (`render`) | 2.28.0 | services, deploys, logs, `render blueprints validate` |
| Render agent skills | user scope | `render-*` skills (deploy, debug, monitor, env vars, blueprints, …) in `~/.claude/skills`, `~/.agents/skills`, `~/.copilot/skills` — use them for Render work |
| DynamoDB Local | latest (Java 21) | local DB via `npm run db:local` |
| jq, python3, make, zip/unzip, ripgrep | — | general scripting |

Credentials for AWS (`~/.aws`) and Render (`~/.render`) live in named volumes and survive rebuilds; `gh` and Claude Code need re-login after a rebuild.

Before declaring work done: `npm run lint && npm run typecheck` pass, plus tests once they exist.

## Layout (target — see PRD §17)

- `src/app/(auth)/login`, `src/app/(dashboard)/…` — routes from PRD §16
- `src/features/<domain>/` — catalog, collection, sets, products, purchases, pricing, wishlist (domain logic, server actions, feature components)
- `src/lib/aws` (DynamoDB client + repositories), `src/lib/auth`, `src/lib/ygoprodeck` (catalog client), `src/lib/utils`
- `src/components/ui` (shadcn), `layout`, `shared` · `src/types`
- `infra/` — Terraform (DynamoDB table, IAM user/policy) · `tests/` — Vitest + Playwright · `render.yaml` — Render blueprint

## Non-negotiable business rules

1. **Completion counts unique card IDs**, regardless of printing; duplicates never increase it.
2. **Buying a product never adds its cards** to the collection — the user adds copies manually.
3. **Each physical copy is its own record** (`copyId`), with its own condition/price/date.
4. **Never fabricate data**: no invented prices, product contents, or condition multipliers. Card-level fallback prices are labelled **Estimated**; missing ones show **Price Unavailable** and are excluded from totals.
5. **Money**: store amounts in their original currency (USD/ILS); use decimal-safe math (integer minor units or a decimal lib, never float arithmetic); record exchange-rate timestamps. Shipping is separate from subtotal.

## Security

- Auth is enforced **server-side** on every page, route handler, and server action; access is allowed only for the Google `sub` in `AUTHORIZED_GOOGLE_SUB`.
- AWS credentials and API config stay server-only (`import "server-only"`; never `NEXT_PUBLIC_*`).
- Validate all external input (forms, params, YGOPRODeck responses) with Zod.
- Least-privilege IAM: the app's policy is scoped to the single table.

## DynamoDB

Single table `yugioh-collection`, keys `PK`/`SK` (PRD §14). Design access patterns first; use `Query`, never `Scan`, in app paths; conditional writes for uniqueness; `TransactWriteItems` for multi-record changes. The client reads `DYNAMODB_ENDPOINT` so local dev points at `http://localhost:8000`.

## External catalog

All YGOPRODeck calls go through `src/lib/ygoprodeck` — normalize responses to internal types, cache them, respect rate limits (≈20 req/s), and keep provider details out of the UI. Don't mirror the whole catalog into DynamoDB.

## Environment variables

`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTHORIZED_GOOGLE_SUB`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DYNAMODB_TABLE`, `DYNAMODB_ENDPOINT` (local only). Local values live in `.env.local` (git-ignored); production values live in Render.

## Working agreements

- Follow the PRD roadmap phase order (§19); keep changes small and feature-scoped.
- Never commit secrets, `.env*`, or Terraform state. Never run `terraform apply`/`destroy`, write to real AWS, or trigger Render deploys without explicit user approval.
- Commit only when asked; branch off `master` first.
