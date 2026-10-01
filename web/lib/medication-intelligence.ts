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

export type MedicationSupportingGoal = {
  category: string;
  title?: string | null;
  targetValue?: number | string | null;
  unit?: string | null;
};

export type MedicationIntelligenceInsight = {
  title: string;
  text: string;
  tone?: "positive" | "action" | "context" | "watch" | "neutral";
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
      title: "Your medication routine is holding steady",
      text:
        "You are at about " +
        formatWhole(recentStats.percentage) +
        "% recently, compared with " +
        formatWhole(baselineStats.percentage) +
        "% earlier in your plan.",
    });
    return;
  }

  insights.push({
    title: delta > 0 ? "Medication adherence is improving" : "Medication adherence needs more consistency",
    text:
      delta > 0
        ? "You moved from about " +
          formatWhole(baselineStats.percentage) +
          "% to " +
          formatWhole(recentStats.percentage) +
          "% recently — up " +
          formatWhole(Math.abs(delta)) +
          "%."
        : "You moved from about " +
          formatWhole(baselineStats.percentage) +
          "% to " +
          formatWhole(recentStats.percentage) +
          "% recently. Keeping the same routine more consistently may help.",
  });
}

function addTimingPattern(
  insights: MedicationIntelligenceInsight[],
  timeline: MedicationDay[],
  actionRecords: ActionRecord[],
) {
  const eveningNotTaken = actionRecords.filter(
    (action) => action.hour >= 21 && action.skipped,
  );

  if (eveningNotTaken.length >= 2) {
    insights.push({
      title: "Your evening routine is the main pattern",
      text:
        "Night-time is where most of your dose entries need attention, with " +
        formatWhole(eveningNotTaken.length) +
        " recorded there. Try linking your evening medicine to supper or brushing your teeth.",
    });
    return;
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
      title: "One day of the week needs more attention",
      text:
        topWeekday[0] +
        " is where your medication routine has been hardest to keep complete. A simple phone reminder on that day may help.",
    });
  }
}

function compareContext(
  days: MedicationDay[],
  predicateA: (day: MedicationDay) => boolean,
  predicateB: (day: MedicationDay) => boolean,
  buildText: (a: number, b: number, countA: number, countB: number) => string,
  title: string,
  insights: MedicationIntelligenceInsight[],
) {
  const groupA = days.filter(predicateA);
  const groupB = days.filter(predicateB);

  if (groupA.length < 2 || groupB.length < 2) return;

  const a = adherenceFor(groupA).percentage;
  const b = adherenceFor(groupB).percentage;

  if (Math.abs(a - b) < 10) return;

  insights.push({
    title,
    text: buildText(a, b, groupA.length, groupB.length),
    tone: "context",
  });
}

function buildCoverage(label: string, recordedDays: number, planDays: number) {
  return label + " " + formatWhole(recordedDays) + " of " + formatWhole(planDays) + " days.";
}

