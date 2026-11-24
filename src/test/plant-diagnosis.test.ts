import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DATA_URL_LENGTH,
  isTrustedSourceUrl,
  plantDiagnosisSchema,
  sanitizeTrustedSources,
  validatePlantImageFile,
} from "@/lib/plant-diagnosis";

describe("validatePlantImageFile", () => {
  it("accepts valid JPG, PNG, and WebP images within size limits", () => {
    expect(validatePlantImageFile({ type: "image/jpeg", size: 512_000 })).toBeNull();
    expect(validatePlantImageFile({ type: "image/png", size: 1_024_000 })).toBeNull();
    expect(validatePlantImageFile({ type: "image/webp", size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it("rejects empty files", () => {
    expect(validatePlantImageFile({ type: "image/jpeg", size: 0 })).toMatch(/empty/i);
  });

  it("rejects unsupported file formats", () => {
    expect(validatePlantImageFile({ type: "application/pdf", size: 1024 })).toMatch(/unsupported/i);
    expect(validatePlantImageFile({ type: "image/gif", size: 1024 })).toMatch(/unsupported/i);
  });

  it("rejects images larger than 8 MB", () => {
    expect(validatePlantImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toMatch(
      /8 MB/i,
    );
  });
});

describe("plantDiagnosisSchema", () => {
  it("validates a complete plant disease diagnosis payload", () => {
    const sample = {
      isPlantImage: true,
      plantSpecies: "Tomato (Solanum lycopersicum)",
      healthStatus: "diseased",
      diseaseName: "Early Blight (Alternaria solani)",
      confidence: "high",
      severity: "moderate",
      summary: "Dark brown concentric leaf spots typical of early blight.",
      symptoms: ["Target-like brown lesions on lower leaves", "Yellowing halo around spots"],
      possibleCauses: ["Fungal pathogen Alternaria solani", "Warm humid foliage conditions"],
      treatment: ["Remove affected lower leaves", "Apply copper-based fungicide per label"],
      preventionTips: ["Water at soil level", "Rotate solanaceous crops annually"],
      trustedSources: [
        {
          name: "UC IPM Tomato Early Blight",
          organization: "University of California Agriculture and Natural Resources",
          url: "https://ipm.ucanr.edu",
          note: "Diagnostic criteria and integrated pest management guidelines.",
        },
      ],
    };
    expect(plantDiagnosisSchema.parse(sample).diseaseName).toBe("Early Blight (Alternaria solani)");
  });
});

describe("trusted agricultural source validation", () => {
  it("accepts official HTTPS institutional and dataset domains", () => {
    expect(isTrustedSourceUrl("https://plantvillage.psu.edu")).toBe(true);
    expect(isTrustedSourceUrl("https://ipm.ucanr.edu/agriculture/tomato/early-blight/")).toBe(true);
    expect(isTrustedSourceUrl("https://www.apsnet.org")).toBe(true);
    expect(isTrustedSourceUrl("https://www.fao.org/plant-production-protection")).toBe(true);
    expect(isTrustedSourceUrl("https://www.rhs.org.uk/disease")).toBe(true);
  });

  it("rejects untrusted domains, blogs, and non-HTTPS URLs", () => {
    expect(isTrustedSourceUrl("http://ipm.ucanr.edu")).toBe(false);
    expect(isTrustedSourceUrl("https://random-garden-blog.example.com/tips")).toBe(false);
    expect(isTrustedSourceUrl("https://fake-usda.gov.evil.com")).toBe(false);
    expect(isTrustedSourceUrl("not-a-url")).toBe(false);
  });

  it("strips untrusted sources and guarantees at least two verified references for plant images", () => {
    const cleaned = sanitizeTrustedSources(
      [
        {
          name: "Random Blog",
          organization: "Unknown",
          url: "https://random-garden-blog.example.com",
          note: "Unverified home remedy",
        },
        {
          name: "FAO Plant Protection",
          organization: "FAO",
          url: "https://www.fao.org/plant-production-protection",
          note: "Official UN crop protection guidance.",
        },
      ],
      true,
    );
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0]?.url).toBe("https://www.fao.org/plant-production-protection");
    expect(cleaned.every((s) => isTrustedSourceUrl(s.url))).toBe(true);
  });

  it("returns no sources when the image is not a plant", () => {
    const cleaned = sanitizeTrustedSources(
      [
        {
          name: "UC IPM",
          organization: "UC ANR",
          url: "https://ipm.ucanr.edu",
          note: "Official source",
        },
      ],
      false,
    );
    expect(cleaned).toEqual([]);
  });
});

describe("MAX_IMAGE_DATA_URL_LENGTH", () => {
  const toDataUrl = (bytes: number, type: string) =>
    `data:${type};base64,${Buffer.alloc(bytes, 7).toString("base64")}`;

  it("lets every image the UI accepts through the server size check", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(toDataUrl(MAX_IMAGE_BYTES, type).length).toBeLessThanOrEqual(
        MAX_IMAGE_DATA_URL_LENGTH,
      );
    }
  });

  it("rejects images bigger than the UI limit", () => {
    expect(toDataUrl(MAX_IMAGE_BYTES + 3, "image/jpeg").length).toBeGreaterThan(
      MAX_IMAGE_DATA_URL_LENGTH,
    );
  });
});
