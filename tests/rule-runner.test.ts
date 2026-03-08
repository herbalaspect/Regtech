import { describe, it, expect } from "vitest";
import { runRules } from "~/services/compliance/rule-runner";
import type { ComplianceRule, ProductData, ShopSettings } from "~/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";

const makeProduct = (overrides: Partial<ProductData> = {}): ProductData => ({
  id: "1",
  shopifyId: "gid://shopify/Product/1",
  title: "Test Product",
  description: "",
  bodyHtml: "",
  tags: [],
  productType: "",
  vendor: "Test Vendor",
  images: [],
  metafields: {},
  ...overrides,
});

const settings: ShopSettings = {
  ...DEFAULT_SHOP_SETTINGS,
};

describe("Rule Runner", () => {
  describe("Presence rules", () => {
    const rule: ComplianceRule = {
      id: "test-presence",
      category: "supplement",
      ruleType: "presence",
      severity: "critical",
      name: "Missing Disclaimer",
      description: "Product must include disclaimer",
      keywords: ["not been evaluated by the fda", "disclaimer present"],
      enabled: true,
    };

    it("should flag when required text is missing", () => {
      const product = makeProduct({
        description: "A great supplement for your health",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("critical");
      expect(findings[0].ruleId).toBe("test-presence");
    });

    it("should pass when required text is present", () => {
      const product = makeProduct({
        description: "This has not been evaluated by the FDA and is great",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(0);
    });

    it("should be case-insensitive", () => {
      const product = makeProduct({
        description: "NOT BEEN EVALUATED BY THE FDA",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(0);
    });
  });

  describe("Absence rules", () => {
    const rule: ComplianceRule = {
      id: "test-absence",
      category: "supplement",
      ruleType: "absence",
      severity: "critical",
      name: "Prohibited Claim",
      description: "Cannot make drug claims",
      keywords: ["cures cancer", "treats diabetes"],
      enabled: true,
    };

    it("should flag when prohibited text is found", () => {
      const product = makeProduct({
        description: "This supplement cures cancer naturally",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(1);
      expect(findings[0].affectedText).toContain("cures cancer");
    });

    it("should pass when prohibited text is absent", () => {
      const product = makeProduct({
        description: "A natural supplement for daily wellness",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(0);
    });

    it("should include affected text with context", () => {
      const product = makeProduct({
        description: "Our amazing formula treats diabetes effectively",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(1);
      expect(findings[0].affectedText).toBeDefined();
      expect(findings[0].suggestion).toBeDefined();
    });
  });

  describe("Pattern rules", () => {
    const rule: ComplianceRule = {
      id: "test-pattern",
      category: "cosmetic",
      ruleType: "pattern",
      severity: "warning",
      name: "SPF Claim",
      description: "SPF claims require OTC drug compliance",
      pattern: "spf\\s*\\d+",
      enabled: true,
    };

    it("should flag matching patterns", () => {
      const product = makeProduct({
        description: "Moisturizer with SPF 30 protection",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(1);
    });

    it("should pass when pattern is not found", () => {
      const product = makeProduct({
        description: "A simple moisturizer with no sun protection claims",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(0);
    });
  });

  describe("Structural rules", () => {
    const rule: ComplianceRule = {
      id: "test-structural",
      category: "supplement",
      ruleType: "structural",
      severity: "warning",
      name: "Missing Tag",
      description: "Product should have allergen tag",
      keywords: ["tag:allergen-warning"],
      enabled: true,
    };

    it("should flag when required tag is missing", () => {
      const product = makeProduct({ tags: ["supplement", "health"] });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(1);
    });

    it("should pass when required tag is present", () => {
      const product = makeProduct({
        tags: ["supplement", "allergen-warning"],
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(0);
    });
  });

  describe("Disabled rules", () => {
    it("should skip disabled rules", () => {
      const rule: ComplianceRule = {
        id: "test-disabled",
        category: "supplement",
        ruleType: "absence",
        severity: "critical",
        name: "Disabled Rule",
        description: "This should not fire",
        keywords: ["test keyword"],
        enabled: false,
      };
      const product = makeProduct({
        description: "Contains test keyword here",
      });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(0);
    });
  });

  describe("Scan scope settings", () => {
    const rule: ComplianceRule = {
      id: "test-scope",
      category: "supplement",
      ruleType: "absence",
      severity: "warning",
      name: "Claim Found",
      description: "Found a claim",
      keywords: ["miracle cure"],
      enabled: true,
    };

    it("should not scan title when title scanning is disabled", () => {
      const product = makeProduct({ title: "Miracle Cure Supplement" });
      const scopeSettings = {
        ...settings,
        scanScope: { ...settings.scanScope, title: false },
      };
      const findings = runRules(product, [rule], scopeSettings);
      expect(findings).toHaveLength(0);
    });

    it("should scan title when title scanning is enabled", () => {
      const product = makeProduct({ title: "Miracle Cure Supplement" });
      const findings = runRules(product, [rule], settings);
      expect(findings).toHaveLength(1);
    });
  });
});