export function buildMedicationIntelligence(input: {
  adherenceEvents: MedicationIntelligenceEvent[];
  goalStartAt: string;
  scheduledDosesPerDay: number;
  checkIns: MedicationIntelligenceCheckIn[];
  nutritionEvents: MedicationIntelligenceNutritionEvent[];
  supportingGoals: MedicationSupportingGoal[];
}): MedicationIntelligenceInsight[] {
  if (!input.adherenceEvents.length) {
    return [{
      title: "Your medication pattern",
      text: "Log a few doses and Sympto will start showing your personal pattern here.",
      tone: "neutral",
    }];
  }

  const { timeline, actionRecords } = buildTimeline(
    input.adherenceEvents,
    input.goalStartAt,
    input.scheduledDosesPerDay,
  );

  const today = dayKey(new Date());
  const days = timeline.filter((day) => day.day !== today);
  const checkIns = new Map(input.checkIns.map((item) => [item.day, item]));

  const nutritionDays = new Set(
    input.nutritionEvents
      .map((event) => dayKey(event.occurredAt))
      .filter(Boolean),
  );

  const insights: MedicationIntelligenceInsight[] = [];

  // Trend
  if (days.length >= 4) {
    const size = Math.min(5, Math.floor(days.length / 2));
    const baseline = days.slice(-(size * 2), -size);
    const recent = days.slice(-size);
    const before = adherenceFor(baseline).percentage;
    const after = adherenceFor(recent).percentage;
    const delta = after - before;

    if (Math.abs(delta) >= 5) {
      insights.push({
        title: delta > 0 ? "Your medicine routine is improving" : "Your medicine routine needs more consistency",
        text:
          "You moved from " +
          formatWhole(before) +
          "% to " +
          formatWhole(after) +
          "% lately — " +
          (delta > 0 ? "up " : "down ") +
          formatWhole(Math.abs(delta)) +
          "%.",
        tone: delta > 0 ? "positive" : "watch",
      });
    }
  }

  // Time-of-day pattern
  const skipped = actionRecords.filter((action) => action.skipped);
  if (skipped.length >= 2) {
    const counts = new Map<string, number>();
    skipped.forEach((action) => {
      const band = timeBand(action.hour);
      counts.set(band, (counts.get(band) ?? 0) + 1);
    });

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      const routine =
        top[0] === "morning"
          ? "your morning routine"
          : top[0] === "afternoon"
            ? "your afternoon routine"
            : top[0] === "evening"
              ? "supper"
              : "getting ready for bed";

      insights.push({
        title: "Your " + top[0] + " routine stands out",
        text:
          formatWhole(top[1]) +
          " of your uncompleted dose entries were recorded at night. Linking this dose to " +
          routine +
          " could make it easier to remember.",
        tone: "action",
      });
    }
  }

  const getSupportingGoal = (category: string) =>
    input.supportingGoals.find(
      (goal) => String(goal.category ?? "").toUpperCase() === category,
    );

  const targetNumber = (goal?: MedicationSupportingGoal | null) => {
    const value = Number(goal?.targetValue);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  // Sleep
  const sleepDays = days.filter((day) => {
    const value = checkIns.get(day.day)?.sleepHours;
    return value != null && Number.isFinite(Number(value));
  });

  const sleepGoal = getSupportingGoal("SLEEP");
  const sleepTarget = targetNumber(sleepGoal) ?? 6;

  compareContext(
    sleepDays,
    (day) => Number(checkIns.get(day.day)?.sleepHours) < sleepTarget,
    (day) => Number(checkIns.get(day.day)?.sleepHours) >= sleepTarget,
    (a, b, countA, countB) =>
      "On " +
      formatWhole(countA) +
      " days below your sleep target, your medicine logging averaged " +
      formatWhole(a) +
      "% versus " +
      formatWhole(b) +
      "% on " +
      formatWhole(countB) +
      " days at or above it.",
    sleepGoal?.title ? String(sleepGoal.title) + " & your medicine" : "Sleep & your medicine",
    insights,
  );

  // Water
  const hydrationDays = days.filter((day) => {
    const value = checkIns.get(day.day)?.waterIntakeMl;
    return value != null && Number.isFinite(Number(value));
  });

  if (hydrationDays.length >= 4) {
    const hydrationGoal = getSupportingGoal("HYDRATION");
    const goalTarget = targetNumber(hydrationGoal);

    if (goalTarget != null) {
      compareContext(
        hydrationDays,
        (day) => Number(checkIns.get(day.day)?.waterIntakeMl) < goalTarget,
        (day) => Number(checkIns.get(day.day)?.waterIntakeMl) >= goalTarget,
        (a, b, countA, countB) =>
          "On " +
          formatWhole(countA) +
          " days below your water target, your medicine logging averaged " +
          formatWhole(a) +
          "% versus " +
          formatWhole(b) +
          "% on " +
          formatWhole(countB) +
          " days at or above it.",
        hydrationGoal?.title ? String(hydrationGoal.title) + " & your medicine" : "Water & your medicine",
        insights,
      );
    } else {
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
        (a, b) =>
          "On lower-water days, your medicine logging averaged " +
          formatWhole(a) +
          "% versus " +
          formatWhole(b) +
          "% on higher-water days.",
        "Water & your medicine",
        insights,
      );
    }
  }

  // Activity
  const activityDays = days.filter((day) => {
    const value = checkIns.get(day.day)?.exerciseMinutes;
    return value != null && Number.isFinite(Number(value));
  });

  const exerciseGoal = getSupportingGoal("EXERCISE");
  const exerciseTarget = targetNumber(exerciseGoal) ?? 30;

  compareContext(
    activityDays,
    (day) => Number(checkIns.get(day.day)?.exerciseMinutes) < exerciseTarget,
    (day) => Number(checkIns.get(day.day)?.exerciseMinutes) >= exerciseTarget,
    (a, b) =>
      "On lower-activity days, your medicine logging averaged " +
      formatWhole(a) +
      "% versus " +
      formatWhole(b) +
      "% on days meeting your activity target.",
    exerciseGoal?.title ? String(exerciseGoal.title) + " & your medicine" : "Activity & your medicine",
    insights,
  );

  // Nutrition logging
  const nutritionLogged = days.filter((day) => nutritionDays.has(day.day));
  const nutritionNotLogged = days.filter((day) => !nutritionDays.has(day.day));

  const nutritionGoal = getSupportingGoal("NUTRITION");
  const nutritionTarget = targetNumber(nutritionGoal);

  if (nutritionTarget != null) {
    const caloriesByDay = new Map<string, number>();
    input.nutritionEvents.forEach((event) => {
      const day = dayKey(event.occurredAt);
      if (!day) return;
      caloriesByDay.set(day, (caloriesByDay.get(day) ?? 0) + Number(event.loggedValue || 0));
    });

    const nutritionComparedDays = days.filter((day) => caloriesByDay.has(day.day));
    const targetNutrition = nutritionComparedDays.filter(
      (day) => (caloriesByDay.get(day.day) ?? 0) >= nutritionTarget,
    );
    const belowNutrition = nutritionComparedDays.filter(
      (day) => (caloriesByDay.get(day.day) ?? 0) < nutritionTarget,
    );

    if (targetNutrition.length >= 2 && belowNutrition.length >= 2) {
      compareContext(
        nutritionComparedDays,
        (day) => (caloriesByDay.get(day.day) ?? 0) < nutritionTarget,
        (day) => (caloriesByDay.get(day.day) ?? 0) >= nutritionTarget,
        (a, b) =>
          "On days below your food target, your medicine logging averaged " +
          formatWhole(a) +
          "% versus " +
          formatWhole(b) +
          "% on days at or above it.",
        nutritionGoal?.title ? String(nutritionGoal.title) + " & your medicine" : "Food & your medicine",
        insights,
      );
    }
  } else if (nutritionLogged.length >= 2 && nutritionNotLogged.length >= 2) {
    compareContext(
      days,
      (day) => nutritionDays.has(day.day),
      (day) => !nutritionDays.has(day.day),
      (a, b) =>
        "On days you logged food, your medicine logging averaged " +
        formatWhole(a) +
        "% versus " +
        formatWhole(b) +
        "% on days without a food entry.",
      "Food & your medicine",
      insights,
    );
  }

  // Always give a compact context summary when there is recorded context,
  // but do not present it as if the check-in itself caused the medication result.
  if (insights.length < 3) {
    const parts: string[] = [];
    const planDays = days.length;

    if (planDays > 0) {
      if (sleepDays.length) parts.push(buildCoverage("Sleep", sleepDays.length, planDays));
      if (hydrationDays.length) parts.push(buildCoverage("Water", hydrationDays.length, planDays));
      if (activityDays.length) parts.push(buildCoverage("Activity", activityDays.length, planDays));
      if (nutritionLogged.length) parts.push(buildCoverage("Food", nutritionLogged.length, planDays));
    }

    if (parts.length) {
      insights.push({
        title: "Your daily context",
        text: "Sympto has " + parts.join(" ") + " It uses these entries to look for patterns in your medicine routine.",
        tone: "context",
      });
    }
  }

  if (!insights.length) {
    insights.push({
      title: "Your medication pattern is building",
      text: "Keep logging your doses. Sympto will compare your routine as more days are recorded.",
      tone: "neutral",
    });
  }

  return insights.slice(0, 3);
}
