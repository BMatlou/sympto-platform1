"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, FileText, MapPin, MessageCircle, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

function unwrap<T>(value: any): T { return value?.data ?? value; }
function formatDate(value: unknown) { if (!value) return "Not recorded"; const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return String(value); return new Intl.DateTimeFormat("en-ZA", { dateStyle: "full", timeStyle: "short" }).format(date); }
function displayName(person?: any) { return [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ") || "Healthcare professional"; }

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/appointments/${params.id}`);
        setAppointment(unwrap(response.data));
      } catch (requestError) {
        console.error("Failed to load appointment:", requestError);
        setError("We could not load this appointment. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params?.id]);

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <Link href="/appointments" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><ArrowLeft className="h-4 w-4" /> Back to appointments</Link>
    {loading && <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 text-sm font-semibold text-slate-500">Loading appointment…</div>}
    {error && !loading && <div className="mt-6 rounded-3xl border border-red-200 bg-white p-7"><h1 className="text-lg font-black text-[#0b2d54]">Appointment unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Link href="/appointments" className="mt-5 inline-flex rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-bold text-white">Back to appointments</Link></div>}
    {!loading && !error && appointment && <>
      <header className="mt-6 rounded-[30px] bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white shadow-[0_18px_55px_rgba(11,45,84,0.14)] sm:p-8">
        <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><CalendarDays className="h-7 w-7" /></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Appointment</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{String(appointment.appointmentType || appointment.title || "Healthcare appointment").replace(/_/g, " ")}</h1>{appointment.status && <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">{String(appointment.status).replace(/_/g, " ")}</span>}</div></div>
      </header>
      <section className="mt-5 space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-[#24c1c4]" /><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Date & time</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{formatDate(appointment.scheduledStart)}</p>{appointment.scheduledEnd && <p className="mt-1 text-xs text-slate-500">Ends {formatDate(appointment.scheduledEnd)}</p>}</div></div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><Stethoscope className="mt-0.5 h-5 w-5 text-[#24c1c4]" /><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Healthcare professional</p><p className="mt-1 text-base font-black text-[#0b2d54]">{displayName(appointment.practitioner?.person)}</p>{appointment.practitioner?.registrationNumber && <p className="mt-1 text-xs text-slate-500">Registration: {appointment.practitioner.registrationNumber}</p>}</div></div></div>
        {(appointment.practice?.name || appointment.practice?.address) && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-[#24c1c4]" /><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Practice</p><p className="mt-1 text-base font-black text-[#0b2d54]">{appointment.practice?.name || "Healthcare practice"}</p>{appointment.practice?.address && <p className="mt-1 text-sm leading-6 text-slate-500">{typeof appointment.practice.address === "string" ? appointment.practice.address : [appointment.practice.address.line1, appointment.practice.address.suburb, appointment.practice.address.city].filter(Boolean).join(", ")}</p>}</div></div></div>}
        {(appointment.reason || appointment.notes) && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-[#24c1c4]" /><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Appointment notes</p>{appointment.reason && <p className="mt-2 text-sm font-semibold leading-6 text-[#0b2d54]">{appointment.reason}</p>}{appointment.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{appointment.notes}</p>}</div></div></div>}
      </section>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/messages" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#071f3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><MessageCircle className="h-5 w-5" />Open care messages</Link><Link href="/smart-file" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#0b2d54] shadow-sm transition hover:border-[#24c1c4]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">Share Smart File</Link></div>
      <div className="mt-4 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-xs font-semibold leading-5 text-[#0b2d54]">Your appointment details are part of your Sympto health record. Clinical Smart File sharing remains a separate consent action.</div>
    </>}
  </div></main></ProtectedRoute>;
}
