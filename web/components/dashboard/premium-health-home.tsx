import Link from "next/link";
import { ArrowRight, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import HealthHome from "@/components/dashboard/health-home";

export default function PremiumHealthHome() {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#08284a] via-[#0b4771] to-[#24babe] px-6 py-8 text-white shadow-[0_18px_52px_rgba(11,45,84,0.12)] sm:px-9 sm:py-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-28 right-24 h-52 w-52 rounded-full bg-[#24c1c4]/20 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              <Sparkles className="h-4 w-4 text-[#24c1c4]" />
              A calmer way to care for your health
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Your health, connected.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-[15px]">
              Sympto brings your next action, clinical context and health history together — so the right thing is easier to see.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/today" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-[#0b2d54] shadow-sm transition hover:-translate-y-0.5">
                See what I need to do
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/log-symptom" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-black text-white transition hover:bg-white/15">
                <HeartPulse className="h-4 w-4" />
                Log a symptom
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-2 pt-7 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-[#0b2d54]">
          <ShieldCheck className="h-5 w-5 text-[#24c1c4]" />
          <h2 className="text-xl font-black tracking-tight">Your health, at a glance</h2>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-400">Your existing health dashboard is connected below.</p>
      </section>

      <HealthHome />
    </div>
  );
}
