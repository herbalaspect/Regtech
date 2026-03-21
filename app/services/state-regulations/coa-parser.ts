import type { CannabinoidProfile, CoaParsedData, ContaminantResults } from "~/lib/state-types";

/**
 * Parse a Certificate of Analysis (COA) from structured text input.
 * Supports common COA formats from major labs.
 */
export function parseCoaText(text: string): CoaParsedData {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  return {
    labName: extractLabName(lines),
    labLicense: extractLabLicense(lines),
    testDate: extractTestDate(lines),
    batchNumber: extractBatchNumber(lines),
    sampleName: extractSampleName(lines),
    cannabinoidResults: extractCannabinoidProfile(lines, fullText),
    terpeneResults: extractTerpeneResults(lines),
    contaminantResults: extractContaminantResults(lines, fullText),
    totalThcPct: extractNamedPercentage(fullText, ["total thc", "total delta-9", "total d9"]),
    totalCbdPct: extractNamedPercentage(fullText, ["total cbd"]),
    moisturePct: extractNamedPercentage(fullText, ["moisture"]),
  };
}

/**
 * Parse COA data from a structured JSON object (e.g. from API integrations).
 */
export function parseCoaJson(data: Record<string, unknown>): CoaParsedData {
  const cannabinoids = (data.cannabinoids || data.cannabinoid_results || {}) as Record<string, number | null>;
  const contaminants = (data.contaminants || data.contaminant_results || {}) as Record<string, string>;
  const terpenes = (data.terpenes || data.terpene_results || {}) as Record<string, number>;

  const cannabinoidProfile: CannabinoidProfile = {
    delta9_thc: cannabinoids.delta9_thc ?? cannabinoids.d9_thc ?? cannabinoids["delta-9-thc"] ?? null,
    delta8_thc: cannabinoids.delta8_thc ?? cannabinoids.d8_thc ?? cannabinoids["delta-8-thc"] ?? null,
    thca: cannabinoids.thca ?? cannabinoids.THCA ?? null,
    total_thc: cannabinoids.total_thc ?? null,
    cbd: cannabinoids.cbd ?? cannabinoids.CBD ?? null,
    cbda: cannabinoids.cbda ?? cannabinoids.CBDA ?? null,
    total_cbd: cannabinoids.total_cbd ?? null,
    cbg: cannabinoids.cbg ?? cannabinoids.CBG ?? null,
    cbn: cannabinoids.cbn ?? cannabinoids.CBN ?? null,
    cbc: cannabinoids.cbc ?? cannabinoids.CBC ?? null,
    thcv: cannabinoids.thcv ?? cannabinoids.THCV ?? null,
    cbdv: cannabinoids.cbdv ?? cannabinoids.CBDV ?? null,
  };

  // Calculate total THC if not provided: delta9_thc + (thca * 0.877)
  if (cannabinoidProfile.total_thc === null && cannabinoidProfile.delta9_thc !== null) {
    const thca = cannabinoidProfile.thca ?? 0;
    cannabinoidProfile.total_thc = cannabinoidProfile.delta9_thc + thca * 0.877;
  }

  const contaminantResults: ContaminantResults = {
    pesticides: normalizeTestResult(contaminants.pesticides),
    heavy_metals: normalizeTestResult(contaminants.heavy_metals),
    microbials: normalizeTestResult(contaminants.microbials ?? contaminants.microbiology),
    mycotoxins: normalizeTestResult(contaminants.mycotoxins),
    residual_solvents: normalizeTestResult(contaminants.residual_solvents ?? contaminants.solvents),
    moisture: normalizeTestResult(contaminants.moisture),
  };

  return {
    labName: (data.lab_name || data.labName || null) as string | null,
    labLicense: (data.lab_license || data.labLicense || null) as string | null,
    testDate: (data.test_date || data.testDate || null) as string | null,
    batchNumber: (data.batch_number || data.batchNumber || data.batch_id || null) as string | null,
    sampleName: (data.sample_name || data.sampleName || null) as string | null,
    cannabinoidResults: cannabinoidProfile,
    terpeneResults: terpenes,
    contaminantResults,
    totalThcPct: cannabinoidProfile.total_thc,
    totalCbdPct: cannabinoidProfile.total_cbd ?? cannabinoidProfile.cbd,
    moisturePct: (data.moisture_pct || data.moisture || null) as number | null,
  };
}

// ── Internal Extraction Helpers ────────────────────────────────────

function extractLabName(lines: string[]): string | null {
  for (const line of lines.slice(0, 10)) {
    const match = line.match(/(?:lab(?:oratory)?|tested by|analyzed by)[:\s]+(.+)/i);
    if (match) return match[1].trim();
  }
  // Try first non-empty line as lab name if it looks like one
  const labPatterns = /lab|testing|analytical|sciences|research/i;
  for (const line of lines.slice(0, 5)) {
    if (labPatterns.test(line) && line.length < 100) return line;
  }
  return null;
}

function extractLabLicense(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/(?:license|lic\.?|permit)[\s#:]+([A-Z0-9-]+)/i);
    if (match) return match[1].trim();
  }
  return null;
}

function extractTestDate(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/(?:test|analysis|report|sample)\s*date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
    if (match) return normalizeDate(match[1]);
    const isoMatch = line.match(/(?:test|analysis|report|sample)\s*date[:\s]+(\d{4}-\d{2}-\d{2})/i);
    if (isoMatch) return isoMatch[1];
  }
  return null;
}

