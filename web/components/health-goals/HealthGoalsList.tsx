"use client";

import { useSymptoGoals } from "@/hooks/useSymptoGoals";

function formatTargetDate(value: string | null) {
  if (!value) return "No target date";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function HealthGoalsList() {
  const { goals, loading, hasGoals } = useSymptoGoals();

  if (loading) {
    return <div className="text-sm text-slate-400">Loading your health goals…</div>;
  }

  if (!hasGoals) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">No active goals yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Your tracked health activity can still be recorded. Add a goal when you are ready and matching activity will populate it automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {goals.map((goal) => (
        <div
          key={goal.id}
          className="mb-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-800">{goal.title}</span>
            <span className="shrink-0 font-mono text-xs font-bold text-emerald-600">
              {goal.currentProgress}% progress
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(Math.max(goal.currentProgress, 0), 100)}%` }}
            />
          </div>

          <p className="mt-1 text-[10px] text-slate-400">
            🎯 Target: {formatTargetDate(goal.targetDate)} · {goal.guidanceText}
          </p>
        </div>
      ))}
    </div>
  );
}
