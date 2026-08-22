"use client";

import { useState } from "react";

import {
  BellRing,
  Check,
  FileText,
  Landmark,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { Button } from "@/components/ui/button";

import type { UpdateConsentDto } from "@/types/onboarding";

interface ConsentStepProps {
  values: UpdateConsentDto;

  onChange: (values: UpdateConsentDto) => void;

  onBack: () => void;

  onComplete: () => void;

  loading?: boolean;
}

type ConsentDocument =
  | "terms"
  | "privacy"
  | "healthData"
  | null;

export function ConsentStep({
  values,
  onChange,
  onBack,
  onComplete,
  loading = false,
}: ConsentStepProps) {
  const [openDocument, setOpenDocument] =
    useState<ConsentDocument>(null);

  function update(
    field: keyof UpdateConsentDto,
    value: boolean,
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function toggle(
    field: keyof UpdateConsentDto,
  ) {
    update(
      field,
      !Boolean(values[field]),
    );
  }

  const requiredConsentsAccepted =
    Boolean(
      values.acceptTerms &&
        values.acceptPrivacyPolicy &&
        values.acceptDataProcessing,
    );

  return (
    <div>
      <SectionTitle
        step={10}
        title="Your Agreements"
        description="Review and accept the required agreements to complete your onboarding."
      />

      {/* Agreement Cards */}
      <div className="space-y-3">
        {/* TERMS */}
        <div
          className={`rounded-2xl border p-4 transition-all duration-200 ${
            values.acceptTerms
              ? "border-[#24C1C4]/40 bg-[#24C1C4]/5"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  values.acceptTerms
                    ? "border-[#24C1C4]/20 bg-white text-[#24C1C4]"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <FileText className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-[#0B2D54]">
                    Terms and Conditions
                  </h4>

                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Required
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Please read our Terms and Conditions
                  before using Sympto.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setOpenDocument("terms")
                  }
                  className="mt-2 text-xs font-semibold text-[#159FA3] transition-colors hover:text-[#0B2D54] hover:underline"
                >
                  Read Terms and Conditions
                </button>
              </div>
            </div>

            <button
              type="button"
              aria-label="Accept Terms and Conditions"
              aria-pressed={Boolean(
                values.acceptTerms,
              )}
              onClick={() =>
                toggle("acceptTerms")
              }
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                values.acceptTerms
                  ? "border-[#24C1C4] bg-[#24C1C4] text-white"
                  : "border-slate-300 bg-white hover:border-[#24C1C4]"
              }`}
            >
              {values.acceptTerms && (
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={3}
                />
              )}
            </button>
          </div>
        </div>

        {/* PRIVACY */}
        <div
          className={`rounded-2xl border p-4 transition-all duration-200 ${
            values.acceptPrivacyPolicy
              ? "border-[#24C1C4]/40 bg-[#24C1C4]/5"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  values.acceptPrivacyPolicy
                    ? "border-[#24C1C4]/20 bg-white text-[#24C1C4]"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <Lock className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-[#0B2D54]">
                    Privacy Policy
                  </h4>

                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Required
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Learn how Sympto collects, uses,
                  protects and stores your information.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setOpenDocument("privacy")
                  }
                  className="mt-2 text-xs font-semibold text-[#159FA3] transition-colors hover:text-[#0B2D54] hover:underline"
                >
                  Read Privacy Policy
                </button>
              </div>
            </div>

            <button
              type="button"
              aria-label="Accept Privacy Policy"
              aria-pressed={Boolean(
                values.acceptPrivacyPolicy,
              )}
              onClick={() =>
                toggle(
                  "acceptPrivacyPolicy",
                )
              }
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                values.acceptPrivacyPolicy
                  ? "border-[#24C1C4] bg-[#24C1C4] text-white"
                  : "border-slate-300 bg-white hover:border-[#24C1C4]"
              }`}
            >
              {values.acceptPrivacyPolicy && (
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={3}
                />
              )}
            </button>
          </div>
        </div>

        {/* HEALTH DATA */}
        <div
          className={`rounded-2xl border p-4 transition-all duration-200 ${
            values.acceptDataProcessing
              ? "border-[#24C1C4]/40 bg-[#24C1C4]/5"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  values.acceptDataProcessing
                    ? "border-[#24C1C4]/20 bg-white text-[#24C1C4]"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <Landmark className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-[#0B2D54]">
                    Health Data &amp; Privacy
                  </h4>

                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Required
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  I consent to the use of my health data
                  to provide Sympto&apos;s health features.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setOpenDocument("healthData")
                  }
                  className="mt-2 text-xs font-semibold text-[#159FA3] transition-colors hover:text-[#0B2D54] hover:underline"
                >
                  Read Permission Details
                </button>
              </div>
            </div>

            <button
              type="button"
              aria-label="Accept Health Data Permission"
              aria-pressed={Boolean(
                values.acceptDataProcessing,
              )}
              onClick={() =>
                toggle(
                  "acceptDataProcessing",
                )
              }
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                values.acceptDataProcessing
                  ? "border-[#24C1C4] bg-[#24C1C4] text-white"
                  : "border-slate-300 bg-white hover:border-[#24C1C4]"
              }`}
            >
              {values.acceptDataProcessing && (
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={3}
                />
              )}
            </button>
          </div>
        </div>

        {/* MARKETING */}
        <div
          className={`rounded-2xl border p-4 transition-all duration-200 ${
            values.acceptMarketing
              ? "border-slate-300 bg-slate-50/60"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  values.acceptMarketing
                    ? "border-slate-300 bg-white text-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <BellRing className="h-[18px] w-[18px]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-[#0B2D54]">
                    Product Updates and Health Tips
                  </h4>

                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    Optional
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  I&apos;d like to receive optional product
                  updates, helpful information and health
                  tips.
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Accept Product Updates and Health Tips"
              aria-pressed={Boolean(
                values.acceptMarketing,
              )}
              onClick={() =>
                toggle("acceptMarketing")
              }
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                values.acceptMarketing
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              {values.acceptMarketing && (
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={3}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LEGAL NOTICE */}
      <p className="pt-5 text-[11px] leading-relaxed text-slate-400">
        The Terms and Conditions, Privacy Policy and
        Health Data Permission are required to complete
        onboarding. Please ensure you have read and
        understood them before accepting.
      </p>

      {/* COMPLETE ONBOARDING */}
      <div
        className={`mt-6 overflow-hidden rounded-2xl border transition-all duration-300 ${
          requiredConsentsAccepted
            ? "border-[#24C1C4]/30 bg-gradient-to-br from-[#F2FEFE] via-white to-slate-50"
            : "border-slate-200 bg-slate-50/50"
        }`}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  requiredConsentsAccepted
                    ? "bg-[#24C1C4]/10 text-[#159FA3]"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {requiredConsentsAccepted ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-[#0B2D54]">
                  {requiredConsentsAccepted
                    ? "You're ready to go"
                    : "Complete Onboarding"}
                </h3>

                <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
                  {requiredConsentsAccepted
                    ? "Your required agreements are accepted. Complete onboarding to continue to your Sympto dashboard."
                    : "Once you have accepted all required agreements, you can complete onboarding and continue to your dashboard."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={onBack}
                className="border-slate-300 text-slate-700 hover:bg-white"
              >
                Back
              </Button>

              <Button
                type="button"
                disabled={
                  loading ||
                  !requiredConsentsAccepted
                }
                onClick={onComplete}
                className={`gap-2 ${
                  requiredConsentsAccepted
                    ? "bg-[#0B2D54] text-white shadow-sm hover:bg-[#0B2D54]/90"
                    : ""
                }`}
              >
                {loading ? (
                  "Completing..."
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {!requiredConsentsAccepted && (
            <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3">
              <p className="text-xs font-medium leading-5 text-amber-700">
                Please accept the Terms and Conditions,
                Privacy Policy, and Health Data Permission
                before completing onboarding.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT VIEWER */}
      {openDocument !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-document-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2
                id="consent-document-title"
                className="text-xl font-semibold text-slate-900"
              >
                {openDocument === "terms" &&
                  "Terms and Conditions"}

                {openDocument === "privacy" &&
                  "Privacy Policy"}

                {openDocument === "healthData" &&
                  "Health Data Permission Statement"}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setOpenDocument(null)
                }
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close document"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto px-6 py-6">
              {openDocument === "terms" && (
                <div className="space-y-6 text-sm leading-7 text-slate-700">
                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Using Sympto
                    </h3>

                    <p>
                      Sympto provides tools to help you
                      manage and understand your personal
                      health information. The service is
                      intended to support your health journey
                      and does not replace professional
                      medical care.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Your responsibility
                    </h3>

                    <p>
                      You are responsible for providing
                      information that is accurate and
                      keeping your account information
                      secure.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Medical information
                    </h3>

                    <p>
                      Sympto is not a substitute for a
                      doctor, nurse, pharmacist or other
                      qualified healthcare professional.
                      For urgent or serious medical
                      concerns, seek appropriate
                      professional care.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Changes to the service
                    </h3>

                    <p>
                      We may update or improve Sympto from
                      time to time. Important changes to
                      these terms will be communicated where
                      required.
                    </p>
                  </section>
                </div>
              )}

              {openDocument === "privacy" && (
                <div className="space-y-6 text-sm leading-7 text-slate-700">
                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Information we collect
                    </h3>

                    <p>
                      Sympto may collect information you
                      provide during onboarding and while
                      using the service, including profile,
                      health, medication, allergy and
                      wellness information.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      How we use your information
                    </h3>

                    <p>
                      Your information is used to provide
                      and improve the Sympto features you
                      choose to use, maintain your account,
                      and support your health record.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Protecting your information
                    </h3>

                    <p>
                      We take reasonable technical and
                      organisational measures to protect
                      your information against unauthorised
                      access, loss or misuse.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Your choices
                    </h3>

                    <p>
                      Depending on the information and
                      applicable law, you may have rights
                      relating to access, correction,
                      deletion or other handling of your
                      personal information.
                    </p>
                  </section>
                </div>
              )}

              {openDocument === "healthData" && (
                <div className="space-y-6 text-sm leading-7 text-slate-700">
                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      What health information means
                    </h3>

                    <p>
                      Health information can include
                      information about your conditions,
                      medicines, allergies, vaccinations,
                      measurements, lifestyle and other
                      information you provide about your
                      health.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Why we use it
                    </h3>

                    <p>
                      Sympto uses your health information to
                      provide the health record, tracking,
                      reminders and other features you choose
                      to use.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Keeping it secure
                    </h3>

                    <p>
                      We use appropriate security measures to
                      help protect your health information.
                      Access should only be provided to
                      authorised users and services.
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-semibold text-slate-900">
                      Your control
                    </h3>

                    <p>
                      You should have meaningful control over
                      your information and how it is used
                      within the Sympto service, subject to
                      applicable legal and technical
                      requirements.
                    </p>
                  </section>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t px-6 py-4">
              <Button
                type="button"
                onClick={() =>
                  setOpenDocument(null)
                }
                className="bg-[#0B2D54] text-white hover:bg-[#0B2D54]/90"
              >
                Done Reading
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}