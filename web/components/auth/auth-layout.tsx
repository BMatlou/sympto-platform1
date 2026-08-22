interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#24c1c4]/5 flex items-center justify-center p-6">

      <div className="w-full max-w-md">

        <div className="mb-8 text-center">

          <img
            src="/logo.png"
            alt="Sympto"
            className="mx-auto mb-6 h-20 w-auto"
          />

          <h1 className="text-3xl font-bold text-[#0B2D54]">
            {title}
          </h1>

          <p className="mt-3 text-slate-600">
            {subtitle}
          </p>

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          {children}
        </div>

      </div>

    </main>
  );
}