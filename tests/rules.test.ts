import { describe, it, expect } from "vitest";
import { runRules } from "~/services/compliance/rule-runner";
import { supplementRules } from "~/services/compliance/rules/supplements";
import { hempCbdRules } from "~/services/compliance/rules/hemp-cbd";
import { cosmeticRules } from "~/services/compliance/rules/cosmetics";
import { otcDrugRules } from "~/services/compliance/rules/otc-drugs";
import { essentialOilRules } from "~/services/compliance/rules/essential-oils";
import { crossCategoryRules } from "~/services/compliance/rules/cross-category";
import { getAllRulesForCategory } from "~/services/compliance/rules/index";
import type { ProductData, ShopSettings } from "~/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";

const settings = DEFAULT_SHOP_SETTINGS;

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

describe("Supplement Rules", () => {
  it("should flag missing DSHEA disclaimer", () => {
    const product = makeProduct({
      title: "Vitamin C Supplement",
      description: "Supports immune health. Take daily for best results.",
    });
    const findings = runRules(product, supplementRules, settings);
    const dshea = findings.find((f) => f.ruleId === "supp-dshea-001");
    expect(dshea).toBeDefined();
    expect(dshea!.severity).toBe("critical");
  });

  it("should pass when DSHEA disclaimer is present", () => {
    const product = makeProduct({
      description:
        "Supports immune health. These statements have not been evaluated by the " +
        "Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.",
    });
    const findings = runRules(product, supplementRules, settings);
    const dshea = findings.find((f) => f.ruleId === "supp-dshea-001");
    expect(dshea).toBeUndefined();
  });

  it("should flag drug claims on supplements", () => {
    const product = makeProduct({
      description: "This supplement cures arthritis and treats diabetes.",
    });
    const findings = runRules(product, supplementRules, settings);
    const drugClaim = findings.find((f) => f.ruleId === "supp-drug-001");
    expect(drugClaim).toBeDefined();
    expect(drugClaim!.severity).toBe("critical");
  });

  it("should flag unsubstantiated weight loss claims", () => {
    const product = makeProduct({
      description: "Lose weight fast with our revolutionary belly fat burner!",
    });
    const findings = runRules(product, supplementRules, settings);
    const weightClaim = findings.find((f) => f.ruleId === "supp-weight-001");
    expect(weightClaim).toBeDefined();
  });
});

describe("Hemp/CBD Rules", () => {
  it("should flag therapeutic claims on CBD products", () => {
    const product = makeProduct({
      title: "CBD Oil",
      description: "Relieves pain and reduces anxiety naturally.",
    });
    const findings = runRules(product, hempCbdRules, settings);
    const therapeutic = findings.find((f) => f.ruleId === "hemp-claims-001");
    expect(therapeutic).toBeDefined();
    expect(therapeutic!.severity).toBe("critical");
  });

  it("should flag missing THC disclosure", () => {
    const product = makeProduct({
      title: "CBD Tincture",
      description: "Full spectrum hemp extract.",
    });
    const findings = runRules(product, hempCbdRules, settings);
    const thc = findings.find((f) => f.ruleId === "hemp-thc-001");
    expect(thc).toBeDefined();
  });

  it("should pass when THC disclosure is present", () => {
    const product = makeProduct({
      description: "Full spectrum hemp extract. Contains less than 0.3% THC.",
    });
    const findings = runRules(product, hempCbdRules, settings);
    const thc = findings.find((f) => f.ruleId === "hemp-thc-001");
    expect(thc).toBeUndefined();
  });

  it("should flag CBD marketed as dietary supplement", () => {
    const product = makeProduct({
      description: "CBD supplement for daily wellness.",
    });
    const findings = runRules(product, hempCbdRules, settings);
    const ingest = findings.find((f) => f.ruleId === "hemp-ingest-001");
    expect(ingest).toBeDefined();
  });
});

