import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  HelpCircle,
  Leaf,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import type { PlantDiagnosis } from "@/lib/plant-diagnosis";

interface DiagnosisReportProps {
  diagnosis: PlantDiagnosis;
}

const STATUS_STYLES: Record<
  PlantDiagnosis["healthStatus"],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  healthy: {
    label: "Healthy Plant",
    className: "bg-status-healthy-soft text-status-healthy",
    icon: CheckCircle2,
  },
  diseased: {
    label: "Disease Detected",
    className: "bg-status-severe-soft text-status-severe",
    icon: AlertTriangle,
  },
  uncertain: {
    label: "Uncertain — Closer Photo Recommended",
    className: "bg-status-moderate-soft text-status-moderate",
    icon: HelpCircle,
  },
};

const SEVERITY_LABELS: Record<PlantDiagnosis["severity"], string> = {
  none: "None",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export function DiagnosisReport({ diagnosis }: DiagnosisReportProps) {
  if (!diagnosis.isPlantImage) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-moderate" />
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              No Plant or Leaf Detected
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {diagnosis.summary}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const status = STATUS_STYLES[diagnosis.healthStatus];
  const StatusIcon = status.icon;

  return (
    <article className="space-y-6 rounded-xl border bg-card p-6 sm:p-8">
      <header className="space-y-4 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Confidence:{" "}
            <strong className="capitalize text-foreground">{diagnosis.confidence}</strong>
            {" · "}
            Severity:{" "}
            <strong className="text-foreground">{SEVERITY_LABELS[diagnosis.severity]}</strong>
          </span>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Leaf className="h-4 w-4" />
            {diagnosis.plantSpecies}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {diagnosis.diseaseName}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{diagnosis.summary}</p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" />
            Observed Symptoms
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {diagnosis.symptoms.map((item, idx) => (
              <li key={idx} className="flex gap-2 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FlaskConical className="h-4 w-4 text-primary" />
            Possible Causes
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {diagnosis.possibleCauses.map((item, idx) => (
              <li key={idx} className="flex gap-2 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 border-t pt-6 sm:grid-cols-2">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Recommended Treatment
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {diagnosis.treatment.map((step, idx) => (
              <li key={idx} className="flex gap-2.5 leading-relaxed">
                <span className="font-semibold text-primary">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Prevention Tips
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {diagnosis.preventionTips.map((tip, idx) => (
              <li key={idx} className="flex gap-2 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {diagnosis.trustedSources.length > 0 && (
        <section className="border-t pt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Trusted Agricultural Sources
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {diagnosis.trustedSources.map((source, idx) => (
              <li key={idx} className="rounded-lg bg-muted/60 p-3 text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {source.name}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <p className="text-xs font-medium text-foreground/80">{source.organization}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{source.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
