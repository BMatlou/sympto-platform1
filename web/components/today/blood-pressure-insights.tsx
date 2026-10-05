"use client";

import { AlertTriangle, Dumbbell, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { canonicalExerciseDayTotals } from "@/lib/exercise-metric";

type BloodPressureEvent = {
  id?: string;
  loggedValue: number;
  occurredAt: string;
  source?: string | null;
  sourceId?: string | null;
};

type Props = {
  target: number | null;
  exerciseGoalTarget?: number | null;
  exerciseGoalTitle?: string | null;
  exerciseGoalFrequency?: string | null;
  challengeStartAt: string | null;
  bloodPressureEvents: BloodPressureEvent[] | null;
};

type InsightState = {
  loading: boolean;
  title: string;
  body: string;
  tone: "info" | "warning";
  evidence: string[];
  bpAverage: number | null;
  latestBp: number | null;
  exerciseTotal: number | null;
  exerciseTarget: number | null;
  exerciseLabel: string;
  pattern: "LOWER" | "HIGHER" | "BUILDING" | "NONE";
};

function numberOrNull(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value: number | null) {
  return value == null || !Number.isFinite(value) ? null : Math.round(value);
}

function localDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function mondayKey(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const local = new Date(Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), 12));
  const mondayOffset = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - mondayOffset);
  return [
    local.getUTCFullYear(),
    String(local.getUTCMonth() + 1).padStart(2, "0"),
    String(local.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function shiftWeek(key: string, offset: number) {
  const [year, month, day] = key.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return "";
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + offset * 7);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export default function BloodPressureInsights({
  target,
  exerciseGoalTarget = null,
  exerciseGoalTitle = "Exercise",
  exerciseGoalFrequency = "WEEKLY",
  challengeStartAt,
  bloodPressureEvents,
}: Props) {
  const [state, setState] = useState<InsightState>({
    loading: bloodPressureEvents === null,
    title: "",
    body: "",
    tone: "info",
    evidence: [],
    bpAverage: null,
    latestBp: null,
    exerciseTotal: null,
    exerciseTarget: numberOrNull(exerciseGoalTarget),
    exerciseLabel: String(exerciseGoalTitle || "Exercise"),
    pattern: "BUILDING",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      setState((current) => ({ ...current, loading: true }));

      try {
        const now = new Date();
        const parsedChallengeStart = challengeStartAt ? new Date(challengeStartAt) : null;
        const from = parsedChallengeStart && !Number.isNaN(parsedChallengeStart.getTime())
          ? parsedChallengeStart
          : new Date(0);
        const exercise = await healthGoalsService.getMetricEvents(
          "EXERCISE",
          "exercise.minutes",
          from,
          now,
        );

        if (!active) return;

        // IMPORTANT: BP events come directly from TodaySupportedGoalCard.
        // That component already applies the goal.createdAt -> now challenge window.
        // Never fetch BP history again here, otherwise baseline/historical readings can leak into Insights.
        const bpEvents = (bloodPressureEvents ?? [])
          .map((event) => ({
            value: numberOrNull(event.loggedValue),
            occurredAt: String(event.occurredAt ?? ""),
          }))
          .filter((event) => event.value != null && event.occurredAt);

        const latestByDay = new Map<string, { value: number; at: number }>();

        for (const event of bpEvents) {
          const day = localDayKey(event.occurredAt);
          if (!day) continue;

          const at = new Date(event.occurredAt).getTime();
          const latest = latestByDay.get(day);
          if (!latest || at >= latest.at) {
            latestByDay.set(day, { value: event.value, at });
          }

        }

        // Match the Goal Card exactly: one latest systolic value per active challenge day.
        const dailyLatest = new Map(
          [...latestByDay.entries()].map(([day, item]) => [day, item.value] as const),
        );

        const orderedDays = [...dailyLatest.keys()].sort();
        const recordedDays = orderedDays.length;
        const recentDays = orderedDays.slice(-7);
        const earlierDays = orderedDays.slice(-14, -7);
        const latestDay = orderedDays.at(-1);
        const latestBp = latestDay ? round(dailyLatest.get(latestDay) ?? null) : null;

        // Do not manufacture a trend or average from one/two active challenge days.
        const incompleteChallengeData = recordedDays < 3;
        const bpAverage = incompleteChallengeData
          ? null
          : round(average(recentDays.map((day) => dailyLatest.get(day) ?? 0)));
        const earlierAverage = incompleteChallengeData || earlierDays.length < 2
          ? null
          : round(average(earlierDays.map((day) => dailyLatest.get(day) ?? 0)));
        const bpChange = bpAverage != null && earlierAverage != null
          ? bpAverage - earlierAverage
          : null;

        const rawExerciseEvents = (exercise.events ?? [])
          .map((event: any) => ({
            value: numberOrNull(event?.loggedValue),
            occurredAt: String(event?.occurredAt ?? ""),
            source: event?.source ?? null,
          }))
          .filter((event: any) => event.value != null && event.occurredAt);

        const canonicalInput = rawExerciseEvents.map((event: any) => ({
          loggedValue: event.value,
          occurredAt: event.occurredAt,
          source: event.source,
        }));

        const dayTotals = canonicalExerciseDayTotals(canonicalInput);
        const exerciseFrequency = String(exerciseGoalFrequency || "WEEKLY").toUpperCase();
        const numericExerciseTarget = numberOrNull(exerciseGoalTarget);

        const currentWeek = mondayKey(now);
        const exerciseTotal = exerciseFrequency === "WEEKLY"
          ? round(
              [...dayTotals.entries()]
                .filter(([day]) => mondayKey(day) === currentWeek)
                .reduce((sum, [, value]) => sum + value, 0),
            )
          : round(dayTotals.get(localDayKey(now)) ?? 0);

        const title = String(exerciseGoalTitle || "Exercise");

        // Compare complete/recent weeks where both Exercise and BP were recorded.
        const exerciseWeeks = new Map<string, number>();
        for (const [day, minutes] of dayTotals.entries()) {
          const week = mondayKey(day);
          if (!week) continue;
          exerciseWeeks.set(week, (exerciseWeeks.get(week) ?? 0) + minutes);
        }

        const bpWeeks = new Map<string, number[]>();
        for (const [day, value] of dailyAverage.entries()) {
          const week = mondayKey(day);
          if (!week) continue;
          const values = bpWeeks.get(week) ?? [];
          values.push(value);
          bpWeeks.set(week, values);
        }

        const reachedGoalWeeks: number[] = [];
        const belowGoalWeeks: number[] = [];

        if (numericExerciseTarget != null && exerciseFrequency === "WEEKLY") {
          for (const [week, minutes] of exerciseWeeks.entries()) {
            const bpWeekAverage = average(bpWeeks.get(week) ?? []);
            if (bpWeekAverage == null) continue;
            if (minutes >= numericExerciseTarget) reachedGoalWeeks.push(bpWeekAverage);
            else belowGoalWeeks.push(bpWeekAverage);
          }
        }

        const enoughComparisonData =
          reachedGoalWeeks.length >= 2 &&
          belowGoalWeeks.length >= 2;

        const reachedAverage = round(average(reachedGoalWeeks));
        const belowAverage = round(average(belowGoalWeeks));
        const exerciseDifference =
          reachedAverage != null && belowAverage != null
            ? reachedAverage - belowAverage
            : null;

        let titleText = "";
        let bodyText = "";
        let tone: "info" | "warning" = "info";
        let pattern: InsightState["pattern"] = "BUILDING";

        if (incompleteChallengeData) {
          const latestValue = latestBp;
          const distance = latestValue != null && target != null ? latestValue - target : null;
          const recordedLabel = recordedDays === 1 ? "1 recorded blood-pressure day" : recordedDays + " recorded blood-pressure days";

          titleText = recordedDays === 0
            ? "More blood-pressure data is needed"
            : recordedDays === 1
              ? "Your first blood-pressure reading is recorded"
              : "Keep building your blood-pressure pattern";

          bodyText = recordedDays === 0
            ? "Sympto does not have enough blood-pressure readings inside this goal yet to describe a trend."
            : "You have " +
              recordedLabel +
              " in this goal. " +
              (latestValue != null
                ? "Your latest systolic reading is " + latestValue + " mmHg" +
                  (target != null
                    ? distance != null && distance > 0
                      ? ", which is " + distance + " mmHg above your " + target + " mmHg target."
                      : distance != null && distance < 0
                        ? ", which is " + Math.abs(distance) + " mmHg below your " + target + " mmHg target."
                        : ", exactly at your " + target + " mmHg target."
                    : ".")
                : "") +
              " Sympto will wait for more recorded challenge days before showing a blood-pressure trend.";

          pattern = "BUILDING";
          tone = distance != null && distance > 0 ? "warning" : "info";
        } else if (numericExerciseTarget != null && exerciseFrequency === "WEEKLY") {
          const total = exerciseTotal ?? 0;
          const remaining = Math.max(0, numericExerciseTarget - total);

          if (enoughComparisonData && exerciseDifference != null && Math.abs(exerciseDifference) >= 5) {
            pattern = exerciseDifference < 0 ? "LOWER" : "HIGHER";
            titleText = exerciseDifference < 0
              ? title + " and blood pressure show a lower-reading pattern"
              : title + " and blood pressure show a higher-reading pattern";
            bodyText =
              "In your recorded weeks, reaching your " +
              numericExerciseTarget +
              "-minute " +
              title +
              " goal was associated with an average systolic reading of " +
              reachedAverage +
              " mmHg, compared with " +
              belowAverage +
              " mmHg in weeks where the goal was not reached.";
          } else {
            titleText = title + " is part of your blood-pressure picture";
            bodyText =
              "This week you have logged " +
              total +
              " of " +
              numericExerciseTarget +
              " minutes toward your " +
              title +
              " goal. Sympto is comparing your weekly activity with your blood-pressure readings as more matching weeks build up.";
            pattern = "BUILDING";
          }

          tone = bpAverage != null && target != null && bpAverage > target ? "warning" : "info";
        } else {
          titleText = target != null && bpAverage != null && bpAverage > target
            ? "Your recent readings are above your target"
            : "Your recent blood-pressure pattern";
          bodyText = bpAverage != null && target != null
            ? "Your recent average is " +
              bpAverage +
              " mmHg against your " +
              target +
              " mmHg target."
            : bpAverage != null
              ? "Your recent average systolic reading is " + bpAverage + " mmHg."
              : "Keep recording blood-pressure readings so Sympto can build your personal pattern.";
          tone = target != null && bpAverage != null && bpAverage > target ? "warning" : "info";
        }

        const evidence: string[] = [];
        if (recordedDays === 1 && latestBp != null) {
          evidence.push("1 recorded BP day");
          evidence.push("Latest " + latestBp + " mmHg");
          if (target != null) {
            const distance = latestBp - target;
            evidence.push(
              distance > 0
                ? distance + " mmHg above target"
                : distance < 0
                  ? Math.abs(distance) + " mmHg below target"
                  : "At target",
            );
          }
        } else if (bpAverage != null) {
          evidence.push("Recent BP " + bpAverage + " mmHg");
          if (target != null) {
            const distance = bpAverage - target;
            evidence.push(
              distance > 0
                ? distance + " mmHg above target"
                : distance < 0
                  ? Math.abs(distance) + " mmHg below target"
                  : "At target",
            );
          }
          if (latestBp != null) evidence.push("Latest " + latestBp + " mmHg");
        }

        if (numericExerciseTarget != null && exerciseFrequency === "WEEKLY") {
          evidence.push((exerciseTotal ?? 0) + "/" + numericExerciseTarget + " min this week");
          if (enoughComparisonData && reachedAverage != null && belowAverage != null) {
            evidence.push(
              "Goal weeks " +
              reachedAverage +
              " vs " +
              belowAverage +
              " mmHg",
            );
          }
        }

        if (bpChange != null && Math.abs(bpChange) >= 5 && earlierAverage != null && bpAverage != null) {
          evidence.push("Earlier " + earlierAverage + " mmHg · Recent " + bpAverage + " mmHg");
        }

        if (numericExerciseTarget != null && exerciseFrequency === "WEEKLY" && enoughComparisonData) {
          bodyText +=
            exerciseDifference != null && Math.abs(exerciseDifference) >= 5
              ? " This is an association in your records, not proof that exercise caused the difference."
              : "";
        }

        setState({
          loading: false,
          title: titleText,
          body: bodyText,
          tone,
          evidence,
          bpAverage,
          latestBp,
          exerciseTotal,
          exerciseTarget: numericExerciseTarget,
          exerciseLabel: title,
          pattern,
        });
      } catch {
        if (!active) return;
        setState({
          loading: false,
          title: "Keep building your personal pattern",
          body: "Record both blood pressure and exercise in Sympto. Once those records overlap, Sympto can compare them instead of giving you a generic trend.",
          tone: "info",
          evidence: [],
          bpAverage: null,
          latestBp: null,
          exerciseTotal: null,
          exerciseTarget: numberOrNull(exerciseGoalTarget),
          exerciseLabel: String(exerciseGoalTitle || "Exercise"),
          pattern: "BUILDING",
        });
      }
    }

    void load();

    const handleRefresh = () => { void load(); };
    window.addEventListener("sympto:today-action-updated", handleRefresh);
    window.addEventListener("sympto:health-checkin-updated", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("sympto:today-action-updated", handleRefresh);
      window.removeEventListener("sympto:health-checkin-updated", handleRefresh);
    };
  }, [target, exerciseGoalTarget, exerciseGoalTitle, exerciseGoalFrequency, challengeStartAt, bloodPressureEvents]);

  const warning = state.tone === "warning";
  const trendIcon = state.pattern === "LOWER"
    ? TrendingDown
    : state.pattern === "HIGHER"
      ? TrendingUp
      : state.pattern === "BUILDING"
        ? Dumbbell
        : Sparkles;
  const TrendIcon = trendIcon;

  return (
    <section className="mt-3 rounded-[22px] border border-[#dcebed] bg-[#f8fbfc] p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#e8f8f7] text-[#0b7b80]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Sympto Insights</p>
          <p className="mt-0.5 text-[9px] font-semibold text-[#7d8f9c]">
            How your blood pressure connects with your {state.exerciseLabel}
          </p>
        </div>
      </div>

      {state.loading ? (
        <div className="mt-4 rounded-[18px] border border-[#e1ecef] bg-white p-4" aria-busy="true">
          <div className="h-3 w-40 animate-pulse rounded bg-[#eef3f5]" />
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-[#f4f8f9]" />
          <div className="mt-3 h-14 w-full animate-pulse rounded-[14px] bg-[#f4f8f9]" />
        </div>
      ) : (
        <article
          className={
            warning
              ? "mt-4 rounded-[19px] border border-red-100 bg-red-50/65 p-4 sm:p-5"
              : "mt-4 rounded-[19px] border border-[#dfeaec] bg-white p-4 sm:p-5"
          }
        >
          <div className="flex items-start gap-3">
            <span
              className={
                warning
                  ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-red-100 text-red-700"
                  : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-[#e8f8f7] text-[#0b7b80]"
              }
            >
              {warning ? <AlertTriangle className="h-3.5 w-3.5" /> : <TrendIcon className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={warning ? "text-[11px] font-black tracking-[-.01em] text-red-950" : "text-[11px] font-black tracking-[-.01em] text-[#0b2d54]"}>
                {state.title}
              </p>
              <p className={warning ? "mt-1 text-[10px] leading-5 text-red-900/80" : "mt-1 text-[10px] leading-5 text-[#637986]"}>
                {state.body}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[15px] bg-[#f7fbfb] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#8b9aa4]">Blood pressure</p>
              <p className="mt-1 text-base font-black text-[#0b2d54]">
                {state.latestBp == null ? "—" : state.latestBp + " mmHg"}
              </p>
              <p className="mt-0.5 text-[8px] font-semibold text-[#8b9aa4]">
                {state.bpAverage == null
                  ? (state.latestBp == null ? "No reading yet" : (state.pattern === "BUILDING" ? "Latest recorded reading" : "Latest reading"))
                  : "Recent daily average"}
              </p>
            </div>
            <div className="rounded-[15px] bg-[#f7fbfb] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#0b7b80]">{state.exerciseLabel}</p>
              <p className="mt-1 text-base font-black text-[#0b2d54]">
                {state.exerciseTotal == null || state.exerciseTarget == null
                  ? "—"
                  : state.exerciseTotal + " / " + state.exerciseTarget + " min"}
              </p>
              <p className="mt-0.5 text-[8px] font-semibold text-[#8b9aa4]">
                This week
              </p>
            </div>
          </div>

          {state.evidence.length > 0 && (
            <div className="mt-3 rounded-[14px] bg-[#f7fbfb] px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#8b9aa4]">What Sympto is seeing</p>
              <p className="mt-1 text-[9px] font-bold leading-4 text-[#0b2d54]">
                {state.evidence.join(" · ")}
              </p>
            </div>
          )}
        </article>
      )}

      <p className="mt-3 text-[8px] leading-4 text-[#97a5ae]">
        Sympto compares the health data you record. A pattern does not prove that one factor caused another.
      </p>
    </section>
  );
}
