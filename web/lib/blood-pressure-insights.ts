export type BloodPressureMetricEvent = {
  loggedValue: number | string | null | undefined;
  occurredAt: string;
  source?: string | null;
};

export type BloodPressureJournal = {
  createdAt?: string | null;
  updatedAt?: string | null;
  title?: string | null;
  stressLevel?: number | string | null;
  sleepHours?: number | string | null;
};

export type BloodPressureSymptom = {
  startedAt?: string | null;
  createdAt?: string | null;
  overallSeverity?: string | null;
  severity?: string | null;
  title?: string | null;
  status?: string | null;
};

export type BloodPressureInsight = {
  kind: "trend" | "time" | "exercise" | "stress" | "sleep" | "symptom" | "data";
  tone: "info" | "warning";
  title: string;
  body: string;
  evidence?: string;
};

const TIME_ZONE = "Africa/Johannesburg";
const DAY_MS = 86_400_000;

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function localParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    key: map.year + "-" + map.month + "-" + map.day,
    hour: Number(map.hour),
  };
}

function dayKey(value: string | Date) {
  return localParts(value)?.key ?? "";
}

function dateFromDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function shiftDayKey(key: string, offset: number) {
  const date = dateFromDayKey(key);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + offset);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function weekStartKey(key: string) {
  const date = dateFromDayKey(key);
  if (!date) return "";
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function recentDayKeySet(days: number, now = new Date()) {
  const today = dayKey(now);
  const result: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    result.push(shiftDayKey(today, -offset));
  }
  return result;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number | null, digits = 0) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function groupDaily(values: Array<{ day: string; value: number }>) {
  const map = new Map<string, number[]>();
  for (const item of values) {
    if (!item.day || !Number.isFinite(item.value)) continue;
    const list = map.get(item.day) ?? [];
    list.push(item.value);
    map.set(item.day, list);
  }
  return new Map([...map.entries()].map(([day, items]) => [day, mean(items) ?? 0] as const));
}

function sumDaily(values: Array<{ day: string; value: number }>) {
  const map = new Map<string, number>();
  for (const item of values) {
    if (!item.day || !Number.isFinite(item.value)) continue;
    map.set(item.day, (map.get(item.day) ?? 0) + item.value);
  }
  return map;
}

function canonicalExerciseDayTotals(values: Array<{ day: string; value: number; source?: string | null; occurredAt: string }>) {
  const byDay = new Map<string, Array<{ value: number; source?: string | null; occurredAt: string }>>();

  for (const item of values) {
    if (!item.day || !Number.isFinite(item.value)) continue;
    const list = byDay.get(item.day) ?? [];
    list.push({
      value: item.value,
      source: item.source,
      occurredAt: item.occurredAt,
    });
    byDay.set(item.day, list);
  }

  return new Map(
    [...byDay.entries()].map(([day, dayEvents]) => {
      const wearableTotal = dayEvents
        .filter((event) => String(event.source ?? "").toLowerCase().startsWith("wearable"))
        .reduce((sum, event) => sum + event.value, 0);

      const manualEvents = dayEvents
        .filter((event) => !String(event.source ?? "").toLowerCase().startsWith("wearable"))
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

      const manualTotal = manualEvents.length ? manualEvents[manualEvents.length - 1].value : 0;

      return [day, Math.max(wearableTotal, manualTotal)] as const;
    }),
  );
}

function severityScore(value: unknown) {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "MILD") return 1;
  if (normalized === "MODERATE") return 2;
  if (normalized === "SEVERE") return 3;
  if (normalized === "VERY_SEVERE") return 4;
  if (normalized === "NONE") return 0;
  return 0;
}

function withinLookback(value: string | Date, days: number, now: Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= now.getTime() - days * DAY_MS && date.getTime() <= now.getTime() + DAY_MS;
}

function compareGroups(high: number[], low: number[]) {
  const highAverage = mean(high);
  const lowAverage = mean(low);
  if (highAverage == null || lowAverage == null || high.length < 3 || low.length < 3) return null;
  return {
    highAverage,
    lowAverage,
    difference: highAverage - lowAverage,
  };
}

