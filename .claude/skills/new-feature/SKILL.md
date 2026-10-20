---
name: new-feature
description: Implement a PRD feature end-to-end (route, server action, repository, UI) inside src/features/<domain>. Use when starting any roadmap item — catalog, collection, sets, products, purchases, pricing, wishlist, dashboard.
argument-hint: "<domain> <short feature description>"
---

# Implement a PRD feature

Target: `$ARGUMENTS`

## 1. Scope it against the PRD (`prd.md`)
- Find the item in the roadmap (§21) and confirm it belongs to the current phase. If it's a later phase or Phase 5 (future), stop and say so.
- Read the feature's own section: catalog §7, inventory §8, sets §9, products §10, purchases §11, valuation §12, wishlist §13, dashboard §14, PWA §15.
- Out of scope (§1): registration, multiplayer, marketplace, trading, deck building.
- List which business rules apply (AGENTS.md "Non-negotiable business rules") before coding.

## 2. Plan (PRD §23 step 2)
Required files, implementation steps, new dependencies (avoid them unless needed, §3 rule 12), infra changes, security considerations. For multi-feature work or key-design changes, use plan mode.

## 3. Read the Next 16 docs you'll touch
Don't rely on memory. Grep `node_modules/next/dist/docs/`, typically:
- `01-app/02-guides/server-actions.md`, `01-app/01-getting-started/07-mutating-data.md`, `01-app/02-guides/forms.md`
- `01-app/02-guides/authentication.md`, `01-app/02-guides/data-security.md`
- `01-app/01-getting-started/08-caching.md`, `01-app/03-api-reference/01-directives/use-cache.md`
Or ask the `nextjs-docs` agent.

## 4. Layout (PRD §19)
```
src/features/<domain>/
  schemas.ts       # Zod schemas for inputs + domain types (z.infer)
  actions.ts       # "use server" — auth check → Zod parse → repository call
  queries.ts       # server-only reads used by pages
  components/      # feature UI (shadcn from src/components)
src/lib/aws/…              # DynamoDB repositories (see /dynamodb-access-pattern)
src/app/<route>/page.tsx   # routes from PRD §18
```

## 5. Rules for each entry point
Every page, route handler, and server action must:
1. Verify the session **server-side** and check the Google `sub` against `AUTHORIZED_GOOGLE_SUB` with the shared helper in `src/lib/auth`. Proxy/middleware alone is not enough.
2. Parse all input (form data, params, search params) with Zod.
3. Keep AWS and provider code in `import "server-only"` modules.
4. Keep the UI free of raw DynamoDB or YGOPRODeck shapes. Inventory pages must still render when YGOPRODeck is down (§17).
5. Use touch-friendly, responsive UI that works on iPhone (§15).

## 6. Finish
- Write tests for the §22 priorities this feature touches (use the `test-writer` agent).
- Run `/check`, then have the `business-rules-reviewer` and `security-reviewer` agents review the diff.
