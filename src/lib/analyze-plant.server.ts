import {
  plantDiagnosisSchema,
  sanitizeTrustedSources,
  type AnalyzePlantResult,
} from "./plant-diagnosis";

const DIAGNOSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isPlantImage",
    "plantSpecies",
    "healthStatus",
    "diseaseName",
    "confidence",
    "severity",
    "summary",
    "symptoms",
    "possibleCauses",
    "treatment",
    "preventionTips",
    "trustedSources",
  ],
  properties: {
    isPlantImage: { type: "boolean" },
    plantSpecies: { type: "string" },
    healthStatus: { type: "string", enum: ["healthy", "diseased", "uncertain"] },
    diseaseName: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    severity: { type: "string", enum: ["none", "mild", "moderate", "severe"] },
    summary: { type: "string" },
    symptoms: { type: "array", items: { type: "string" } },
    possibleCauses: { type: "array", items: { type: "string" } },
    treatment: { type: "array", items: { type: "string" } },
    preventionTips: { type: "array", items: { type: "string" } },
    trustedSources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "organization", "url", "note"],
        properties: {
          name: { type: "string" },
          organization: { type: "string" },
          url: { type: "string" },
          note: { type: "string" },
        },
      },
    },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `You are PlantCare AI, a plant pathology and biology diagnostic assistant.
Analyze the uploaded photo of a plant or leaf carefully:
1. Determine if the image actually shows a plant, leaf, stem, fruit, or crop. If not, set isPlantImage to false, plantSpecies to "Not a plant", healthStatus to "uncertain", diseaseName to "No plant detected", confidence to "low", severity to "none", summary explaining that a clear photo of a plant or leaf is needed, and empty arrays for symptoms, possibleCauses, treatment, preventionTips, and trustedSources.
2. If it IS a plant or leaf:
   - Identify the most likely plant species (common name and scientific Latin name).
   - Classify whether the plant is healthy, diseased, or uncertain, and name the most likely disease (include pathogen scientific name when applicable, or "No Disease Detected (Healthy)" if healthy).
   - List 3-5 clear, observable symptoms visible in the image (or healthy traits if healthy).
   - List 2-4 biological or environmental possible causes (e.g., fungal spores, bacterial infection, viral vector, nutrient deficiency, overwatering).
   - Provide 3-5 practical, science-backed recommended treatment steps (or routine care if healthy).
   - Provide 3-5 prevention tips to protect the plant and nearby plants.
   - Ground every symptom, cause, treatment, and prevention point strictly in established plant-pathology and university agricultural extension knowledge (never unverified home remedies or blog myths).
   - Cite 2-3 trusted scientific or agricultural sources ONLY from these verified domains: https://plantvillage.psu.edu, https://ipm.ucanr.edu, https://www.apsnet.org, https://www.fao.org/plant-production-protection, https://www.usda.gov, https://www.rhs.org.uk/disease, https://cals.cornell.edu, https://gd.eppo.int, or https://extension.umn.edu. Never cite blogs, forums, or unverified sites.
Keep language clear, accurate, and accessible for biology students and growers.`;

interface OpenAIResponsePayload {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
}

export async function analyzePlantPhotoServer(imageDataUrl: string): Promise<AnalyzePlantResult> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured. Add it to your .env file to enable AI analysis.",
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env["OPENAI_MODEL"] || "gpt-4o-mini",
        instructions: SYSTEM_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze this plant or leaf image and return the structured plant disease diagnosis JSON.",
              },
              {
                type: "input_image",
                image_url: imageDataUrl,
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "plant_disease_diagnosis",
            strict: true,
            schema: DIAGNOSIS_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return {
          ok: false,
          error: "Too many analysis requests right now. Please wait a moment and try again.",
        };
      }
      return {
        ok: false,
        error: "AI analysis is temporarily unavailable. Please try again in a moment.",
      };
    }

    const data = (await res.json()) as OpenAIResponsePayload;
    let rawText = "";
    let refusalText = "";
    for (const item of data.output ?? []) {
      if (item.type === "message") {
        for (const part of item.content ?? []) {
          if (part.type === "output_text" && part.text) {
            rawText += part.text;
          } else if (part.type === "refusal" && part.refusal) {
            refusalText += part.refusal;
          }
        }
      }
    }

    if (refusalText) {
      return {
        ok: false,
        error: "The image could not be analyzed. Please try another plant or leaf photo.",
      };
    }

    if (!rawText) {
      return {
        ok: false,
        error: "No diagnosis was returned. Please try uploading a clearer photo.",
      };
    }

    const parsed = plantDiagnosisSchema.safeParse(JSON.parse(rawText));
    if (!parsed.success) {
      return { ok: false, error: "The analysis result was incomplete. Please try again." };
    }

    const diagnosis = {
      ...parsed.data,
      trustedSources: sanitizeTrustedSources(parsed.data.trustedSources, parsed.data.isPlantImage),
    };

    return { ok: true, diagnosis };
  } catch (err) {
    console.error("[PlantCare AI] Unexpected error:", err);
    return {
      ok: false,
      error: "Something went wrong while analyzing the image. Please try again.",
    };
  }
}
