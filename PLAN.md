# RegShield - Shopify Regulatory Compliance App

## Overview

An embedded Shopify app that automatically scans product listings for regulatory compliance issues across regulated product categories. Uses a hybrid approach: deterministic rule engines for known requirements (FDA disclaimers, Prop 65 warnings, ingredient disclosures) combined with AI-powered analysis for claim detection and product classification.

## Tech Stack

- **Framework:** Remix (Shopify CLI app template)
- **Database:** Prisma + SQLite (dev) / PostgreSQL (prod)
- **UI:** Shopify Polaris
- **AI:** Claude API for claim analysis and product classification
- **Shopify:** App Bridge, Admin API (GraphQL), Webhooks
- **Testing:** Vitest
- **Language:** TypeScript

---

## MVP Product Categories (Core 5)

### 1. Dietary Supplements & Nutraceuticals
- **DSHEA Disclaimer** — "These statements have not been evaluated by the FDA..."
- **Supplement Facts label** reference/presence
- **Structure/function claims** vs prohibited disease claims detection
- **Allergen warnings** (nuts, soy, dairy, gluten, etc.)
- **Drug claim detection** (cure, treat, diagnose, prevent disease)

### 2. Hemp & CBD Products
- **THC content disclaimer** (<0.3%)
- **No ingestible CBD claims** (FDA prohibition)
- **No therapeutic claims** on topical CBD (pain, anxiety, sleep)
- **Certificate of Analysis (CoA)** reference check
- **State-specific legality warnings**

### 3. Cosmetics & Personal Care
- **Ingredient declaration** presence
- **Cosmetic vs drug claim** boundary detection
- **Prohibited ingredient** flagging (mercury, hydroquinone OTC)
- **"For external use only"** where required
- **Fair Packaging and Labeling Act** compliance

### 4. OTC Topical Drugs
- **Drug Facts label** reference
- **Active ingredient disclosure**
- **Required warnings** (irritation, sun exposure, discontinue use)
- **Monograph compliance** indicators
- **"For external use only"** statement

### 5. Essential Oils & Aromatherapy
- **Cosmetic vs drug classification** based on claims
- **Therapeutic claim detection** (pain relief, cures, treats)
- **Ingredient labeling** compliance
- **Safety warnings** for concentrated oils

### Cross-Category Rules
- **California Prop 65** warnings (for sellers with 10+ employees)
- **FTC claim substantiation** — unsubstantiated health/efficacy claims
- **Age restriction** requirements where applicable
- **Country/state-specific** shipping disclaimers

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Shopify Admin UI                     │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ │
│  │  Dashboard   │ │Product Scan  │ │  Settings     │ │
│  │  (Polaris)   │ │  Results     │ │  & Rules      │ │
│  └──────┬───────┘ └──────┬───────┘ └───────┬───────┘ │
│         └────────────────┼─────────────────┘         │
│                          │ App Bridge                 │
├──────────────────────────┼───────────────────────────┤
│                    Remix Backend                      │
│  ┌───────────────────────┼───────────────────────────┐
│  │              API Routes (loaders/actions)          │
│  ├───────────────────────┼───────────────────────────┤
│  │         ┌─────────────┴──────────────┐            │
│  │         │     Compliance Engine       │            │
│  │         │  ┌──────────┐ ┌──────────┐ │            │
│  │         │  │  Rule    │ │   AI     │ │            │
│  │         │  │  Engine  │ │ Analyzer │ │            │
│  │         │  │(Determ.) │ │(Claude)  │ │            │
│  │         │  └──────────┘ └──────────┘ │            │
│  │         └────────────────────────────┘            │
│  ├───────────────────────────────────────────────────┤
│  │  Shopify Admin API    │    Prisma/DB              │
│  │  (GraphQL Client)     │    (Scan Results,Rules)   │
│  └───────────────────────┴───────────────────────────┘
├──────────────────────────────────────────────────────┤
│  Webhooks: products/create, products/update,         │
│            app/uninstalled                            │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Project Scaffolding & Auth
1. Initialize Shopify Remix app with `@shopify/cli`
2. Configure Prisma schema (shops, products, scan results, compliance rules)
3. Set up Shopify OAuth and session management (built into template)
4. Create base Polaris layout with navigation