export function buildBloodPressureInsights({
  bloodPressureEvents,
  exerciseEvents = [],
  journals = [],
  symptoms = [],
  target = null,
  exerciseGoalTarget = null,
  exerciseGoalTitle = "Exercise",
  exerciseGoalFrequency = "DAILY",
  challengeStartAt = null,
  now = new Date(),
}: {
  bloodPressureEvents: BloodPressureMetricEvent[];
  exerciseEvents?: BloodPressureMetricEvent[];
  journals?: BloodPressureJournal[];
  symptoms?: BloodPressureSymptom[];
  target?: number | null;
  exerciseGoalTarget?: number | null;
  exerciseGoalTitle?: string | null;
  exerciseGoalFrequency?: string | null;
  challengeStartAt?: string | Date | null;
  now?: Date;
}): BloodPressureInsight[] {
  const challengeStartMs =
    challengeStartAt == null
      ? null
      : new Date(challengeStartAt).getTime();

  const bp = bloodPressureEvents
    .map((event) => {
      const value = finite(event.loggedValue);
      const parts = localParts(event.occurredAt);
      const occurredAtMs = new Date(event.occurredAt).getTime();
      const insideChallenge =
        challengeStartMs == null ||
        (Number.isFinite(occurredAtMs) && occurredAtMs >= challengeStartMs);

      return value != null && parts && insideChallenge
        ? { value, day: parts.key, hour: parts.hour, occurredAt: event.occurredAt }
        : null;
    })
    .filter((item): item is { value: number; day: string; hour: number; occurredAt: string } => Boolean(item))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const days7 = recentDayKeySet(7, now);
  const dailyAll = groupDaily(bp.map((item) => ({ day: item.day, value: item.value })));
  const dailySevenDay = groupDaily(
    bp.filter((item) => days7.includes(item.day)).map((item) => ({ day: item.day, value: item.value })),
  );
  const days30 = recentDayKeySet(30, now);
  const dailyThirtyDay = groupDaily(
    bp.filter((item) => days30.includes(item.day)).map((item) => ({ day: item.day, value: item.value })),
  );
  const insights: BloodPressureInsight[] = [];

  const ordered7 = days7.filter((day) => dailySevenDay.has(day));
  const ordered30 = days30.filter((day) => dailyThirtyDay.has(day));
  let trendWindowLabel = "historical";
  let trendDays = [...dailyAll.keys()].sort();
  let trendDaily = dailyAll;
  if (ordered7.length >= 5) {
    trendWindowLabel = "7-day";
    trendDays = ordered7;
    trendDaily = dailySevenDay;
  } else if (ordered30.length >= 5) {
    trendWindowLabel = "30-day";
    trendDays = ordered30;
    trendDaily = dailyThirtyDay;
  }

  if (trendDaily.size >= 3) {
    const dailyValues = trendDays
      .map((day) => trendDaily.get(day))
      .filter((value): value is number => value != null && Number.isFinite(value));

    const recordedDays = dailyValues.length;
    const averageSystolic = mean(dailyValues) ?? 0;
    const overallAverage = round(averageSystolic) ?? 0;

    const midpoint = Math.floor(trendDays.length / 2);
    const earlyValues = trendDays
      .slice(0, midpoint)
      .map((day) => trendDaily.get(day))
      .filter((value): value is number => value != null && Number.isFinite(value));
    const recentValues = trendDays
      .slice(midpoint)
      .map((day) => trendDaily.get(day))
      .filter((value): value is number => value != null && Number.isFinite(value));

    const earlyAverage = mean(earlyValues);
    const recentAverage = mean(recentValues);
    const change = earlyAverage != null && recentAverage != null
      ? recentAverage - earlyAverage
      : null;

    const latestDay = trendDays.at(-1);
    const latestReading = latestDay ? trendDaily.get(latestDay) ?? null : null;

    const targetValue = target != null ? round(target) : null;
    const recentRounded = round(recentAverage);
    const earlyRounded = round(earlyAverage);
    const latestRounded = round(latestReading);

    const recentAboveTarget =
      targetValue != null &&
      recentRounded != null &&
      recentRounded > targetValue;

    const recentAtOrBelowTarget =
      targetValue != null &&
      recentRounded != null &&
      recentRounded <= targetValue;

    const meaningfulChange =
      change != null &&
      Math.abs(change) >= 5 &&
      earlyValues.length >= 2 &&
      recentValues.length >= 2;

    if (targetValue != null && recentRounded != null) {
      if (recentAboveTarget) {
        const distance = recentRounded - targetValue;
        insights.push({
          kind: "trend",
          tone: "warning",
          title: "Your readings are above your target",
          body:
            "Your recent average is " +
            recentRounded +
            " mmHg, which is " +
            distance +
            " mmHg above your " +
            targetValue +
            " mmHg target.",
          evidence:
            "Recent average " +
            recentRounded +
            " mmHg · Target " +
            targetValue +
            " mmHg" +
            (latestRounded != null ? " · Latest " + latestRounded + " mmHg" : ""),
        });
      } else if (recentAtOrBelowTarget) {
        const margin = targetValue - recentRounded;
        insights.push({
          kind: "trend",
          tone: "info",
          title: "Your readings are within your target",
          body:
            "Your recent average is " +
            recentRounded +
            " mmHg, which is " +
            margin +
            " mmHg below your " +
            targetValue +
            " mmHg target.",
          evidence:
            "Recent average " +
            recentRounded +
            " mmHg · Target " +
            targetValue +
            " mmHg" +
            (latestRounded != null ? " · Latest " + latestRounded + " mmHg" : ""),
        });
      }
    } else if (recentRounded != null) {
      insights.push({
        kind: "trend",
        tone: "info",
        title: "Your recent readings",
        body:
          "Your recent average systolic reading is " +
          recentRounded +
          " mmHg across " +
          recordedDays +
          " recorded days.",
        evidence: latestRounded != null ? "Latest " + latestRounded + " mmHg" : undefined,
      });
    }

    if (meaningfulChange && change != null && recentRounded != null && earlyRounded != null) {
      const absoluteChange = Math.abs(round(change) ?? 0);
      const direction = change > 0 ? "higher" : "lower";
      insights.push({
        kind: "trend",
        tone: change > 0 ? "warning" : "info",
        title: change > 0 ? "Your readings have been higher lately" : "Your readings have been lower lately",
        body:
          "Your recent average is " +
          absoluteChange +
          " mmHg " +
          direction +
          " than your earlier average.",
        evidence:
          "Earlier " +
          earlyRounded +
          " mmHg · Recent " +
          recentRounded +
          " mmHg",
      });
    }
  } else {
    const historicalDays = dailyAll.size;
    insights.push({
      kind: "data",
      tone: "info",
      title: historicalDays === 0 ? "Start tracking your blood pressure" : "Add a few more readings",
      body:
        historicalDays === 0
          ? "Record your blood pressure in Health Vitals and Sympto will start showing your personal patterns here."
          : "You have " +
            historicalDays +
            " recorded day" +
            (historicalDays === 1 ? "" : "s") +
            " so far. A few more readings will make the pattern easier to understand.",
      evidence: historicalDays === 0 ? undefined : historicalDays + " day" + (historicalDays === 1 ? "" : "s") + " recorded",
    });
  }

  const morning = bp.filter((item) => item.hour >= 5 && item.hour < 12).map((item) => item.value);
  const evening = bp.filter((item) => item.hour >= 18 && item.hour < 24).map((item) => item.value);
  if (morning.length >= 3 && evening.length >= 3) {
    const morningAverage = mean(morning) ?? 0;
    const eveningAverage = mean(evening) ?? 0;
    const difference = morningAverage - eveningAverage;
    if (Math.abs(difference) >= 5) {
      insights.push({
        kind: "time",
        tone: "info",
        title: difference > 0 ? "Your morning readings tend to be higher" : "Your evening readings tend to be higher",
        body:
          difference > 0
            ? "Your recorded morning systolic readings have been higher than your evening readings during this period. Keep measuring at similar times so the pattern remains comparable."
            : "Your recorded evening systolic readings have been higher than your morning readings during this period. Keep measuring at similar times so the pattern remains comparable.",
        evidence: "Morning average " + (round(morningAverage) ?? 0) + " mmHg · evening average " + (round(eveningAverage) ?? 0) + " mmHg.",
      });
    }
  }

  const exerciseByDay = canonicalExerciseDayTotals(
    exerciseEvents
      .map((event) => {
        const value = finite(event.loggedValue);
        const parts = localParts(event.occurredAt);
        return value != null && parts
          ? {
              day: parts.key,
              value,
              source: event.source,
              occurredAt: event.occurredAt,
            }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          day: string;
          value: number;
          source: string | null | undefined;
          occurredAt: string;
        } => Boolean(item),
      ),
  );

  const allDailyBp = groupDaily(bp.map((item) => ({ day: item.day, value: item.value })));
  const exerciseGoalFrequencyNormalized = String(exerciseGoalFrequency ?? "DAILY").toUpperCase();
  const todayKey = dayKey(now);

  const numericExerciseGoalTarget = exerciseGoalTarget == null ? null : Number(exerciseGoalTarget);
  if (numericExerciseGoalTarget != null && Number.isFinite(numericExerciseGoalTarget)) {
    const goalTarget = Math.max(0, round(numericExerciseGoalTarget) ?? numericExerciseGoalTarget);
    const exerciseGoalTitleSafe = String(exerciseGoalTitle || "Exercise goal");

    if (exerciseGoalFrequencyNormalized === "WEEKLY") {
      const exerciseByWeek = new Map<string, number>();
      for (const [day, minutes] of exerciseByDay.entries()) {
        if (!withinLookback(day + "T12:00:00Z", 30, now)) continue;
        const week = weekStartKey(day);
        exerciseByWeek.set(week, (exerciseByWeek.get(week) ?? 0) + minutes);
      }

      const thisWeek = weekStartKey(todayKey);
      const thisWeekMinutes = exerciseByWeek.get(thisWeek) ?? 0;
      const thisWeekRounded = round(thisWeekMinutes) ?? 0;
      const remaining = Math.max(0, goalTarget - thisWeekRounded);

      const bpByWeek = new Map<string, number[]>();
      for (const [day, bpValue] of allDailyBp.entries()) {
        const week = weekStartKey(day);
        const list = bpByWeek.get(week) ?? [];
        list.push(bpValue);
        bpByWeek.set(week, list);
      }

      const reachedGoalWeeks: number[] = [];
      const otherWeeks: number[] = [];

      for (const [week, minutes] of exerciseByWeek.entries()) {
        const weeklyBp = mean(bpByWeek.get(week) ?? []);
        if (weeklyBp == null) continue;
        if (minutes >= goalTarget) reachedGoalWeeks.push(weeklyBp);
        else otherWeeks.push(weeklyBp);
      }

      if (reachedGoalWeeks.length >= 3 && otherWeeks.length >= 3) {
        const comparison = compareGroups(reachedGoalWeeks, otherWeeks);
        if (comparison && Math.abs(comparison.difference) >= 5) {
          const direction = comparison.difference < 0 ? "lower" : "higher";
          insights.unshift({
            kind: "exercise",
            tone: "info",
            title: exerciseGoalTitleSafe + " and your blood pressure show a pattern",
            body:
              "In your recorded data, weeks when you reached your " +
              goalTarget +
              "-minute Exercise goal had an average systolic reading of " +
              (round(comparison.highAverage) ?? 0) +
              " mmHg. Weeks when you did not reach the goal averaged " +
              (round(comparison.lowAverage) ?? 0) +
              " mmHg. The readings were " +
              direction +
              " during the goal weeks; this is an observed pattern, not proof that exercise caused the difference.",
            evidence:
              "Goal weeks " +
              (round(comparison.highAverage) ?? 0) +
              " mmHg · Other weeks " +
              (round(comparison.lowAverage) ?? 0) +
              " mmHg · " +
              reachedGoalWeeks.length +
              " vs " +
              otherWeeks.length +
              " weeks.",
          });
        }
      } else {
        insights.unshift({
          kind: "exercise",
          tone: "info",
          title: exerciseGoalTitleSafe + " is connected to your blood-pressure pattern",
          body:
            "This week you have logged " +
            thisWeekRounded +
            " of " +
            goalTarget +
            " minutes toward your " +
            exerciseGoalTitleSafe +
            " target. Sympto will compare these exercise records with your blood-pressure readings as more weeks are recorded.",
          evidence:
            remaining > 0
              ? remaining + " minutes remaining this week."
              : "Weekly Exercise goal reached.",
        });
      }
    }
  }

  const journalByDay = new Map<string, BloodPressureJournal>();
  for (const journal of journals) {
    const date = journal.updatedAt ?? journal.createdAt;
    if (!date || !withinLookback(date, 30, now)) continue;
    const day = dayKey(date);
    if (!day) continue;
    const current = journalByDay.get(day);
    if (!current || new Date(date).getTime() > new Date(current.updatedAt ?? current.createdAt ?? 0).getTime()) {
      journalByDay.set(day, journal);
    }
  }

  const stressPairs: Array<{ stress: number; bp: number }> = [];
  const sleepPairs: Array<{ sleep: number; nextDayBp: number }> = [];
  const fullBpByDay = groupDaily(bp.map((item) => ({ day: item.day, value: item.value })));

  for (const [journalDay, journal] of journalByDay.entries()) {
    const stress = finite(journal.stressLevel);
    const sleep = finite(journal.sleepHours);
    const bpSameDay = fullBpByDay.get(journalDay);
    if (stress != null && bpSameDay != null) stressPairs.push({ stress, bp: bpSameDay });
    if (sleep != null) {
      const nextDayBp = fullBpByDay.get(shiftDayKey(journalDay, 1));
      if (nextDayBp != null) sleepPairs.push({ sleep, nextDayBp });
    }
  }

  if (stressPairs.length >= 7) {
    const medianStress = median(stressPairs.map((pair) => pair.stress)) ?? 5;
    const highStress = stressPairs.filter((pair) => pair.stress > medianStress).map((pair) => pair.bp);
    const lowerStress = stressPairs.filter((pair) => pair.stress <= medianStress).map((pair) => pair.bp);
    const comparison = compareGroups(highStress, lowerStress);
    if (comparison && comparison.difference >= 5) {
      insights.push({
        kind: "stress",
        tone: "info",
        title: "Stress and your readings",
        body: "Your higher-stress days have tended to coincide with higher systolic readings in your recent records. This is an observed association, not proof that stress caused the change.",
        evidence: "Higher-stress days averaged " + (round(comparison.highAverage) ?? 0) + " mmHg versus " + (round(comparison.lowAverage) ?? 0) + " mmHg on lower-stress days.",
      });
    }
  }

  if (sleepPairs.length >= 7) {
    const medianSleep = median(sleepPairs.map((pair) => pair.sleep)) ?? 7;
    const shorterSleep = sleepPairs.filter((pair) => pair.sleep < medianSleep).map((pair) => pair.nextDayBp);
    const longerSleep = sleepPairs.filter((pair) => pair.sleep >= medianSleep).map((pair) => pair.nextDayBp);
    const comparison = compareGroups(shorterSleep, longerSleep);
    if (comparison && comparison.difference >= 5) {
      insights.push({
        kind: "sleep",
        tone: "info",
        title: "Sleep and your next-day readings",
        body: "Your next-day systolic readings have tended to be higher after shorter recorded sleep. Keep tracking both so you can see whether the pattern continues.",
        evidence: "After shorter sleep: " + (round(comparison.highAverage) ?? 0) + " mmHg · after longer sleep: " + (round(comparison.lowAverage) ?? 0) + " mmHg.",
      });
    }
  }

  const symptomByDay = new Map<string, number>();
  for (const symptom of symptoms) {
    const date = symptom.startedAt ?? symptom.createdAt;
    if (!date || !withinLookback(date, 14, now)) continue;
    const day = dayKey(date);
    const score = severityScore(symptom.overallSeverity ?? symptom.severity);
    if (!day || score <= 0) continue;
    symptomByDay.set(day, Math.max(symptomByDay.get(day) ?? 0, score));
  }

  const symptomHigh: number[] = [];
  const symptomLow: number[] = [];
  for (const [day, bpValue] of fullBpByDay.entries()) {
    if (!withinLookback(day + "T12:00:00Z", 14, now)) continue;
    const score = symptomByDay.get(day) ?? 0;
    if (score >= 2) symptomHigh.push(bpValue);
    else if (score === 0) symptomLow.push(bpValue);
  }
  const symptomComparison = compareGroups(symptomHigh, symptomLow);
  if (symptomComparison && symptomComparison.difference >= 5) {
    insights.push({
      kind: "symptom",
      tone: "info",
      title: "Symptoms and blood pressure entries occurred together",
      body: "On days when you recorded more noticeable symptoms, your systolic readings tended to be higher. Sympto cannot determine whether one caused the other, but keeping both records can help you review the pattern with a healthcare professional.",
      evidence: "Symptom days averaged " + (round(symptomComparison.highAverage) ?? 0) + " mmHg versus " + (round(symptomComparison.lowAverage) ?? 0) + " mmHg on days without a recorded symptom.",
    });
  }

  const unique = new Map<string, BloodPressureInsight>();
  for (const insight of insights) {
    const key = insight.kind + "::" + insight.title;
    if (!unique.has(key)) unique.set(key, insight);
  }
  const priority: Record<BloodPressureInsight["kind"], number> = {
    exercise: 0,
    trend: 1,
    time: 2,
    stress: 3,
    sleep: 4,
    symptom: 5,
    data: 6,
  };
  return [...unique.values()]
    .sort((a, b) => (priority[a.kind] ?? 99) - (priority[b.kind] ?? 99))
    .slice(0, 5);
}
