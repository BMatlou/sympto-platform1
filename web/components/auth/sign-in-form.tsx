"use client";

import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSignIn } from "@/hooks/use-sign-in";
import { onboardingService } from "@/services/onboarding.service";


type LoginForm = {
  email: string;
  password: string;
};

export default function SignInForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const signIn = useSignIn();

  const {
    register,
    handleSubmit,
  } = useForm<LoginForm>();

  const onSubmit = (data: LoginForm) => {
    signIn.mutate(data, {
     onSuccess: async (response) => {
  localStorage.setItem(
    "accessToken",
    response.accessToken,
  );

  if (response.refreshToken) {
    localStorage.setItem(
      "refreshToken",
      response.refreshToken,
    );
  }

  toast.success("Welcome back!");

  try {
    const progress =
      await onboardingService.getProgress();

    if (progress?.status === "COMPLETED") {
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }
  } catch (error) {
    console.error(
      "Failed to check onboarding progress:",
      error,
    );

    router.push("/onboarding");
  }
},
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Email address
        </label>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Password
        </label>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-12 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2D54]"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          Remember me
        </label>

        <Link
          href="/auth/forgot-password"
          className="font-medium text-[#0B2D54] hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={signIn.isPending}
        className="w-full rounded-xl bg-[#0B2D54] py-3 font-semibold text-white transition hover:bg-[#082443] disabled:opacity-60"
      >
        {signIn.isPending ? "Signing In..." : "Sign In"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="font-semibold text-[#24C1C4] hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
