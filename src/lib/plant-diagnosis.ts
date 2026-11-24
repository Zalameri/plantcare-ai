import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// The browser sends the photo as a base64 data URL, which is about 4/3 the size of the file.
// The server limit is derived from MAX_IMAGE_BYTES so every file the UI accepts also passes the server.
const LONGEST_DATA_URL_PREFIX = "data:image/jpeg;base64,".length;
export const MAX_IMAGE_DATA_URL_LENGTH =
  LONGEST_DATA_URL_PREFIX + Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

export const TRUSTED_SOURCE_DOMAINS = [
  "plantvillage.psu.edu",
  "psu.edu",
  "ipm.ucanr.edu",
  "ucanr.edu",
  "apsnet.org",
  "fao.org",
  "usda.gov",
  "rhs.org.uk",
  "cornell.edu",
  "eppo.int",
  "cabi.org",
  "extension.umn.edu",
] as const;

export interface ScientificReference {
  id: string;
  name: string;
  organization: string;
  category: "Dataset" | "Plant Pathology" | "Extension Guide";
  url: string;
  description: string;
}

export const TRUSTED_AGRICULTURAL_REFERENCES: readonly ScientificReference[] = [
  {
    id: "plantvillage",
    name: "PlantVillage Dataset",
    organization: "Penn State University",
    category: "Dataset",
    url: "https://plantvillage.psu.edu",
    description:
      "Open-access reference library of 54,000+ expert-labeled leaf images spanning 14 crop species and 38 plant disease classes.",
  },
  {
    id: "uc-ipm",
    name: "UC IPM Pest & Disease Guides",
    organization: "University of California Agriculture & Natural Resources",
    category: "Extension Guide",
    url: "https://ipm.ucanr.edu",
    description:
      "Peer-reviewed diagnostic symptoms, biological causes, and integrated pest management treatments.",
  },
  {
    id: "aps",
    name: "APS Plant Disease Compendia",
    organization: "American Phytopathological Society",
    category: "Plant Pathology",
    url: "https://www.apsnet.org",
    description:
      "Scientific plant pathology documentation covering fungal, bacterial, and viral crop pathogens.",
  },
  {
    id: "fao",
    name: "FAO Plant Production & Protection",
    organization: "Food and Agriculture Organization of the UN",
    category: "Extension Guide",
    url: "https://www.fao.org/plant-production-protection",
    description:
      "International plant health guidelines, crop protection standards, and sustainable disease prevention.",
  },
  {
    id: "usda",
    name: "USDA Agricultural Research",
    organization: "U.S. Department of Agriculture",
    category: "Plant Pathology",
    url: "https://www.usda.gov",
    description:
      "Federal agricultural research, crop disease surveillance, and evidence-based plant care advisories.",
  },
  {
    id: "rhs",
    name: "RHS Plant Disease Advice",
    organization: "Royal Horticultural Society",
    category: "Extension Guide",
    url: "https://www.rhs.org.uk/disease",
    description:
      "Horticultural symptom identification and science-backed garden and ornamental plant disease management.",
  },
] as const;

export const trustedSourceSchema = z.object({
  name: z.string().min(1),
  organization: z.string().min(1),
  url: z.string().url(),
  note: z.string().min(1),
});

export type TrustedSource = z.infer<typeof trustedSourceSchema>;

export const plantDiagnosisSchema = z.object({
  isPlantImage: z.boolean(),
  plantSpecies: z.string().min(1),
  healthStatus: z.enum(["healthy", "diseased", "uncertain"]),
  diseaseName: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  severity: z.enum(["none", "mild", "moderate", "severe"]),
  summary: z.string().min(1),
  symptoms: z.array(z.string().min(1)),
  possibleCauses: z.array(z.string().min(1)),
  treatment: z.array(z.string().min(1)),
  preventionTips: z.array(z.string().min(1)),
  trustedSources: z.array(trustedSourceSchema),
});

export type PlantDiagnosis = z.infer<typeof plantDiagnosisSchema>;

export type AnalyzePlantResult =
  { ok: true; diagnosis: PlantDiagnosis } | { ok: false; error: string };

export function isTrustedSourceUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return TRUSTED_SOURCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

const FALLBACK_TRUSTED_SOURCES: readonly TrustedSource[] = [
  {
    name: "UC IPM Plant Disease Guidelines",
    organization: "University of California Agriculture & Natural Resources",
    url: "https://ipm.ucanr.edu",
    note: "Peer-reviewed integrated pest and plant disease management guidelines.",
  },
  {
    name: "APS Plant Pathology Resources",
    organization: "American Phytopathological Society",
    url: "https://www.apsnet.org",
    note: "Scientific reference on plant pathogens, symptoms, and disease cycles.",
  },
];

export function sanitizeTrustedSources(
  sources: readonly TrustedSource[],
  isPlantImage: boolean,
): TrustedSource[] {
  if (!isPlantImage) return [];
  const verified: TrustedSource[] = [];
  const seenUrls = new Set<string>();

  for (const source of sources) {
    if (!isTrustedSourceUrl(source.url)) continue;
    const key = source.url.toLowerCase();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    verified.push(source);
  }

  for (const fallback of FALLBACK_TRUSTED_SOURCES) {
    if (verified.length >= 2) break;
    if (!seenUrls.has(fallback.url.toLowerCase())) {
      seenUrls.add(fallback.url.toLowerCase());
      verified.push(fallback);
    }
  }

  return verified;
}

export function validatePlantImageFile(file: { type: string; size: number }): string | null {
  if (file.size <= 0) {
    return "The selected file is empty. Please choose a valid plant or leaf photo.";
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Unsupported image format. Please upload a JPG, PNG, or WebP photo.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large (max 8 MB). Please choose a smaller photo.";
  }
  return null;
}
