export type MedicationReminderFrequency = {
  doseCount: number;
  cadence: "DAILY" | "WEEKLY" | "UNSUPPORTED";
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  once: 1,
  two: 2,
  twice: 2,
  three: 3,
  four: 4,
  five: 5,
};

function parseCount(value: string) {
  const numeric = value.match(/\b([1-9])\b/);
  if (numeric) return Number(numeric[1]);
  for (const [word, count] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(value)) return count;
  }
  return null;
}

export function getMedicationReminderFrequency(frequency: string | null | undefined): MedicationReminderFrequency {
  const value = String(frequency ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!value) return { doseCount: 0, cadence: "UNSUPPORTED" };
  if (/as needed|when needed|prn/.test(value)) return { doseCount: 0, cadence: "UNSUPPORTED" };
  if (/weekly|once a week|once per week/.test(value)) return { doseCount: 1, cadence: "WEEKLY" };

  const everyHours = value.match(/every\s+(\d+(?:\.\d+)?)\s*hours?/);
  if (everyHours) {
    const hours = Number(everyHours[1]);
    if (hours > 0 && 24 % hours === 0) {
      const count = 24 / hours;
      if (count >= 1 && count <= 4) return { doseCount: count, cadence: "DAILY" };
    }
  }

  // Check explicit multi-dose schedules before the generic "daily" match.
  // Otherwise "three times daily" incorrectly matches the generic daily branch as 1 dose.
  if (/four\s+times?\s+(a|per)?\s*day|four\s+times?\s+daily/.test(value)) return { doseCount: 4, cadence: "DAILY" };
  if (/three\s+times?\s+(a|per)?\s*day|three\s+times?\s+daily/.test(value)) return { doseCount: 3, cadence: "DAILY" };
  if (/twice\s+(a|per)\s+day|twice\s+daily/.test(value)) return { doseCount: 2, cadence: "DAILY" };
  if (/once\s+(a|per)\s+day|once\s+daily/.test(value)) return { doseCount: 1, cadence: "DAILY" };

  const timesPerDay = value.match(/\b([1-9]|one|two|three|four)\s+times?\s+(?:a|per)\s+day\b/i);
  if (timesPerDay) {
    const count = parseCount(timesPerDay[0]);
    if (count && count <= 4) return { doseCount: count, cadence: "DAILY" };
  }

  if (/\bdaily\b/.test(value)) return { doseCount: 1, cadence: "DAILY" };

  return { doseCount: 0, cadence: "UNSUPPORTED" };
}

export function assertReminderTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("Invalid timezone.");
  }
}

function offsetMinutesAt(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "shortOffset" }).formatToParts(date);
  const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = raw.match(/^GMT(?:(\+|-)(\d{1,2})(?::(\d{2}))?)?$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekday === 0 ? 7 : weekday,
  };
}

function localClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
) {
  // Treat the requested local wall-clock time as a UTC-looking timestamp,
  // then apply the timezone offset to that fixed wall-clock value. Recompute
  // from the same base value on each iteration so the offset is never
  // subtracted repeatedly.
  const wallClockMs = Date.UTC(year, month - 1, day, hour, minute);
  let guess = new Date(wallClockMs);

  for (let i = 0; i < 3; i += 1) {
    const offsetMs = offsetMinutesAt(guess, timezone) * 60_000;
    const next = new Date(wallClockMs - offsetMs);

    if (next.getTime() === guess.getTime()) {
      break;
    }

    guess = next;
  }

  return guess;
}

export function nextMedicationReminderOccurrence(args: {
  now: Date;
  time: string;
  daysOfWeek: number[];
  timezone: string;
  notBefore?: Date | null;
  notAfter?: Date | null;
}) {
  const [hourText, minuteText] = String(args.time).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const allowedDays = new Set(args.daysOfWeek);
  if (!allowedDays.size) return null;

  const effectiveNow = args.notBefore && args.notBefore > args.now ? args.notBefore : args.now;
  const local = localParts(effectiveNow, args.timezone);
  const baseUtc = Date.UTC(local.year, local.month - 1, local.day);

  for (let offset = 0; offset <= 14; offset += 1) {
    const candidateLocal = new Date(baseUtc + offset * 86_400_000);
    const year = candidateLocal.getUTCFullYear();
    const month = candidateLocal.getUTCMonth() + 1;
    const day = candidateLocal.getUTCDate();
    const weekdayDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = weekdayDate.getUTCDay() === 0 ? 7 : weekdayDate.getUTCDay();
    if (!allowedDays.has(weekday)) continue;
    const candidate = localClockToUtc(year, month, day, hour, minute, args.timezone);
    if (candidate <= effectiveNow) continue;
    if (args.notAfter && candidate >= args.notAfter) return null;
    return candidate;
  }
  return null;
}

export function recentMedicationReminderOccurrence(args: {
  now: Date;
  time: string;
  daysOfWeek: number[];
  timezone: string;
  notBefore?: Date | null;
  notAfter?: Date | null;
  graceMs?: number;
}) {
  const [hourText, minuteText] = String(args.time).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const allowedDays = new Set(args.daysOfWeek);
  if (!allowedDays.size) return null;

  const effectiveNow =
    args.notBefore && args.notBefore > args.now ? args.notBefore : args.now;
  const local = localParts(effectiveNow, args.timezone);

  if (!allowedDays.has(local.weekday)) return null;

  const candidate = localClockToUtc(
    local.year,
    local.month,
    local.day,
    hour,
    minute,
    args.timezone,
  );

  const age = effectiveNow.getTime() - candidate.getTime();
  const graceMs = args.graceMs ?? 60_000;

  if (age < 0 || age > graceMs) return null;
  if (args.notAfter && candidate >= args.notAfter) return null;

  return candidate;
}
