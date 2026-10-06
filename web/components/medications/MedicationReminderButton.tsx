"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Clock3, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface MedicationReminderButtonProps {
  medicationId: string;
  medicationName: string;
  dosage?: string | null;
  frequency?: string | null;
  className?: string;
}

type ReminderState = {
  enabled: boolean;
  daysOfWeek: number[];
  times: string[];
  timezone: string;
};

const DAYS = [
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
  ["Sun", 7],
] as const;

function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function defaultTimes(count: number) {
  if (count === 1) return ["08:00"];
  if (count === 2) return ["08:00", "20:00"];
  if (count === 3) return ["08:00", "14:00", "20:00"];
  return ["08:00", "12:00", "16:00", "20:00"].slice(0, count);
}

function inferReminderFrequency(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!normalized || /as needed|when needed|prn/.test(normalized)) {
    return { doseCount: 0, cadence: "UNSUPPORTED" };
  }
  if (/weekly|once a week|once per week/.test(normalized)) {
    return { doseCount: 1, cadence: "WEEKLY" };
  }
  const everyHours = normalized.match(/every\s+(\d+(?:\.\d+)?)\s*hours?/);
  if (everyHours) {
    const hours = Number(everyHours[1]);
    if (hours > 0 && 24 % hours === 0) {
      const count = 24 / hours;
      if (count >= 1 && count <= 4) return { doseCount: count, cadence: "DAILY" };
    }
  }
  // Check explicit multi-dose schedules before the generic "daily" match.
  if (/four\s+times?\s+(a|per)?\s*day|four\s+times?\s+daily/.test(normalized)) {
    return { doseCount: 4, cadence: "DAILY" };
  }
  if (/three\s+times?\s+(a|per)?\s*day|three\s+times?\s+daily/.test(normalized)) {
    return { doseCount: 3, cadence: "DAILY" };
  }
  if (/twice\s+(a|per)\s+day|twice\s+daily/.test(normalized)) {
    return { doseCount: 2, cadence: "DAILY" };
  }
  if (/once\s+(a|per)\s+day|once\s+daily/.test(normalized)) {
    return { doseCount: 1, cadence: "DAILY" };
  }
  const timesPerDay = normalized.match(/\b([1-9]|one|two|three|four)\s+times?\s+(?:a|per)\s+day\b/i);
  if (timesPerDay) {
    const count = Number(timesPerDay[1]) || { one: 1, two: 2, three: 3, four: 4 }[timesPerDay[1].toLowerCase()] || 0;
    if (count >= 1 && count <= 4) return { doseCount: count, cadence: "DAILY" };
  }
  if (/\bdaily\b/.test(normalized)) {
    return { doseCount: 1, cadence: "DAILY" };
  }
  return { doseCount: 0, cadence: "UNSUPPORTED" };
}

function currentWeekday() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function frequencyCopy(doseCount: number, cadence: string) {
  if (cadence === "WEEKLY") return doseCount === 1 ? "1 dose per week" : doseCount + " doses per week";
  return doseCount === 1 ? "1 dose per day" : doseCount + " doses per day";
}

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");
  if (responseMessage) return responseMessage;
  return "We could not update the medication reminders.";
}

