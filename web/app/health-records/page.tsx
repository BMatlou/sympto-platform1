"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Pill,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

type DocumentKind = "blood-test" | "imaging" | "prescription";

type HealthDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  date: string | null;
  subtitle: string;
  status: string;
  source: string;
  fields: Array<{ label: string; value: string }>;
};

const kindConfig: Record<
  DocumentKind,
  {
    icon: typeof FlaskConical;
    label: string;
    eyebrow: string;
    iconClass: string;
    previewClass: string;
  }
> = {
  "blood-test": {
    icon: FlaskConical,
    label: "Blood Test",
    eyebrow: "LAB RESULT",
    iconClass: "bg-teal-50 text-[#0b2d54]",
    previewClass: "bg-gradient-to-br from-teal-50 via-white to-slate-100",
  },
  imaging: {
    icon: ImageIcon,
    label: "Imaging Scan",
    eyebrow: "IMAGING",
    iconClass: "bg-blue-50 text-blue-700",
    previewClass: "bg-gradient-to-br from-blue-50 via-white to-slate-100",
  },
  prescription: {
    icon: Pill,
    label: "Doctor's Prescription",
    eyebrow: "PRESCRIPTION",
    iconClass: "bg-violet-50 text-violet-700",
    previewClass: "bg-gradient-to-br from-violet-50 via-white to-slate-100",
  },
};

const displayDate = (value: unknown) => {
  if (!value) return "Date not recorded";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(parsed);
};

const valueText = (value: unknown, fallback = "Not recorded") =>
  value === null || value === undefined || value === "" ? fallback : String(value);

function PreviewDocument({ document }: { document: HealthDocument }) {
  const config = kindConfig[document.kind];
  const Icon = config.icon;

  return (
    <div className={`relative h-44 overflow-hidden rounded-2xl border border-slate-200 p-4 ${config.previewClass}`}>
      <div className="absolute right-3 top-3 h-14 w-12 rotate-2 rounded-md border border-slate-200 bg-white shadow-sm" aria-hidden="true">
        <div className="mx-2 mt-3 h-1.5 rounded bg-slate-200" />
        <div className="mx-2 mt-2 h-1 rounded bg-slate-100" />
        <div className="mx-2 mt-2 h-1 rounded bg-slate-100" />
        <div className="mx-2 mt-4 h-5 rounded bg-slate-100" />
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${config.iconClass}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="mt-5 max-w-[70%] rounded-lg bg-white/85 p-2.5 shadow-sm backdrop-blur">
        <div className="h-2 w-24 rounded bg-slate-300" />
        <div className="mt-2 h-1.5 w-32 rounded bg-slate-200" />
        <div className="mt-1.5 h-1.5 w-20 rounded bg-slate-200" />
      </div>
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#0b2d54]/60">{config.eyebrow}</span>
        <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-500">OPEN</span>
      </div>
    </div>
  );
}