### Phase 2: Product Sync & Classification
5. Build Shopify Admin API integration to fetch products (title, description, tags, metafields, images)
6. Create product classifier — determines which regulatory category a product belongs to based on:
   - Product tags/collections
   - Title & description keywords
   - Manual merchant override
7. Store product snapshots in DB for change tracking

### Phase 3: Rule Engine (Deterministic)
8. Design rule schema: `{ id, category, severity, check, message, fix_suggestion }`
9. Implement rule runners for each category:
   - **Text presence rules** — check if required statements exist in description
   - **Text absence rules** — flag prohibited claims/words
   - **Pattern rules** — regex-based checks (ingredient lists, percentages)
   - **Structural rules** — required fields, metafields, or tags present
10. Build rule sets for Core 5 categories:
    - Supplements: DSHEA disclaimer, drug claim patterns, allergen warnings
    - Hemp/CBD: THC disclaimer, therapeutic claim patterns, CoA reference
    - Cosmetics: ingredient list, drug claim boundary, prohibited ingredients
    - OTC Drugs: Drug Facts reference, active ingredients, warnings
    - Essential Oils: therapeutic claim detection, safety warnings
11. Add Prop 65 and FTC cross-category rules

### Phase 4: AI Analyzer (Claude Integration)
12. Build Claude API integration for:
    - **Product classification** — auto-detect product category from listing content
    - **Claim analysis** — identify health/efficacy claims and classify as structure/function vs drug claim
    - **Severity assessment** — contextual risk scoring beyond keyword matching
    - **Fix suggestions** — generate compliant alternative language
13. Design prompts with regulatory context for each category
14. Implement caching layer to avoid redundant AI calls on unchanged products
15. Add fallback to rule-engine-only mode if AI is unavailable

### Phase 5: Scanning Pipeline
16. Build scan orchestrator:
    - Fetch product data from Shopify
    - Classify product category
    - Run deterministic rules
    - Run AI analysis (for claims that need contextual understanding)
    - Merge and deduplicate findings
    - Score overall compliance (Red/Yellow/Green)
17. Support scan modes: single product, bulk (all products), scheduled (cron)
18. Set up webhook handlers for `products/create` and `products/update` to trigger auto-scans

### Phase 6: Dashboard & UI
19. **Dashboard page** — overall store compliance score, issues by severity, category breakdown
20. **Product list page** — all products with compliance status badges (✓ Compliant, ⚠ Warnings, ✗ Violations)
21. **Product detail page** — per-product scan results:
    - List of issues with severity (Critical / Warning / Info)
    - Affected text highlighted
    - Suggested fixes with one-click copy
    - "Re-scan" button
22. **Settings page** —
    - Select active product categories
    - Toggle Prop 65 / state-specific rules
    - Configure scan frequency (manual / on-change / daily)
    - AI analysis on/off toggle
    - Notification preferences

### Phase 7: Notifications & Reporting
23. In-app notification banner for new critical issues
24. Email digest (daily/weekly compliance summary)
25. Export compliance report (CSV/PDF) for auditing

### Phase 8: Polish & Production
26. Error handling, rate limiting, retry logic for Shopify API
27. App listing metadata (description, screenshots, pricing)
28. Production deployment configuration
29. End-to-end tests for critical scanning flows

---

## Database Schema (Prisma)

```prisma
model Shop {
  id            String   @id @default(cuid())
  shopDomain    String   @unique
  accessToken   String
  settings      Json     @default("{}")
  installedAt   DateTime @default(now())
  products      Product[]
  scanResults   ScanResult[]
}

model Product {
  id              String   @id @default(cuid())
  shopId          String
  shopifyId       String
  title           String
  description     String   @db.Text
  tags            String   @default("")
  category        String?  // regulatory category classification
  lastScannedAt   DateTime?
  complianceScore String?  // RED, YELLOW, GREEN
  shop            Shop     @relation(fields: [shopId], references: [id])
  scanResults     ScanResult[]
  @@unique([shopId, shopifyId])
}

model ScanResult {
  id            String   @id @default(cuid())
  shopId        String
  productId     String
  ruleId        String
  category      String   // supplement, hemp, cosmetic, otc, essential_oil
  severity      String   // critical, warning, info
  title         String
  description   String   @db.Text
  affectedText  String?  @db.Text
  suggestion    String?  @db.Text
  source        String   // "rule_engine" or "ai_analyzer"
  resolved      Boolean  @default(false)
  scannedAt     DateTime @default(now())
  shop          Shop     @relation(fields: [shopId], references: [id])
  product       Product  @relation(fields: [productId], references: [id])
}

model ComplianceRule {
  id          String  @id @default(cuid())
  category    String
  ruleType    String  // presence, absence, pattern, structural
  severity    String
  name        String
  description String
  pattern     String? // regex pattern for pattern rules
  keywords    Json?   // keyword lists for presence/absence
  enabled     Boolean @default(true)
  builtIn     Boolean @default(true) // false = merchant-created
}
```

