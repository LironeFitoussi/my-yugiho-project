# Yu-Gi-Oh! Collection Manager

**Product Requirements Document & Claude Code Implementation Guide**

**Version:** 1.2  
**Status:** Approved for Implementation  
**Architecture:** Next.js + DynamoDB + Render + Terraform  
**Development Strategy:** CLI-First, Infrastructure as Code

---

## 1. Project Overview

Build a private web application for managing a physical Yu-Gi-Oh! trading card collection.

The application focuses on collecting, inventory management, official card catalogs, product tracking, and financial valuation rather than competitive gameplay.

### Primary Features

- Search the complete Yu-Gi-Oh! TCG catalog.
- Filter cards associated with the original Duel Monsters era.
- Identify cards by name, Card ID, passcode, or Set Code.
- Display official sets and known printings containing a card.
- Track individual physical card copies.
- Track duplicate copies with independent conditions and purchase prices.
- Calculate official set completion using unique card identities.
- Manage purchased decks, booster packs, and sealed products.
- Track purchases, sellers, shipping expenses, and acquisition dates.
- Automatically estimate collection market value.
- Display financial values in USD and ILS.
- Manage a wishlist.
- Provide a responsive, installable iPhone PWA.

### Scope

The application supports one authorized Google account.

No public registration, multiplayer features, marketplace, trading platform, or competitive deck-building functionality is required.

---

## 2. Approved Technology Stack

| Component              | Technology                                |
| ---------------------- | ----------------------------------------- |
| Framework              | Next.js App Router                        |
| Language               | TypeScript                                |
| UI                     | React, Tailwind CSS, shadcn/ui            |
| Backend                | Next.js Server Actions and Route Handlers |
| Authentication         | Auth.js + Google OAuth                    |
| Database               | Amazon DynamoDB                           |
| AWS SDK                | AWS SDK for JavaScript v3                 |
| Infrastructure as Code | HashiCorp Terraform                       |
| Hosting                | Render Web Service                        |
| Card Catalog           | YGOPRODeck API v7                         |
| Validation             | Zod                                       |
| Testing                | Vitest and Playwright                     |
| Package Manager        | npm                                       |
| PWA                    | Web App Manifest and Service Worker       |

Do not introduce AWS CDK, CloudFormation, Serverless Framework, or Terragrunt without explicit approval.

Terraform is the exclusive AWS Infrastructure as Code tool.

---

## 3. Claude Code Operating Instructions

Claude Code is the primary development agent.

### Mandatory Rules

1. Read this PRD before implementing any feature.
2. Inspect the existing repository and development environment.
3. Prefer CLI tools over graphical dashboards.
4. Manage AWS infrastructure exclusively through Terraform.
5. Use `render.yaml` and Render CLI for supported hosting operations.
6. Do not manually provision AWS resources through the console.
7. Never hardcode credentials or commit secrets.
8. Implement features incrementally.
9. Run validation before marking a phase complete.
10. Obtain explicit approval before applying infrastructure changes or creating billable resources.
11. Never execute destructive infrastructure operations without approval.
12. Do not install unnecessary tools or dependencies.
13. Preserve existing working configurations unless changes are necessary.

### Required CLI Tools

- Node.js LTS
- npm
- Git
- GitHub CLI (`gh`)
- AWS CLI v2
- Terraform
- Render CLI
- jq

Docker is optional for local DynamoDB testing.

### Environment Verification

Before beginning development, verify the installed tools:

```bash
node --version
npm --version
git --version
gh --version
aws --version
terraform version
render --version
jq --version
```

If a required tool is missing, determine the operating system and use its official installation procedure.

Do not overwrite existing tool installations.

---

## 4. Infrastructure Architecture

### Application Hosting

The Next.js application runs as a single Render Web Service.

Render is responsible for:

- Running the Next.js server.
- HTTPS.
- Deployment.
- Environment variables.
- Runtime logs.
- Health checks.

### AWS Infrastructure

AWS provides:

- DynamoDB for persistent data.
- IAM policies and application access permissions.
- Optional future services when explicitly approved.

### External Services