describe("Cosmetic Rules", () => {
  it("should flag drug claims on cosmetics", () => {
    const product = makeProduct({
      description: "This cream treats acne and cures eczema effectively.",
    });
    const findings = runRules(product, cosmeticRules, settings);
    const drugClaim = findings.find((f) => f.ruleId === "cosm-drug-001");
    expect(drugClaim).toBeDefined();
  });

  it("should flag prohibited ingredients", () => {
    const product = makeProduct({
      description: "Contains mercury for skin brightening effects.",
    });
    const findings = runRules(product, cosmeticRules, settings);
    const prohibited = findings.find((f) => f.ruleId === "cosm-ingredient-001");
    expect(prohibited).toBeDefined();
    expect(prohibited!.severity).toBe("critical");
  });

  it("should flag SPF claims", () => {
    const product = makeProduct({
      description: "Daily moisturizer with SPF 50 sun protection.",
    });
    const findings = runRules(product, cosmeticRules, settings);
    const spf = findings.find((f) => f.ruleId === "cosm-spf-001");
    expect(spf).toBeDefined();
  });

  it("should flag missing ingredient list", () => {
    const product = makeProduct({
      description: "A wonderful moisturizer for all skin types.",
    });
    const findings = runRules(product, cosmeticRules, settings);
    const ingredients = findings.find((f) => f.ruleId === "cosm-ingredients-001");
    expect(ingredients).toBeDefined();
  });
});

describe("OTC Drug Rules", () => {
  it("should flag missing Drug Facts reference", () => {
    const product = makeProduct({
      description: "Pain relief cream that works fast.",
    });
    const findings = runRules(product, otcDrugRules, settings);
    const drugFacts = findings.find((f) => f.ruleId === "otc-facts-001");
    expect(drugFacts).toBeDefined();
  });

  it("should pass when Drug Facts are present", () => {
    const product = makeProduct({
      description:
        "Drug Facts: Active ingredient: Lidocaine 4%. Uses: Temporary relief of pain. " +
        "Warnings: For external use only. Directions: Apply to affected area.",
    });
    const findings = runRules(product, otcDrugRules, settings);
    const drugFacts = findings.find((f) => f.ruleId === "otc-facts-001");
    expect(drugFacts).toBeUndefined();
  });

  it("should flag prescription strength claims", () => {
    const product = makeProduct({
      description: "Prescription strength pain relief without a prescription.",
    });
    const findings = runRules(product, otcDrugRules, settings);
    const rx = findings.find((f) => f.ruleId === "otc-rx-001");
    expect(rx).toBeDefined();
  });
});

describe("Essential Oil Rules", () => {
  it("should flag therapeutic claims", () => {
    const product = makeProduct({
      description: "Lavender oil that relieves pain and treats insomnia.",
    });
    const findings = runRules(product, essentialOilRules, settings);
    const therapeutic = findings.find((f) => f.ruleId === "eo-therapeutic-001");
    expect(therapeutic).toBeDefined();
  });

  it("should flag internal use promotion", () => {
    const product = makeProduct({
      description: "Add to water for a refreshing drink. Take internally for best results.",
    });
    const findings = runRules(product, essentialOilRules, settings);
    const internal = findings.find((f) => f.ruleId === "eo-internal-001");
    expect(internal).toBeDefined();
  });

  it("should flag missing safety warnings", () => {
    const product = makeProduct({
      description: "Pure tea tree essential oil for aromatherapy.",
    });
    const findings = runRules(product, essentialOilRules, settings);
    const safety = findings.find((f) => f.ruleId === "eo-safety-001");
    expect(safety).toBeDefined();
  });
});

describe("Cross-Category Rules", () => {
  it("should flag misleading FDA approval claims", () => {
    const product = makeProduct({
      description: "Our FDA approved supplement is the best.",
    });
    const findings = runRules(product, crossCategoryRules, settings);
    const fda = findings.find((f) => f.ruleId === "cross-fda-001");
    expect(fda).toBeDefined();
    expect(fda!.severity).toBe("critical");
  });

  it("should flag unsubstantiated health claims", () => {
    const product = makeProduct({
      description: "Scientifically proven miracle formula with guaranteed results.",
    });
    const findings = runRules(product, crossCategoryRules, settings);
    const ftc = findings.find((f) => f.ruleId === "cross-ftc-001");
    expect(ftc).toBeDefined();
  });
});

describe("getAllRulesForCategory", () => {
  it("should include category rules and cross-category rules", () => {
    const rules = getAllRulesForCategory("supplement");
    const hasSupp = rules.some((r) => r.category === "supplement");
    const hasCross = rules.some((r) => r.category === "cross_category");
    expect(hasSupp).toBe(true);
    expect(hasCross).toBe(true);
  });

  it("should exclude Prop 65 when disabled", () => {
    const rules = getAllRulesForCategory("supplement", false);
    const prop65 = rules.find((r) => r.id === "cross-prop65-001");
    expect(prop65).toBeUndefined();
  });

  it("should include Prop 65 by default", () => {
    const rules = getAllRulesForCategory("supplement");
    const prop65 = rules.find((r) => r.id === "cross-prop65-001");
    expect(prop65).toBeDefined();
  });
});