export function MedicationReminderButton({
  medicationId,
  medicationName,
  dosage,
  frequency,
  className = "",
}: MedicationReminderButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inferredFrequency = useMemo(() => inferReminderFrequency(frequency), [frequency]);
  const [doseCount, setDoseCount] = useState(inferredFrequency.doseCount);
  const [cadence, setCadence] = useState(inferredFrequency.cadence);
  const [supported, setSupported] = useState(inferredFrequency.doseCount > 0);
  const [state, setState] = useState<ReminderState>({
    enabled: false,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    times: ["08:00"],
    timezone: localTimezone(),
  });

  useEffect(() => {
    void loadSchedule();
  }, [medicationId]);

  const isWeekly = cadence === "WEEKLY";
  const cadenceLabel = useMemo(() => frequencyCopy(doseCount, cadence), [doseCount, cadence]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const response = await api.get("/patient-medications/" + medicationId + "/reminder-schedule");
      const payload = response.data?.data ?? response.data;
      const nextDoseCount = Number(payload?.doseCount ?? 0) || inferredFrequency.doseCount;
      const nextCadence = String(payload?.cadence ?? inferredFrequency.cadence).toUpperCase();
      const nextSupported = payload?.supported == null
        ? inferredFrequency.doseCount > 0
        : Boolean(payload.supported && nextDoseCount > 0);

      setDoseCount(nextDoseCount);
      setCadence(nextCadence);
      setSupported(nextSupported);

      const schedule = payload?.schedule;
      const timezone = String(schedule?.timezone || localTimezone());
      const savedDays = Array.isArray(schedule?.daysOfWeek) ? schedule.daysOfWeek.map(Number).filter((day: number) => day >= 1 && day <= 7) : [];
      const savedTimes = Array.isArray(schedule?.times) ? schedule.times.map(String) : [];
      const validSavedTimes = savedTimes.length === nextDoseCount;
      const validSavedDays = nextCadence === "WEEKLY" ? savedDays.length === 1 : savedDays.length > 0;

      setState({
        enabled: Boolean(schedule?.enabled && validSavedTimes && validSavedDays),
        daysOfWeek: validSavedDays ? savedDays : nextCadence === "WEEKLY" ? [currentWeekday()] : [1, 2, 3, 4, 5, 6, 7],
        times: validSavedTimes ? savedTimes : defaultTimes(nextDoseCount || 1),
        timezone,
      });
    } catch (error) {
      setDoseCount(inferredFrequency.doseCount);
      setCadence(inferredFrequency.cadence);
      setSupported(inferredFrequency.doseCount > 0);
      setState((current) => ({
        ...current,
        enabled: false,
        times: defaultTimes(inferredFrequency.doseCount || 1),
        daysOfWeek: inferredFrequency.cadence === "WEEKLY" ? [currentWeekday()] : [1, 2, 3, 4, 5, 6, 7],
      }));
      toast.error("Could not load reminder settings", { description: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: number) {
    setState((current) => {
      if (isWeekly) return { ...current, daysOfWeek: [day] };
      const exists = current.daysOfWeek.includes(day);
      const next = exists
        ? current.daysOfWeek.filter((item) => item !== day)
        : [...current.daysOfWeek, day].sort((a, b) => a - b);
      return { ...current, daysOfWeek: next };
    });
  }

  function updateTime(index: number, value: string) {
    setState((current) => ({
      ...current,
      times: current.times.map((time, slotIndex) => (slotIndex === index ? value : time)),
    }));
  }

  async function save(enabled: boolean) {
    if (!doseCount || !supported) return;
    if (enabled && state.times.length !== doseCount) {
      toast.error("Set one reminder time for every scheduled dose.");
      return;
    }
    if (enabled && state.daysOfWeek.length === 0) {
      toast.error("Choose at least one day.");
      return;
    }
    if (enabled && isWeekly && state.daysOfWeek.length !== 1) {
      toast.error("Choose one day for a weekly medication.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/patient-medications/" + medicationId + "/reminder-schedule", {
        enabled,
        daysOfWeek: state.daysOfWeek,
        times: state.times,
        timezone: state.timezone,
      });
      const payload = response.data?.data ?? response.data;
      setState((current) => ({ ...current, enabled: Boolean(payload?.enabled) }));
      toast.success(enabled ? "Medication reminders turned on" : "Medication reminders turned off", {
        description: enabled
          ? medicationName + " will remind you " + cadenceLabel.toLowerCase() + " on your selected days."
          : medicationName + " will no longer send scheduled medication reminders.",
      });
    } catch (error) {
      toast.error("Reminder settings could not be saved", { description: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  function openPanel() {
    setOpen(true);
    void loadSchedule();
  }

  const buttonLabel = state.enabled ? "Reminders on" : "Set reminders";

  return (
    <div className={"relative inline-flex h-9 " + className}>
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#24c1c4]/30 bg-[#24c1c4]/5 px-3 text-xs font-semibold text-[#0b2d54] transition hover:bg-[#24c1c4]/10"
      >
        <Bell className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(11,45,84,0.16)]">
          <div className="bg-[#0b2d54] px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]">Medication reminders</p>
                <h3 className="mt-1 text-base font-black">{medicationName}</h3>
                <p className="mt-1 text-xs text-white/55">
                  {dosage || "Dose not recorded"}{frequency ? " · " + frequency.replaceAll("_", " ").toLowerCase() : ""}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/15" aria-label="Close reminder settings">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {!supported ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                Sympto needs a fixed dose frequency before it can schedule reminders. Update this medicine to once, twice, three or four times daily, or once weekly.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-black text-[#0b2d54]">Scheduled reminders</p>
                    <p className="mt-1 text-[11px] text-slate-500">{cadenceLabel}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state.enabled}
                    onClick={() => setState((current) => ({ ...current, enabled: !current.enabled }))}
                    className={"relative h-7 w-12 rounded-full p-1 transition " + (state.enabled ? "bg-[#24c1c4]" : "bg-slate-300")}
                  >
                    <span className={"block h-5 w-5 rounded-full bg-white shadow-sm transition-transform " + (state.enabled ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-black text-[#0b2d54]">Days</p>
                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {DAYS.map(([label, day]) => {
                      const selected = state.daysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          aria-pressed={selected}
                          title={selected ? `${label}: reminders on` : `${label}: reminders off`}
                          className={"rounded-xl border px-1 py-2.5 text-[10px] font-black transition " + (selected
                            ? "border-[#0b2d54] bg-[#0b2d54] text-white shadow-[0_5px_12px_rgba(11,45,84,.12)]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            {selected ? <span aria-hidden="true" className="text-[9px] text-[#24c1c4]">✓</span> : null}
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {isWeekly
                      ? "Choose the day you take this medicine."
                      : "Tap a day to turn reminders on or off. Navy with ✓ means reminders are active."}
                  </p>
                  {!isWeekly && (
                    <p className="mt-1 text-[10px] font-semibold text-[#0b2d54]">
                      {state.daysOfWeek.length === 7
                        ? "Active every day"
                        : state.daysOfWeek.length === 0
                          ? "No days selected"
                          : `Active: ${DAYS.filter(([, day]) => state.daysOfWeek.includes(day)).map(([label]) => label).join(", ")}`}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-[#0b2d54]">Reminder times</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Set one reminder time for each scheduled dose.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[9px] font-black text-[#0b7b80]">
                      {doseCount} {doseCount === 1 ? "time" : "times"}
                    </span>
                  </div>

                  <div className="mt-2 space-y-2">
                    {Array.from({ length: doseCount }, (_, index) => {
                      const time = state.times[index] ?? defaultTimes(doseCount)[index] ?? "08:00";
                      return (
                        <label key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e8f8f7] text-[#0b7b80]">
                            <Clock3 className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Dose {index + 1}</span>
                            <input
                              type="time"
                              value={time}
                              onChange={(event) => updateTime(index, event.target.value)}
                              className="mt-0.5 w-full bg-transparent text-sm font-black text-[#0b2d54] outline-none"
                            />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[10px] leading-5 text-slate-400">
                  Reminders stay active while this medication remains active. Turning the medication off, completing it, discontinuing it or removing it stops future reminders automatically.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void save(false)}
                    disabled={loading}
                    className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#0b2d54] disabled:opacity-50"
                  >
                    Turn off
                  </button>
                  <button
                    type="button"
                    onClick={() => void save(true)}
                    disabled={loading}
                    className="min-h-10 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-3 text-xs font-black text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 text-[#24c1c4]" />
                    Save reminders
                  </button>
                </div>
              </>
            )}

            {supported && !loading && (
              <p className="text-[10px] text-slate-400">
                {state.enabled ? "Your selected times repeat automatically until this medication is no longer active." : "Choose the days and times, then turn reminders on."}
              </p>
            )}

            {loading && <p className="text-center text-[11px] font-semibold text-slate-400">Loading…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
