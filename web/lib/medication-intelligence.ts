export type MedicationIntelligenceEvent = {
  loggedValue: number;
  occurredAt: string;
  metadata?: Record<string, unknown> | null;
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

export type LiveMedicationInsightState = {
  medication_name: string;
  current_lifecycle_day: number;
  daily_target_doses: number;
  total_taken_to_date: number;
  today_logged_meals_count: number;
  today_doses_logged: number;
};

type MedicationInsightTemplateTokens = {
  medication_name: string;
  live_adherence_pct: string;
  historical_expected_doses: string;
};

function formatInsightToken(value: unknown, fallback = "your medicine") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function renderMedicationInsightTemplate(
  template: string,
  tokens: MedicationInsightTemplateTokens,
) {
  return template.replace(/\\{([a-z0-9_]+)\\}/gi, (match, key: string) => {
    const value = tokens[key as keyof MedicationInsightTemplateTokens];
    return value == null ? match : String(value);
  });
}

/**
 * Live medication Insight source of truth.
 *
 * This intentionally does not inspect HealthGoalMetricEvent percentages,
 * historical trend windows, or inferred dose actions. The medication card
 * already has the authoritative local state used for the current journey.
 */
export function buildLiveMedicationInsights(
  state: LiveMedicationInsightState,
): MedicationIntelligenceInsight[] {
  const lifecycleDay = Math.max(0, Math.floor(Number(state.current_lifecycle_day) || 0));
  const dailyTarget = Math.max(0, Math.floor(Number(state.daily_target_doses) || 0));
  const totalTaken = Math.max(0, Math.floor(Number(state.total_taken_to_date) || 0));
  const mealsToday = Math.max(0, Math.floor(Number(state.today_logged_meals_count) || 0));
  const dosesToday = Math.max(0, Math.floor(Number(state.today_doses_logged) || 0));

  const historicalExpectedDoses = lifecycleDay * dailyTarget;
  const liveAdherence =
    historicalExpectedDoses > 0
      ? Math.min(100, Math.max(0, Math.round((totalTaken / historicalExpectedDoses) * 100)))
      : 0;

  const tokens: MedicationInsightTemplateTokens = {
    medication_name: formatInsightToken(state.medication_name),
    live_adherence_pct: String(liveAdherence),
    historical_expected_doses: String(historicalExpectedDoses),
  };

  const insights: MedicationIntelligenceInsight[] = [
    {
      title: "Your medication routine",
      text: renderMedicationInsightTemplate(
        "Your medicine routine is improving. You are at {live_adherence_pct}% adherence for your {medication_name} goal journey.",
        tokens,
      ),
      tone: liveAdherence >= 80 ? "positive" : "context",
    },
  ];

  const todayIsComplete =
    dailyTarget > 0 &&
    dosesToday >= dailyTarget;

  if (mealsToday > 0 && todayIsComplete) {
    insights.push({
      title: "Food logging & your medicine",
      text: renderMedicationInsightTemplate(
        "Excellent consistency today! You successfully matched your {medication_name} schedule alongside your active meals.",
        tokens,
      ),
      tone: "positive",
    });
  }

  return insights.slice(0, 3);
}


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

    const explicitAction = String(event.metadata?.action ?? "").toUpperCase();
    const explicitTaken = explicitAction === "TAKEN";
    const explicitSkipped = explicitAction === "SKIPPED";
    const hasExplicitAction = explicitTaken || explicitSkipped;

    actions.push({
      day: dayKey(at),
      hour: Number(
        new Intl.DateTimeFormat("en-ZA", {
          timeZone: "Africa/Johannesburg",
          hour: "2-digit",
          hour12: false,
        }).format(at),
      ),
      taken: hasExplicitAction ? explicitTaken : takenDelta > 0,
      skipped: hasExplicitAction ? explicitSkipped : takenDelta === 0,
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

/** @deprecated The Today medication Insight UI now uses buildLiveMedicationInsights. */
export function buildMedicationIntelligence(input: {
  adherenceEvents: MedicationIntelligenceEvent[];
  goalStartAt: string;
  scheduledDosesPerDay: number;
  lifecycleDayCount?: number | null;
  totalHistoricalTakenDoses?: number | null;
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

  // Keep the existing completed-day logic for general medication trend/timing
  // insights. For a same-day food comparison, include today only when all of
  // today's scheduled doses have already been resolved. A partial day must not
  // silently become a "no food" or "missed medicine" day.
  const comparisonDays = timeline.filter(
    (day) => day.day !== today || day.unrecorded === 0,
  );

  const comparisonTaken = adherenceFor(comparisonDays).taken;
  const comparisonScheduled = adherenceFor(comparisonDays).scheduled;
  const expectedScheduled =
    Number.isFinite(Number(input.lifecycleDayCount)) &&
    Number(input.lifecycleDayCount) > 0
      ? Number(input.lifecycleDayCount) * Math.max(1, Math.floor(input.scheduledDosesPerDay || 1))
      : null;
  const historicalTaken = Number(input.totalHistoricalTakenDoses);

  const doseHistoryReconciled =
    Number.isFinite(historicalTaken) &&
    historicalTaken >= 0 &&
    comparisonTaken === Math.floor(historicalTaken) &&
    (expectedScheduled == null || comparisonScheduled === expectedScheduled);

  let nutritionComparisonSuppressed = false;

  const checkIns = new Map(input.checkIns.map((item) => [item.day, item]));

  const insights: MedicationIntelligenceInsight[] = [];

  // 1. Trend: earlier completed plan days versus the most recent completed days.
  if (days.length >= 4) {
    const size = Math.min(5, Math.floor(days.length / 2));
    const baseline = days.slice(-(size * 2), -size);
    const recent = days.slice(-size);
    const before = adherenceFor(baseline).percentage;
    const after = adherenceFor(recent).percentage;
    const delta = after - before;

    if (Math.abs(delta) >= 5) {
      insights.push({
        title:
          delta > 0
            ? "Your medicine routine is improving"
            : "Your medicine routine needs more consistency",
        text:
          delta > 0
            ? "You moved from about " +
              formatWhole(before) +
              "% to " +
              formatWhole(after) +
              "% lately — up " +
              formatWhole(Math.abs(delta)) +
              "%."
            : "You moved from about " +
              formatWhole(before) +
              "% to " +
              formatWhole(after) +
              "% lately. A steadier routine may help.",
        tone: delta > 0 ? "positive" : "watch",
      });
    }
  }

  // 2. Timing/day pattern: use explicit skipped actions first, then unrecorded doses by weekday.
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
          " doses were marked as skipped around the " +
          top[0] +
          ". Linking this dose to " +
          routine +
          " could make it easier to remember.",
        tone: "action",
      });
    }
  } else {
    const weekdayMissed = new Map<string, number>();
    days.forEach((day) => {
      if (day.unrecorded + day.skippedActions <= 0) return;
      const name = weekdayName(day.day);
      weekdayMissed.set(
        name,
        (weekdayMissed.get(name) ?? 0) + day.unrecorded + day.skippedActions,
      );
    });

    const topWeekday = [...weekdayMissed.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topWeekday && topWeekday[1] >= 2) {
      insights.push({
        title: topWeekday[0] + " is where your routine slips most",
        text:
          topWeekday[0] +
          " has " +
          formatWhole(topWeekday[1]) +
          " doses not taken or not recorded so far.",
        tone: "action",
      });
    }
  }

  type ContextCandidate = MedicationIntelligenceInsight & { difference: number };

  const candidates: ContextCandidate[] = [];

  const getSupportingGoal = (category: string) =>
    input.supportingGoals.find(
      (goal) => String(goal.category ?? "").toUpperCase() === category,
    );

  function supportingTarget(goal: MedicationSupportingGoal | undefined, category: string) {
    const value = Number(goal?.targetValue);
    if (!Number.isFinite(value) || value <= 0) return null;

    const unit = String(goal?.unit ?? "").trim().toLowerCase();

    if (category === "HYDRATION" && ["l", "liter", "litre", "liters", "litres"].includes(unit)) {
      return value * 1000;
    }

    if (category === "SLEEP" && ["min", "minute", "minutes"].includes(unit)) {
      return value / 60;
    }

    if (category === "EXERCISE" && ["h", "hr", "hour", "hours"].includes(unit)) {
      return value * 60;
    }

    return value;
  }

  function addContextCandidate(
    label: string,
    goal: MedicationSupportingGoal | undefined,
    contextDays: MedicationDay[],
    lowerText: string,
    higherText: string,
    lower: (day: MedicationDay) => boolean,
    higher: (day: MedicationDay) => boolean,
  ) {
    const lowerDays = contextDays.filter(lower);
    const higherDays = contextDays.filter(higher);

    if (lowerDays.length < 2 || higherDays.length < 2) return;

    const lowerStats = adherenceFor(lowerDays);
    const higherStats = adherenceFor(higherDays);
    if (!lowerStats.scheduled || !higherStats.scheduled) return;

    const difference = Math.abs(lowerStats.percentage - higherStats.percentage);
    if (difference < 10) return;

    const lowerSkipped = lowerDays.reduce((sum, day) => sum + day.skippedActions, 0);
    const lowerUnrecorded = lowerDays.reduce((sum, day) => sum + day.unrecorded, 0);
    const higherSkipped = higherDays.reduce((sum, day) => sum + day.skippedActions, 0);
    const higherUnrecorded = higherDays.reduce((sum, day) => sum + day.unrecorded, 0);

    const goalLabel = goal?.title ? String(goal.title) : label;

    candidates.push({
      title: goalLabel + " & your medicine",
      text:
        "On " +
        lowerText +
        ", you logged " +
        formatWhole(lowerStats.taken) +
        " of " +
        formatWhole(lowerStats.scheduled) +
        " doses. " +
        formatWhole(lowerSkipped) +
        " were skipped and " +
        formatWhole(lowerUnrecorded) +
        " were never logged. On " +
        higherText +
        ", you logged " +
        formatWhole(higherStats.taken) +
        " of " +
        formatWhole(higherStats.scheduled) +
        ". " +
        formatWhole(higherSkipped) +
        " were skipped and " +
        formatWhole(higherUnrecorded) +
        " were never logged.",
      tone: "context",
      difference,
    });
  }

  // Sleep
  const sleepDays = days.filter((day) => {
    const value = checkIns.get(day.day)?.sleepHours;
    return value != null && Number.isFinite(Number(value));
  });
  const sleepGoal = getSupportingGoal("SLEEP");
  const sleepTarget = supportingTarget(sleepGoal, "SLEEP") ?? 6;

  addContextCandidate(
    "sleep",
    sleepGoal,
    sleepDays,
    "days below your sleep goal",
    "days at or above your sleep goal",
    (day) => Number(checkIns.get(day.day)?.sleepHours) < sleepTarget,
    (day) => Number(checkIns.get(day.day)?.sleepHours) >= sleepTarget,
  );

  // Hydration
  const hydrationDays = days.filter((day) => {
    const value = checkIns.get(day.day)?.waterIntakeMl;
    return value != null && Number.isFinite(Number(value));
  });
  const hydrationGoal = getSupportingGoal("HYDRATION");
  const hydrationTarget = supportingTarget(hydrationGoal, "HYDRATION");

  if (hydrationTarget != null) {
    addContextCandidate(
      "water",
      hydrationGoal,
      hydrationDays,
      "days below your water goal",
      "days at or above your water goal",
      (day) => Number(checkIns.get(day.day)?.waterIntakeMl) < hydrationTarget,
      (day) => Number(checkIns.get(day.day)?.waterIntakeMl) >= hydrationTarget,
    );
  } else if (hydrationDays.length >= 4) {
    const values = hydrationDays
      .map((day) => Number(checkIns.get(day.day)?.waterIntakeMl))
      .sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    const median =
      values.length % 2 === 0
        ? (values[middle - 1] + values[middle]) / 2
        : values[middle];

    addContextCandidate(
      "water intake",
      undefined,
      hydrationDays,
      "lower-water days",
      "higher-water days",
      (day) => Number(checkIns.get(day.day)?.waterIntakeMl) < median,
      (day) => Number(checkIns.get(day.day)?.waterIntakeMl) >= median,
    );
  }

  // Activity
  const activityDays = days.filter((day) => {
    const value = checkIns.get(day.day)?.exerciseMinutes;
    return value != null && Number.isFinite(Number(value));
  });
  const exerciseGoal = getSupportingGoal("EXERCISE");
  const exerciseTarget = supportingTarget(exerciseGoal, "EXERCISE") ?? 30;

  addContextCandidate(
    "activity",
    exerciseGoal,
    activityDays,
    "days below your activity goal",
    "days at or above your activity goal",
    (day) => Number(checkIns.get(day.day)?.exerciseMinutes) < exerciseTarget,
    (day) => Number(checkIns.get(day.day)?.exerciseMinutes) >= exerciseTarget,
  );

  // Nutrition: compare calories against the connected Nutrition goal when it has a target.
  const nutritionGoal = getSupportingGoal("NUTRITION");
  const nutritionTarget = supportingTarget(nutritionGoal, "NUTRITION");
  const caloriesByDay = new Map<string, number>();

  input.nutritionEvents.forEach((event) => {
    const day = dayKey(event.occurredAt);
    if (!day) return;
    caloriesByDay.set(
      day,
      (caloriesByDay.get(day) ?? 0) + Number(event.loggedValue || 0),
    );
  });

  const nutritionDays = days.filter((day) => caloriesByDay.has(day.day));

  if (nutritionTarget != null && nutritionDays.length >= 4) {
    addContextCandidate(
      "food",
      nutritionGoal,
      nutritionDays,
      "days below your food target",
      "days at or above your food target",
      (day) => (caloriesByDay.get(day.day) ?? 0) < nutritionTarget,
      (day) => (caloriesByDay.get(day.day) ?? 0) >= nutritionTarget,
    );
  } else {
    // This comparison is deliberately fail-closed. It is patient-facing
    // telemetry, so the grouped dose counts must reconcile to the same
    // historical total already shown by the medication goal card.
    if (
      !doseHistoryReconciled ||
      comparisonDays.length !== timeline.length
    ) {
      nutritionComparisonSuppressed = true;
    } else {
      const nutritionLogged = comparisonDays.filter((day) =>
        nutritionDays.some((item) => item.day === day.day),
      );
      const nutritionNotLogged = comparisonDays.filter(
        (day) => !nutritionDays.some((item) => item.day === day.day),
      );

      if (nutritionLogged.length >= 2 && nutritionNotLogged.length >= 2) {
        const loggedStats = adherenceFor(nutritionLogged);
        const unloggedStats = adherenceFor(nutritionNotLogged);
        const groupedTaken =
          loggedStats.taken + unloggedStats.taken;
        const groupedScheduled =
          loggedStats.scheduled + unloggedStats.scheduled;
        const difference = Math.abs(
          loggedStats.percentage - unloggedStats.percentage,
        );

        const groupedCountsReconcile =
          groupedTaken === historicalTaken &&
          (expectedScheduled == null || groupedScheduled === expectedScheduled);

        if (groupedCountsReconcile && difference >= 10) {
          const loggedSkipped = nutritionLogged.reduce(
            (sum, day) => sum + day.skippedActions,
            0,
          );
          const loggedUnrecorded = nutritionLogged.reduce(
            (sum, day) => sum + day.unrecorded,
            0,
          );

          candidates.push({
            title: "Food logging & your medicine",
            text:
              "On days you logged food, you logged " +
              formatWhole(loggedStats.taken) +
              " of " +
              formatWhole(loggedStats.scheduled) +
              " doses. " +
              formatWhole(loggedSkipped) +
              " were skipped and " +
              formatWhole(loggedUnrecorded) +
              " were never logged. On days without a food entry, you logged " +
              formatWhole(unloggedStats.taken) +
              " of " +
              formatWhole(unloggedStats.scheduled) +
              " doses.",
            tone: "context",
            difference,
          });
        } else {
          nutritionComparisonSuppressed = true;
        }
      }
    }
  }

  candidates.sort((a, b) => b.difference - a.difference);

  if (nutritionComparisonSuppressed && insights.length < 3) {
    insights.push({
      title: "Medication pattern",
      text:
        "Keep logging your doses and meals to build a clearer personal pattern.",
      tone: "neutral",
    });
  }

  // Put one useful connected-data comparison after the two primary medication patterns.
  if (candidates[0]) {
    insights.push({
      title: candidates[0].title,
      text: candidates[0].text,
      tone: candidates[0].tone,
    });
  }

  if (insights.length < 3) {
    const planDays = days.length;
    const matchedDays = input.checkIns.filter((checkIn) =>
      days.some((day) => day.day === checkIn.day),
    ).length;

    if (planDays > 0 && matchedDays > 0) {
      const connected = [
        sleepDays.length ? "sleep" : null,
        hydrationDays.length ? "water" : null,
        activityDays.length ? "activity" : null,
        nutritionDays.length ? "food" : null,
      ].filter(Boolean);

      if (connected.length > 0) {
        insights.push({
          title: "Your daily routine is connected",
          text:
            "Sympto has matched your medicine records with " +
            connected.join(", ") +
            " on " +
            formatWhole(matchedDays) +
            " of " +
            formatWhole(planDays) +
            " recorded days.",
          tone: "context",
        });
      }
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

