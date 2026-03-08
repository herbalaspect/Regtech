// ── FDA Required Disclaimers ───────────────────────────────────────

export const DSHEA_DISCLAIMER =
  "These statements have not been evaluated by the Food and Drug Administration. " +
  "This product is not intended to diagnose, treat, cure, or prevent any disease.";

export const DSHEA_DISCLAIMER_VARIANTS = [
  "not been evaluated by the food and drug administration",
  "not intended to diagnose, treat, cure, or prevent any disease",
  "not evaluated by the fda",
  "these statements have not been evaluated",
];

export const EXTERNAL_USE_ONLY = "for external use only";

// ── Drug Claim Keywords ────────────────────────────────────────────
// Words/phrases that indicate a product is making disease/drug claims

export const DRUG_CLAIM_KEYWORDS = [
  "cures",
  "treats",
  "prevents disease",
  "diagnoses",
  "heals",
  "eliminates",
  "reverses",
  "eradicates",
  "anti-cancer",
  "anti-tumor",
  "antiviral",
  "antibacterial treatment",
  "fights infection",
  "kills bacteria",
  "kills viruses",
  "lowers blood pressure",
  "lowers cholesterol",
  "controls blood sugar",
  "treats diabetes",
  "treats arthritis",
  "treats depression",
  "treats anxiety",
  "cures cancer",
  "prevents alzheimer",
  "treats epilepsy",
  "treats seizures",
  "treats parkinson",
  "FDA approved",
  "clinically proven to treat",
  "prescription strength",
];

// ── Therapeutic Claim Keywords (Hemp/CBD specific) ─────────────────

export const THERAPEUTIC_CLAIM_KEYWORDS = [
  "relieves pain",
  "pain relief",
  "reduces anxiety",
  "anti-anxiety",
  "helps sleep",
  "sleep aid",
  "reduces inflammation",
  "anti-inflammatory",
  "treats insomnia",
  "stress relief",
  "calming effect",
  "reduces stress",
  "mood enhancer",
  "antidepressant",
  "muscle relaxant",
  "nerve pain",
  "chronic pain",
  "migraine relief",
  "headache relief",
  "joint pain relief",
  "neuropathic",
  "anxiolytic",
  "analgesic",
  "sedative",
];

// ── Cosmetic Drug Claim Keywords ───────────────────────────────────
// Claims that push a cosmetic product into drug territory

export const COSMETIC_DRUG_CLAIM_KEYWORDS = [
  "treats acne",
  "cures eczema",
  "heals psoriasis",
  "anti-aging treatment",
  "removes wrinkles",
  "removes scars",
  "treats rosacea",
  "treats dermatitis",
  "restores skin cells",
  "regenerates tissue",
  "treats skin cancer",
  "reverses sun damage",
  "penetrates the skin to treat",
  "stimulates collagen production",
  "increases cell turnover",
  "prescription grade",
  "medical grade",
  "pharmaceutical grade",
];

// ── Prohibited Cosmetic Ingredients ────────────────────────────────

export const PROHIBITED_COSMETIC_INGREDIENTS = [
  "mercury",
  "mercurous chloride",
  "calomel",
  "mercuric",
  "mercurio",
  "hydroquinone", // banned for OTC, prescription only
];

// ── Allergen Keywords ──────────────────────────────────────────────

export const COMMON_ALLERGENS = [
  "milk",
  "eggs",
  "fish",
  "shellfish",
  "tree nuts",
  "peanuts",
  "wheat",
  "soybeans",
  "soy",
  "sesame",
  "gluten",
];

// ── Essential Oil Therapeutic Claims ───────────────────────────────

export const ESSENTIAL_OIL_THERAPEUTIC_CLAIMS = [
  "relieves pain",
  "cures",
  "treats",
  "heals wounds",
  "antifungal treatment",
  "antibacterial treatment",
  "treats infection",
  "muscle relaxant",
  "blood pressure",
  "treats depression",
  "treats anxiety",
  "treats insomnia",
  "digestive treatment",
  "respiratory treatment",
  "decongestant",
  "immune booster",
  "fights cold",
  "fights flu",
  "anti-cancer",
];

