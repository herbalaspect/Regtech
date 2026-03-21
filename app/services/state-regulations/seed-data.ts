import type { StateRegulationData, PackagingRules, PlatformAdRules } from "~/lib/state-types";

// ── Shared Defaults ──────────────────────────────────────────────────

const DEFAULT_PLATFORM_AD_RULES: PlatformAdRules = {
  google: [
    "No health/medical claims",
    "No targeting users under 21",
    "Must comply with local laws",
    "CBD product landing pages must include disclaimers",
  ],
  meta: [
    "No health claims in ad copy",
    "No before/after imagery",
    "Age-gated audiences only (21+)",
    "No claims about FDA-regulated conditions",
  ],
  tiktok: [
    "No promotion of cannabis consumption",
    "No health benefit claims",
    "Age-restricted content policies apply",
    "No user-generated content showing consumption",
  ],
  general: [
    "No testimonials claiming therapeutic benefits",
    "No targeting minors",
    "Must include required state disclaimers",
    "No misleading potency claims",
  ],
};

const DEFAULT_PACKAGING: PackagingRules = {
  childResistant: true,
  opaquePackaging: false,
  tamperEvident: true,
  noCartoonCharacters: true,
  noAppealToMinors: true,
  additionalRules: [],
};

const STRICT_PACKAGING: PackagingRules = {
  childResistant: true,
  opaquePackaging: true,
  tamperEvident: true,
  noCartoonCharacters: true,
  noAppealToMinors: true,
  additionalRules: ["Exit packaging required", "Resealable container required"],
};

const DEFAULT_AD_RULES = [
  "No health or therapeutic claims",
  "No targeting minors",
  "No false or misleading claims about potency",
  "No claims of FDA approval",
];

const FARM_BILL_LABELING = [
  "Product name",
  "Net weight",
  "Ingredient list",
  "Manufacturer name and address",
  "Batch or lot number",
  "Hemp-derived disclaimer",
];

const STRICT_LABELING = [
  ...FARM_BILL_LABELING,
  "THC content",
  "CBD content",
  "QR code or link to lab results",
  "Universal cannabis symbol",
  "Warning: Keep out of reach of children",
  "Government-issued warning label",
  "Serving size",
  "Date of manufacture",
  "Expiration date",
];

// Helper to create a state entry with defaults
function state(
  overrides: Partial<StateRegulationData> & Pick<StateRegulationData, "stateCode" | "stateName">,
): StateRegulationData {
  return {
    cannabisLegal: false,
    hempLegal: true,
    medicalOnly: false,
    deltaThcLimitPct: 0.3,
    totalThcLimitPct: null,
    thcMgPerServing: null,
    thcMgPerPackage: null,
    bannedCannabinoids: [],
    restrictedCannabinoids: [],
    labelingRequirements: FARM_BILL_LABELING,
    packagingRules: DEFAULT_PACKAGING,
    requiresLicense: false,
    licenseTypes: [],
    licenseUrl: null,
    minAge: 21,
    advertisingRules: DEFAULT_AD_RULES,
    platformAdRules: DEFAULT_PLATFORM_AD_RULES,
    allowsInboundShipping: true,
    allowsOutboundShipping: true,
    shippingNotes: null,
    effectiveDate: "2025-01-01",
    sourceUrl: null,
    sourceDescription: null,
    ...overrides,
  };
}

// ── All 50 States + DC ──────────────────────────────────────────────

