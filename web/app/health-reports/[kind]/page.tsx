"use client";

import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

const unwrap = <T,>(value: any): T => value?.data ?? value;
const text = (value: unknown, fallback = "Not recorded") =>
  value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("en-ZA", {
        dateStyle: "medium",
        timeZone: "Africa/Johannesburg",
      }).format(new Date(String(value)))
    : "Not recorded";
const human = (value: unknown) =>
  text(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type Report = {
  type: "WEEKLY" | "MONTHLY";
  period: { start: string; end: string; label: string; scheduledFor: string };
  activity: {
    journalEntries: any[];
    symptoms: any[];
    appointments: any[];
    patientVitals: any[];
    deviceMeasurements: any[];
    sleepSessions: any[];
    workouts: any[];
  };
  clinical: {
    encounters: any[];
    diagnoses: any[];
    prescriptions: any[];
    notes: any[];
    vitals: any[];
    labResults: any[];
    imaging: any[];
    procedures: any[];
    carePlans: any[];
    referrals: any[];
  };
  currentSnapshot: {
    medicalRecord: any;
    conditions: any[];
    allergies: any[];
    medications: any[];
  };
  generatedAt: string;
};

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof HeartPulse;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-[#0b2d54]">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          {count}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-slate-500">No {label} were recorded in this period.</p>;
}

export default function HealthReportPage() {
  const params = useParams<{ kind: string }>();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const kind = params.kind?.toLowerCase();
    if (kind !== "weekly" && kind !== "monthly") {
      setError("This health report could not be found.");
      setLoading(false);
      return;
    }
    const query = searchParams.get("date");
    const url = "/health-reports/" + kind + (query ? "?date=" + encodeURIComponent(query) : "");
    api
      .get(url)
      .then((response) => setReport(unwrap<Report>(response.data)))
      .catch((err) => setError(err?.response?.data?.message || "This health report is not available."))
      .finally(() => setLoading(false));
  }, [params.kind, searchParams]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-5">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="h-48 animate-pulse rounded-[32px] bg-white" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-56 animate-pulse rounded-3xl bg-white" />
              <div className="h-56 animate-pulse rounded-3xl bg-white" />
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !report) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-5">
          <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold text-[#0b2d54]">Health report unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">{error || "We could not load this report."}</p>
            <Link href="/notifications" className="mt-5 inline-flex rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-bold text-white">Back to notifications</Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const clinicalCount =
    report.clinical.encounters.length +
    report.clinical.diagnoses.length +
    report.clinical.prescriptions.length +
    report.clinical.notes.length +
    report.clinical.vitals.length +
    report.clinical.labResults.length +
    report.clinical.imaging.length +
    report.clinical.procedures.length +
    report.clinical.carePlans.length +
    report.clinical.referrals.length;

  const activityCount =
    report.activity.journalEntries.length +
    report.activity.symptoms.length +
    report.activity.appointments.length +
    report.activity.patientVitals.length +
    report.activity.deviceMeasurements.length +
    report.activity.sleepSessions.length +
    report.activity.workouts.length;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] pb-10 text-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]">
            <ArrowLeft className="h-4 w-4" /> Back to notifications
          </Link>

          <section className="mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white shadow-lg sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  <ShieldCheck className="h-4 w-4" /> Sympto health report
                </div>
                <h1 className="mt-3 text-3xl font-black">{report.type === "WEEKLY" ? "Weekly" : "Monthly"} health report</h1>
                <p className="mt-2 text-sm text-white/80">{report.period.label}</p>
              </div>
              <FileText className="h-8 w-8 text-white/80" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold">{activityCount} health activity records</span>
              <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold">{clinicalCount} clinical records</span>
            </div>
          </section>

          {activityCount > 0 && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {report.activity.journalEntries.length > 0 && (
                <Section icon={FileText} title="Your journal" count={report.activity.journalEntries.length}>
                  <div className="space-y-2">{report.activity.journalEntries.map((entry: any) => <div key={entry.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{date(entry.createdAt)}</p><p className="mt-1 font-semibold text-[#0b2d54]">{text(entry.title, "Journal entry")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{text(entry.journal)}</p></div>)}</div>
                </Section>
              )}
              {report.activity.symptoms.length > 0 && (
                <Section icon={Activity} title="Symptoms recorded" count={report.activity.symptoms.length}>
                  <div className="space-y-2">{report.activity.symptoms.map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className={item.source === "CLINICAL" ? "rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700" : "rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700"}>{item.source === "CLINICAL" ? "Clinical" : "Patient"}</span><span className="text-xs text-slate-400">{date(item.startedAt || item.createdAt)}</span></div><p className="mt-2 font-semibold text-[#0b2d54]">{text(item.title, "Symptom recorded")}</p><p className="mt-1 text-sm text-slate-600">{(item.symptoms || []).map((x: any) => x.symptom?.name || x.name).filter(Boolean).join(" · ") || text(item.description)}</p></div>)}</div>
                </Section>
              )}
              {report.activity.patientVitals.length > 0 && (
                <Section icon={HeartPulse} title="Vitals you recorded" count={report.activity.patientVitals.length}>
                  <div className="space-y-2">{report.activity.patientVitals.map((v: any) => <div key={v.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">{date(v.recordedAt)}</p><div className="mt-2 flex flex-wrap gap-2">{v.temperature != null && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">Temp · {v.temperature} °C</span>}{v.bloodPressureSystolic != null || v.bloodPressureDiastolic != null ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">BP · {v.bloodPressureSystolic ?? "—"}/{v.bloodPressureDiastolic ?? "—"}</span> : null}{v.heartRate != null && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">HR · {v.heartRate} bpm</span>}{v.oxygenSaturation != null && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">O2 · {v.oxygenSaturation}%</span>}{v.respiratoryRate != null && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">Resp · {v.respiratoryRate}/min</span>}{v.weightKg != null && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">Weight · {v.weightKg} kg</span>}</div></div>)}</div>
                </Section>
              )}
              {report.activity.appointments.length > 0 && (
                <Section icon={CalendarDays} title="Appointments" count={report.activity.appointments.length}>
                  <div className="space-y-2">{report.activity.appointments.map((a: any) => <div key={a.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{human(a.appointmentType)}</p><p className="mt-1 text-xs text-slate-500">{date(a.scheduledStart)} · {text(a.practitioner?.person ? a.practitioner.person.firstName + " " + a.practitioner.person.lastName : null)}</p>{a.reason && <p className="mt-1 text-sm text-slate-600">{a.reason}</p>}</div>)}</div>
                </Section>
              )}
            </div>
          )}

          {clinicalCount > 0 && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {report.clinical.encounters.length > 0 && <Section icon={Stethoscope} title="Clinical visits" count={report.clinical.encounters.length}><div className="space-y-3">{report.clinical.encounters.map((e: any) => <div key={e.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(e.encounterType?.name, "Clinical encounter")}</p></div><p className="mt-1 text-xs text-slate-500">{date(e.startedAt)} · {text(e.practitioner?.person ? e.practitioner.person.firstName + " " + e.practitioner.person.lastName : null, "Practitioner not recorded")}</p>{e.chiefComplaint && <p className="mt-3 text-sm leading-5 text-slate-700"><strong>Reason:</strong> {e.chiefComplaint}</p>}{e.assessment && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700"><strong>Assessment:</strong> {e.assessment}</p>}{e.plan && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700"><strong>Plan:</strong> {e.plan}</p>}{e.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600"><strong>Notes:</strong> {e.notes}</p>}</div>)}</div></Section>}
              {report.clinical.diagnoses.length > 0 && <Section icon={ClipboardList} title="Diagnoses" count={report.clinical.diagnoses.length}><div className="space-y-2">{report.clinical.diagnoses.map((d: any) => <div key={d.id} className="rounded-xl bg-slate-50 p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 font-semibold text-[#0b2d54]">{text(d.diagnosis?.name || d.name, "Diagnosis")}</p><p className="mt-1 text-xs text-slate-500">{d.diagnosedAt ? date(d.diagnosedAt) : "Date not recorded"} · {human(d.status)}</p>{d.treatmentPlan && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{d.treatmentPlan}</p>}</div>)}</div></Section>}
              {report.clinical.prescriptions.length > 0 && <Section icon={Pill} title="Prescriptions" count={report.clinical.prescriptions.length}><div className="space-y-2">{report.clinical.prescriptions.map((p: any) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><span className="text-xs text-slate-400">{date(p.issuedAt)}</span></div>{(p.items || []).map((item: any) => <div key={item.id} className="mt-2"><p className="font-semibold text-[#0b2d54]">{text(item.medication?.name, "Medication")}</p><p className="text-xs text-slate-500">{text(item.dosage)} · {human(item.frequency)} · {human(item.route)}</p>{item.instructions && <p className="mt-1 text-sm text-slate-600">{item.instructions}</p>}</div>)}</div>)}</div></Section>}
              {report.clinical.notes.length > 0 && <Section icon={FileText} title="Clinical notes" count={report.clinical.notes.length}><div className="space-y-2">{report.clinical.notes.map((n: any) => <div key={n.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><span className="text-xs text-slate-400">{date(n.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{n.note}</p></div>)}</div></Section>}
              {report.clinical.vitals.length > 0 && <Section icon={HeartPulse} title="Clinical vitals" count={report.clinical.vitals.length}><div className="space-y-2">{report.clinical.vitals.map((v: any) => <div key={v.id} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span>{text(v.vitalType?.name, "Vital")}</span><strong className="text-[#0b2d54]">{text(v.value)}</strong></div>)}</div></Section>}
              {report.clinical.labResults.length > 0 && <Section icon={FlaskConical} title="Laboratory results" count={report.clinical.labResults.length}><div className="space-y-3">{report.clinical.labResults.map((r: any) => <div key={r.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(r.orderItem?.test?.name, "Lab result")}</p><span className="text-xs text-slate-400">{date(r.reportedAt || r.releasedAt)}</span></div><div className="mt-3 space-y-2">{(r.items || []).map((item: any) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3"><span className="text-xs font-semibold text-slate-600">{text(item.test?.name, "Test")}</span><span className="text-xs font-black text-[#0b2d54]">{item.numericValue ?? item.textValue ?? item.booleanValue ?? "Not recorded"}{item.abnormal ? " · Abnormal" : ""}{item.critical ? " · Critical" : ""}</span></div>)}</div></div>)}</div></Section>}
              {report.clinical.imaging.length > 0 && <Section icon={FileText} title="Imaging" count={report.clinical.imaging.length}><div className="space-y-3">{report.clinical.imaging.map((study: any) => <div key={study.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(study.studyType || study.modality, "Imaging study")}</p><span className="text-xs text-slate-400">{date(study.performedAt || study.reportedAt)}</span></div>{(study.reports || []).map((reportItem: any) => <div key={reportItem.id} className="mt-3 space-y-2"><p className="text-sm leading-5 text-slate-700"><strong>Findings:</strong> {text(reportItem.findings)}</p>{reportItem.impression && <p className="text-sm leading-5 text-slate-700"><strong>Impression:</strong> {reportItem.impression}</p>}{reportItem.recommendations && <p className="text-sm leading-5 text-slate-700"><strong>Recommendations:</strong> {reportItem.recommendations}</p>}</div>)}</div>)}</div></Section>}
              {report.clinical.procedures.length > 0 && <Section icon={ClipboardList} title="Procedures" count={report.clinical.procedures.length}><div className="space-y-2">{report.clinical.procedures.map((p: any) => <div key={p.id} className="rounded-xl bg-slate-50 p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 font-semibold text-[#0b2d54]">{text(p.procedure?.name || p.name, "Procedure")}</p><p className="mt-1 text-xs text-slate-500">{p.performedAt ? date(p.performedAt) : date(p.createdAt)} · {human(p.status)}</p>{p.outcome && <p className="mt-2 text-sm text-slate-600">{p.outcome}</p>}</div>)}</div></Section>}
              {report.clinical.carePlans.length > 0 && <Section icon={ClipboardList} title="Care plans" count={report.clinical.carePlans.length}><div className="space-y-2">{report.clinical.carePlans.map((p: any) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 font-semibold text-[#0b2d54]">{text(p.title, "Care plan")}</p><p className="mt-1 text-xs text-slate-500">{human(p.status)} · {date(p.updatedAt || p.createdAt)}</p>{p.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{p.description}</p>}</div>)}</div></Section>}
              {report.clinical.referrals.length > 0 && <Section icon={Stethoscope} title="Referrals" count={report.clinical.referrals.length}><div className="space-y-2">{report.clinical.referrals.map((r: any) => <div key={r.id} className="rounded-2xl bg-slate-50 p-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 font-semibold text-[#0b2d54]">{r.specialty || "Clinical referral"}</p><p className="mt-1 text-xs text-slate-500">{human(r.status)} · {date(r.requestedDate)}</p><p className="mt-2 text-sm leading-5 text-slate-600">{text(r.reason)}</p>{r.clinicalSummary && <p className="mt-2 text-sm leading-5 text-slate-600"><strong>Clinical summary:</strong> {r.clinicalSummary}</p>}</div>)}</div></Section>}
            </div>
          )}

          {(report.currentSnapshot.conditions.length > 0 || report.currentSnapshot.allergies.length > 0 || report.currentSnapshot.medications.length > 0) && (
            <Section icon={ShieldCheck} title="Current clinical snapshot" count={report.currentSnapshot.conditions.length + report.currentSnapshot.allergies.length + report.currentSnapshot.medications.length}>
              <div className="grid gap-4 md:grid-cols-3">
                {report.currentSnapshot.conditions.length > 0 && <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Active conditions</p><div className="mt-2 space-y-2">{report.currentSnapshot.conditions.map((item: any) => <div key={item.id} className="rounded-xl bg-blue-50 p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 text-sm font-semibold text-[#0b2d54]">{text(item.condition?.name || item.name)}</p></div>)}</div></div>}
                {report.currentSnapshot.allergies.length > 0 && <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Active allergies</p><div className="mt-2 space-y-2">{report.currentSnapshot.allergies.map((item: any) => <div key={item.id} className="rounded-xl bg-rose-50 p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 text-sm font-semibold text-[#0b2d54]">{text(item.allergy?.name || item.name)}</p></div>)}</div></div>}
                {report.currentSnapshot.medications.length > 0 && <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Current medications</p><div className="mt-2 space-y-2">{report.currentSnapshot.medications.map((item: any) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Clinical</span><p className="mt-2 text-sm font-semibold text-[#0b2d54]">{text(item.medication?.name || item.name)}</p><p className="mt-1 text-xs text-slate-500">{[item.dosage, item.frequency, item.route].filter(Boolean).join(" · ")}</p></div>)}</div></div>}
              </div>
            </Section>
          )}

          <p className="mt-5 text-center text-xs text-slate-400">Report generated {date(report.generatedAt)}. Sections appear only when records are available.</p>
        </div>
      </main>
    </ProtectedRoute>
  );
}
