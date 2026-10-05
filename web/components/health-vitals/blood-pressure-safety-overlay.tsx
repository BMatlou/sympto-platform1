"use client";

import { AlertTriangle, CheckCircle2, PhoneCall, RotateCcw, ShieldAlert, X } from "lucide-react";
import { BLOOD_PRESSURE_SAFETY_SYMPTOMS, type BloodPressureSafetyStage } from "@/lib/blood-pressure-safety";

type Props = {
  stage: BloodPressureSafetyStage;
  systolic: number;
  diastolic: number;
  initialSystolic?: number;
  initialDiastolic?: number;
  selectedSymptoms: string[];
  onToggleSymptom: (symptom: string) => void;
  onRepeat: () => void;
  onContinueSymptoms: () => void;
  onClose: () => void;
};

export default function BloodPressureSafetyOverlay({
  stage,
  systolic,
  diastolic,
  initialSystolic,
  initialDiastolic,
  selectedSymptoms,
  onToggleSymptom,
  onRepeat,
  onContinueSymptoms,
  onClose,
}: Props) {
  const emergency = stage === "emergency";
  const review = stage === "review";
  const symptoms = stage === "symptoms";
  const resolved = stage === "resolved";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071b2d]/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="blood-pressure-safety-title"
        className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(2,18,35,.3)]"
      >
        <header className={emergency ? "flex items-start justify-between gap-4 bg-[#7f1d1d] p-5 text-white sm:p-6" : review || symptoms || !resolved ? "flex items-start justify-between gap-4 bg-[#fff7ed] p-5 text-[#0b2d54] sm:p-6" : "flex items-start justify-between gap-4 bg-[#effaf7] p-5 text-[#0b2d54] sm:p-6"}>
          <div className="flex gap-3">
            <span className={emergency ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-white" : review || symptoms || !resolved ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-900" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#0b7b80]"}>
              {emergency ? <ShieldAlert className="h-5 w-5" /> : resolved ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div>
              <p className={emergency ? "text-[9px] font-black uppercase tracking-[.16em] text-white/70" : "text-[9px] font-black uppercase tracking-[.16em] text-[#7d8d99]"}>Blood pressure safety</p>
              <h2 id="blood-pressure-safety-title" className={emergency ? "mt-1 text-xl font-black tracking-[-.04em] text-white" : "mt-1 text-xl font-black tracking-[-.04em] text-[#0b2d54]"}>
                {emergency ? "Get emergency medical help now" : review ? "Your repeat reading is still very high" : symptoms ? "How are you feeling?" : resolved ? "Your repeat reading is lower" : "Very high blood pressure reading"}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={emergency ? "grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white" : "grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500 ring-1 ring-[#dce7eb]"}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5 sm:p-6">
          {stage === "initial" && (
            <>
              <p className="text-sm leading-6 text-[#485e6c]">
                Your reading was <strong className="text-[#0b2d54]">{systolic}/{diastolic} mmHg</strong>. This is very high. Sit quietly and repeat the measurement after at least 1 minute.
              </p>
              <p className="mt-3 text-xs leading-5 text-[#718391]">
                Sympto has saved the reading to your health record. Do not change or stop prescribed medication based on this alert.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#d8e5e9] bg-white px-4 text-xs font-black text-[#0b2d54]">Done for now</button>
                <button type="button" onClick={onRepeat} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-5 text-xs font-black text-white"><RotateCcw className="h-4 w-4 text-[#24c1c4]" />Repeat measurement</button>
              </div>
            </>
          )}

          {stage === "symptoms" && (
            <>
              <p className="text-sm leading-6 text-[#485e6c]">
                Your repeat reading was <strong className="text-[#0b2d54]">{systolic}/{diastolic} mmHg</strong> and remains very high.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#718391]">Select any new or concerning symptoms you are experiencing right now.</p>
              <div className="mt-4 space-y-2">
                {BLOOD_PRESSURE_SAFETY_SYMPTOMS.map((symptom) => {
                  const selected = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleSymptom(symptom)}
                      className={selected ? "flex min-h-11 w-full items-center justify-between rounded-xl border border-[#0b2d54] bg-[#f1f7f8] px-3.5 py-2.5 text-left text-xs font-bold text-[#0b2d54]" : "flex min-h-11 w-full items-center justify-between rounded-xl border border-[#dde8eb] bg-white px-3.5 py-2.5 text-left text-xs font-bold text-[#617583]"}
                    >
                      <span>{symptom}</span>
                      <span className={selected ? "h-4 w-4 rounded-full border-2 border-[#24c1c4] bg-[#24c1c4] shadow-[inset_0_0_0_3px_white]" : "h-4 w-4 rounded-full border-2 border-[#c9d8dd]"} />
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={onContinueSymptoms} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0b2d54] px-4 text-xs font-black text-white">Continue</button>
            </>
          )}

          {review && (
            <>
              <p className="text-sm leading-6 text-[#485e6c]">
                Your repeat reading was <strong className="text-[#0b2d54]">{systolic}/{diastolic} mmHg</strong>. Contact your healthcare professional as soon as possible for advice about what to do next.
              </p>
              <p className="mt-3 text-xs leading-5 text-[#718391]">
                This alert is based on the reading you recorded. Sympto does not diagnose hypertension or replace professional medical care.
              </p>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-[#0b2d54] px-5 text-xs font-black text-white">Close</button>
              </div>
            </>
          )}

          {emergency && (
            <>
              <p className="text-sm font-bold leading-6 text-[#5a1b1b]">
                Your repeat blood-pressure reading is very high and you reported symptoms that can require emergency medical attention.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#5a1b1b]">
                <strong>Call 112 now</strong> or use your local emergency service. Do not wait to see whether the reading comes down on its own.
              </p>
              <p className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-3 text-[10px] leading-5 text-[#6f2020]">
                Sympto does not diagnose medical emergencies or replace professional medical care. This alert is based on the blood-pressure reading and symptoms you reported. Seek emergency medical care now.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#d8e5e9] bg-white px-4 text-xs font-black text-[#0b2d54]">Close</button>
                <a href="tel:112" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8f2020] px-5 text-xs font-black text-white"><PhoneCall className="h-4 w-4" />Call 112</a>
              </div>
            </>
          )}

          {resolved && (
            <>
              <p className="text-sm leading-6 text-[#485e6c]">
                Your first reading was <strong className="text-[#0b2d54]">{initialSystolic}/{initialDiastolic} mmHg</strong> and your repeat reading was <strong className="text-[#0b2d54]">{systolic}/{diastolic} mmHg</strong>.
              </p>
              <p className="mt-3 text-xs leading-5 text-[#718391]">
                Keep both readings in your health record. If you remain concerned or continue getting high readings, contact your healthcare professional.
              </p>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-[#0b2d54] px-5 text-xs font-black text-white">Close</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
