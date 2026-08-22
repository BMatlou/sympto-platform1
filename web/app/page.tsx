import { Activity, Stethoscope, CalendarCheck, ShieldCheck, UserCheck } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter, } from "react-icons/fa6";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F4FBFB]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-20 text-center sm:px-8">

        {/* Logo */}
        <img
          src="/icon0.svg"
          alt="Sympto"
          className="-mt-40 mb-10 h-100 w-auto object-contain sm:h-28 md:h-100"
        />

        <div className="-mt-30 max-[]:w-7xl">
  <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] md:text-4xl lg:text-5xl">
    Empowering healthier lives, together.
  </h1>

  <p className="mx-auto mt-3 max-w-5xl text-center text-lg leading-8 text-slate-600 md:text-xl">
  Making every step of your health journey more connected, confident, and informed.
  Whether you're managing your wellbeing or navigating life's more complex health moments, Sympto gives you one secure place to stay informed, connected, and in control.
</p>
</div>

      {/* CTA Section */}
<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
  <a 
    href="/auth/sign-in"
    className="inline-block text-center rounded-xl bg-[#0b2d54] px-10 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[#0b2d54]/90 hover:shadow-xl"
  >
    Sign In
  </a>

  <a 
    href="/auth/sign-up"
    className="inline-block text-center rounded-xl border border-slate-200 bg-white px-10 py-4 text-lg font-semibold text-[#0b2d54] shadow-sm transition hover:bg-slate-50 hover:shadow-md"
  >
    Create Account
  </a>
</div>


        <p className="mt-4 text-sm text-slate-500">
         Built with security, privacy, and user trust at the core.
        </p>

        {/* Features Layout */}
        <div className="mt-8 grid w-full max-w-6xl gap-8 md:grid-cols-3">

          {/* Feature 1 - Log Symptoms & Vitals */}
          <div className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
            {/* Soft teal icon background transitions to solid deep navy on card hover */}
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#24c1c4] transition group-hover:bg-[#0b2d54] group-hover:text-white mx-auto">
              <Activity className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-semibold text-[#0b2d54]">
              Track Symptoms & Vitals
            </h3>
            <p className="mt-3 text-slate-600">
              Capture symptoms, vital signs, and health changes in one place to build a complete picture of your wellbeing.
            </p>
          </div>

          {/* Feature 2 - Connect Your Practitioner */}
          <div className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#24c1c4] transition group-hover:bg-[#0b2d54] group-hover:text-white mx-auto">
              <UserCheck className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-semibold text-[#0b2d54]">
              Connected Care
            </h3>
            <p className="mt-3 text-slate-600">
              Securely share your health information with your healthcare providers for more informed, coordinated care.
            </p>
          </div>

          {/* Feature 3 - Smart Appointments */}
          <div className="group rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#24c1c4] transition group-hover:bg-[#0b2d54] group-hover:text-white mx-auto">
              <CalendarCheck className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-semibold text-[#0b2d54]">
              Better Consultations
            </h3>
            <p className="mt-3 text-slate-600">
               Turn every appointment into a more meaningful conversation with accurate, up-to-date health information.
            </p>
          </div>

        </div>

      {/* Footer */}
<footer className="mt-8 w-full border-t border-slate-200 pt-10 pb-0 mb-0">
  <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 pb-0 mb-0">

    <p className="font-bold text-[#0b2d54] text-lg">
      Sympto
    </p>

    <p className="text-sm text-slate-500">
      Empowering healthier lives, together.
    </p>

    <div className="flex items-center gap-5">
      <a
        href="https://linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 transition hover:text-[#0b2d54]"
      >
        <FaLinkedinIn className="h-5 w-5" />
      </a>

      <a
        href="https://facebook.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 transition hover:text-[#0b2d54]"
      >
        <FaFacebookF className="h-5 w-5" />
      </a>

      <a
        href="https://instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 transition hover:text-[#0b2d54]"
      >
        <FaInstagram className="h-5 w-5" />
      </a>

      <a
        href="https://x.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 transition hover:text-[#0b2d54]"
      >
        <FaXTwitter className="h-5 w-5" />
      </a>
    </div>

    <p className="text-sm text-slate-400 mb-0 pb-0">
      © {new Date().getFullYear()} Sympto. All rights reserved.
    </p>

  </div>
</footer>



      </section>
    </main>
  );
}
