---
name: dynamodb-access-pattern
description: Add or change a DynamoDB entity, access pattern, or repository function on the single yugioh-collection table (PRD §16). Use whenever code reads/writes DynamoDB or the PK/SK design is involved.
argument-hint: "<entity or access pattern>"
---

# DynamoDB access pattern

Target: `$ARGUMENTS`

If this changes the **key design** (new PK/SK shape, a new GSI), get a design from the `dynamodb-architect` agent first, plus user approval, before writing code.

## Key design (PRD §16)
| Entity | PK | SK |
| --- | --- | --- |
| CARD_COPY | `USER#OWNER` | `CARD#<cardId>#COPY#<copyId>` |
| PRODUCT | `USER#OWNER` | `PRODUCT#<uuid>` |
| PURCHASE | `USER#OWNER` | `PURCHASE#<uuid>` |
| PURCHASE_ITEM | (design it, e.g. under its purchase) | |
| WISHLIST | `USER#OWNER` | `WISHLIST#CARD#<cardId>` / `WISHLIST#PRODUCT#…` |
| CARD_CACHE | `CATALOG#CARD` | `ID#<cardId>` |
| PRICE_SNAPSHOT | `PRICE#<cardId>` | `DATE#<YYYY-MM-DD>` |

Store an `entityType` attribute on every item. Card identity is the provider's numeric card ID, never the name (§7).

## Design first
1. Write the access pattern as a sentence: "All copies of card X", "Recent acquisitions", "Purchases by date".
2. Map it to a `Query` on `PK` with `begins_with`/`between` on `SK`. Add a GSI only when no key shape fits, and only after listing the access patterns it serves.
3. **No `Scan` in app paths.**

## Implement in `src/lib/aws`
- A shared `DynamoDBDocumentClient` reads `AWS_REGION`, `DYNAMODB_TABLE`, and `DYNAMODB_ENDPOINT` (local → `http://localhost:8000`). Use `import "server-only"`.
- One typed repository function per access pattern. Parse items read from the table with Zod.
- Uniqueness: `ConditionExpression: "attribute_not_exists(PK)"`.
- Atomic multi-item changes (purchase + its items, linking copies to a purchase): `TransactWriteCommand`.
- **Prevent duplicate purchase accounting** (§11, §16): an item belongs to at most one purchase. Enforce that with conditional writes.
- Paginate with `LastEvaluatedKey` and return a cursor.
- Store timestamps as ISO-8601 UTC strings and dates as `YYYY-MM-DD`.
- Money is stored as integer minor units plus a currency (see `/money`).

## Verify locally
```bash
npm run db:local   # separate terminal
aws dynamodb list-tables --endpoint-url http://localhost:8000
aws dynamodb query --endpoint-url http://localhost:8000 --table-name yugioh-collection \
  --key-condition-expression "PK = :pk" --expression-attribute-values '{":pk":{"S":"USER#OWNER"}}'
```
Never write to real AWS without explicit approval. New GSIs also need a change in `infrastructure/terraform/dynamodb.tf` (see `/infra-change`).
