export type BloodPressureSafetyStage = "initial" | "symptoms" | "review" | "emergency" | "resolved";

export const BLOOD_PRESSURE_SAFETY_SYMPTOMS = [
  "Chest pain",
  "Shortness of breath",
  "Severe or unusual back pain",
  "Numbness",
  "Weakness",
  "Change in vision",
  "Difficulty speaking",
  "Another new or concerning symptom",
] as const;

export const BLOOD_PRESSURE_REMINDER_COPY = [
  {
    title: "Time for your blood pressure check",
    body: "Take a few quiet minutes this morning, then record your blood pressure in Health Vitals.",
  },
  {
    title: "Before you measure",
    body: "Sit and rest for a few minutes before checking your blood pressure. Save today's reading in Health Vitals.",
  },
  {
    title: "Make it part of your routine",
    body: "After your morning routine, take your blood pressure and save the reading in Health Vitals.",
  },
] as const;

export function isVeryHighBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
) {
  const systolicValue = Number(systolic);
  const diastolicValue = Number(diastolic);
  return (
    (Number.isFinite(systolicValue) && systolicValue >= 180) ||
    (Number.isFinite(diastolicValue) && diastolicValue >= 120)
  );
}

export function bloodPressureCategory(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
) {
  const s = Number(systolic);
  const d = Number(diastolic);
  if (!Number.isFinite(s) && !Number.isFinite(d)) return "UNKNOWN" as const;
  if ((Number.isFinite(s) && s >= 180) || (Number.isFinite(d) && d >= 120)) return "VERY_HIGH" as const;
  if ((Number.isFinite(s) && s >= 140) || (Number.isFinite(d) && d >= 90)) return "STAGE_2_RANGE" as const;
  if ((Number.isFinite(s) && s >= 130) || (Number.isFinite(d) && d >= 80)) return "STAGE_1_RANGE" as const;
  if (Number.isFinite(s) && s >= 120 && Number.isFinite(d) && d < 80) return "ELEVATED_RANGE" as const;
  return "BELOW_120_80_RANGE" as const;
}
