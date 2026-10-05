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
  now = new Date(),
}: {
  bloodPressureEvents: BloodPressureMetricEvent[];
  exerciseEvents?: BloodPressureMetricEvent[];
  journals?: BloodPressureJournal[];
  symptoms?: BloodPressureSymptom[];
  target?: number | null;
  now?: Date;
}): BloodPressureInsight[] {
  const bp = bloodPressureEvents
    .map((event) => {
      const value = finite(event.loggedValue);
      const parts = localParts(event.occurredAt);
      return value != null && parts ? { value, day: parts.key, hour: parts.hour, occurredAt: event.occurredAt } : null;
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
      .map((day) => trendDaily.get(day) ?? 0)
      .filter((value) => Number.isFinite(value));

    const averageSystolic = mean(dailyValues) ?? 0;
    const averageRounded = round(averageSystolic) ?? 0;
    const recordedDays = trendDaily.size;
    const targetDays = target == null
      ? 0
      : dailyValues.filter((value) => value <= target).length;
    const targetRate = target != null && recordedDays > 0
      ? Math.round((targetDays / recordedDays) * 100)
      : null;

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
    const directionDelta =
      earlyAverage != null && recentAverage != null
        ? recentAverage - earlyAverage
        : 0;

    const latestDay = trendDays.at(-1);
    const latestAverage = latestDay ? trendDaily.get(latestDay) ?? null : null;
    const latestRounded = round(latestAverage) ?? null;
    const targetRounded = target == null ? null : round(target) ?? null;

    const strongRecentShift =
      Math.abs(directionDelta) >= 5 &&
      earlyValues.length >= 2 &&
      recentValues.length >= 2;

    let title = "Your blood-pressure pattern is still building";
    let body =
      "You have enough recorded readings for Sympto to start describing the pattern, but not enough change to call the recent direction meaningful.";

    if (targetRounded != null && recentAverage != null && recentAverage > targetRounded) {
      if (strongRecentShift && directionDelta >= 5) {
        title = "Your recent readings are above target and higher";
        body =
          "Across " +
          recordedDays +
          " recorded days in this " +
          trendWindowLabel +
          " window, your recent daily average was " +
          (round(recentAverage) ?? 0) +
          " mmHg, compared with " +
          (round(earlyAverage) ?? 0) +
          " mmHg earlier. Your recent average is also above your " +
          targetRounded +
          " mmHg target.";
      } else if (strongRecentShift && directionDelta <= -5) {
        title = "Your readings remain above target, but are lower recently";
        body =
          "Your recent daily average was " +
          (round(recentAverage) ?? 0) +
          " mmHg versus " +
          (round(earlyAverage) ?? 0) +
          " mmHg earlier. The direction is improving in your recorded data, although the recent average remains above your " +
          targetRounded +
          " mmHg target.";
      } else {
        title = "Your recent readings are above your target";
        body =
          "Your recent daily average is " +
          (round(recentAverage) ?? 0) +
          " mmHg against a " +
          targetRounded +
          " mmHg target. Keep recording readings so Sympto can distinguish a persistent pattern from short-term variation.";
      }
    } else if (targetRounded != null && recentAverage != null && recentAverage <= targetRounded) {
      if (strongRecentShift && directionDelta >= 5) {
        title = "Your recent readings are moving closer to your upper limit";
        body =
          "Your recent daily average was " +
          (round(recentAverage) ?? 0) +
          " mmHg, up from " +
          (round(earlyAverage) ?? 0) +
          " mmHg earlier, but it is still at or below your " +
          targetRounded +
          " mmHg target. Keep tracking the next readings.";
      } else if (strongRecentShift && directionDelta <= -5) {
        title = "Your recent readings are lower and within target";
        body =
          "Your recent daily average was " +
          (round(recentAverage) ?? 0) +
          " mmHg, down from " +
          (round(earlyAverage) ?? 0) +
          " mmHg earlier, and remains at or below your " +
          targetRounded +
          " mmHg target.";
      } else {
        title = "Your recent readings are within your target";
        body =
          "Your recent daily average is " +
          (round(recentAverage) ?? 0) +
          " mmHg, at or below your " +
          targetRounded +
          " mmHg target. Keep recording consistently so Sympto can show whether this holds over time.";
      }
    } else if (strongRecentShift && directionDelta >= 5) {
      title = "Your recent readings are higher than earlier";
      body =
        "Your recent daily average was " +
        (round(recentAverage) ?? 0) +
        " mmHg versus " +
        (round(earlyAverage) ?? 0) +
        " mmHg earlier in the record. This is a change in your recorded readings, so keep tracking to see whether it continues.";
    } else if (strongRecentShift && directionDelta <= -5) {
      title = "Your recent readings are lower than earlier";
      body =
        "Your recent daily average was " +
        (round(recentAverage) ?? 0) +
        " mmHg versus " +
        (round(earlyAverage) ?? 0) +
        " mmHg earlier in the record. Keep tracking to see whether the lower pattern continues.";
    } else if (earlyAverage != null && recentAverage != null) {
      title = "Your readings are relatively stable";
      body =
        "Your recent daily average is " +
        (round(recentAverage) ?? 0) +
        " mmHg versus " +
        (round(earlyAverage) ?? 0) +
        " mmHg earlier. The difference is small enough that Sympto is treating the pattern as relatively stable for now.";
    }

    const evidenceParts = [
      trendWindowLabel + " · " + recordedDays + " recorded days",
      "Overall average " + averageRounded + " mmHg",
      latestRounded != null ? "Latest day " + latestRounded + " mmHg" : null,
      targetRounded != null ? "Target " + targetRounded + " mmHg" : null,
      targetRate != null ? "At target " + targetDays + "/" + recordedDays + " days (" + targetRate + "%)" : null,
      strongRecentShift && recentAverage != null && earlyAverage != null
        ? "Recent vs earlier " + (round(recentAverage) ?? 0) + " vs " + (round(earlyAverage) ?? 0) + " mmHg"
        : null,
    ].filter((item): item is string => Boolean(item));

    insights.push({
      kind: "trend",
      tone:
        targetRounded != null && recentAverage != null && recentAverage > targetRounded
          ? "warning"
          : "info",
      title,
      body,
      evidence: evidenceParts.join(" · "),
    });
  } else {
    insights.push({
      kind: "data",
      tone: "info",
      title: "More readings will make this pattern clearer",
      body: "Keep recording your blood pressure regularly. Sympto needs more observations before it can identify a meaningful pattern.",
      evidence: dailyAll.size
        ? dailyAll.size + " recorded days are available historically; more consistent recent readings will make the comparison stronger."
        : "No historical systolic readings are available yet.",
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

  const exerciseByDay = sumDaily(
    exerciseEvents
      .map((event) => {
        const value = finite(event.loggedValue);
        const day = dayKey(event.occurredAt);
        return value != null && day ? { day, value } : null;
      })
      .filter((item): item is { day: string; value: number } => Boolean(item)),
  );
  const exercisePairs: Array<{ activity: number; nextDayBp: number }> = [];
  for (const [exerciseDay, activity] of exerciseByDay.entries()) {
    const nextDay = shiftDayKey(exerciseDay, 1);
    const bpValue = dailySevenDay.get(nextDay) ?? groupDaily(bp.map((item) => ({ day: item.day, value: item.value }))).get(nextDay);
    if (bpValue != null) exercisePairs.push({ activity, nextDayBp: bpValue });
  }
  if (exercisePairs.length >= 7) {
    const activityMedian = median(exercisePairs.map((pair) => pair.activity)) ?? 0;
    const higherActivity = exercisePairs.filter((pair) => pair.activity > activityMedian).map((pair) => pair.nextDayBp);
    const lowerActivity = exercisePairs.filter((pair) => pair.activity <= activityMedian).map((pair) => pair.nextDayBp);
    const comparison = compareGroups(higherActivity, lowerActivity);
    if (comparison && Math.abs(comparison.difference) >= 5) {
      insights.push({
        kind: "exercise",
        tone: "info",
        title: "Exercise and your next-day readings",
        body:
          comparison.difference < 0
            ? "Days with more recorded activity have often been followed by lower systolic readings in your records. This is an observed pattern, not proof that exercise caused the change."
            : "Days with more recorded activity have often been followed by higher systolic readings in your records. This is an observed pattern, not proof that exercise caused the change.",
        evidence: "Higher-activity next-day average " + (round(comparison.highAverage) ?? 0) + " mmHg · lower-activity " + (round(comparison.lowAverage) ?? 0) + " mmHg.",
      });
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
    if (!unique.has(insight.kind)) unique.set(insight.kind, insight);
  }
  return [...unique.values()].slice(0, 5);
}
