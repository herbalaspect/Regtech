// ── State Regulation Types ──────────────────────────────────────────

export interface StateRegulationData {
  stateCode: string;
  stateName: string;
  cannabisLegal: boolean;
  hempLegal: boolean;
  medicalOnly: boolean;
  deltaThcLimitPct: number | null;
  totalThcLimitPct: number | null;
  thcMgPerServing: number | null;
  thcMgPerPackage: number | null;
  bannedCannabinoids: string[];
  restrictedCannabinoids: RestrictedCannabinoid[];
  labelingRequirements: string[];
  packagingRules: PackagingRules;
  requiresLicense: boolean;
  licenseTypes: string[];
  licenseUrl: string | null;
  minAge: number;
  advertisingRules: string[];
  platformAdRules: PlatformAdRules;
  allowsInboundShipping: boolean;
  allowsOutboundShipping: boolean;
  shippingNotes: string | null;
  effectiveDate: string; // ISO date
  sourceUrl: string | null;
  sourceDescription: string | null;
}

export interface RestrictedCannabinoid {
  name: string;
  condition: string; // e.g. "max 0.3% delta-9 THC by dry weight"
}

export interface PackagingRules {
  childResistant: boolean;
  opaquePackaging: boolean;
  tamperEvident: boolean;
  noCartoonCharacters: boolean;
  noAppealToMinors: boolean;
  maxServingSize?: string;
  additionalRules: string[];
}

export interface PlatformAdRules {
  google: string[];
  meta: string[];
  tiktok: string[];
  general: string[];
}

// ── COA Types ───────────────────────────────────────────────────────

export interface CannabinoidProfile {
  delta9_thc: number | null;
  delta8_thc: number | null;
  thca: number | null;
  total_thc: number | null;
  cbd: number | null;
  cbda: number | null;
  total_cbd: number | null;
  cbg: number | null;
  cbn: number | null;
  cbc: number | null;
  thcv: number | null;
  cbdv: number | null;
  [key: string]: number | null;
}

export interface ContaminantResults {
  pesticides: "pass" | "fail" | "not_tested";
  heavy_metals: "pass" | "fail" | "not_tested";
  microbials: "pass" | "fail" | "not_tested";
  mycotoxins: "pass" | "fail" | "not_tested";
  residual_solvents: "pass" | "fail" | "not_tested";
  moisture: "pass" | "fail" | "not_tested";
}

export interface CoaParsedData {
  labName: string | null;
  labLicense: string | null;
  testDate: string | null;
  batchNumber: string | null;
  sampleName: string | null;
  cannabinoidResults: CannabinoidProfile;
  terpeneResults: Record<string, number>;
  contaminantResults: ContaminantResults;
  totalThcPct: number | null;
  totalCbdPct: number | null;
  moisturePct: number | null;
}

export interface StateComplianceResult {
  stateCode: string;
  stateName: string;
  compliant: boolean;
  issues: StateComplianceIssue[];
}

export interface StateComplianceIssue {
  severity: "critical" | "warning" | "info";
  ruleId: string;
  title: string;
  description: string;
  affectedValue?: string;
  stateRequirement?: string;
  suggestion?: string;
}

// ── Regulation Change Types ──────────────────────────────────────────

export interface RegulationChange {
  stateCode: string;
  changeType: "new" | "amended" | "repealed" | "effective_date";
  fieldChanged: string;
  previousValue: string | null;
  newValue: string | null;
  summary: string;
  effectiveDate: string;
  sourceUrl: string | null;
}
