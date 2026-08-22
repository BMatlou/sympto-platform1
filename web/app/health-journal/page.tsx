"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ClipboardList,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  Plus,
  Sparkles,
  CheckCircle,
  Save,
  Smile,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { useHealthJournal } from "@/hooks/use-health-journal";

import type {
  CreateHealthJournalDto,
  HealthJournalMood,
  SleepQuality,
  EnergyLevel,
  HealthJournal,
} from "@/types/health-journal";

export default function HealthJournalPage() {
  const { data: dashboard, loading } =
    useDashboard();

  const {
    entries,
    loading: journalLoading,
    saving,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useHealthJournal();

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [journal, setJournal] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [mood, setMood] =
    useState<HealthJournalMood | "">("");

  const [sleepQuality, setSleepQuality] =
    useState<SleepQuality | "">("");

  const [sleepHours, setSleepHours] =
    useState("");

  const [energyLevel, setEnergyLevel] =
    useState<EnergyLevel | "">("");

  const [stressLevel, setStressLevel] =
    useState("");

  const [waterIntakeMl, setWaterIntakeMl] =
    useState("");

  const [exerciseMinutes, setExerciseMinutes] =
    useState("");

  const [weightKg, setWeightKg] =
    useState("");

  const [temperature, setTemperature] =
    useState("");

  const [
    bloodPressureSystolic,
    setBloodPressureSystolic,
  ] = useState("");

  const [
    bloodPressureDiastolic,
    setBloodPressureDiastolic,
  ] = useState("");

  const [heartRate, setHeartRate] =
    useState("");

  const [oxygenSaturation, setOxygenSaturation] =
    useState("");

  const [respiratoryRate, setRespiratoryRate] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const journalSettings =
    dashboard?.healthJournalSettings ??
    dashboard?.patient?.healthJournalSettings ??
    null;

  const trackingOptions = [
    {
      key: "trackSymptoms",
      label: "Symptoms",
      description:
        "Record symptoms and how you are feeling.",
      icon: HeartPulse,
      enabled:
        journalSettings?.trackSymptoms,
      iconClass:
        "bg-rose-50 text-rose-600",
    },
    {
      key: "trackMood",
      label: "Mood",
      description:
        "Keep track of your mood and wellbeing.",
      icon: Smile,
      enabled:
        journalSettings?.trackMood,
      iconClass:
        "bg-violet-50 text-violet-600",
    },
    {
      key: "trackSleep",
      label: "Sleep",
      description:
        "Record your sleep and rest.",
      icon: Moon,
      enabled:
        journalSettings?.trackSleep,
      iconClass:
        "bg-blue-50 text-blue-600",
    },
    {
      key: "trackWater",
      label: "Water",
      description:
        "Keep track of your daily water intake.",
      icon: Droplets,
      enabled:
        journalSettings?.trackWater,
      iconClass:
        "bg-cyan-50 text-cyan-600",
    },
    {
      key: "trackExercise",
      label: "Exercise",
      description:
        "Record physical activity and exercise.",
      icon: Dumbbell,
      enabled:
        journalSettings?.trackExercise,
      iconClass:
        "bg-emerald-50 text-emerald-600",
    },
    {
      key: "trackVitals",
      label: "Vitals",
      description:
        "Record measurements and vital signs.",
      icon: Thermometer,
      enabled:
        journalSettings?.trackVitals,
      iconClass:
        "bg-orange-50 text-orange-600",
    },
  ];

  const enabledTrackingOptions =
    trackingOptions.filter(
      (option) => option.enabled,
    );

  const resetForm = () => {
    setEditingId(null);

    setTitle("");
    setJournal("");

    setMood("");
    setSleepQuality("");
    setSleepHours("");

    setEnergyLevel("");
    setStressLevel("");

    setWaterIntakeMl("");
    setExerciseMinutes("");

    setWeightKg("");
    setTemperature("");

    setBloodPressureSystolic("");
    setBloodPressureDiastolic("");

    setHeartRate("");
    setOxygenSaturation("");
    setRespiratoryRate("");

    setNotes("");
  };

  const handleSaveEntry = async () => {
    if (!journal.trim()) {
      return;
    }

    const dto: CreateHealthJournalDto = {
      journal: journal.trim(),

      ...(title.trim()
        ? {
            title: title.trim(),
          }
        : {}),

      ...(mood
        ? {
            mood,
          }
        : {}),

      ...(sleepQuality
        ? {
            sleepQuality,
          }
        : {}),

      ...(sleepHours
        ? {
            sleepHours,
          }
        : {}),

      ...(energyLevel
        ? {
            energyLevel,
          }
        : {}),

      ...(stressLevel
        ? {
            stressLevel:
              Number(stressLevel),
          }
        : {}),

      ...(waterIntakeMl
        ? {
            waterIntakeMl:
              Number(waterIntakeMl),
          }
        : {}),

      ...(exerciseMinutes
        ? {
            exerciseMinutes:
              Number(exerciseMinutes),
          }
        : {}),

      ...(weightKg
        ? {
            weightKg,
          }
        : {}),

      ...(temperature
        ? {
            temperature,
          }
        : {}),

      ...(bloodPressureSystolic
        ? {
            bloodPressureSystolic:
              Number(
                bloodPressureSystolic,
              ),
          }
        : {}),

      ...(bloodPressureDiastolic
        ? {
            bloodPressureDiastolic:
              Number(
                bloodPressureDiastolic,
              ),
          }
        : {}),

      ...(heartRate
        ? {
            heartRate:
              Number(heartRate),
          }
        : {}),

      ...(oxygenSaturation
        ? {
            oxygenSaturation,
          }
        : {}),

      ...(respiratoryRate
        ? {
            respiratoryRate:
              Number(
                respiratoryRate,
              ),
          }
        : {}),

      ...(notes.trim()
        ? {
            notes: notes.trim(),
          }
        : {}),
    };

    try {
      if (editingId) {
        await updateEntry(
          editingId,
          dto,
        );
      } else {
        await createEntry(dto);
      }

      resetForm();
      setShowForm(false);
    } catch {
      // The hook stores the error.
    }
  };

  const handleEditEntry = (
    entry: HealthJournal,
  ) => {
    setEditingId(entry.id);

    setTitle(entry.title ?? "");
    setJournal(entry.journal ?? "");

    setMood(entry.mood ?? "");
    setSleepQuality(
      entry.sleepQuality ?? "",
    );

    setSleepHours(
      entry.sleepHours ?? "",
    );

    setEnergyLevel(
      entry.energyLevel ?? "",
    );

    setStressLevel(
      entry.stressLevel != null
        ? String(entry.stressLevel)
        : "",
    );

    setWaterIntakeMl(
      entry.waterIntakeMl != null
        ? String(entry.waterIntakeMl)
        : "",
    );

    setExerciseMinutes(
      entry.exerciseMinutes != null
        ? String(entry.exerciseMinutes)
        : "",
    );

    setWeightKg(
      entry.weightKg ?? "",
    );

    setTemperature(
      entry.temperature ?? "",
    );

    setBloodPressureSystolic(
      entry.bloodPressureSystolic != null
        ? String(
            entry.bloodPressureSystolic,
          )
        : "",
    );

    setBloodPressureDiastolic(
      entry.bloodPressureDiastolic != null
        ? String(
            entry.bloodPressureDiastolic,
          )
        : "",
    );

    setHeartRate(
      entry.heartRate != null
        ? String(entry.heartRate)
        : "",
    );

    setOxygenSaturation(
      entry.oxygenSaturation ?? "",
    );

    setRespiratoryRate(
      entry.respiratoryRate != null
        ? String(
            entry.respiratoryRate,
          )
        : "",
    );

    setNotes(entry.notes ?? "");

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteEntry = async (
    id: string,
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this journal entry?",
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEntry(id);

      if (editingId === id) {
        resetForm();
        setShowForm(false);
      }
    } catch {
      // The hook stores the error.
    }
  };


return (
  <ProtectedRoute>
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#0B5CAD]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAF3FB] px-2.5 py-1 text-xs font-semibold text-[#0B5CAD]">
              <ClipboardList className="h-3.5 w-3.5" />
              Health Companion
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Your health journal
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              A simple space to check in, understand your health patterns,
              and keep track of what matters.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
              }

              setShowForm((current) => !current);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#084987]"
          >
            {showForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {showForm ? "Close" : "New entry"}
          </button>
        </div>

        {/* Loading */}
        {loading || journalLoading ? (
          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
            Loading your health history...
          </div>
        ) : null}

        {/* Error */}
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {/* Smart Journal */}
        {showForm ? (
          <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            {/* Form header */}
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Smart check-in
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
                    ? "Update your entry"
                    : "How are you feeling today?"}
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Tell us what the system cannot know. We'll keep the
                  health information you've already logged with this entry.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-7">
              {/* Mood */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-800">
                  How are you feeling?
                </label>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    {
                      value: "VERY_BAD",
                      label: "Rough",
                      emoji: "😞",
                    },
                    {
                      value: "BAD",
                      label: "Low",
                      emoji: "😕",
                    },
                    {
                      value: "NEUTRAL",
                      label: "Okay",
                      emoji: "😐",
                    },
                    {
                      value: "GOOD",
                      label: "Good",
                      emoji: "🙂",
                    },
                    {
                      value: "VERY_GOOD",
                      label: "Great",
                      emoji: "😁",
                    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setMood(
                          item.value as HealthJournalMood,
                        )
                      }
                      className={`rounded-xl border px-2 py-3 transition-all ${
                        mood === item.value
                          ? "border-[#0B5CAD] bg-[#EAF3FB] text-[#0B5CAD] shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xl">
                        {item.emoji}
                      </div>

                      <div className="mt-1 text-xs font-semibold">
                        {item.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-800">
                  How's your energy?
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      value: "LOW",
                      label: "Low",
                    },
                    {
                      value: "NORMAL",
                      label: "Steady",
                    },
                    {
                      value: "HIGH",
                      label: "High",
                    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setEnergyLevel(
                          item.value as EnergyLevel,
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        energyLevel === item.value
                          ? "border-[#0B5CAD] bg-[#EAF3FB] text-[#0B5CAD]"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Narrative */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  What would you like to remember about today?
                </label>

                <textarea
                  value={journal}
                  onChange={(event) =>
                    setJournal(event.target.value)
                  }
                  rows={4}
                  placeholder="Anything unusual, a symptom you're noticing, how your day went, or something you want to remember..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition-all placeholder:text-slate-400 focus:border-[#0B5CAD] focus:ring-4 focus:ring-[#0B5CAD]/5"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Optional — add as much or as little as you like.
                </p>
              </div>

              {/* Automatically captured */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Already captured for today
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Health information you've already logged can be
                      included with this entry.
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Synced
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {sleepHours && (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600">
                      💤 Sleep:{" "}
                      <span className="font-semibold text-slate-800">
                        {sleepHours}h
                      </span>
                    </div>
                  )}

                  {exerciseMinutes && (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600">
                      🏃 Activity:{" "}
                      <span className="font-semibold text-slate-800">
                        {exerciseMinutes} min
                      </span>
                    </div>
                  )}

                  {waterIntakeMl && (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600">
                      💧 Water:{" "}
                      <span className="font-semibold text-slate-800">
                        {waterIntakeMl} ml
                      </span>
                    </div>
                  )}

                  {heartRate && (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600">
                      ❤️ Heart rate:{" "}
                      <span className="font-semibold text-slate-800">
                        {heartRate} bpm
                      </span>
                    </div>
                  )}

                  {bloodPressureSystolic ||
                  bloodPressureDiastolic ? (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600">
                      🩺 Blood pressure:{" "}
                      <span className="font-semibold text-slate-800">
                        {bloodPressureSystolic || "—"} /{" "}
                        {bloodPressureDiastolic || "—"}
                      </span>
                    </div>
                  ) : null}

                  {oxygenSaturation && (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-600">
                      🫁 Oxygen:{" "}
                      <span className="font-semibold text-slate-800">
                        {oxygenSaturation}%
                      </span>
                    </div>
                  )}

                  {!sleepHours &&
                    !exerciseMinutes &&
                    !waterIntakeMl &&
                    !heartRate &&
                    !bloodPressureSystolic &&
                    !bloodPressureDiastolic &&
                    !oxygenSaturation && (
                      <div className="sm:col-span-2 rounded-xl bg-white px-3 py-3 text-xs text-slate-500">
                        No additional health measurements have been
                        recorded yet today.
                      </div>
                    )}
                </div>
              </div>

              {/* Optional additional metrics */}
              <details className="group rounded-2xl border border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#0B5CAD]" />
                    Add or update health measurements
                  </span>

                  <span className="text-slate-400 transition-transform group-open:rotate-45">
                    <Plus className="h-4 w-4" />
                  </span>
                </summary>

                <div className="border-t border-slate-100 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Sleep quality
                      </label>

                      <select
                        value={sleepQuality}
                        onChange={(event) =>
                          setSleepQuality(
                            event.target.value as
                              | SleepQuality
                              | "",
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      >
                        <option value="">
                          Not recorded
                        </option>
                        <option value="VERY_POOR">
                          Very poor
                        </option>
                        <option value="POOR">
                          Poor
                        </option>
                        <option value="FAIR">
                          Fair
                        </option>
                        <option value="GOOD">
                          Good
                        </option>
                        <option value="EXCELLENT">
                          Excellent
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Sleep hours
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={sleepHours}
                        onChange={(event) =>
                          setSleepHours(event.target.value)
                        }
                        placeholder="7.5"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Weight (kg)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={weightKg}
                        onChange={(event) =>
                          setWeightKg(event.target.value)
                        }
                        placeholder="72.5"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Temperature (°C)
                      </label>

                      <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(event) =>
                          setTemperature(event.target.value)
                        }
                        placeholder="36.8"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Heart rate (bpm)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={heartRate}
                        onChange={(event) =>
                          setHeartRate(event.target.value)
                        }
                        placeholder="72"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Breathing rate
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={respiratoryRate}
                        onChange={(event) =>
                          setRespiratoryRate(
                            event.target.value,
                          )
                        }
                        placeholder="16 / min"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Blood pressure (Top / Systolic)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={bloodPressureSystolic}
                        onChange={(event) =>
                          setBloodPressureSystolic(
                            event.target.value,
                          )
                        }
                        placeholder="120"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Blood pressure (Bottom)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={bloodPressureDiastolic}
                        onChange={(event) =>
                          setBloodPressureDiastolic(
                            event.target.value,
                          )
                        }
                        placeholder="80"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Oxygen saturation
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={oxygenSaturation}
                        onChange={(event) =>
                          setOxygenSaturation(
                            event.target.value,
                          )
                        }
                        placeholder="98%"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Water (ml)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={waterIntakeMl}
                        onChange={(event) =>
                          setWaterIntakeMl(
                            event.target.value,
                          )
                        }
                        placeholder="1500"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Exercise (minutes)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={exerciseMinutes}
                        onChange={(event) =>
                          setExerciseMinutes(
                            event.target.value,
                          )
                        }
                        placeholder="30"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0B5CAD]"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    saving || !journal.trim()
                  }
                  onClick={handleSaveEntry}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#084987] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {editingId
                        ? "Save changes"
                        : "Log today's health"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* Customise Tracking */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Customise what you track
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the health information that matters to you.
            </p>
          </div>

          {enabledTrackingOptions.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-sm leading-6 text-slate-500">
                No additional tracking options have been enabled yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enabledTrackingOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#BFD8EE] hover:shadow-md"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${option.iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 font-semibold text-slate-900">
                      {option.label}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Entries */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent entries
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your health story, all in one place.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF3FB] text-[#0B5CAD]">
                <ClipboardList className="h-7 w-7" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Your health story starts here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your journal will bring together the things Sympto
                already knows about your day and the things only you
                can tell us.
              </p>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#084987]"
              >
                <Plus className="h-4 w-4" />
                Start today's check-in
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const hasAdditionalMetrics =
                  entry.exerciseMinutes != null ||
                  entry.waterIntakeMl != null ||
                  entry.weightKg != null ||
                  entry.temperature != null ||
                  entry.bloodPressureSystolic != null ||
                  entry.bloodPressureDiastolic != null ||
                  entry.heartRate != null ||
                  entry.oxygenSaturation != null ||
                  entry.respiratoryRate != null;

                const createdDate = new Date(
                  entry.createdAt,
                );

                const today = new Date();

                const yesterday = new Date();
                yesterday.setDate(
                  yesterday.getDate() - 1,
                );

                const isToday =
                  createdDate.toDateString() ===
                  today.toDateString();

                const isYesterday =
                  createdDate.toDateString() ===
                  yesterday.toDateString();

                const relativeLabel = isToday
                  ? "Today"
                  : isYesterday
                    ? "Yesterday"
                    : null;

                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-[#BFD8EE] hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FB] text-[#0B5CAD]">
                        <ClipboardList className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {entry.title ||
                                "Daily health check-in"}
                            </h3>

                            <p className="mt-1 text-xs font-medium text-slate-400">
                              {createdDate.toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}

                              {relativeLabel ? (
                                <>
                                  {" "}
                                  <span className="text-slate-300">
                                    •
                                  </span>{" "}
                                  <span className="text-[#0B5CAD]">
                                    {relativeLabel}
                                  </span>
                                </>
                              ) : null}
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEditEntry(entry)
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#BFD8EE] hover:bg-slate-50 hover:text-[#0B5CAD]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                handleDeleteEntry(
                                  entry.id,
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {entry.journal}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {entry.mood && (
                            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium capitalize text-violet-700">
                              Mood:{" "}
                              {entry.mood
                                .replaceAll("_", " ")
                                .toLowerCase()}
                            </span>
                          )}

                          {entry.energyLevel && (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium capitalize text-amber-700">
                              Energy:{" "}
                              {entry.energyLevel
                                .replaceAll("_", " ")
                                .toLowerCase()}
                            </span>
                          )}

                          {entry.sleepQuality && (
                            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium capitalize text-blue-700">
                              Sleep:{" "}
                              {entry.sleepQuality
                                .replaceAll("_", " ")
                                .toLowerCase()}
                            </span>
                          )}

                          {entry.sleepHours != null && (
                            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
                              {entry.sleepHours}h sleep
                            </span>
                          )}

                          {entry.stressLevel != null && (
                            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                              Stress: {entry.stressLevel}/10
                            </span>
                          )}
                        </div>

                        {hasAdditionalMetrics ? (
                          <details className="group mt-4">
                            <summary className="cursor-pointer list-none text-xs font-semibold text-[#0B5CAD]">
                              <span className="group-open:hidden">
                                View health measurements
                              </span>

                              <span className="hidden group-open:inline">
                                Hide health measurements
                              </span>
                            </summary>

                            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                              {entry.exerciseMinutes != null && (
                                <div className="text-sm text-slate-600">
                                  🏃 Exercise:{" "}
                                  {entry.exerciseMinutes} min
                                </div>
                              )}

                              {entry.waterIntakeMl != null && (
                                <div className="text-sm text-slate-600">
                                  💧 Water:{" "}
                                  {entry.waterIntakeMl} ml
                                </div>
                              )}

                              {entry.weightKg != null && (
                                <div className="text-sm text-slate-600">
                                  ⚖️ Weight:{" "}
                                  {entry.weightKg} kg
                                </div>
                              )}

                              {entry.temperature != null && (
                                <div className="text-sm text-slate-600">
                                  🌡️ Temperature:{" "}
                                  {entry.temperature} °C
                                </div>
                              )}

                              {(entry.bloodPressureSystolic != null ||
                                entry.bloodPressureDiastolic !=
                                  null) && (
                                <div className="text-sm text-slate-600">
                                  🩺 BP:{" "}
                                  {entry.bloodPressureSystolic ??
                                    "—"}
                                  /
                                  {entry.bloodPressureDiastolic ??
                                    "—"}
                                </div>
                              )}

                              {entry.heartRate != null && (
                                <div className="text-sm text-slate-600">
                                  ❤️ Heart rate:{" "}
                                  {entry.heartRate} bpm
                                </div>
                              )}

                              {entry.oxygenSaturation != null && (
                                <div className="text-sm text-slate-600">
                                  🫁 Oxygen:{" "}
                                  {entry.oxygenSaturation}%
                                </div>
                              )}

                              {entry.respiratoryRate != null && (
                                <div className="text-sm text-slate-600">
                                  🫁 Breathing rate:{" "}
                                  {entry.respiratoryRate}/min
                                </div>
                              )}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  </ProtectedRoute>
);
}             