// ── OTC Drug Required Warnings ─────────────────────────────────────

export const OTC_REQUIRED_PHRASES = [
  "drug facts",
  "active ingredient",
  "uses",
  "warnings",
  "directions",
  "inactive ingredients",
];

// ── Prop 65 Keywords ───────────────────────────────────────────────

export const PROP_65_WARNING_PHRASES = [
  "proposition 65",
  "prop 65",
  "known to the state of california",
  "california prop 65",
  "WARNING: This product can expose you to",
  "cancer and reproductive harm",
];

// ── Product Category Classification Keywords ──────────────────────

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  supplement: [
    "supplement",
    "dietary supplement",
    "vitamin",
    "mineral",
    "probiotic",
    "prebiotic",
    "protein powder",
    "amino acid",
    "herbal supplement",
    "nutraceutical",
    "capsule",
    "tablet",
    "softgel",
    "gummy",
    "multivitamin",
    "fish oil",
    "omega",
    "turmeric",
    "ashwagandha",
    "melatonin",
    "collagen supplement",
    "biotin",
    "zinc supplement",
    "iron supplement",
    "magnesium supplement",
    "creatine",
    "bcaa",
    "whey protein",
    "serving size",
    "supplement facts",
    "daily value",
  ],
  hemp_cbd: [
    "cbd",
    "cannabidiol",
    "hemp",
    "hemp extract",
    "hemp oil",
    "hemp seed",
    "full spectrum",
    "broad spectrum",
    "cbd oil",
    "cbd gummies",
    "cbd tincture",
    "cbd cream",
    "cbd topical",
    "hemp derived",
    "thc free",
    "thc",
    "cannabinoid",
    "endocannabinoid",
    "terpene",
    "coa",
    "certificate of analysis",
  ],
  cosmetic: [
    "moisturizer",
    "serum",
    "cleanser",
    "face wash",
    "lotion",
    "cream",
    "body butter",
    "lip balm",
    "foundation",
    "mascara",
    "concealer",
    "primer",
    "toner",
    "exfoliant",
    "face mask",
    "eye cream",
    "sunscreen",
    "spf",
    "beauty",
    "skincare",
    "skin care",
    "cosmetic",
    "makeup",
    "perfume",
    "cologne",
    "fragrance",
    "shampoo",
    "conditioner",
    "hair care",
    "deodorant",
    "body wash",
    "soap",
    "hand cream",
  ],
  otc_drug: [
    "drug facts",
    "active ingredient",
    "pain reliever",
    "fever reducer",
    "antihistamine",
    "antacid",
    "laxative",
    "anti-itch",
    "hydrocortisone",
    "benzoyl peroxide",
    "salicylic acid",
    "acne treatment",
    "first aid",
    "antiseptic",
    "antibiotic ointment",
    "cold medicine",
    "cough suppressant",
    "nasal spray",
    "eye drops",
    "anti-diarrheal",
    "medicated",
    "otc",
    "over the counter",
    "over-the-counter",
  ],
  essential_oil: [
    "essential oil",
    "aromatherapy",
    "diffuser oil",
    "lavender oil",
    "tea tree oil",
    "peppermint oil",
    "eucalyptus oil",
    "frankincense oil",
    "lemon oil",
    "rosemary oil",
    "ylang ylang",
    "bergamot",
    "chamomile oil",
    "clary sage",
    "geranium oil",
    "pure essential",
    "therapeutic grade",
    "carrier oil",
    "jojoba oil",
    "sweet almond oil",
  ],
};

// ── Scan Scope Fields ──────────────────────────────────────────────

export const SCANNABLE_FIELDS = [
  "title",
  "description",
  "tags",
  "metafields",
  "images",
] as const;
