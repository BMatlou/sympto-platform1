import ForgotPasswordForm from "@/components/auth/forgot-password/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#0B2D54]">
              Forgot Password
            </h1>

            <p className="mt-3 text-slate-500">
              Enter your email address and we'll send you a password reset link.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}