"use client";

import Link from "next/link";
import { ArrowRight, Cigarette } from "lucide-react";

type Props = {
  logged: number | null;
  target: number;
  day: number;
  daysLeft: number | null;
  targetDate: string;
  onLog: () => void;
  disabled?: boolean;
};

export default function PremiumSmokingCard({ logged, target, day, daysLeft, targetDate, onLog, disabled }: Props) {
  const hasTarget = Number.isFinite(target) && target > 0;
  const reached = logged !== null && hasTarget && logged >= target;
  const pct = logged !== null && hasTarget ? Math.min(100, Math.round((logged / target) * 100)) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_55px_rgba(11,45,84,0.10)] ring-1 ring-[#e6eef1]">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e5f7f6] text-[#24c1c4] ring-1 ring-[#c9eeec]"><Cigarette className="h-5 w-5" /></span>
          <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#71879b]">Smoking cessation</p><h3 className="mt-0.5 text-base font-black tracking-[-0.04em] text-[#0b2d54]">Smoking</h3></div>
        </div>
      </div>

      <div className="mx-4 rounded-[24px] bg-[#0b2d54] px-5 py-6 text-white shadow-[0_16px_40px_rgba(11,45,84,0.16)]">
        <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9db4ca]">Today</p>
          <div className="relative mx-auto mt-4 h-[142px] w-[142px]">
            <svg width="142" height="142" viewBox="0 0 142 142" className="-rotate-90"><circle cx="71" cy="71" r={radius} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="10" />{logged !== null && hasTarget && <circle cx="71" cy="71" r={radius} fill="none" stroke="#24c1c4" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />}</svg>
            <div className="absolute inset-0 grid place-items-center text-center">{logged === null ? <div><p className="text-3xl font-black">—</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">Not logged</p></div> : <div><p className="text-4xl font-black tracking-[-0.07em]">{logged}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">cigarettes</p></div>}</div>
          </div>
          <p className="mt-4 text-[10px] font-semibold text-white/55">Daily ceiling</p>
          <p className="mt-0.5 text-sm font-black">{hasTarget ? `${target} cigarettes` : "No ceiling set"}</p>
        </div>

        <div className="mt-5 rounded-2xl bg-white/[0.07] px-4 py-3 text-center">
          {logged === null ? <><p className="text-sm font-bold">Log honestly when you’re ready.</p><p className="mt-1 text-[10px] leading-relaxed text-white/55">Sympto will compare your entry with your daily ceiling.</p></> : <p className="text-[11px] font-bold text-white/70">{reached ? "You have reached today’s ceiling." : `${Math.max(0, target - logged)} cigarettes remaining today.`}</p>}
        </div>
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9aa8b4]">Journey</p><p className="mt-1 text-sm font-black text-[#0b2d54]">Day {day}</p></div>{daysLeft !== null && <div className="text-right"><p className="text-sm font-black text-[#0b2d54]">{daysLeft} days left</p><p className="mt-0.5 text-[9px] text-[#8291a0]">until {targetDate}</p></div>}</div>
        <div className="grid grid-cols-2 gap-2"><button type="button" disabled={disabled} onClick={onLog} className={`min-h-11 rounded-xl px-3 text-[10px] font-black ${disabled ? "bg-[#eef2f4] text-[#93a0aa]" : "bg-[#0b2d54] text-white"}`}>{reached ? "Daily ceiling reached" : logged === null ? "Log today’s smoking" : "Update today’s log"}</button><Link href="/health-goals" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
      </div>
    </div>
  );
}
