import { describe, it, expect } from "vitest";
import { parseCoaText, parseCoaJson } from "~/services/state-regulations/coa-parser";
import {
  checkProductStateCompliance,
  checkCoaStateCompliance,
  checkMultiStateCompliance,
  getShippableStates,
} from "~/services/state-regulations/state-compliance-engine";
import { STATE_REGULATION_MAP } from "~/services/state-regulations/seed-data";
import type { CannabinoidProfile, CoaParsedData, StateRegulationData } from "~/lib/state-types";
import type { ProductData } from "~/lib/types";

// ── COA Parser Tests ────────────────────────────────────────────────

describe("COA Text Parser", () => {
  const sampleCoaText = `
    Green Valley Testing Labs
    License: CDPH-T00001234

    Sample Name: Premium CBD Tincture
    Batch: BATCH-2026-001
    Test Date: 03/15/2026

    CANNABINOID PROFILE
    Delta-9-THC: 0.28%
    Delta-8-THC: 0.00%
    THCA: 0.02%
    Total THC: 0.30%
    CBD: 15.20%
    CBDA: 1.50%
    Total CBD: 16.52%
    CBG: 0.45%
    CBN: 0.12%

    TERPENE PROFILE
    Myrcene: 0.85%
    Limonene: 0.42%
    Linalool: 0.28%
    Caryophyllene: 0.55%

    CONTAMINANT TESTING
    Pesticides: PASS
    Heavy Metals: PASS
    Microbials: PASS
    Mycotoxins: PASS
    Residual Solvents: PASS
    Moisture: PASS
  `;

  it("should extract lab name", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.labName).toBe("Green Valley Testing Labs");
  });

  it("should extract lab license", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.labLicense).toBe("CDPH-T00001234");
  });

  it("should extract batch number", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.batchNumber).toBe("BATCH-2026-001");
  });

  it("should extract test date", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.testDate).toBe("2026-03-15");
  });

  it("should extract cannabinoid profile", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.cannabinoidResults.delta9_thc).toBe(0.28);
    expect(result.cannabinoidResults.delta8_thc).toBe(0);
    expect(result.cannabinoidResults.cbd).toBe(15.2);
    expect(result.cannabinoidResults.total_thc).toBe(0.30);
    expect(result.cannabinoidResults.cbg).toBe(0.45);
    expect(result.cannabinoidResults.cbn).toBe(0.12);
  });

  it("should extract terpene results", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.terpeneResults.myrcene).toBe(0.85);
    expect(result.terpeneResults.limonene).toBe(0.42);
    expect(result.terpeneResults.caryophyllene).toBe(0.55);
  });

  it("should extract contaminant results", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.contaminantResults.pesticides).toBe("pass");
    expect(result.contaminantResults.heavy_metals).toBe("pass");
    expect(result.contaminantResults.microbials).toBe("pass");
    expect(result.contaminantResults.residual_solvents).toBe("pass");
  });

  it("should extract total THC/CBD percentages", () => {
    const result = parseCoaText(sampleCoaText);
    expect(result.totalThcPct).toBe(0.30);
    expect(result.totalCbdPct).toBe(16.52);
  });

  it("should calculate total THC from delta9 + THCA when not provided", () => {
    const text = `
      Delta-9-THC: 0.25%
      THCA: 0.10%
      CBD: 12.00%
    `;
    const result = parseCoaText(text);
    // total_thc = 0.25 + (0.10 * 0.877) = 0.3377
    expect(result.cannabinoidResults.total_thc).toBeCloseTo(0.338, 2);
  });

  it("should handle COA with failing contaminant tests", () => {
    const text = `
      Pesticides: FAIL
      Heavy Metals: PASS
      Microbials: Non-Compliant
    `;
    const result = parseCoaText(text);
    expect(result.contaminantResults.pesticides).toBe("fail");
    expect(result.contaminantResults.heavy_metals).toBe("pass");
    expect(result.contaminantResults.microbials).toBe("fail");
  });
});

