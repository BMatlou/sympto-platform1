"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  Play,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import {
  patientClinicalRecordsService,
  type PatientCarePlanTaskStatus,
} from "@/services/patient-clinical-records.service";

function date(value: unknown) {
  if (!value) return "Not recorded";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function dateTime(value: unknown) {
  if (!value) return "Not recorded";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function name(person: any) {
  return person
    ? [person.firstName, person.lastName].filter(Boolean).join(" ")
    : "Care team";
}

function taskIsCompleted(task: any) {
  return Boolean(task?.completedAt) || String(task?.status ?? "").toUpperCase() === "COMPLETED";
}

function taskIsOverdue(task: any) {
  if (!task?.dueDate || taskIsCompleted(task)) return false;
  const due = new Date(String(task.dueDate));
  if (Number.isNaN(due.getTime())) return false;
  const formatDay = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  return formatDay(due) < formatDay(new Date());
}

function nextTaskStatus(status: string): PatientCarePlanTaskStatus | null {
  if (status === "PENDING") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "COMPLETED";
  if (status === "COMPLETED") return "IN_PROGRESS";
  return null;
}

export default function CarePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await patientClinicalRecordsService.get();
      setPlans(Array.isArray(data.carePlans) ? data.carePlans : []);
    } catch {
      setError("We couldn't load your care plans. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const tasks = plans.flatMap((plan) => Array.isArray(plan?.tasks) ? plan.tasks : []);
    const activeTasks = tasks.filter((task) => String(task?.status ?? "").toUpperCase() !== "CANCELLED");
    const completed = activeTasks.filter(taskIsCompleted).length;
    const overdue = activeTasks.filter(taskIsOverdue).length;
    const active = activeTasks.filter((task) => !taskIsCompleted(task)).length;
    return {
      plans: plans.length,
      tasks: tasks.length,
      completed,
      overdue,
      active,
    };
  }, [plans]);

  async function updateTask(planId: string, taskId: string, currentStatus: string) {
    const status = nextTaskStatus(currentStatus);
    if (!status || busyTaskId) return;

    try {
      setBusyTaskId(taskId);
      setNotice("");
      const updated = await patientClinicalRecordsService.updateCarePlanTaskStatus(taskId, status);
      setPlans((current) =>
        current.map((plan) =>
          plan.id !== planId
            ? plan
            : {
                ...plan,
                tasks: (plan.tasks ?? []).map((task: any) =>
                  task.id === taskId ? { ...task, ...updated } : task,
                ),
              },
        ),
      );
      setNotice(status === "COMPLETED" ? "Task completed and saved to your care plan." : "Task returned to in progress.");
    } catch {
      setNotice("We couldn't update that task. It may be clinician-controlled or no longer available.");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/health-records" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">
            <ArrowLeft className="h-4 w-4" />Health records
          </Link>

          <section className="rounded-[30px] border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0b2d54] text-white">
                <ClipboardCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#24c1c4]">My care</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">Care plans</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  See the plan created for you, understand what is due, and keep your task progress current.
                </p>
              </div>
            </div>
          </section>

          {!loading && !error && plans.length > 0 && (
            <section className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Plans</p>
                <p className="mt-1 text-2xl font-black text-[#0b2d54]">{summary.plans}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tasks</p>
                <p className="mt-1 text-2xl font-black text-[#0b2d54]">{summary.tasks}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Completed</p>
                <p className="mt-1 text-2xl font-black text-[#0b2d54]">{summary.completed}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Overdue</p>
                <p className="mt-1 text-2xl font-black text-amber-800">{summary.overdue}</p>
              </div>
            </section>
          )}

          {notice && <div className="mt-5 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-sm font-semibold text-[#0b2d54]">{notice}</div>}

          {loading && <div className="mt-5 rounded-2xl bg-white p-6 text-sm text-slate-500">Loading your care plans…</div>}

          {!loading && error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-white p-6">
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-bold text-white">Try again</button>
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-10 text-center">
              <ClipboardCheck className="mx-auto h-9 w-9 text-slate-400" />
              <h2 className="mt-4 font-semibold text-[#0b2d54]">No care plans yet</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Care plans will appear here when your care team creates one for you.</p>
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <div className="mt-5 space-y-5">
              {plans.map((plan) => {
                const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
                const activeTasks = tasks.filter((task: any) => String(task?.status ?? "").toUpperCase() !== "CANCELLED");
                const completed = activeTasks.filter(taskIsCompleted).length;
                const progress = activeTasks.length ? Math.round((completed / activeTasks.length) * 100) : 0;

                return (
                  <article key={plan.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-[#0b2d54]">{plan.title}</h2>
                          <span className="rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[11px] font-bold text-[#0b2d54]">{String(plan.status ?? "ACTIVE").replace(/_/g, " ")}</span>
                        </div>
                        {plan.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{plan.description}</p>}
                      </div>
                      <div className="text-sm text-slate-500">
                        <CalendarDays className="mr-1 inline h-4 w-4" />
                        {date(plan.startDate)}{plan.endDate ? " – " + date(plan.endDate) : ""}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Plan progress</p>
                          <p className="mt-1 text-sm font-bold text-[#0b2d54]">{completed} of {activeTasks.length} active task{activeTasks.length === 1 ? "" : "s"} complete</p>
                        </div>
                        <span className="text-lg font-black text-[#0b2d54]">{progress}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                        <div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: progress + "%" }} />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <h3 className="font-semibold text-[#0b2d54]">Goals</h3>
                        {(plan.goals ?? []).length ? (
                          <div className="mt-3 space-y-2">
                            {plan.goals.map((goal: any) => (
                              <div key={goal.id} className="rounded-xl bg-white p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-slate-800">{goal.title}</p>
                                  <span className="text-[11px] font-semibold text-slate-400">{String(goal.status ?? "NOT_STARTED").replace(/_/g, " ")}</span>
                                </div>
                                {goal.description && <p className="mt-1 text-xs leading-5 text-slate-500">{goal.description}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">No care-plan goals recorded.</p>
                        )}
                      </section>

                      <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-[#0b2d54]">Tasks</h3>
                          <span className="text-xs font-semibold text-slate-400">{completed}/{tasks.length} complete</span>
                        </div>

                        {tasks.length ? (
                          <div className="mt-3 space-y-2">
                            {tasks.map((task: any) => {
                              const status = String(task?.status ?? "PENDING").toUpperCase();
                              const completedTask = taskIsCompleted(task);
                              const overdue = taskIsOverdue(task);
                              const next = nextTaskStatus(status);
                              return (
                                <div key={task.id} className="rounded-xl bg-white p-3">
                                  <div className="flex items-start gap-3">
                                    <span className="mt-0.5">
                                      {completedTask ? <CheckCircle2 className="h-4 w-4 text-[#24c1c4]" /> : status === "IN_PROGRESS" ? <Clock3 className="h-4 w-4 text-amber-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <p className={"text-sm font-semibold " + (completedTask ? "text-slate-400 line-through" : "text-slate-800")}>{task.title}</p>
                                          {task.description && <p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p>}
                                        </div>
                                        <span className={"rounded-full px-2 py-1 text-[10px] font-bold " + (completedTask ? "bg-[#24c1c4]/10 text-[#0b2d54]" : overdue ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500")}>{completedTask ? "Complete" : overdue ? "Overdue" : String(status).replace(/_/g, " ")}</span>
                                      </div>

                                      {task.dueDate && (
                                        <p className={"mt-2 text-xs " + (overdue ? "font-bold text-amber-700" : "text-slate-400")}>
                                          {overdue ? "Due " + date(task.dueDate) : "Due " + date(task.dueDate)}
                                        </p>
                                      )}
                                      {task.completedAt && <p className="mt-1 text-[11px] text-slate-400">Completed {dateTime(task.completedAt)}</p>}

                                      {next && status !== "CANCELLED" && (
                                        <button
                                          type="button"
                                          onClick={() => void updateTask(plan.id, task.id, status)}
                                          disabled={busyTaskId === task.id}
                                          className={"mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50 " + (completedTask ? "border border-slate-200 bg-white text-[#0b2d54]" : "bg-[#0b2d54] text-white")}
                                        >
                                          {busyTaskId === task.id ? "Saving…" : completedTask ? <><RotateCcw className="h-3.5 w-3.5" />Reopen task</> : status === "PENDING" ? <><Play className="h-3.5 w-3.5" />Start task</> : <><CheckCircle2 className="h-3.5 w-3.5" />Mark complete</>}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">No tasks recorded.</p>
                        )}
                      </section>
                    </div>

                    {plan.practitioner?.person && <p className="mt-4 text-xs text-slate-400">Care team: {name(plan.practitioner.person)}</p>}
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
            Task progress is your record of what you have done. It does not change the clinical plan or cancel a clinician-assigned task.
          </p>
        </div>
      </main>
    </ProtectedRoute>
  );
}