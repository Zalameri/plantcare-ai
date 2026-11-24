import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyzePlantPhotoServer } from "./analyze-plant.server";
import { MAX_IMAGE_DATA_URL_LENGTH } from "./plant-diagnosis";

const analyzeInputSchema = z.object({
  imageDataUrl: z
    .string()
    .max(MAX_IMAGE_DATA_URL_LENGTH, "Image is too large (max 8 MB)")
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid image format"),
});

export const analyzePlantImage = createServerFn({ method: "POST" })
  .inputValidator((input) => analyzeInputSchema.parse(input))
  .handler(async ({ data }) => {
    return analyzePlantPhotoServer(data.imageDataUrl);
  });