describe("COA JSON Parser", () => {
  it("should parse structured cannabinoid data", () => {
    const data = {
      lab_name: "Test Lab Inc",
      batch_number: "B-001",
      test_date: "2026-03-01",
      cannabinoids: {
        delta9_thc: 0.15,
        cbd: 18.5,
        thca: 0.05,
        cbg: 0.3,
      },
      contaminants: {
        pesticides: "pass",
        heavy_metals: "pass",
        microbials: "pass",
      },
      terpenes: {
        myrcene: 1.2,
        limonene: 0.8,
      },
    };

    const result = parseCoaJson(data);
    expect(result.labName).toBe("Test Lab Inc");
    expect(result.batchNumber).toBe("B-001");
    expect(result.cannabinoidResults.delta9_thc).toBe(0.15);
    expect(result.cannabinoidResults.cbd).toBe(18.5);
    expect(result.contaminantResults.pesticides).toBe("pass");
    expect(result.terpeneResults.myrcene).toBe(1.2);
  });

  it("should calculate total THC when not provided", () => {
    const data = {
      cannabinoids: {
        delta9_thc: 0.2,
        thca: 0.1,
      },
    };

    const result = parseCoaJson(data);
    // total_thc = 0.2 + (0.1 * 0.877) = 0.2877
    expect(result.cannabinoidResults.total_thc).toBeCloseTo(0.288, 2);
  });

  it("should handle alternate key names", () => {
    const data = {
      labName: "Alt Lab",
      batchNumber: "ALT-001",
      cannabinoid_results: {
        "delta-9-thc": 0.25,
        "delta-8-thc": 0.01,
      },
      contaminant_results: {
        pesticides: "compliant",
        solvents: "within limits",
      },
    };

    const result = parseCoaJson(data);
    expect(result.labName).toBe("Alt Lab");
    expect(result.cannabinoidResults.delta9_thc).toBe(0.25);
    expect(result.cannabinoidResults.delta8_thc).toBe(0.01);
    expect(result.contaminantResults.pesticides).toBe("pass");
    expect(result.contaminantResults.residual_solvents).toBe("pass");
  });
});

// ── State Compliance Engine Tests ───────────────────────────────────

const mockCbdProduct: ProductData = {
  id: "prod-001",
  shopifyId: "gid://shopify/Product/12345",
  title: "Premium Full Spectrum CBD Oil 1500mg",
  description: "Our full spectrum CBD oil contains 0.28% delta-9 THC and 15% CBD. Lab tested, certificate of analysis available. Contains delta-8 THC naturally occurring.",
  bodyHtml: "<p>Premium CBD oil for wellness. Must be 21+ to purchase.</p>",
  tags: ["cbd", "hemp", "full-spectrum", "tincture"],
  productType: "CBD Oil",
  vendor: "Hemp Co",
  images: [],
  metafields: {},
};

const mockHighThcProduct: ProductData = {
  id: "prod-002",
  shopifyId: "gid://shopify/Product/12346",
  title: "Super Strong Delta-8 Gummies 50mg",
  description: "Each gummy contains 50mg delta-8 THC. Cures anxiety and treats pain naturally.",
  bodyHtml: "<p>Delta-8 THC gummies for relaxation.</p>",
  tags: ["delta-8", "gummies", "hemp"],
  productType: "Edible",
  vendor: "D8 Brand",
  images: [],
  metafields: {},
};

describe("State Compliance Engine — Product Checks", () => {
  it("should detect banned cannabinoids (delta-8 in NY)", () => {
    const regulation = STATE_REGULATION_MAP["NY"];
    const result = checkProductStateCompliance(mockHighThcProduct, "NY", regulation);

    expect(result.compliant).toBe(false);
    const bannedIssue = result.issues.find((i) => i.ruleId.includes("banned-cannabinoid"));
    expect(bannedIssue).toBeDefined();
    expect(bannedIssue!.severity).toBe("critical");
  });

  it("should flag health claims in product text", () => {
    const regulation = STATE_REGULATION_MAP["CA"];
    const result = checkProductStateCompliance(mockHighThcProduct, "CA", regulation);

    const healthIssue = result.issues.find((i) => i.ruleId.includes("advertising-health-claim"));
    expect(healthIssue).toBeDefined();
    expect(healthIssue!.severity).toBe("critical");
  });

  it("should flag shipping to Idaho (zero THC tolerance)", () => {
    const regulation = STATE_REGULATION_MAP["ID"];
    const result = checkProductStateCompliance(mockCbdProduct, "ID", regulation);

    const shippingIssue = result.issues.find((i) => i.ruleId.includes("shipping-prohibited"));
    expect(shippingIssue).toBeDefined();
    expect(shippingIssue!.severity).toBe("critical");
    expect(result.compliant).toBe(false);
  });

  it("should pass compliant CBD product in hemp-friendly state", () => {
    const regulation = STATE_REGULATION_MAP["KY"];
    const result = checkProductStateCompliance(mockCbdProduct, "KY", regulation);

    const criticalIssues = result.issues.filter((i) => i.severity === "critical");
    // KY doesn't ban delta-8 and is hemp-friendly
    expect(criticalIssues.length).toBe(0);
  });

  it("should check multiple states at once", () => {
    const regulations = new Map(Object.entries(STATE_REGULATION_MAP));
    const results = checkMultiStateCompliance(
      mockHighThcProduct,
      ["NY", "CA", "CO", "ID"],
      regulations,
    );

    expect(results.length).toBe(4);
    // Idaho should be non-compliant (zero THC, no shipping)
    const idaho = results.find((r) => r.stateCode === "ID");
    expect(idaho?.compliant).toBe(false);
  });
});