- YGOPRODeck for card catalog data.
- Google OAuth for authentication.
- A suitable exchange-rate provider for currency conversion.

### Infrastructure Principles

- Minimize AWS resources.
- Prefer serverless services.
- Avoid unnecessary networking infrastructure.
- No EC2 instances.
- No VPC or NAT Gateway unless a future requirement justifies them.
- No Kubernetes or ECS.
- No dedicated application backend outside Next.js.
- Use DynamoDB on-demand billing initially.

---

## 5. Terraform Infrastructure

### Scope

Terraform must manage:

- DynamoDB table.
- Required DynamoDB indexes.
- IAM policies.
- Application IAM access resources.
- Resource tagging.
- DynamoDB recovery and protection settings.

Do not create resources manually through AWS Console.

### Directory Structure

```text
infrastructure/
└── terraform/
    ├── versions.tf
    ├── providers.tf
    ├── main.tf
    ├── dynamodb.tf
    ├── iam.tf
    ├── variables.tf
    ├── outputs.tf
    ├── terraform.tfvars.example
    └── .gitignore
```

Keep the Terraform configuration straightforward. Do not create reusable modules for a single small deployment unless complexity justifies them.

### Terraform Requirements

- Pin Terraform and provider version constraints.
- Use variables for environment-specific values.
- Never store secrets in Terraform source files.
- Use consistent resource naming.
- Apply resource tags.
- Enable appropriate DynamoDB point-in-time recovery.
- Enable deletion protection for production data.
- Use `PAY_PER_REQUEST` billing initially.
- Use `prevent_destroy` for critical production data resources where appropriate.
- Validate before applying.
- Review plans before infrastructure changes.
- Never commit Terraform state or state backups.

### State Management

Terraform state must be protected.

For initial local experimentation, local state may be used temporarily.

Before provisioning production infrastructure:

- Configure a secure remote S3 backend.
- Enable S3 bucket versioning.
- Enable encryption.
- Block public access.
- Configure Terraform state locking using a supported mechanism.
- Restrict state access using IAM.

The state backend must be bootstrapped separately from the infrastructure it manages.

Do not use a legacy DynamoDB locking table unless required by an explicitly approved compatibility constraint.