function extractBatchNumber(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/(?:batch|lot)[\s#:]+([A-Z0-9-]+)/i);
    if (match) return match[1].trim();
  }
  return null;
}

function extractSampleName(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/(?:sample|product)\s*(?:name|id)?[:\s]+(.+)/i);
    if (match && !match[1].match(/date|number|id/i)) return match[1].trim();
  }
  return null;
}

function extractCannabinoidProfile(lines: string[], fullText: string): CannabinoidProfile {
  const profile: CannabinoidProfile = {
    delta9_thc: null,
    delta8_thc: null,
    thca: null,
    total_thc: null,
    cbd: null,
    cbda: null,
    total_cbd: null,
    cbg: null,
    cbn: null,
    cbc: null,
    thcv: null,
    cbdv: null,
  };

  const cannabinoidPatterns: [string, keyof CannabinoidProfile][] = [
    ["(?:delta.?9.?thc|d9.?thc|δ9.?thc)", "delta9_thc"],
    ["(?:delta.?8.?thc|d8.?thc|δ8.?thc)", "delta8_thc"],
    ["(?:thca|thc.?a)", "thca"],
    ["total\\s*thc", "total_thc"],
    ["\\bcbd\\b(?!a)", "cbd"],
    ["(?:cbda|cbd.?a)", "cbda"],
    ["total\\s*cbd", "total_cbd"],
    ["\\bcbg\\b", "cbg"],
    ["\\bcbn\\b", "cbn"],
    ["\\bcbc\\b", "cbc"],
    ["\\bthcv\\b", "thcv"],
    ["\\bcbdv\\b", "cbdv"],
  ];

  // Process total variants first, then individual cannabinoids
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const [pattern, key] of cannabinoidPatterns) {
      if (profile[key] !== null) continue;
      const regex = new RegExp(`${pattern}[\\s:]+([\\d.]+)\\s*(%|mg\\/g|ppm)?`, "i");
      const match = lower.match(regex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) profile[key] = val;
      }
    }
  }

  // Calculate total THC if not found: delta9 + (THCA * 0.877)
  if (profile.total_thc === null && profile.delta9_thc !== null) {
    const thca = profile.thca ?? 0;
    profile.total_thc = Math.round((profile.delta9_thc + thca * 0.877) * 1000) / 1000;
  }

  // Calculate total CBD if not found: CBD + (CBDA * 0.877)
  if (profile.total_cbd === null && profile.cbd !== null) {
    const cbda = profile.cbda ?? 0;
    profile.total_cbd = Math.round((profile.cbd + cbda * 0.877) * 1000) / 1000;
  }

  return profile;
}

function extractTerpeneResults(lines: string[]): Record<string, number> {
  const terpenes: Record<string, number> = {};
  const knownTerpenes = [
    "myrcene", "limonene", "linalool", "caryophyllene", "pinene",
    "humulene", "terpinolene", "ocimene", "bisabolol", "geraniol",
    "nerolidol", "guaiol", "camphene", "valencene", "eucalyptol",
    "borneol", "terpineol", "fenchol", "cedrol", "pulegone",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const terpene of knownTerpenes) {
      if (lower.includes(terpene)) {
        const match = lower.match(new RegExp(`${terpene}[\\s:]*[^\\d]*(\\d+\\.?\\d*)\\s*(%|mg)?`, "i"));
        if (match) {
          terpenes[terpene] = parseFloat(match[1]);
        }
      }
    }
  }

  return terpenes;
}

function extractContaminantResults(lines: string[], fullText: string): ContaminantResults {
  const results: ContaminantResults = {
    pesticides: "not_tested",
    heavy_metals: "not_tested",
    microbials: "not_tested",
    mycotoxins: "not_tested",
    residual_solvents: "not_tested",
    moisture: "not_tested",
  };

  const testMap: [string, keyof ContaminantResults][] = [
    ["pesticide", "pesticides"],
    ["heavy metal", "heavy_metals"],
    ["microbial|microbiology|micro", "microbials"],
    ["mycotoxin", "mycotoxins"],
    ["residual solvent|solvent", "residual_solvents"],
    ["moisture", "moisture"],
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const [pattern, key] of testMap) {
      const regex = new RegExp(`(${pattern})`, "i");
      if (regex.test(lower)) {
        // Check fail patterns first (they're more specific)
        if (/\bfail\b|non.?compliant|above limit|exceeds/i.test(lower)) {
          results[key] = "fail";
        } else if (/\bpass\b|compliant|within limits|\bnd\b|not detected|none detected/i.test(lower)) {
          results[key] = "pass";
        }
      }
    }
  }

  return results;
}

function extractNamedPercentage(fullText: string, names: string[]): number | null {
  for (const name of names) {
    const regex = new RegExp(`${name}[\\s:]*[^\\d]*(\\d+\\.?\\d*)\\s*%`, "i");
    const match = fullText.match(regex);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

function normalizeTestResult(value: unknown): "pass" | "fail" | "not_tested" {
  if (!value) return "not_tested";
  const str = String(value).toLowerCase();
  if (str === "pass" || str === "compliant" || str === "within limits") return "pass";
  if (str === "fail" || str === "non-compliant" || str === "above limit") return "fail";
  return "not_tested";
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split(/[/-]/);
  if (parts.length !== 3) return dateStr;
  const [a, b, c] = parts;
  // Assume MM/DD/YYYY or MM-DD-YYYY
  const year = c.length === 2 ? `20${c}` : c;
  return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
}
