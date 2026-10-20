---
name: check
description: Run the PRD §22 done-gate — lint, typecheck, tests, build (plus Terraform validation when infra changed) — and produce the §23 report. Use before declaring any task or phase complete.
allowed-tools: Bash(npm run lint:*), Bash(npm run typecheck), Bash(npm run build), Bash(npm run test:*), Bash(npm test:*), Bash(npx vitest:*), Bash(npx playwright test:*), Bash(terraform fmt:*), Bash(terraform validate:*), Bash(git status:*), Bash(git diff:*)
---

# Done-gate

Run in order and stop at the first failure:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test` (if the script doesn't exist yet, say so; §22 requires adding it)
4. `npm run build`
5. If `infrastructure/terraform/` changed: `terraform fmt -check && terraform validate` there. A `plan` needs credentials, so ask first.
6. E2E (`npx playwright test`) only when UI flows changed and the app and local DB are running.

Fix failures caused by the current change. Report failures that predate it, with their output, instead of fixing them silently.

## Report (PRD §23 step 5)
- Implemented features
- Modified files (`git status --short`)
- Test results, with a pass/fail line per step above
- Infrastructure changes
- Deployment status
- Outstanding issues
- Required user actions

Don't call the work done while any step fails.