---

## Key Rule Examples

### Supplements — DSHEA Disclaimer Check
```ts
{
  id: "supp-dshea-001",
  category: "supplement",
  ruleType: "presence",
  severity: "critical",
  name: "Missing FDA Disclaimer",
  description: "Supplement products must include the DSHEA disclaimer",
  keywords: ["not been evaluated by the Food and Drug Administration",
             "not intended to diagnose, treat, cure, or prevent"]
}
```

### Hemp/CBD — Therapeutic Claim Detection
```ts
{
  id: "hemp-claims-001",
  category: "hemp",
  ruleType: "absence",
  severity: "critical",
  name: "Prohibited Therapeutic Claims",
  description: "CBD/hemp products cannot make therapeutic claims",
  keywords: ["relieves pain", "reduces anxiety", "helps sleep",
             "anti-inflammatory", "treats", "cures"]
}
```

### Cosmetics — Drug Claim Boundary
```ts
{
  id: "cosm-claims-001",
  category: "cosmetic",
  ruleType: "absence",
  severity: "critical",
  name: "Drug Claims on Cosmetic Product",
  description: "Cosmetic products cannot claim to treat conditions",
  keywords: ["treats acne", "cures eczema", "heals", "anti-aging treatment",
             "reduces wrinkles", "removes scars"]
}
```

---

## Compliance Scoring

| Score  | Criteria |
|--------|----------|
| 🟢 GREEN  | No critical or warning issues |
| 🟡 YELLOW | No critical issues, 1+ warnings |
| 🔴 RED    | 1+ critical issues |

---

## File Structure

```
app/
├── routes/
│   ├── app._index.tsx          # Dashboard
│   ├── app.products.tsx        # Product list with compliance status
│   ├── app.products.$id.tsx    # Product compliance detail
│   ├── app.scan.tsx            # Trigger scans
│   ├── app.settings.tsx        # App settings
│   ├── webhooks.tsx            # Webhook handlers
│   └── auth.$.tsx              # OAuth (Shopify template)
├── components/
│   ├── ComplianceBadge.tsx
│   ├── IssueCard.tsx
│   ├── ScanResultsList.tsx
│   ├── DashboardStats.tsx
│   └── ProductComplianceTable.tsx
├── services/
│   ├── compliance/
│   │   ├── engine.ts           # Scan orchestrator
│   │   ├── classifier.ts       # Product category classifier
│   │   ├── rule-runner.ts      # Deterministic rule execution
│   │   ├── ai-analyzer.ts      # Claude API integration
│   │   └── rules/
│   │       ├── supplements.ts
│   │       ├── hemp-cbd.ts
│   │       ├── cosmetics.ts
│   │       ├── otc-drugs.ts
│   │       ├── essential-oils.ts
│   │       └── cross-category.ts  # Prop 65, FTC
│   ├── shopify/
│   │   ├── products.ts         # Product CRUD via Admin API
│   │   └── webhooks.ts         # Webhook processing
│   └── notifications.ts
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   └── constants.ts            # Regulatory text constants
└── prisma/
    └── schema.prisma
```

---

## Future Expansion (Post-MVP)

- **Additional categories:** Alcohol, pet products, medical devices, sunscreen, weight loss, tobacco/vape, skin lightening
- **Image scanning:** OCR on product images to check label compliance
- **Metafield enforcement:** Write compliance data back to Shopify metafields
- **Multi-language support:** Compliance checks in Spanish, French, etc.
- **Regulatory update feed:** Auto-update rules when regulations change
- **Shopify Flow integration:** Trigger flows based on compliance status
- **Bulk fix actions:** Apply suggested fixes across multiple products
- **Compliance certification badge:** Storefront widget showing compliance status
- **API access:** Let merchants integrate compliance checks into their workflows
