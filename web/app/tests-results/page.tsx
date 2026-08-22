"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { useDashboard } from "@/hooks/use-dashboard";

function formatDate(value: unknown) {
  if (!value) return "Date not recorded";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEnum(value: unknown) {
  if (!value) return "Not specified";

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function TestsResultsPage() {
  const { data, loading } = useDashboard();

  /*
   * The current dashboard API does not appear to expose
   * tests/results yet. Keep this safely empty until the
   * backend provides the field.
   */
  const tests = Array.isArray(data?.tests)
    ? data.tests
    : Array.isArray(data?.testResults)
      ? data.testResults
      : Array.isArray(data?.results)
        ? data.results
        : [];

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B5CAD] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF3FB] px-3 py-1 text-xs font-semibold text-[#0B5CAD]">
              <Activity className="h-3.5 w-3.5" />
              My health
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Tests & results
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Keep track of laboratory tests, imaging studies
              and other health results in one place.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084987]"
          >
            <Plus className="h-4 w-4" />
            Add result
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading your test results...
          </div>
        )}

        {/* Summary */}
        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FlaskConical className="h-5 w-5" />
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {tests.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Tests & results
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <ImageIcon className="h-5 w-5" />
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {tests.filter(
                  (test: any) =>
                    String(
                      test?.type ||
                        test?.category ||
                        "",
                    ).toUpperCase() === "IMAGING",
                ).length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Imaging studies
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileText className="h-5 w-5" />
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {tests.filter(
                  (test: any) =>
                    test?.result ||
                    test?.resultValue ||
                    test?.status === "COMPLETED",
                ).length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Results available
              </p>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Your results
            </h2>

            <span className="text-sm text-slate-400">
              {tests.length} record
              {tests.length === 1 ? "" : "s"}
            </span>
          </div>

          {tests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FlaskConical className="h-7 w-7" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No test results yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your laboratory results, imaging studies and
                other test information will appear here when
                they are added to your health record.
              </p>

              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084987]"
              >
                <Plus className="h-4 w-4" />
                Add your first result
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {tests.map((test: any, index: number) => {
                const title =
                  test?.name ||
                  test?.testName ||
                  test?.title ||
                  "Health test";

                const type =
                  test?.type ||
                  test?.category ||
                  "TEST";

                const date =
                  test?.date ||
                  test?.performedAt ||
                  test?.completedAt ||
                  test?.createdAt;

                const result =
                  test?.result ??
                  test?.resultValue ??
                  test?.value;

                const status =
                  test?.status || "RECORDED";

                return (
                  <div
                    key={test?.id ?? `test-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <FlaskConical className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {title}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatEnum(type)}
                          </p>

                          {date && (
                            <p className="mt-2 text-xs text-slate-400">
                              {formatDate(date)}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {formatEnum(status)}
                      </span>
                    </div>

                    {result !== undefined &&
                      result !== null &&
                      result !== "" && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-400">
                            Result
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {String(result)}
                          </p>
                        </div>
                      )}

                    {(test?.notes ||
                      test?.comments ||
                      test?.laboratory) && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {test?.laboratory && (
                          <p className="text-sm text-slate-500">
                            Laboratory:{" "}
                            <span className="font-medium text-slate-700">
                              {test.laboratory}
                            </span>
                          </p>
                        )}

                        {test?.notes && (
                          <p className="mt-1 text-sm text-slate-500">
                            {test.notes}
                          </p>
                        )}

                        {test?.comments && (
                          <p className="mt-1 text-sm text-slate-500">
                            {test.comments}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Information */}
        <section className="mb-8">
          <div className="rounded-2xl border border-[#D8E7F4] bg-[#F5FAFE] p-6">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B5CAD]" />

              <div>
                <h3 className="font-semibold text-slate-900">
                  Keep your results together
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Store laboratory results and imaging
                  information here so you can easily reference
                  them during future healthcare visits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pb-6 text-center text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          Your health information is private and protected.
        </div>
      </div>
    </main>
  );
}