export const STATE_REGULATIONS: StateRegulationData[] = [
  // ── Alabama ───────────────────────────────────────────────────────
  state({
    stateCode: "AL",
    stateName: "Alabama",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["AMCC license"],
    sourceDescription: "Alabama Medical Cannabis Commission",
  }),

  // ── Alaska ────────────────────────────────────────────────────────
  state({
    stateCode: "AK",
    stateName: "Alaska",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 50,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retail", "Cultivation", "Manufacturing"],
    sourceDescription: "Alaska Marijuana Control Board",
  }),

  // ── Arizona ───────────────────────────────────────────────────────
  state({
    stateCode: "AZ",
    stateName: "Arizona",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Cultivation", "Manufacturing"],
    sourceDescription: "Arizona Dept of Health Services",
  }),

  // ── Arkansas ──────────────────────────────────────────────────────
  state({
    stateCode: "AR",
    stateName: "Arkansas",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC"],
    requiresLicense: true,
    licenseTypes: ["Medical marijuana license"],
    sourceDescription: "Arkansas Medical Marijuana Commission",
  }),

  // ── California ────────────────────────────────────────────────────
  state({
    stateCode: "CA",
    stateName: "California",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Must be naturally derived, not synthetically converted" },
    ],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal cannabis symbol (exclamation mark in triangle)",
      "UID tracking number",
      "Allergen warnings",
      "County of origin for flower",
      "Government warning: This product has intoxicating effects",
    ],
    packagingRules: {
      ...STRICT_PACKAGING,
      additionalRules: [
        "Exit packaging required",
        "Resealable for multi-serving",
        "Single-use packaging for single servings",
        "No packaging attractive to children",
        "Opaque and not see-through",
      ],
    },
    requiresLicense: true,
    licenseTypes: ["Retailer", "Distributor", "Manufacturer", "Cultivator", "Microbusiness"],
    licenseUrl: "https://cannabis.ca.gov/applicants/license-types/",
    advertisingRules: [
      ...DEFAULT_AD_RULES,
      "No ads on broadcast, cable, radio, print, or digital if 71.6% of audience is under 21",
      "No ads within 1000 feet of schools, playgrounds, child care centers",
      "No ads on public transit",
      "Must include license number in all advertising",
      "No use of California state flag or seal",
    ],
    sourceDescription: "California Dept of Cannabis Control",
    sourceUrl: "https://cannabis.ca.gov/",
    effectiveDate: "2024-01-01",
  }),

  // ── Colorado ──────────────────────────────────────────────────────
  state({
    stateCode: "CO",
    stateName: "Colorado",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    totalThcLimitPct: 0.3,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal THC symbol",
      "Standardized potency labeling",
      "Activation time for edibles",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retail", "Cultivation", "Manufacturing", "Testing"],
    sourceDescription: "Colorado Marijuana Enforcement Division",
    effectiveDate: "2024-01-01",
  }),

  // ── Connecticut ───────────────────────────────────────────────────
  state({
    stateCode: "CT",
    stateName: "Connecticut",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 50,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Cultivator", "Manufacturer"],
    sourceDescription: "Connecticut Dept of Consumer Protection",
  }),

  // ── Delaware ──────────────────────────────────────────────────────
  state({
    stateCode: "DE",
    stateName: "Delaware",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retail", "Cultivation", "Manufacturing"],
    sourceDescription: "Delaware Office of the Marijuana Commissioner",
  }),

  // ── DC ────────────────────────────────────────────────────────────
  state({
    stateCode: "DC",
    stateName: "District of Columbia",
    cannabisLegal: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    shippingNotes: "No commercial sales — possession and gifting only (Initiative 71)",
    sourceDescription: "DC ABCA",
  }),

  // ── Florida ───────────────────────────────────────────────────────
  state({
    stateCode: "FL",
    stateName: "Florida",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    restrictedCannabinoids: [
      { name: "THC", condition: "Smokable marijuana limited to 24,500mg per 70-day period for medical patients" },
    ],
    requiresLicense: true,
    licenseTypes: ["Medical Marijuana Treatment Center (MMTC)"],
    licenseUrl: "https://knowthefactsmmj.com/",
    sourceDescription: "Florida Office of Medical Marijuana Use",
  }),

  // ── Georgia ───────────────────────────────────────────────────────
  state({
    stateCode: "GA",
    stateName: "Georgia",
    medicalOnly: true,
    deltaThcLimitPct: 5.0,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Low-THC oil license"],
    shippingNotes: "Only low-THC oil (max 5%) for registered patients",
    sourceDescription: "Georgia Access to Medical Cannabis Commission",
  }),

  // ── Hawaii ────────────────────────────────────────────────────────
  state({
    stateCode: "HI",
    stateName: "Hawaii",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical dispensary"],
    sourceDescription: "Hawaii Dept of Health",
  }),

  // ── Idaho ─────────────────────────────────────────────────────────
  state({
    stateCode: "ID",
    stateName: "Idaho",
    hempLegal: true,
    deltaThcLimitPct: 0,
    totalThcLimitPct: 0,
    bannedCannabinoids: ["Delta-8 THC", "Delta-9 THC", "THCO", "HHC", "THCA"],
    allowsInboundShipping: false,
    shippingNotes: "Zero THC tolerance — any detectable THC is illegal",
    sourceDescription: "Idaho Code 37-2701",
  }),

  // ── Illinois ──────────────────────────────────────────────────────
  state({
    stateCode: "IL",
    stateName: "Illinois",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal cannabis symbol",
      "Potency per serving",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Craft Grower", "Infuser", "Transporter"],
    sourceDescription: "Illinois IDFPR",
  }),

  // ── Indiana ───────────────────────────────────────────────────────
  state({
    stateCode: "IN",
    stateName: "Indiana",
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    sourceDescription: "Indiana state law",
  }),

  // ── Iowa ──────────────────────────────────────────────────────────
  state({
    stateCode: "IA",
    stateName: "Iowa",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical cannabidiol dispensary"],
    sourceDescription: "Iowa Dept of Public Health",
  }),

  // ── Kansas ────────────────────────────────────────────────────────
  state({
    stateCode: "KS",
    stateName: "Kansas",
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    sourceDescription: "Kansas state law",
  }),

  // ── Kentucky ──────────────────────────────────────────────────────
  state({
    stateCode: "KY",
    stateName: "Kentucky",
    medicalOnly: true,
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal if hemp-derived and under 0.3% delta-9 THC" },
    ],
    labelingRequirements: [
      ...FARM_BILL_LABELING,
      "THC content per serving",
      "Total THC content",
      "Lab test results reference",
    ],
    sourceDescription: "Kentucky Dept of Agriculture",
  }),

  // ── Louisiana ─────────────────────────────────────────────────────
  state({
    stateCode: "LA",
    stateName: "Louisiana",
    medicalOnly: true,
    bannedCannabinoids: ["THCO", "HHC"],
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal if hemp-derived, regulated under Act 164" },
    ],
    requiresLicense: true,
    licenseTypes: ["Medical marijuana pharmacy"],
    sourceDescription: "Louisiana Dept of Health",
  }),

  // ── Maine ─────────────────────────────────────────────────────────
  state({
    stateCode: "ME",
    stateName: "Maine",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retail", "Cultivation", "Manufacturing"],
    sourceDescription: "Maine OCP",
  }),

  // ── Maryland ──────────────────────────────────────────────────────
  state({
    stateCode: "MD",
    stateName: "Maryland",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Grower", "Processor"],
    sourceDescription: "Maryland Cannabis Administration",
  }),

  // ── Massachusetts ─────────────────────────────────────────────────
  state({
    stateCode: "MA",
    stateName: "Massachusetts",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Impairment warning",
      "Pregnancy/breastfeeding warning",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Cultivator", "Manufacturer", "Microbusiness"],
    advertisingRules: [
      ...DEFAULT_AD_RULES,
      "No outdoor advertising within 500 feet of schools",
      "No ads where 85% of audience is under 21",
    ],
    sourceDescription: "Massachusetts Cannabis Control Commission",
  }),

  // ── Michigan ──────────────────────────────────────────────────────
  state({
    stateCode: "MI",
    stateName: "Michigan",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Grower", "Processor", "Microbusiness"],
    sourceDescription: "Michigan Cannabis Regulatory Agency",
  }),

  // ── Minnesota ─────────────────────────────────────────────────────
  state({
    stateCode: "MN",
    stateName: "Minnesota",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 50,
    bannedCannabinoids: ["THCO", "HHC"],
    labelingRequirements: [
      ...STRICT_LABELING,
      "OCM compliance mark",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retail", "Cultivation", "Manufacturing", "Microbusiness"],
    sourceDescription: "Minnesota Office of Cannabis Management",
    effectiveDate: "2025-01-01",
  }),

  // ── Mississippi ───────────────────────────────────────────────────
  state({
    stateCode: "MS",
    stateName: "Mississippi",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical marijuana establishment"],
    sourceDescription: "Mississippi Dept of Health",
  }),

  // ── Missouri ──────────────────────────────────────────────────────
  state({
    stateCode: "MO",
    stateName: "Missouri",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Cultivator", "Manufacturer", "Microbusiness"],
    sourceDescription: "Missouri Division of Cannabis Regulation",
  }),

  // ── Montana ───────────────────────────────────────────────────────
  state({
    stateCode: "MT",
    stateName: "Montana",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Cultivator", "Manufacturer"],
    sourceDescription: "Montana DPHHS",
  }),

  // ── Nebraska ──────────────────────────────────────────────────────
  state({
    stateCode: "NE",
    stateName: "Nebraska",
    hempLegal: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    sourceDescription: "Nebraska state law",
  }),

  // ── Nevada ────────────────────────────────────────────────────────
  state({
    stateCode: "NV",
    stateName: "Nevada",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal cannabis symbol",
      "Not for resale warning",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retail", "Cultivation", "Production", "Distribution"],
    sourceDescription: "Nevada Cannabis Compliance Board",
  }),

  // ── New Hampshire ─────────────────────────────────────────────────
  state({
    stateCode: "NH",
    stateName: "New Hampshire",
    medicalOnly: true,
    bannedCannabinoids: ["THCO", "HHC"],
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal if hemp-derived under Farm Bill" },
    ],
    requiresLicense: true,
    licenseTypes: ["Alternative treatment center"],
    sourceDescription: "NH DHHS",
  }),

  // ── New Jersey ────────────────────────────────────────────────────
  state({
    stateCode: "NJ",
    stateName: "New Jersey",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Cultivator", "Manufacturer"],
    sourceDescription: "New Jersey Cannabis Regulatory Commission",
  }),

  // ── New Mexico ────────────────────────────────────────────────────
  state({
    stateCode: "NM",
    stateName: "New Mexico",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Producer", "Manufacturer"],
    sourceDescription: "New Mexico Cannabis Control Division",
  }),

  // ── New York ──────────────────────────────────────────────────────
  state({
    stateCode: "NY",
    stateName: "New York",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal cannabis symbol",
      "OCM compliance mark",
      "Social equity disclaimer",
    ],
    packagingRules: {
      ...STRICT_PACKAGING,
      additionalRules: [
        "Exit packaging required",
        "No packaging imitating candy or food products",
        "Plain, uniform packaging for certain products",
      ],
    },
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Cultivator", "Processor", "Microbusiness", "CAURD"],
    advertisingRules: [
      ...DEFAULT_AD_RULES,
      "No outdoor ads within 500 feet of schools",
      "No public transit advertising",
      "Must include OCM license number",
    ],
    sourceDescription: "New York Office of Cannabis Management",
    effectiveDate: "2024-01-01",
  }),

  // ── North Carolina ────────────────────────────────────────────────
  state({
    stateCode: "NC",
    stateName: "North Carolina",
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal if hemp-derived, minimal regulation" },
    ],
    sourceDescription: "North Carolina state law",
  }),

  // ── North Dakota ──────────────────────────────────────────────────
  state({
    stateCode: "ND",
    stateName: "North Dakota",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical marijuana dispensary"],
    sourceDescription: "North Dakota Division of Medical Marijuana",
  }),

  // ── Ohio ──────────────────────────────────────────────────────────
  state({
    stateCode: "OH",
    stateName: "Ohio",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Dispensary", "Cultivator", "Processor"],
    sourceDescription: "Ohio Division of Cannabis Control",
    effectiveDate: "2024-06-07",
  }),

  // ── Oklahoma ──────────────────────────────────────────────────────
  state({
    stateCode: "OK",
    stateName: "Oklahoma",
    medicalOnly: true,
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal if hemp-derived" },
    ],
    requiresLicense: true,
    licenseTypes: ["Medical marijuana dispensary", "Grower", "Processor"],
    sourceDescription: "Oklahoma Medical Marijuana Authority",
  }),

  // ── Oregon ────────────────────────────────────────────────────────
  state({
    stateCode: "OR",
    stateName: "Oregon",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 50,
    totalThcLimitPct: 0.3,
    bannedCannabinoids: ["THCO"],
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Artificially derived cannabinoids regulated as intoxicating" },
    ],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal cannabis symbol",
      "OLCC tracking number",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Producer", "Processor", "Wholesaler"],
    advertisingRules: [
      ...DEFAULT_AD_RULES,
      "No ads on broadcast if 30% of audience is under 21",
      "No outdoor ads within 1000 feet of schools",
    ],
    sourceDescription: "Oregon Liquor and Cannabis Commission",
  }),

  // ── Pennsylvania ──────────────────────────────────────────────────
  state({
    stateCode: "PA",
    stateName: "Pennsylvania",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical marijuana dispensary", "Grower/Processor"],
    sourceDescription: "Pennsylvania DOH",
  }),

  // ── Rhode Island ──────────────────────────────────────────────────
  state({
    stateCode: "RI",
    stateName: "Rhode Island",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Cultivator", "Manufacturer"],
    sourceDescription: "Rhode Island Cannabis Control Commission",
  }),

  // ── South Carolina ────────────────────────────────────────────────
  state({
    stateCode: "SC",
    stateName: "South Carolina",
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal under state hemp program" },
    ],
    sourceDescription: "South Carolina Dept of Agriculture",
  }),

  // ── South Dakota ──────────────────────────────────────────────────
  state({
    stateCode: "SD",
    stateName: "South Dakota",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical cannabis establishment"],
    sourceDescription: "South Dakota DOH",
  }),

  // ── Tennessee ─────────────────────────────────────────────────────
  state({
    stateCode: "TN",
    stateName: "Tennessee",
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Regulated — must be tested and labeled; age 21+" },
    ],
    labelingRequirements: [
      ...FARM_BILL_LABELING,
      "THC content",
      "Lab test reference",
      "Age restriction notice (21+)",
    ],
    sourceDescription: "Tennessee HB 1927",
  }),

  // ── Texas ─────────────────────────────────────────────────────────
  state({
    stateCode: "TX",
    stateName: "Texas",
    medicalOnly: true,
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal status disputed; Texas Supreme Court allowed sales to continue pending legislation" },
    ],
    requiresLicense: true,
    licenseTypes: ["Compassionate Use Program license"],
    labelingRequirements: [
      ...FARM_BILL_LABELING,
      "THC content",
      "Lab test results",
    ],
    sourceDescription: "Texas DSHS Compassionate Use Program",
  }),

  // ── Utah ──────────────────────────────────────────────────────────
  state({
    stateCode: "UT",
    stateName: "Utah",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical cannabis pharmacy"],
    sourceDescription: "Utah Dept of Health & Human Services",
  }),

  // ── Vermont ───────────────────────────────────────────────────────
  state({
    stateCode: "VT",
    stateName: "Vermont",
    cannabisLegal: true,
    thcMgPerServing: 5,
    thcMgPerPackage: 50,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: STRICT_LABELING,
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Cultivator", "Manufacturer"],
    sourceDescription: "Vermont Cannabis Control Board",
  }),

  // ── Virginia ──────────────────────────────────────────────────────
  state({
    stateCode: "VA",
    stateName: "Virginia",
    cannabisLegal: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    shippingNotes: "Adult-use possession legal, but retail sales delayed — no licensed dispensaries for recreational yet",
    sourceDescription: "Virginia Cannabis Control Authority",
  }),

  // ── Washington ────────────────────────────────────────────────────
  state({
    stateCode: "WA",
    stateName: "Washington",
    cannabisLegal: true,
    thcMgPerServing: 10,
    thcMgPerPackage: 100,
    totalThcLimitPct: 0.3,
    bannedCannabinoids: ["THCO"],
    labelingRequirements: [
      ...STRICT_LABELING,
      "Universal cannabis symbol",
      "Traceability lot number",
    ],
    packagingRules: STRICT_PACKAGING,
    requiresLicense: true,
    licenseTypes: ["Retailer", "Producer", "Processor"],
    advertisingRules: [
      ...DEFAULT_AD_RULES,
      "No ads on public transit",
      "No outdoor ads within 1000 feet of schools, parks, arcades",
    ],
    sourceDescription: "Washington State Liquor and Cannabis Board",
  }),

  // ── West Virginia ─────────────────────────────────────────────────
  state({
    stateCode: "WV",
    stateName: "West Virginia",
    medicalOnly: true,
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    requiresLicense: true,
    licenseTypes: ["Medical cannabis dispensary"],
    sourceDescription: "West Virginia DHHR",
  }),

  // ── Wisconsin ─────────────────────────────────────────────────────
  state({
    stateCode: "WI",
    stateName: "Wisconsin",
    restrictedCannabinoids: [
      { name: "Delta-8 THC", condition: "Legal if hemp-derived under Farm Bill" },
    ],
    sourceDescription: "Wisconsin state law",
  }),

  // ── Wyoming ───────────────────────────────────────────────────────
  state({
    stateCode: "WY",
    stateName: "Wyoming",
    bannedCannabinoids: ["Delta-8 THC", "THCO", "HHC"],
    sourceDescription: "Wyoming state law",
  }),
];

// ── Quick Lookup Map ────────────────────────────────────────────────

export const STATE_REGULATION_MAP: Record<string, StateRegulationData> = {};
for (const reg of STATE_REGULATIONS) {
  STATE_REGULATION_MAP[reg.stateCode] = reg;
}
