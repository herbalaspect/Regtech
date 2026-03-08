import { describe, it, expect } from "vitest";
import { classifyProduct, classifyProductMulti } from "~/services/compliance/classifier";
import type { ProductData } from "~/lib/types";

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

describe("Product Classifier", () => {
  describe("classifyProduct", () => {
    it("should classify a supplement product", () => {
      const product = makeProduct({
        title: "Vitamin D3 Dietary Supplement",
        description: "High potency vitamin D3 supplement with 5000 IU per softgel",
        productType: "Supplement",
        tags: ["supplement", "vitamin", "health"],
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("supplement");
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("should classify a CBD product", () => {
      const product = makeProduct({
        title: "Full Spectrum CBD Oil Tincture 1000mg",
        description: "Hemp-derived CBD oil, third-party tested, THC free",
        tags: ["cbd", "hemp", "tincture"],
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("hemp_cbd");
    });

    it("should classify a cosmetic product", () => {
      const product = makeProduct({
        title: "Hydrating Face Moisturizer",
        description: "A lightweight daily moisturizer with hyaluronic acid",
        productType: "Skincare",
        tags: ["moisturizer", "skincare", "face"],
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("cosmetic");
    });

    it("should classify an OTC drug product", () => {
      const product = makeProduct({
        title: "Benzoyl Peroxide Acne Treatment",
        description: "Drug Facts: Active ingredient Benzoyl Peroxide 10%",
        productType: "Acne Treatment",
        tags: ["acne", "treatment", "medicated"],
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("otc_drug");
    });

    it("should classify an essential oil product", () => {
      const product = makeProduct({
        title: "Pure Lavender Essential Oil",
        description: "100% pure lavender essential oil for aromatherapy and diffuser use",
        tags: ["essential oil", "lavender", "aromatherapy"],
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("essential_oil");
    });

    it("should return unknown for unclassifiable products", () => {
      const product = makeProduct({
        title: "Blue T-Shirt",
        description: "A comfortable cotton t-shirt in blue",
        productType: "Apparel",
        tags: ["clothing", "t-shirt"],
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("unknown");
    });

    it("should weight title matches higher than description", () => {
      const product = makeProduct({
        title: "CBD Hemp Extract",
        description: "This supplement contains natural ingredients and essential oils",
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("hemp_cbd");
    });

    it("should weight productType highest", () => {
      const product = makeProduct({
        title: "Natural Wellness Formula",
        productType: "Dietary Supplement",
        description: "Contains essential oils and hemp extract",
      });
      const result = classifyProduct(product);
      expect(result.category).toBe("supplement");
    });
  });

  describe("classifyProductMulti", () => {
    it("should identify multiple matching categories", () => {
      const product = makeProduct({
        title: "CBD Moisturizing Cream",
        description: "A topical CBD cream with moisturizing ingredients for skincare",
        tags: ["cbd", "skincare", "moisturizer", "hemp"],
      });
      const results = classifyProductMulti(product);
      const categories = results.map((r) => r.category);
      expect(categories).toContain("hemp_cbd");
      expect(categories).toContain("cosmetic");
    });

    it("should return unknown for unclassifiable products", () => {
      const product = makeProduct({
        title: "Red Widget",
        description: "A widget for your desk",
      });
      const results = classifyProductMulti(product);
      expect(results[0].category).toBe("unknown");
    });
  });
});
