"use client";

import { Cigarette } from "lucide-react";

export default function TodaySmokingGoalPremium() {
  return <div className="rounded-[28px] bg-[#0b2d54] p-6 text-white shadow-[0_20px_55px_rgba(11,45,84,0.16)]"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e5f7f6] text-[#24c1c4]"><Cigarette className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9db4ca]">Smoking cessation</p><p className="mt-1 text-lg font-black">Smoking</p></div></div><div className="mt-8 text-center"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9db4ca]">Today</p><p className="mt-3 text-4xl font-black tracking-[-0.06em]">Not logged</p><p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-white/55">Log honestly when you are ready. Sympto will compare it with your daily ceiling.</p></div></div>;
}
