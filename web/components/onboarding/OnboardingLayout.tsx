"use client";

import { ReactNode } from "react";

interface OnboardingLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function OnboardingLayout({
  sidebar,
  children,
}: OnboardingLayoutProps) {
  return (
    <main className="relative min-h-screen bg-[#F6F8FC] font-sans text-slate-900 selection:bg-[#24C1C4]/20">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_15%_0%,rgba(36,193,196,0.10),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(79,70,229,0.08),transparent_30%),linear-gradient(to_bottom,#EDF4FB,transparent)]"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-1/2 top-[300px] h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-white/60 blur-3xl"
        aria-hidden="true"
      />

      {/* Wider overall container */}
      <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Header */}
        <header className="flex h-[64px] items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo-navbar.png"
              alt="Sympto"
              className="h-12 w-auto object-contain sm:h-14"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#24C1C4] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#24C1C4]" />
            </span>

            <span className="hidden text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:inline">
              Secure & private
            </span>

            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 sm:hidden">
              Secure
            </span>
          </div>
        </header>

        {/* Main layout */}
        <div className="grid items-start gap-5 pb-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:sticky lg:top-0">
            <div className="custom-step-trail">
              {sidebar}
            </div>

            {/* Support */}
            <a
              href="https://wa.me/27614985686"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact Sympto support on WhatsApp"
              className="group relative mt-2 hidden overflow-hidden rounded-[14px] border border-[#24C1C4]/30 bg-gradient-to-br from-white via-[#F8FEFE] to-[#EEFDFC] p-2.5 shadow-[0_6px_22px_rgba(36,193,196,0.10)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#24C1C4]/60 hover:shadow-[0_12px_32px_rgba(36,193,196,0.20)] sm:block"
            >
              {/* Animated glow */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#24C1C4]/20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-[#24C1C4]/30"
                aria-hidden="true"
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Live support icon */}
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#24C1C4] to-[#159FA3] text-sm font-bold text-white shadow-[0_4px_14px_rgba(36,193,196,0.30)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_5px_18px_rgba(36,193,196,0.45)]">
                    <span className="absolute inset-0 rounded-xl bg-[#24C1C4]/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />

                    <span className="relative z-10">?</span>

                    {/* Live indicator */}
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#24C1C4] opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-[#24C1C4]" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#159FA3]">
                        Need help?
                      </p>

                      <span className="rounded-full bg-[#24C1C4]/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-[#159FA3]">
                        Online
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] font-bold text-slate-800 transition-colors duration-300 group-hover:text-[#0B2D54]">
                      Contact support
                    </p>

                    <p className="mt-0.5 text-[9px] text-slate-400 transition-colors duration-300 group-hover:text-slate-500">
                      Chat with us on WhatsApp
                    </p>
                  </div>
                </div>

                {/* Animated arrow */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#24C1C4]/10 text-[#159FA3] transition-all duration-300 group-hover:bg-[#24C1C4] group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(36,193,196,0.30)]">
                  <span className="text-sm transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </div>
            </a>
          </aside>

          {/* Content */}
          <section className="relative min-w-0 rounded-[24px] border border-white/90 bg-white/95 shadow-[0_16px_45px_rgba(24,51,114,0.06)] backdrop-blur-xl sm:rounded-[28px]">
            {/* Soft glowing top line */}
            <div
              className="pointer-events-none absolute inset-x-4 top-0 z-20 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#24C1C4] to-transparent opacity-90 shadow-[0_0_10px_rgba(36,193,196,0.55)] sm:inset-x-6"
              aria-hidden="true"
            />

            {/* Soft content glow */}
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#24C1C4]/[0.04] blur-3xl"
              aria-hidden="true"
            />

            {/* Content */}
            <div className="relative z-10 px-4 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8 xl:px-12">
              {/* Wider content */}
              <div className="w-full max-w-none">
                {children}
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        .custom-step-trail {
          position: relative;
          width: 100%;
        }

        .custom-step-trail > div {
          width: 100% !important;
        }

        .custom-step-trail > div:first-child {
          padding: 0.9rem 1rem !important;
          border-radius: 1rem !important;
        }

        .custom-step-trail h2,
        .custom-step-trail h3 {
          font-size: 0.875rem !important;
          font-weight: 800 !important;
          color: #ffffff !important;
          margin-bottom: 0.15rem !important;
          letter-spacing: -0.02em !important;
        }

        .custom-step-trail p {
          font-size: 0.625rem !important;
          color: #cbd5e1 !important;
          line-height: 1.25 !important;
          margin-bottom: 0.5rem !important;
        }

        .custom-step-trail ul,
        .custom-step-trail div.space-y-2.5,
        .custom-step-trail div.space-y-3 {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.15rem !important;
          padding-left: 0 !important;
          margin-top: 0 !important;
        }

        .custom-step-trail ul::before,
        .custom-step-trail div.space-y-2.5::before,
        .custom-step-trail div.space-y-3::before {
          content: "" !important;
          position: absolute !important;
          left: 12px !important;
          top: 12px !important;
          bottom: 12px !important;
          width: 1px !important;
          background-color: rgba(148, 163, 184, 0.32) !important;
          z-index: 0 !important;
        }

        .custom-step-trail button,
        .custom-step-trail li,
        .custom-step-trail a {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          position: relative !important;
          min-height: 25px !important;
          padding-left: 2.15rem !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          background: transparent !important;
          border: none !important;
          width: 100% !important;
          text-align: left !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .custom-step-trail button::before,
        .custom-step-trail li::before,
        .custom-step-trail a::before {
          display: none !important;
        }

        .custom-step-trail button div:first-child,
        .custom-step-trail li span:first-child {
          position: absolute !important;
          left: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          height: 25px !important;
          width: 25px !important;
          border-radius: 9999px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 0.55rem !important;
          font-weight: 700 !important;
          z-index: 10 !important;
          transition: all 0.2s ease !important;
          background-color: #0B2D54 !important;
          border: 1px solid #64748b !important;
          color: #94a3b8 !important;
        }

        .custom-step-trail button span:last-child,
        .custom-step-trail li span:last-child {
          font-size: 0.6875rem !important;
          line-height: 1 !important;
          font-weight: 600 !important;
          color: #94a3b8 !important;
          transition: color 0.2s ease !important;
        }

        .custom-step-trail .is-active div:first-child,
        .custom-step-trail [aria-current="step"] span:first-child,
        .custom-step-trail button:focus div:first-child {
          background-color: #4f46e5 !important;
          border-color: #ffffff !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.18) !important;
        }

        .custom-step-trail .is-active span:last-child,
        .custom-step-trail [aria-current="step"] span:last-child,
        .custom-step-trail button:focus span:last-child {
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        .custom-step-trail .is-completed div:first-child,
        .custom-step-trail .completed span:first-child {
          background-color: #24C1C4 !important;
          border-color: #24C1C4 !important;
          color: #ffffff !important;
        }

        .custom-step-trail .is-completed span:last-child,
        .custom-step-trail .completed span:last-child {
          color: #ffffff !important;
        }
      `}</style>
    </main>
  );
}