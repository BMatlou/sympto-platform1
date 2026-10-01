"use client";

export type MedicationIntelligenceEvent = {
  loggedValue: number;
  occurredAt: string;
};

export type MedicationIntelligenceCheckIn = {
  day: string;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  exerciseMinutes: number | null;
};

export type MedicationIntelligenceNutritionEvent = {
  loggedValue: number;
  occurredAt: string;
};

export type MedicationIntelligenceInsight = {
  title: string;
  text: string;
};

type MedicationDay = {
  day: string;
  scheduled: number;
  taken: number;
  recordedActions: number;
  skippedActions: number;
  unrecorded: number;
  adherence: number;
};

type ActionRecord = {
  day: string;
  hour: number;
  taken: boolean;
  skipped: boolean;
};

function dayKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateFromDayKey(day: string) {
  return new Date(`${day}T12:00:00Z`);
}

function nextDay(day: string) {
  const date = dateFromDayKey(day);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatWhole(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function adherenceFor(days: MedicationDay[]) {
  const scheduled = days.reduce((sum, day) => sum + day.scheduled, 0);
  const taken = days.reduce((sum, day) => sum + Math.min(day.taken, day.scheduled), 0);
  return {
    scheduled,
    taken,
    percentage: scheduled > 0 ? (taken / scheduled) * 100 : 0,
  };
}

function reconstructActions(events: MedicationIntelligenceEvent[]) {
  const sorted = [...events]
    .filter((event) => Number.isFinite(Number(event.loggedValue)))
    .sort(
      (a, b) =>
        new Date(String(a.occurredAt)).getTime() -
        new Date(String(b.occurredAt)).getTime(),
    );

  let cumulativeTaken = 0;
  const actions: ActionRecord[] = [];

  sorted.forEach((event, index) => {
    const totalActions = index + 1;
    const adherence = Number(event.loggedValue);
    const inferredTaken = Math.max(
      0,
      Math.min(
        totalActions,
        Math.round((totalActions * adherence) / 100),
      ),
    );

    const takenDelta = Math.max(0, inferredTaken - cumulativeTaken);
    cumulativeTaken = Math.max(cumulativeTaken, inferredTaken);

    const at = new Date(String(event.occurredAt));
    if (Number.isNaN(at.getTime())) return;

    actions.push({
      day: dayKey(at),
      hour: Number(
        new Intl.DateTimeFormat("en-ZA", {
          timeZone: "Africa/Johannesburg",
          hour: "2-digit",
          hour12: false,
        }).format(at),
      ),
      taken: takenDelta > 0,
      skipped: takenDelta === 0,
    });
  });

  return actions;
}

function buildTimeline(
  events: MedicationIntelligenceEvent[],
  goalStartAt: string,
  scheduledDosesPerDay: number,
) {
  const startDay = dayKey(goalStartAt) || dayKey(new Date());
  const today = dayKey(new Date());
  const actionRecords = reconstructActions(events);
  const byDay = new Map<string, { taken: number; actions: number; skipped: number }>();

  for (const action of actionRecords) {
    if (!action.day) continue;
    const current = byDay.get(action.day) ?? { taken: 0, actions: 0, skipped: 0 };
    current.actions += 1;
    current.taken += action.taken ? 1 : 0;
    current.skipped += action.skipped ? 1 : 0;
    byDay.set(action.day, current);
  }

  const timeline: MedicationDay[] = [];
  let cursor = startDay;
  const safeScheduled = Math.max(1, Math.floor(scheduledDosesPerDay || 1));

  for (let guard = 0; cursor && guard < 370 && cursor <= today; guard += 1) {
    const current = byDay.get(cursor) ?? { taken: 0, actions: 0, skipped: 0 };
    const taken = Math.min(safeScheduled, current.taken);
    const recordedActions = Math.min(safeScheduled, current.actions);
    const unrecorded = Math.max(0, safeScheduled - recordedActions);

    timeline.push({
      day: cursor,
      scheduled: safeScheduled,
      taken,
      recordedActions,
      skippedActions: Math.min(safeScheduled, current.skipped),
      unrecorded,
      adherence: (taken / safeScheduled) * 100,
    });

    if (cursor === today) break;
    cursor = nextDay(cursor);
  }

  return { timeline, actionRecords };
}

function weekdayName(day: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
  }).format(dateFromDayKey(day));
}

