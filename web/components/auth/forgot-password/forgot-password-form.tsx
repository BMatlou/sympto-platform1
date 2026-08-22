"use client";

import { Mail } from "lucide-react";

export default function ForgotPasswordForm() {
  return (
    <form className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Email Address
        </label>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="email"
            placeholder="john@example.com"
            className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-[#0B2D54] py-3 font-semibold text-white transition hover:bg-[#082443]"
      >
        Send Reset Link
      </button>

      <div className="text-center">
        <a
          href="/auth/sign-in"
          className="text-sm font-medium text-[#24C1C4] hover:underline"
        >
          Back to Sign In
        </a>
      </div>
    </form>
  );
}