describe("State Compliance Engine — COA Checks", () => {
  it("should flag COA THC over state limit", () => {
    const coaData: CoaParsedData = {
      labName: "Test Lab",
      labLicense: null,
      testDate: "2026-01-01",
      batchNumber: "B-001",
      sampleName: "CBD Oil",
      cannabinoidResults: {
        delta9_thc: 0.5, // Over 0.3% limit
        delta8_thc: null,
        thca: 0.02,
        total_thc: 0.52,
        cbd: 15.0,
        cbda: null,
        total_cbd: 15.0,
        cbg: null,
        cbn: null,
        cbc: null,
        thcv: null,
        cbdv: null,
      },
      terpeneResults: {},
      contaminantResults: {
        pesticides: "pass",
        heavy_metals: "pass",
        microbials: "pass",
        mycotoxins: "pass",
        residual_solvents: "pass",
        moisture: "pass",
      },
      totalThcPct: 0.52,
      totalCbdPct: 15.0,
      moisturePct: null,
    };

    const regulation = STATE_REGULATION_MAP["CA"];
    const result = checkCoaStateCompliance(coaData, "CA", regulation);

    const thcIssue = result.issues.find((i) => i.ruleId.includes("delta9-thc-limit"));
    expect(thcIssue).toBeDefined();
    expect(thcIssue!.severity).toBe("critical");
    expect(result.compliant).toBe(false);
  });

  it("should pass compliant COA under THC limits", () => {
    const coaData: CoaParsedData = {
      labName: "Test Lab",
      labLicense: null,
      testDate: "2026-01-01",
      batchNumber: "B-002",
      sampleName: "CBD Oil",
      cannabinoidResults: {
        delta9_thc: 0.25,
        delta8_thc: null,
        thca: 0.02,
        total_thc: 0.27,
        cbd: 18.0,
        cbda: null,
        total_cbd: 18.0,
        cbg: null,
        cbn: null,
        cbc: null,
        thcv: null,
        cbdv: null,
      },
      terpeneResults: {},
      contaminantResults: {
        pesticides: "pass",
        heavy_metals: "pass",
        microbials: "pass",
        mycotoxins: "pass",
        residual_solvents: "pass",
        moisture: "pass",
      },
      totalThcPct: 0.27,
      totalCbdPct: 18.0,
      moisturePct: null,
    };

    const regulation = STATE_REGULATION_MAP["CO"];
    const result = checkCoaStateCompliance(coaData, "CO", regulation);

    const criticalIssues = result.issues.filter((i) => i.severity === "critical");
    expect(criticalIssues.length).toBe(0);
    expect(result.compliant).toBe(true);
  });

  it("should flag failed contaminant tests", () => {
    const coaData: CoaParsedData = {
      labName: "Test Lab",
      labLicense: null,
      testDate: "2026-01-01",
      batchNumber: "B-003",
      sampleName: "CBD Oil",
      cannabinoidResults: {
        delta9_thc: 0.2,
        delta8_thc: null,
        thca: null,
        total_thc: 0.2,
        cbd: 10.0,
        cbda: null,
        total_cbd: 10.0,
        cbg: null,
        cbn: null,
        cbc: null,
        thcv: null,
        cbdv: null,
      },
      terpeneResults: {},
      contaminantResults: {
        pesticides: "fail",
        heavy_metals: "pass",
        microbials: "pass",
        mycotoxins: "not_tested",
        residual_solvents: "pass",
        moisture: "pass",
      },
      totalThcPct: 0.2,
      totalCbdPct: 10.0,
      moisturePct: null,
    };

    const regulation = STATE_REGULATION_MAP["CA"];
    const result = checkCoaStateCompliance(coaData, "CA", regulation);

    const pestFail = result.issues.find((i) => i.ruleId.includes("contaminant-fail-pesticides"));
    expect(pestFail).toBeDefined();
    expect(pestFail!.severity).toBe("critical");

    const mycoNotTested = result.issues.find((i) => i.ruleId.includes("contaminant-not-tested-mycotoxins"));
    expect(mycoNotTested).toBeDefined();
    expect(mycoNotTested!.severity).toBe("warning");
  });
});

describe("Seed Data", () => {
  it("should have all 50 states + DC", () => {
    const codes = Object.keys(STATE_REGULATION_MAP);
    expect(codes.length).toBe(51);
  });

  it("should have California with adult-use legal", () => {
    const ca = STATE_REGULATION_MAP["CA"];
    expect(ca.cannabisLegal).toBe(true);
    expect(ca.thcMgPerServing).toBe(10);
    expect(ca.thcMgPerPackage).toBe(100);
  });

  it("should have Idaho with zero THC tolerance", () => {
    const id = STATE_REGULATION_MAP["ID"];
    expect(id.deltaThcLimitPct).toBe(0);
    expect(id.allowsInboundShipping).toBe(false);
  });

  it("should have Florida as medical only", () => {
    const fl = STATE_REGULATION_MAP["FL"];
    expect(fl.medicalOnly).toBe(true);
    expect(fl.requiresLicense).toBe(true);
  });
});
