export type ExerciseMetricEvent = {
  loggedValue: number;
  occurredAt: string;
  source?: string | null;
};

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function canonicalExerciseDayTotals(events: ExerciseMetricEvent[]) {
  const byDay = new Map<string, ExerciseMetricEvent[]>();

  for (const event of events) {
    const key = dayKey(event.occurredAt);
    if (!key) continue;
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  return new Map(
    [...byDay.entries()].map(([key, dayEvents]) => {
      const wearableTotal = dayEvents
        .filter((event) => String(event.source ?? "").toLowerCase().startsWith("wearable"))
        .reduce((sum, event) => sum + finite(event.loggedValue), 0);

      const manualEvents = dayEvents
        .filter((event) => !String(event.source ?? "").toLowerCase().startsWith("wearable"))
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

      const manualTotal = manualEvents.length ? finite(manualEvents[manualEvents.length - 1].loggedValue) : 0;

      return [key, Math.max(wearableTotal, manualTotal)] as const;
    }),
  );
}

export function canonicalExerciseWeekTotal(events: ExerciseMetricEvent[]) {
  return [...canonicalExerciseDayTotals(events).values()].reduce((sum, value) => sum + value, 0);
}