function ReportModal({ document, onClose }: { document: HealthDocument; onClose: () => void }) {
  const config = kindConfig[document.kind];
  const Icon = config.icon;

  useEffect(() => {
    const previousOverflow = documentBodyOverflow();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-[#f5f8fb]" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b2d54] transition hover:border-[#24c1c4]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2"
          aria-label="Close report"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back to Records
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"
          aria-label="Close report"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${config.iconClass}`}>
                <Icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#24c1c4]">{config.eyebrow}</p>
                <h1 id="report-title" className="mt-1 text-2xl font-bold tracking-tight text-[#0b2d54] sm:text-3xl">{document.title}</h1>
                <p className="mt-2 text-sm text-slate-500">{document.subtitle}</p>
              </div>
            </div>
            <span className="inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-600">{document.status}</span>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0b2d54]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {displayDate(document.date)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Source: {document.source}</p>
          </div>

          <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {document.fields.map((field) => (
              <div key={field.label} className="grid gap-1 px-4 py-4 sm:grid-cols-[180px_1fr] sm:gap-5">
                <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{field.label}</dt>
                <dd className="whitespace-pre-wrap text-sm font-semibold leading-6 text-[#0b2d54]">{field.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]" aria-hidden="true" />
            <p className="text-sm leading-6 text-slate-600">This report is displayed from your connected patient record.</p>
          </div>
        </article>
      </div>
    </div>
  );
}

function documentBodyOverflow() {
  return document.body.style.overflow;
}

export default function HealthRecordsPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const { data, loading, error, reload } = useDashboard();
  const [selected, setSelected] = useState<HealthDocument | null>(null);

  const documents: HealthDocument[] = [];

  (data?.recentResults?.laboratory ?? []).forEach((result: any) => {
    const tests = (result.items ?? [])
      .map((item: any) => item.test?.name)
      .filter(Boolean)
      .join(", ");
    documents.push({
      id: `lab-${result.id}`,
      kind: "blood-test",
      title: tests || "Blood Test Result",
      date: result.orderedAt || result.createdAt,
      subtitle: tests || "Laboratory result",
      status: valueText(result.status, "Recorded"),
      source: valueText(result.laboratory?.name || result.provider?.name || result.facility?.name, "Health record"),
      fields: [
        { label: "Test", value: tests || "Blood test" },
        { label: "Order number", value: valueText(result.orderNumber) },
        { label: "Status", value: valueText(result.status) },
        { label: "Ordered", value: displayDate(result.orderedAt || result.createdAt) },
        { label: "Result details", value: (result.items ?? []).map((item: any) => [item.test?.name, item.result?.value ?? item.value, item.result?.unit ?? item.unit].filter(Boolean).join(" · ")).filter(Boolean).join("\n") || "No individual result values recorded." },
      ],
    });
  });

  (data?.recentResults?.imaging ?? []).forEach((study: any) => {
    const report = study.reports?.[0];
    documents.push({
      id: `imaging-${study.id}`,
      kind: "imaging",
      title: study.imagingCenter?.name || study.studyType || "Imaging Scan",
      date: study.performedAt || study.createdAt,
      subtitle: study.studyType || study.modality || "Imaging study",
      status: valueText(study.status, "Recorded"),
      source: valueText(study.imagingCenter?.name || study.facility?.name, "Health record"),
      fields: [
        { label: "Study", value: valueText(study.studyType || study.modality, "Imaging scan") },
        { label: "Findings", value: valueText(report?.findings, "No findings recorded.") },
        { label: "Impression", value: valueText(report?.impression, "No impression recorded.") },
        { label: "Performed", value: displayDate(study.performedAt || study.createdAt) },
        { label: "Status", value: valueText(study.status) },
      ],
    });
  });

  (data?.prescriptions ?? []).forEach((prescription: any) => {
    const medicationName = prescription.medication?.name || prescription.medicationName || prescription.name || "Doctor's Prescription";
    const dose = prescription.dose || prescription.dosage;
    const frequency = prescription.frequency;
    documents.push({
      id: `rx-${prescription.id}`,
      kind: "prescription",
      title: medicationName,
      date: prescription.issuedAt,
      subtitle: [dose, frequency].filter(Boolean).join(" · ") || "Prescription",
      status: valueText(prescription.status, "Active"),
      source: valueText(prescription.prescriber?.name || prescription.doctor?.name || prescription.provider?.name, "Health record"),
      fields: [
        { label: "Medicine", value: medicationName },
        { label: "Dose", value: valueText(dose) },
        { label: "How often", value: valueText(frequency) },
        { label: "Instructions", value: valueText(prescription.instructions || prescription.directions) },
        { label: "Issued", value: displayDate(prescription.issuedAt) },
        { label: "Status", value: valueText(prescription.status) },
      ],
    });
  });

  documents.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const closePreview = () => setSelected(null);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href={patientId ? `/health-journal?patientId=${encodeURIComponent(patientId)}` : "/health-journal"}
            className="mb-7 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#0b2d54] shadow-sm transition hover:border-[#24c1c4]/50 hover:text-[#24c1c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back to Journal
          </Link>

          <header className="mb-8">
            <div className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#24c1c4]/10 px-4 py-2 text-xs font-bold text-[#0b2d54]">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Health Records
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">My Health Documents</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">Your reports and prescriptions, brought together from your active health record.</p>
          </header>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading health records">
              {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl bg-white" />)}
            </div>
          ) : error ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <FileText className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-[#0b2d54]">We couldn't load your records</h2>
              <p className="mt-2 text-sm text-slate-500">Your saved health information has not been changed.</p>
              <button type="button" onClick={reload} className="mt-5 min-h-12 rounded-2xl bg-[#0b2d54] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2">Try again</button>
            </section>
          ) : documents.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <FileText className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-[#0b2d54]">No reports yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">When your clinic adds a blood test, scan, or prescription, it will appear here automatically.</p>
            </section>
          ) : (
            <section aria-label="Health documents" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((document) => {
                const config = kindConfig[document.kind];
                const Icon = config.icon;
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelected(document)}
                    className="group min-h-[340px] rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#24c1c4]/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2 sm:p-5"
                    aria-label={`Open ${config.label}: ${document.title}`}
                  >
                    <PreviewDocument document={document} />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#24c1c4]">{config.label}</p>
                          <h2 className="mt-1 line-clamp-2 text-base font-bold text-[#0b2d54]">{document.title}</h2>
                          <p className="mt-1 text-xs text-slate-500">{displayDate(document.date)}</p>
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-[#24c1c4]" aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </div>
      </main>
      {selected && <ReportModal document={selected} onClose={closePreview} />}
    </ProtectedRoute>
  );
}