### Terraform Workflow

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan
```

Only after explicit approval:

```bash
terraform apply
```

Never automatically execute:

```bash
terraform destroy
```

### IAM and Credentials

Local development should prefer short-lived AWS credentials.

Use an AWS CLI profile, preferably backed by IAM Identity Center where available.

Render requires a separately configured AWS authentication mechanism because it runs outside AWS.

Claude must evaluate the supported credential options and choose the least-privileged practical approach.

Do not assume that Render automatically supports AWS IAM instance roles.

Never place AWS credentials in the frontend or `NEXT_PUBLIC_*` variables.

---

## 6. Authentication

Use Auth.js with Google OAuth.

### Requirements

- Only one Google account is authorized.
- Validate the stable Google subject identifier (`sub`) on the server.
- Reject all other Google accounts.
- Protect private routes, Server Actions, and API endpoints.
- Use secure session handling.
- Keep OAuth credentials in environment variables.
- Do not create a public registration workflow.

The initial OAuth configuration may require a one-time manual setup in Google Cloud Console if suitable CLI or API automation is unavailable.

---

## 7. Card Catalog

### Primary Provider

YGOPRODeck API v7:

https://ygoprodeck.com/api-guide/

### Features

- Search by card name.
- Search by Card ID.
- Search by passcode.
- Search by Set Code.
- Display card images and descriptions.
- Display card type, attribute, and available statistics.
- Display archetypes when available.
- Display official set appearances.
- Display printing codes and rarities.
- Display available market prices.
- Filter for classic Duel Monsters-related cards.

### Card Identity

Use the provider's canonical card ID as the primary identity.

Do not use the card name as the database key.

A card may have multiple printings and appear in multiple sets.

### Classic Collection Filter

The classic Duel Monsters filter must be implemented using a clearly defined curated dataset or classification strategy.

Do not assume that the external API provides a definitive original-anime classification.

---

## 8. Personal Inventory

### Features

- Add physical cards.
- Remove cards.
- Track multiple copies.
- Edit copies individually.
- Record condition.
- Record purchase price and currency.
- Associate copies with purchases.
- Record acquisition dates.
- Store personal notes.

### Copy Data Model

```json
{
  "copyId": "uuid",
  "cardId": 46986414,
  "condition": "Near Mint",
  "purchasePrice": 12.5,
  "purchaseCurrency": "USD",
  "purchaseId": "purchase-uuid",
  "acquiredAt": "2026-10-20",
  "notes": ""
}
```

Each physical copy has a unique `copyId`.

Printing information is optional.

### Supported Conditions

- Mint
- Near Mint
- Lightly Played
- Moderately Played
- Heavily Played
- Damaged

---

## 9. Official Sets and Completion

### Features

- Browse official TCG sets.
- Search sets.
- Display set contents.
- Identify owned cards.
- Identify missing cards.
- Calculate completion percentages.
- Display official set appearances on card detail pages.

### Completion Rule

Completion is based on unique card identities, regardless of printing.

Example:

- Set contains 50 unique cards.
- User owns 35 unique card identities.
- Completion is 70%.

Duplicates do not increase completion.

A card from another printing still counts as owned.

The interface must make clear that card completion does not mean ownership of the set's exact original printings.

---

## 10. Purchased Products

Support:

- Starter Decks
- Structure Decks
- Legendary Decks
- Egyptian God Decks
- Booster Packs
- Booster Boxes
- Special Collections

### Product Fields

- Product name.
- Product category.
- Purchase date.
- Seller.
- Purchase price.
- Currency.
- Shipping.
- Sealed or opened status.
- Notes.

### Important Rule

Recording a product purchase must never automatically add cards to inventory.

The application may display verified product contents.

Cards are added manually.

If product-specific contents are unavailable, do not invent them.

---

## 11. Purchase Management

### Features

- Record purchases.
- Associate cards and products with purchases.
- Track sellers.
- Track dates.
- Track shipping.
- Support USD and ILS.
- Calculate total expenditure.
- Prevent double-counting.

A purchase may contain multiple items.

Purchase totals must be calculated consistently.

---

## 12. Collection Valuation

### Requirements

- Retrieve available market prices automatically.
- Display estimated value in USD and ILS.
- Track valuation timestamps.
- Calculate total invested.
- Calculate estimated market value.
- Display estimated value difference.
- Identify unpriced cards.

### Pricing Priority

1. Printing-specific market price when reliable data is available.
2. General card market price when no printing-specific price is available.
3. Display `Price Unavailable` when no usable price exists.

General card prices must be labeled as estimates.

Do not fabricate missing prices.

Do not apply arbitrary condition-based multipliers.

Avoid double-counting sealed products and their individual cards.

---

## 13. Wishlist

Support:

- Cards.
- Products.
- Ownership status.
- Available estimated prices.
- Search and filtering.

Users may wishlist additional copies of cards they already own.

---

## 14. Dashboard

Display:

- Total unique cards.
- Total physical copies.
- Total purchased products.
- Total invested.
- Estimated market value in USD.
- Estimated market value in ILS.
- Unpriced cards.
- Recent acquisitions.
- Recent purchases.
- Set completion progress.
- Wishlist summary.

---

## 15. Progressive Web App

Requirements:

- Responsive desktop and mobile layouts.
- iPhone-friendly navigation.
- Add to Home Screen support.
- Web App Manifest.
- Application icons.
- Service Worker for static asset caching.
- Touch-friendly interactions.

Full offline inventory editing is not required for the MVP.

---

## 16. DynamoDB Data Model

### Table Name

`yugioh-collection`

### Primary Keys

- `PK` — Partition Key
- `SK` — Sort Key

### Entities

| Entity         | Purpose                    |
| -------------- | -------------------------- |
| CARD_COPY      | Physical card copy         |
| PRODUCT        | Purchased product          |
| PURCHASE       | Purchase transaction       |
| PURCHASE_ITEM  | Transaction item           |
| WISHLIST       | Desired card or product    |
| CARD_CACHE     | Cached catalog information |
| PRICE_SNAPSHOT | Historical market price    |

### Example Keys

```text
PK = USER#OWNER
SK = CARD#46986414#COPY#uuid

