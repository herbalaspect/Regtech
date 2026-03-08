import { describe, it, expect, vi } from "vitest";
import type { ProductData } from "~/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";

// Mock AI modules so tests don't need API keys
vi.mock("~/services/compliance/ai-analyzer", () => ({
  analyzeClaimsWithAI: vi.fn().mockResolvedValue([]),
}));

vi.mock("~/services/compliance/image-analyzer", () => ({
  analyzeProductImages: vi.fn().mockResolvedValue([]),
}));

// Import after mocks
const { scanProduct, getScanSummary } = await import("~/services/compliance/engine");

const makeProduct = (overrides: Partial<ProductData> = {}): ProductData => ({
  id: "1",
  shopifyId: "gid://shopify/Product/1",
  title: "",
  description: "",
  bodyHtml: "",
  tags: [],
  productType: "",
  vendor: "",
  images: [],
  metafields: {},
  ...overrides,
});

const settingsNoAI = {
  ...DEFAULT_SHOP_SETTINGS,
  aiTextAnalysis: false,
  imageScanning: false,
};

describe("Scan Engine", () => {
  it("should scan a compliant supplement with no critical findings", async () => {
    const product = makeProduct({
      title: "Vitamin C Supplement",
      productType: "Supplement",
      description:
        "Supports immune health. Supplement Facts: Serving Size 1 capsule. " +
        "These statements have not been evaluated by the Food and Drug Administration. " +
        "This product is not intended to diagnose, treat, cure, or prevent any disease. " +
        "Made in USA.",
      tags: ["supplement", "vitamin"],
    });

    const result = await scanProduct(product, settingsNoAI, "supplement");
    const criticalFindings = result.findings.filter((f) => f.severity === "critical");
    expect(criticalFindings.length).toBe(0);
    // Should not be RED (no critical issues)
    expect(result.complianceScore).not.toBe("RED");
  });

  it("should flag a non-compliant supplement as RED", async () => {
    const product = makeProduct({
      title: "Miracle Cure Supplement",
      productType: "Supplement",
      description: "Cures cancer and treats diabetes. Guaranteed results!",
      tags: ["supplement"],
    });

    const result = await scanProduct(product, settingsNoAI, "supplement");
    expect(result.complianceScore).toBe("RED");
    expect(result.findings.length).toBeGreaterThan(0);

    const critical = result.findings.filter((f) => f.severity === "critical");
    expect(critical.length).toBeGreaterThan(0);
  });

  it("should flag a CBD product with therapeutic claims as RED", async () => {
    const product = makeProduct({
      title: "CBD Oil",
      description: "Relieves pain and reduces anxiety. Our CBD supplement.",
      tags: ["cbd", "hemp"],
    });

    const result = await scanProduct(product, settingsNoAI, "hemp_cbd");
    expect(result.complianceScore).toBe("RED");
  });

  it("should include cross-category rules in scan", async () => {
    const product = makeProduct({
      title: "FDA Approved Supplement",
      description: "This FDA approved product is scientifically proven to work.",
      tags: ["supplement"],
    });

    const result = await scanProduct(product, settingsNoAI, "supplement");
    const fdaClaim = result.findings.find((f) => f.ruleId === "cross-fda-001");
    expect(fdaClaim).toBeDefined();
  });

  it("should auto-classify product category", async () => {
    const product = makeProduct({
      title: "Lavender Essential Oil",
      description: "Pure lavender oil for aromatherapy",
      productType: "Essential Oil",
      tags: ["essential oil", "aromatherapy"],
    });

    const result = await scanProduct(product, settingsNoAI);
    expect(result.category).toBe("essential_oil");
  });

  describe("getScanSummary", () => {
    it("should summarize findings correctly", () => {
      const result = {
        productId: "1",
        shopifyId: "gid://shopify/Product/1",
        category: "supplement" as const,
        complianceScore: "RED" as const,
        findings: [
          { ruleId: "1", category: "supplement" as const, severity: "critical" as const, title: "A", description: "B", source: "rule_engine" as const },
          { ruleId: "2", category: "supplement" as const, severity: "warning" as const, title: "C", description: "D", source: "rule_engine" as const },
          { ruleId: "3", category: "supplement" as const, severity: "info" as const, title: "E", description: "F", source: "rule_engine" as const },
        ],
        scannedAt: new Date(),
      };

      const summary = getScanSummary(result);
      expect(summary).toContain("1 critical");
      expect(summary).toContain("1 warning");
      expect(summary).toContain("1 info");
    });

    it("should report no issues for clean scan", () => {
      const result = {
        productId: "1",
        shopifyId: "gid://shopify/Product/1",
        category: "supplement" as const,
        complianceScore: "GREEN" as const,
        findings: [],
        scannedAt: new Date(),
      };

      const summary = getScanSummary(result);
      expect(summary).toContain("fully compliant");
    });
  });
});
