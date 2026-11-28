import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Camera, ImagePlus, Loader2, Microscope, RotateCcw, Sprout, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DiagnosisReport } from "@/components/DiagnosisReport";
import { analyzePlantImage } from "@/lib/analyze-plant.functions";
import { validatePlantImageFile, type PlantDiagnosis } from "@/lib/plant-diagnosis";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlantCare AI — Plant Disease Detection" },
      {
        name: "description",
        content:
          "Upload a photo of a plant or leaf to identify plant diseases, symptoms, causes, treatment, and prevention tips powered by AI and trusted agricultural sources.",
      },
      { property: "og:title", content: "PlantCare AI — Plant Disease Detection" },
      {
        property: "og:description",
        content:
          "Upload a photo of a plant or leaf to identify plant diseases, symptoms, causes, treatment, and prevention tips powered by AI and trusted agricultural sources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

const REPORT_FIELDS = [
  "Plant species (common & scientific name)",
  "Most likely disease & severity",
  "Observable symptoms",
  "Possible biological or environmental causes",
  "Recommended treatment steps",
  "Prevention tips",
  "Trusted agricultural sources",
] as const;

function Index() {
  const analyzeFn = useServerFn(analyzePlantImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<PlantDiagnosis | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const validationError = validatePlantImageFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      toast.error(validationError);
      return;
    }
    try {
      setErrorMessage(null);
      setDiagnosis(null);
      const prepared = await fileToResizedDataUrl(file);
      setImageDataUrl(prepared);
      setFileName(file.name);
    } catch {
      setErrorMessage("Could not load that image. Please try another photo.");
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    void handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  }

  async function handleAnalyze() {
    if (!imageDataUrl || isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await analyzeFn({ data: { imageDataUrl } });
      if (!result.ok) {
        setErrorMessage(result.error);
        toast.error(result.error);
        return;
      }
      setDiagnosis(result.diagnosis);
    } catch {
      const msg = "Could not complete the analysis. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setImageDataUrl(null);
    setFileName("");
    setDiagnosis(null);
    setErrorMessage(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold leading-none tracking-tight">
                PlantCare AI
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Biology &amp; AI Plant Disease Detection
              </p>
            </div>
          </div>
          {imageDataUrl && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isAnalyzing}>
              <RotateCcw className="h-3.5 w-3.5" />
              New Scan
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Detect plant diseases from a single leaf photo
          </h1>
          <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">
            Upload a photo of a plant or leaf. PlantCare AI analyzes visual symptoms to identify the
            possible disease and provides causes, treatment, prevention tips, and trusted
            agricultural sources.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <section className="rounded-xl border bg-card p-6 lg:col-span-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Plant or Leaf Photo
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Clear, well-lit close-ups of affected leaves give the most accurate classification.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onInputChange}
              aria-label="Upload a photo of a plant or leaf"
              className="sr-only"
            />
            {/* On a phone, capture="environment" opens the rear camera directly. */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onInputChange}
              aria-label="Take a photo of a plant or leaf with the camera"
              className="sr-only"
              data-testid="camera-input"
            />

            {!imageDataUrl ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`mt-4 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-accent/60"
                    : "border-border bg-muted/40 hover:border-primary/60"
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                  <ImagePlus className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  Drop a plant or leaf photo here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP up to 8 MB</p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-4 min-h-11 w-full max-w-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Camera className="h-4 w-4" />
                  Take a photo
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="overflow-hidden rounded-lg border bg-muted/40">
                  <img
                    src={imageDataUrl}
                    alt={fileName ? `Uploaded specimen: ${fileName}` : "Uploaded plant specimen"}
                    className="max-h-80 w-full object-contain"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {fileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Change photo
                  </Button>
                </div>
              </div>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-status-severe-soft px-3.5 py-2.5 text-xs font-medium text-status-severe"
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="mt-5 w-full"
              onClick={handleAnalyze}
              disabled={!imageDataUrl || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing leaf specimen…
                </>
              ) : (
                <>
                  <Microscope className="h-4 w-4" />
                  Analyze Plant Health
                </>
              )}
            </Button>
          </section>

          <div className="lg:col-span-7">
            {isAnalyzing ? (
              <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border bg-card p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
                  Analyzing plant specimen
                </h2>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Classifying leaf patterns, identifying plant species, and compiling trusted
                  agricultural guidance…
                </p>
              </section>
            ) : diagnosis ? (
              <DiagnosisReport diagnosis={diagnosis} />
            ) : (
              <section className="rounded-xl border bg-card p-6 sm:p-8">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  What your diagnosis report includes
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Once you upload a photo and click Analyze, PlantCare AI examines the image and
                  returns structured biology &amp; plant pathology findings:
                </p>
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {REPORT_FIELDS.map((field) => (
                    <li
                      key={field}
                      className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm text-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground sm:px-6">
          PlantCare AI combines plant biology with AI image classification and trusted agricultural
          references. For commercial crops or severe outbreaks, confirm diagnoses with a local
          agricultural extension office.
        </div>
      </footer>
    </div>
  );
}
