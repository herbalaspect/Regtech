// ── Product Categories ──────────────────────────────────────────────
export type ProductCategory =
  | "supplement"
  | "hemp_cbd"
  | "cosmetic"
  | "otc_drug"
  | "essential_oil"
  | "unknown";

// ── Severity Levels ────────────────────────────────────────────────
export type Severity = "critical" | "warning" | "info";

// ── Compliance Score ───────────────────────────────────────────────
export type ComplianceScore = "GREEN" | "YELLOW" | "RED" | "NOT_SCANNED";

// ── Rule Types ─────────────────────────────────────────────────────
export type RuleType = "presence" | "absence" | "pattern" | "structural";

// ── Finding Source ─────────────────────────────────────────────────
export type FindingSource = "rule_engine" | "ai_text" | "ai_image";

// ── Product Data ───────────────────────────────────────────────────
export interface ProductData {
  id: string;
  shopifyId: string;
  title: string;
  description: string;
  bodyHtml: string;
  tags: string[];
  productType: string;
  vendor: string;
  images: ProductImage[];
  metafields: Record<string, string>;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

// ── Compliance Rule ────────────────────────────────────────────────
export interface ComplianceRule {
  id: string;
  category: ProductCategory | "cross_category";
  ruleType: RuleType;
  severity: Severity;
  name: string;
  description: string;
  /** For presence/absence: keywords to check. For pattern: regex strings. */
  keywords?: string[];
  /** Regex pattern for pattern-type rules */
  pattern?: string;
  /** Whether this rule is enabled */
  enabled: boolean;
}

// ── Compliance Finding ─────────────────────────────────────────────
export interface ComplianceFinding {
  ruleId: string;
  category: ProductCategory | "cross_category";
  severity: Severity;
  title: string;
  description: string;
  affectedText?: string;
  suggestion?: string;
  source: FindingSource;
}

// ── Scan Result ────────────────────────────────────────────────────
export interface ScanResult {
  productId: string;
  shopifyId: string;
  category: ProductCategory;
  complianceScore: ComplianceScore;
  findings: ComplianceFinding[];
  scannedAt: Date;
}

// ── Classification Result ──────────────────────────────────────────
export interface ClassificationResult {
  category: ProductCategory;
  confidence: number;
  reasoning?: string;
}

// ── AI Claim Analysis ──────────────────────────────────────────────
export interface ClaimAnalysis {
  claim: string;
  claimType: "structure_function" | "drug_claim" | "cosmetic" | "health" | "general";
  severity: Severity;
  explanation: string;
  suggestedFix?: string;
}

// ── Image Analysis Result ──────────────────────────────────────────
export interface ImageAnalysisResult {
  imageUrl: string;
  extractedText: string[];
  findings: ComplianceFinding[];
  labelDetected: boolean;
  supplementFactsDetected: boolean;
  drugFactsDetected: boolean;
  warningSymbolsDetected: string[];
}

// ── Plan Tiers ────────────────────────────────────────────────────
export type PlanTier = "compliance" | "compliance_pro" | "enterprise";

export interface PlanLimits {
  maxProducts: number;
  aiTextAnalysis: boolean;
  imageScanning: boolean;
  scheduledScans: boolean;
  csvExport: boolean;
  pdfExport: boolean;
  externalWebhook: boolean;
  storefrontBadge: boolean;
  customRules: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  compliance: {
    maxProducts: 100,
    aiTextAnalysis: false,
    imageScanning: false,
    scheduledScans: false,
    csvExport: true,
    pdfExport: false,
    externalWebhook: false,
    storefrontBadge: false,
    customRules: false,
  },
  compliance_pro: {
    maxProducts: 1000,
    aiTextAnalysis: true,
    imageScanning: true,
    scheduledScans: true,
    csvExport: true,
    pdfExport: true,
    externalWebhook: true,
    storefrontBadge: true,
    customRules: false,
  },
  enterprise: {
    maxProducts: Infinity,
    aiTextAnalysis: true,
    imageScanning: true,
    scheduledScans: true,
    csvExport: true,
    pdfExport: true,
    externalWebhook: true,
    storefrontBadge: true,
    customRules: true,
  },
};

// ── Shop Settings ──────────────────────────────────────────────────
export interface ShopSettings {
  // Category toggles
  enabledCategories: ProductCategory[];

  // Scan scope
  scanScope: {
    title: boolean;
    description: boolean;
    metafields: boolean;
    tags: boolean;
    images: boolean;
  };

  // Feature toggles
  aiTextAnalysis: boolean;
  imageScanning: boolean;
  prop65Enabled: boolean;

  // Scan frequency
  scanFrequency: "manual" | "on_change" | "daily" | "weekly";

  // Notifications
  notificationEmails: string[];
  notificationLevel: "critical_only" | "all" | "digest";
  digestFrequency: "daily" | "weekly";

  // Data retention
  retentionDays: 30 | 90 | 365;

  // External integrations
  externalWebhookUrl?: string;
  storefrontBadgeEnabled: boolean;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  enabledCategories: ["supplement", "hemp_cbd", "cosmetic", "otc_drug", "essential_oil"],
  scanScope: {
    title: true,
    description: true,
    metafields: true,
    tags: true,
    images: true,
  },
  aiTextAnalysis: true,
  imageScanning: true,
  prop65Enabled: true,
  scanFrequency: "on_change",
  notificationEmails: [],
  notificationLevel: "critical_only",
  digestFrequency: "weekly",
  retentionDays: 90,
  storefrontBadgeEnabled: false,
};

// ── Extended Scan Result (with plan limit info) ───────────────────
export interface ScanResultWithLimits extends ScanResult {
  limitReached: boolean;
  upgradeReason?: string;
}