function timeBand(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function addTrendInsight(
  insights: MedicationIntelligenceInsight[],
  completedDays: MedicationDay[],
) {
  if (completedDays.length < 4) return;

  const windowSize = Math.min(7, Math.floor(completedDays.length / 2));
  if (windowSize < 2) return;

  const baseline = completedDays.slice(-(windowSize * 2), -windowSize);
  const recent = completedDays.slice(-windowSize);
  if (baseline.length !== windowSize || recent.length !== windowSize) return;

  const baselineStats = adherenceFor(baseline);
  const recentStats = adherenceFor(recent);
  if (!baselineStats.scheduled || !recentStats.scheduled) return;

  const delta = recentStats.percentage - baselineStats.percentage;

  if (Math.abs(delta) < 5) {
    insights.push({
      title: "Adherence is holding steady",
      text:
        "Your logged medication adherence was about " +
        formatWhole(baselineStats.percentage) +
        "% in the earlier period and " +
        formatWhole(recentStats.percentage) +
        "% in the latest period.",
    });
    return;
  }

  insights.push({
    title: delta > 0 ? "Medication adherence is improving" : "Medication adherence is drifting down",
    text:
      "Your logged medication adherence moved from about " +
      formatWhole(baselineStats.percentage) +
      "% to " +
      formatWhole(recentStats.percentage) +
      "% in the latest period — " +
      (delta > 0 ? "up " : "down ") +
      formatWhole(Math.abs(delta)) +
      " percentage points.",
  });
}

function addTimingPattern(
  insights: MedicationIntelligenceInsight[],
  timeline: MedicationDay[],
  actionRecords: ActionRecord[],
) {
  const skippedActions = actionRecords.filter((action) => action.skipped);

  if (skippedActions.length >= 2) {
    const bandCounts = new Map<string, number>();
    for (const action of skippedActions) {
      const band = timeBand(action.hour);
      bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
    }

    const topBand = [...bandCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topBand && topBand[1] >= 2) {
      insights.push({
        title: "A dose-timing pattern is emerging",
        text:
          "Your logged skipped doses cluster most around the " +
          topBand[0] +
          ", with " +
          topBand[1] +
          " skipped dose action" +
          (topBand[1] === 1 ? "" : "s") +
          " recorded there. This may help you focus reminders around that part of the day.",
      });
      return;
    }
  }

  const weekdayCounts = new Map<string, number>();
  for (const day of timeline) {
    if (day.unrecorded <= 0) continue;
    const name = weekdayName(day.day);
    weekdayCounts.set(name, (weekdayCounts.get(name) ?? 0) + day.unrecorded);
  }

  const topWeekday = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const totalUnrecorded = timeline.reduce((sum, day) => sum + day.unrecorded, 0);

  if (topWeekday && totalUnrecorded >= 3 && topWeekday[1] / totalUnrecorded >= 0.4) {
    insights.push({
      title: "Some scheduled doses are going unrecorded",
      text:
        "Your records show the largest share of unrecorded scheduled doses on " +
        topWeekday[0] +
        ". This is a timing pattern in your records, not a statement about why the doses were missed.",
    });
  }
}

function compareContext(
  days: MedicationDay[],
  predicateA: (day: MedicationDay) => boolean,
  predicateB: (day: MedicationDay) => boolean,
  title: string,
  description: (a: number, b: number, countA: number, countB: number) => string,
  insights: MedicationIntelligenceInsight[],
) {
  const groupA = days.filter(predicateA);
  const groupB = days.filter(predicateB);

  if (groupA.length < 3 || groupB.length < 3) return;

  const a = adherenceFor(groupA).percentage;
  const b = adherenceFor(groupB).percentage;
  const difference = a - b;

  if (Math.abs(difference) < 10) return;

  insights.push({
    title,
    text: description(a, b, groupA.length, groupB.length),
  });
}

export function buildMedicationIntelligence(input: {
  adherenceEvents: MedicationIntelligenceEvent[];
  goalStartAt: string;
  scheduledDosesPerDay: number;
  checkIns: MedicationIntelligenceCheckIn[];
  nutritionEvents: MedicationIntelligenceNutritionEvent[];
}): MedicationIntelligenceInsight[] {
  const insights: MedicationIntelligenceInsight[] = [];

  if (!input.adherenceEvents.length) {
    return [{
      title: "Not enough data yet",
      text:
        "Sympto has no recorded medication dose actions for this goal yet. As doses are recorded, it can build your trend, timing patterns and supporting-data comparisons.",
    }];
  }

  const { timeline, actionRecords } = buildTimeline(
    input.adherenceEvents,
    input.goalStartAt,
    input.scheduledDosesPerDay,
  );

  const today = dayKey(new Date());
  const completedDays = timeline.filter((day) => day.day !== today);
  const checkIns = new Map(input.checkIns.map((item) => [item.day, item]));

  const nutritionDays = new Set(
    input.nutritionEvents
      .map((event) => dayKey(event.occurredAt))
      .filter(Boolean),
  );

  addTrendInsight(insights, completedDays);
  addTimingPattern(insights, timeline, actionRecords);

  const sleepDays = timeline.filter(
    (day) =>
      checkIns.get(day.day)?.sleepHours != null &&
      Number.isFinite(Number(checkIns.get(day.day)?.sleepHours)),
  );
  const hydrationDays = timeline.filter(
    (day) =>
      checkIns.get(day.day)?.waterIntakeMl != null &&
      Number.isFinite(Number(checkIns.get(day.day)?.waterIntakeMl)),
  );
  const activityDays = timeline.filter(
    (day) =>
      checkIns.get(day.day)?.exerciseMinutes != null &&
      Number.isFinite(Number(checkIns.get(day.day)?.exerciseMinutes)),
  );
  const nutritionLoggedDays = timeline.filter((day) => nutritionDays.has(day.day));

  const totalPlanDays = timeline.length;
  const contextParts = [
    ["sleep", sleepDays.length],
    ["hydration", hydrationDays.length],
    ["activity", activityDays.length],
    ["nutrition", nutritionLoggedDays.length],
  ].filter(([, count]) => Number(count) > 0);

  if (totalPlanDays > 0 && contextParts.length > 0) {
    const summary = contextParts
      .map(
        ([label, count]) =>
          String(label) +
          " is recorded on " +
          formatWhole(Number(count)) +
          " of " +
          formatWhole(totalPlanDays) +
          " medication-plan days",
      )
      .join("; ");

    insights.push({
      title: "The big picture",
      text:
        summary +
        ". These records give Sympto additional context for comparing medication adherence over time; they do not by themselves establish that one habit caused another result.",
    });
  }

  compareContext(
    sleepDays,
    (day) => Number(checkIns.get(day.day)?.sleepHours) < 6,
    (day) => Number(checkIns.get(day.day)?.sleepHours) >= 6,
    "Sleep and medication adherence show a pattern",
    (a, b, countA, countB) =>
      "On " +
      formatWhole(countA) +
      " days with less than 6 hours of recorded sleep, your medication adherence averaged about " +
      formatWhole(a) +
      "% versus " +
      formatWhole(b) +
      "% on " +
      formatWhole(countB) +
      " days with 6 or more hours. This is an association in your records, not evidence that sleep caused the difference.",
    insights,
  );

  if (hydrationDays.length >= 6) {
    const values = hydrationDays
      .map((day) => Number(checkIns.get(day.day)?.waterIntakeMl))
      .sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    const median =
      values.length % 2 === 0
        ? (values[middle - 1] + values[middle]) / 2
        : values[middle];

    compareContext(
      hydrationDays,
      (day) => Number(checkIns.get(day.day)?.waterIntakeMl) < median,
      (day) => Number(checkIns.get(day.day)?.waterIntakeMl) >= median,
      "Hydration and medication adherence show a pattern",
      (a, b, countA, countB) =>
        "On " +
        formatWhole(countA) +
        " lower-hydration days, your medication adherence averaged about " +
        formatWhole(a) +
        "% versus " +
        formatWhole(b) +
        "% on " +
        formatWhole(countB) +
        " higher-hydration days. This is an association in your records, not evidence that hydration caused the difference.",
      insights,
    );
  }

  compareContext(
    activityDays,
    (day) => Number(checkIns.get(day.day)?.exerciseMinutes) < 30,
    (day) => Number(checkIns.get(day.day)?.exerciseMinutes) >= 30,
    "Activity and medication adherence show a pattern",
    (a, b, countA, countB) =>
      "On " +
      formatWhole(countA) +
      " days with less than 30 minutes of recorded activity, your medication adherence averaged about " +
      formatWhole(a) +
      "% versus " +
      formatWhole(b) +
      "% on " +
      formatWhole(countB) +
      " days with 30 minutes or more. This is an association in your records, not evidence that activity caused the difference.",
    insights,
  );

  const nutritionLogged = nutritionLoggedDays;
  const nutritionUnlogged = timeline.filter((day) => !nutritionDays.has(day.day));
  compareContext(
    timeline,
    (day) => nutritionDays.has(day.day),
    (day) => !nutritionDays.has(day.day),
    "Nutrition logging and medication adherence can be compared",
    (a, b, countA, countB) =>
      "On " +
      formatWhole(countA) +
      " days with nutrition recorded, your medication adherence averaged about " +
      formatWhole(a) +
      "% versus " +
      formatWhole(b) +
      "% across " +
      formatWhole(countB) +
      " days without a nutrition record. This is a record-completeness comparison, not evidence that food caused the adherence difference.",
    insights,
  );

  const hasContext = contextParts.length > 0;
  if (insights.length === 0 || (insights.length < 2 && !hasContext)) {
    const totalActions = timeline.reduce((sum, day) => sum + day.recordedActions, 0);
    insights.push({
      title: "Your medication timeline is building",
      text:
        "Sympto has " +
        formatWhole(totalActions) +
        " recorded dose action" +
        (totalActions === 1 ? "" : "s") +
        " across " +
        formatWhole(totalPlanDays) +
        " medication-plan day" +
        (totalPlanDays === 1 ? "" : "s") +
        ". More dated records will make the trend and pattern comparisons stronger.",
    });
  }

  return insights.slice(0, 4);
}