PK = USER#OWNER
SK = PRODUCT#uuid

PK = USER#OWNER
SK = PURCHASE#uuid

PK = USER#OWNER
SK = WISHLIST#CARD#46986414

PK = CATALOG#CARD
SK = ID#46986414

PK = PRICE#46986414
SK = DATE#2026-10-20
```

### Data Requirements

- Define access patterns before implementing indexes.
- Avoid full-table scans.
- Prefer Query operations.
- Support pagination.
- Use conditional writes when appropriate.
- Use transactions for atomic operations.
- Prevent duplicate purchase accounting.
- Store timestamps consistently.

---

## 17. External API Integration

Primary provider:

https://ygoprodeck.com/api-guide/

### Relevant Endpoints

```http
GET /api/v7/cardinfo.php
GET /api/v7/cardsets.php
GET /api/v7/cardsetsinfo.php
```

### Requirements

- Centralize API integration.
- Normalize external responses.
- Implement error handling.
- Respect rate limits.
- Cache suitable responses.
- Handle missing records.
- Follow provider image usage requirements.
- Avoid downloading the entire catalog unnecessarily.

Keep personal inventory independent of the external provider's availability.

---

## 18. Application Routes

| Route         | Purpose            |
| ------------- | ------------------ |
| `/`           | Dashboard          |
| `/login`      | Authentication     |
| `/cards`      | Card catalog       |
| `/cards/[id]` | Card details       |
| `/collection` | Personal inventory |
| `/sets`       | Official sets      |
| `/sets/[id]`  | Set completion     |
| `/products`   | Purchased products |
| `/purchases`  | Purchase history   |
| `/portfolio`  | Financial overview |
| `/wishlist`   | Wishlist           |
| `/settings`   | Settings           |

---

## 19. Repository Structure

```text
yugioh-collection/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── catalog/
│   │   ├── collection/
│   │   ├── sets/
│   │   ├── products/
│   │   ├── purchases/
│   │   ├── pricing/
│   │   └── wishlist/
│   ├── lib/
│   │   ├── aws/
│   │   ├── auth/
│   │   └── ygoprodeck/
│   └── types/
├── infrastructure/
│   └── terraform/
│       ├── versions.tf
│       ├── providers.tf
│       ├── main.tf
│       ├── dynamodb.tf
│       ├── iam.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars.example
├── public/
├── tests/
├── render.yaml
├── next.config.ts
├── package.json
├── CLAUDE.md
├── PRD.md
└── README.md
```

---

## 20. Deployment Strategy

### Render

Use a single Render Web Service.

Configure:

- Node.js runtime.
- Build command.
- Start command.
- Environment variables.
- HTTPS.
- Health checks.
- Automatic GitHub deployments.

Use `render.yaml` where supported.

### Deployment Workflow

1. Validate application code.
2. Run automated tests.
3. Build the Next.js application.
4. Validate Terraform configuration.
5. Review infrastructure changes.
6. Apply approved Terraform changes.
7. Deploy the application to Render.
8. Verify health checks.
9. Verify authentication and database connectivity.

### Separation of Responsibilities

**Terraform:** AWS resources.

**Render CLI / Blueprint:** Hosting and deployments.

**GitHub CLI:** Repository operations.

**AWS CLI:** AWS inspection and diagnostics.

**Claude Code:** Development orchestration.

---

## 21. Development Roadmap

### Phase 1 — Foundation

- [ ] Verify required CLI tools.
- [ ] Initialize Next.js.
- [ ] Configure TypeScript.
- [ ] Configure Tailwind CSS and shadcn/ui.
- [ ] Implement Google OAuth.
- [ ] Create Terraform infrastructure.
- [ ] Configure DynamoDB.
- [ ] Deploy to Render.
- [ ] Implement navigation.

### Phase 2 — Catalog and Inventory

- [ ] Integrate YGOPRODeck.
- [ ] Implement card search.
- [ ] Support card ID and Set Code lookup.
- [ ] Create card detail pages.
- [ ] Display official set appearances.
- [ ] Implement inventory management.
- [ ] Support duplicate copies.

### Phase 3 — Sets and Purchases

- [ ] Implement set browsing.
- [ ] Calculate completion using unique card IDs.
- [ ] Display missing cards.
- [ ] Implement product management.
- [ ] Implement purchase history.
- [ ] Support manual inventory additions.

### Phase 4 — Portfolio and PWA

- [ ] Integrate market prices.
- [ ] Implement USD/ILS conversion.
- [ ] Calculate collection valuation.
- [ ] Build financial dashboard.
- [ ] Add PWA support.
- [ ] Optimize mobile experience.

### Phase 5 — Future Features

- [ ] Camera-based card recognition.
- [ ] Personal card photography.
- [ ] Advanced analytics.
- [ ] Historical price charts.
- [ ] Price notifications.
- [ ] Advanced import/export.

---

## 22. Testing and Validation

Before completing each phase:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Claude must configure the corresponding npm scripts before relying on these commands.

### Testing Priorities

- Authentication and authorization.
- Card identification.
- Duplicate inventory.
- Set completion.
- Purchase calculations.
- Currency conversion.
- Price fallback behavior.
- DynamoDB operations.
- External API failures.

### Terraform Validation

```bash
terraform fmt -check
terraform validate
terraform plan
```

Infrastructure changes require explicit approval before applying.

---

## 23. Claude Code Workflow

### Step 1 — Inspect

- Read `PRD.md`.
- Inspect the repository.
- Verify installed tools.
- Check authentication status without exposing credentials.
- Review existing infrastructure.

### Step 2 — Plan

For each development phase:

- Identify required files.
- Define implementation steps.
- Identify dependencies.
- Identify infrastructure changes.
- Identify security considerations.

### Step 3 — Implement

- Follow the approved stack.
- Use CLI tools.
- Use Terraform for AWS infrastructure.
- Keep changes focused.
- Avoid unnecessary abstractions.

### Step 4 — Validate

- Run linting.
- Run TypeScript checks.
- Run tests.
- Run production build.
- Validate Terraform when relevant.

### Step 5 — Report

Provide:

- Implemented features.
- Modified files.
- Test results.
- Infrastructure changes.
- Deployment status.
- Outstanding issues.
- Required user actions.

### Mandatory Approval Gates

Request explicit approval before:

- Applying Terraform against AWS.
- Creating potentially billable resources.
- Deleting cloud resources.
- Destroying infrastructure.
- Making security-sensitive IAM changes.
- Performing irreversible database operations.
- Publishing the application publicly for the first time.

---

## 24. MVP Acceptance Criteria

- [ ] Only the authorized Google account can access the application.
- [ ] Next.js runs on Render.
- [ ] DynamoDB infrastructure is provisioned through Terraform.
- [ ] Application credentials are securely configured.
- [ ] Cards can be searched by name or identifier.
- [ ] Official set appearances are displayed.
- [ ] Physical card copies are tracked independently.
- [ ] Duplicate copies are supported.
- [ ] Product purchases do not automatically modify card inventory.
- [ ] Set completion uses unique card identities.
- [ ] Purchase expenses are tracked.
- [ ] Market value is estimated automatically.
- [ ] USD and ILS are supported.
- [ ] Application works on desktop and iPhone.
- [ ] PWA installation is supported.
- [ ] Terraform state is securely managed.
- [ ] Deployment is manageable through CLI tools.

---

## 25. Final Engineering Principles

1. CLI-first development.
2. Terraform-only AWS infrastructure provisioning.
3. One Next.js application.
4. DynamoDB for persistent storage.
5. Render for application hosting.
6. Google OAuth for single-user authentication.
7. No unnecessary cloud infrastructure.
8. No automatic card ownership assumptions.
9. Card identity over printing for completion tracking.
10. Transparent market valuations.
11. Secure credentials and least privilege.
12. Incremental development and testing.
13. Explicit approval for infrastructure changes.
14. Maintainable, strongly typed code.
15. Cost efficiency throughout the project.
