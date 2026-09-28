"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { ArrowLeft, Bell, BookHeart, ChevronRight, FileText, KeyRound, LockKeyhole, ShieldCheck, Watch } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";

const sections = [
  {
    title: "Preferences",
    description: "Control how Sympto behaves and how it uses your authorised activity.",
    items: [
      {
        href: "/notifications/preferences",
        icon: Bell,
        title: "Notifications & preferences",
        description: "Choose which notification channels Sympto can use for health and account updates.",
      },
      {
        href: "/health-journal/settings",
        icon: BookHeart,
        title: "Smart Journal settings",
        description: "Choose which authorised health activity Sympto uses for your journal timeline and summaries.",
      },
    ],
  },
  {
    title: "Privacy & security",
    description: "Manage who can access your health information and the permissions you have granted.",
    items: [
      {
        href: "/privacy",
        icon: LockKeyhole,
        title: "Privacy & consent",
        description: "Review active access, understand what has been shared, and revoke access when needed.",
      },
    ],
  },
  {
    title: "Connections",
    description: "Manage the devices and health connections that bring external measurements into Sympto.",
    items: [
      {
        href: "/wearables",
        icon: Watch,
        title: "Connected devices",
        description: "Connect, review and disconnect compatible health devices and wearables.",
      },
    ],
  },
  {
    title: "Security & legal",
    description: "Account access and the policies that govern how Sympto works with you and your data.",
    items: [
      {
        href: null,
        icon: KeyRound,
        title: "Security & account access",
        description: "Password and account-security controls will live here as those patient-facing controls are completed.",
        disabled: true,
      },
      {
        href: "/legal/terms",
        icon: FileText,
        title: "Terms of use",
        description: "Review the Terms and Conditions that govern use of Sympto.",
      },
      {
        href: "/legal/privacy",
        icon: FileText,
        title: "Privacy notice",
        description: "Review how Sympto handles personal and health information.",
      },
      {
        href: "/legal/popia",
        icon: FileText,
        title: "POPIA notice",
        description: "Review Sympto's South African privacy and POPIA information.",
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      if (localStorage.getItem("refreshToken")) {
        await authService.logout();
      }
    } catch {
      // Sign out locally even when the server-side logout request fails.
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authUser");
      router.replace("/auth/sign-in");
    }
  };

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link></div></header><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2d54] text-white"><ShieldCheck className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-[#24c1c4]">Account</p><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Settings</h1></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Manage how Sympto works for you, your privacy and consent, notifications, journal behaviour and connected health devices.</p></div><div className="mt-8 space-y-8">{sections.map((section) => <section key={section.title}><div className="mb-3 px-1"><h2 className="text-lg font-bold text-[#0b2d54]">{section.title}</h2><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">{section.description}</p></div><div className="grid gap-4 sm:grid-cols-2">{section.items.map(({ href, icon: Icon, title, description, disabled }) => disabled ? <div key={title} aria-disabled="true" className="group rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 opacity-90"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b2d54]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold text-[#0b2d54]">{title}</h3><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">Coming soon</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div></div></div> : <Link key={href} href={href as string} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40 hover:shadow-md"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#0b2d54]">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#24c1c4]" /></div></Link>)}</div></section>)}</div><section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="font-semibold text-[#0b2d54]">Sign out</h2>
      <p className="mt-1 text-sm leading-5 text-slate-500">End this session on this device.</p>
    </div>
    <button type="button" onClick={() => void handleSignOut()} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
      Sign out
    </button>
  </div>
</section>
<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
  <h2 className="font-semibold text-[#0b2d54]">Your account</h2>
  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Your identity, insurance, claims, billing and other account-owned information remain under <span className="font-semibold text-[#0b2d54]">My Account</span>. Clinical information stays under <span className="font-semibold text-[#0b2d54]">Clinical</span>. Settings contains how Sympto behaves, connects, communicates and manages privacy and access.</p>
</section></div></main></ProtectedRoute>;
}