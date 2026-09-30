"use client";

import Link from "next/link";
import { ArrowRight, Check, Plus, Sparkles, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthGoalsService, type NutritionFood } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";

type Props = {
  goal: any;
  onUpdated?: () => Promise<void> | void;
};

type NutritionItem = {
  id: string;
  foodName: string;
  fdcId?: string;
  grams: number;
  calories: number;
  protein: number | null;
  fibre: number | null;
  source: string;
};

type NutritionMeal = {
  id: string;
  mealType: string;
  mealName: string;
  calories: number;
  protein: number;
  fibre: number;
  items: NutritionItem[];
  occurredAt: string;
};

type NutritionEvent = {
  id: string;
  loggedValue: number;
  occurredAt: string;
  source: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TodayCheckIn = {
  sleepHours: number | null;
  sleepQuality: string | null;
  exerciseMinutes: number | null;
  waterIntakeMl: number | null;
};

type NutritionInsight = {
  title: string;
  text: string;
};

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function journeyFor(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? ""));
  const targetDate = new Date(String(goal?.targetDate ?? ""));
  const now = Date.now();

  return {
    journeyDay: Number.isNaN(startDate.getTime())
      ? 1
      : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1),
    daysLeft: Number.isNaN(targetDate.getTime())
      ? null
      : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000)),
  };
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function targetFor(goal: any) {
  return numberOrNull(
    goal?.metricConfig?.frequencyTarget ??
      goal?.frequencyTarget ??
      goal?.targetValue,
  );
}

function nutritionTargetReview(target: number | null) {
  if (target == null || !Number.isFinite(target) || target <= 0 || target > 1200) return null;

  if (target < 800) {
    return {
      tone: "strong" as const,
      text: "This target is below 800 calories/day. Sympto is flagging it for clinical review rather than recommending it. Very-low-energy diets should only be used in appropriate specialist-supported circumstances.",
    };
  }

  return {
    tone: "review" as const,
    text: "This target is within the 800–1,200 calories/day low-energy range. Current NICE guidance recommends this range only within a specialist-supported, multicomponent approach for eligible adults, with ongoing clinical support, and for no more than 12 weeks.",
  };
}

function metadataMeal(event: NutritionEvent): NutritionMeal | null {
  const metadata = event.metadata;
  if (!metadata || String(metadata.kind ?? "") !== "nutrition-meal") return null;

  const items = Array.isArray(metadata.items)
    ? metadata.items
        .map((item: any, index: number) => ({
          id: String(item?.id ?? index),
          foodName: String(item?.foodName ?? "Food"),
          fdcId: item?.fdcId ? String(item.fdcId) : undefined,
          grams: Number(item?.grams ?? 0),
          calories: Number(item?.calories ?? 0),
          protein: numberOrNull(item?.protein),
          fibre: numberOrNull(item?.fibre),
          source: String(item?.source ?? "USDA FoodData Central"),
        }))
        .filter((item) => Number.isFinite(item.calories))
    : [];

  return {
    id: event.id,
    mealType: String(metadata.mealType ?? "Meal"),
    mealName: String(metadata.mealName ?? "Meal"),
    calories: Number(metadata.calories ?? event.loggedValue ?? 0),
    protein: Number(metadata.protein ?? 0),
    fibre: Number(metadata.fibre ?? 0),
    items,
    occurredAt: event.occurredAt,
  };
}

function extractFoodSearchTerm(value: string) {
  const clean = value.trim().replace(/\s+/g, " ");
  const match = clean.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return { quantity: 1, query: clean };
  return { quantity: Math.max(1, Number(match[1])), query: match[2].trim() };
}

function localTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isTodayJournal(entry: any) {
  if (String(entry?.title ?? "") !== "Daily Health Check-in") return false;
  const createdAt = new Date(String(entry?.createdAt ?? ""));
  const now = new Date();
  return (
    Number.isFinite(createdAt.getTime()) &&
    createdAt.getFullYear() === now.getFullYear() &&
    createdAt.getMonth() === now.getMonth() &&
    createdAt.getDate() === now.getDate()
  );
}

function journalDayKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildNutritionInsights(
  todayTotal: number,
  target: number | null,
  nutritionEvents: NutritionEvent[],
  recentNutritionDays: Array<{ day: string; calories: number }>,
  recentCheckIns: Array<{
    day: string;
    sleepHours: number | null;
    waterIntakeMl: number | null;
    exerciseMinutes: number | null;
  }>,
): NutritionInsight[] {
  const insights: NutritionInsight[] = [];

  const nutritionByDay = new Map(
    recentNutritionDays.map((item) => [item.day, item.calories]),
  );
  const todayDay = journalDayKey(new Date());

  if (todayDay && todayTotal > 0) {
    nutritionByDay.set(todayDay, todayTotal);
  }

  const matched = recentCheckIns
    .map((checkIn) => ({
      ...checkIn,
      calories: nutritionByDay.get(checkIn.day),
    }))
    .filter((item) => item.calories != null);

  const priorDays = recentNutritionDays.filter(
    (item) => item.day !== todayDay && item.calories >= 0,
  );

  if (target != null && target > 0 && priorDays.length >= 3) {
    const recentAverage =
      priorDays.reduce((sum, item) => sum + Number(item.calories), 0) /
      priorDays.length;
    const difference = recentAverage - target;

    if (Math.abs(difference) >= 75) {
      insights.push({
        title: "Recent intake compared with your target",
        text:
          "Across " +
          priorDays.length +
          " recent recorded days, your average logged intake was about " +
          formatNumber(Math.abs(difference)) +
          " kcal " +
          (difference > 0 ? "above" : "below") +
          " the " +
          formatNumber(target) +
          " kcal daily target. This describes logged intake and does not recommend changing the target.",
      });
    }
  }

  // Pattern 1: sleep < 6h vs >= 6h, using full-day logged calories.
  const sleepMatched = matched.filter(
    (item) => item.sleepHours != null && Number.isFinite(Number(item.sleepHours)),
  );

  if (sleepMatched.length >= 6) {
    const lowerSleep = sleepMatched.filter((item) => Number(item.sleepHours) < 6);
    const usualSleep = sleepMatched.filter((item) => Number(item.sleepHours) >= 6);

    if (lowerSleep.length >= 3 && usualSleep.length >= 3) {
      const lowAverage =
        lowerSleep.reduce((sum, item) => sum + Number(item.calories), 0) /
        lowerSleep.length;
      const usualAverage =
        usualSleep.reduce((sum, item) => sum + Number(item.calories), 0) /
        usualSleep.length;
      const difference = lowAverage - usualAverage;

      if (Math.abs(difference) >= 100) {
        insights.push({
          title: "Sleep and logged intake show a pattern",
          text:
            "On " +
            lowerSleep.length +
            " days with less than 6 hours of recorded sleep, your logged daily intake averaged about " +
            formatNumber(Math.abs(difference)) +
            " kcal " +
            (difference > 0 ? "higher" : "lower") +
            " than on " +
            usualSleep.length +
            " days with 6 or more hours. This is an association in your records, not evidence that sleep caused the difference.",
        });
      }
    }
  }

  // Pattern 2: sleep < 6h vs >= 6h, specifically evening meal calories.
  const eveningByDay = new Map<string, number>();

  for (const event of nutritionEvents) {
    const meal = metadataMeal(event);
    if (!meal) continue;

    const mealType = meal.mealType.trim().toLowerCase();
    const mealTime = new Date(event.occurredAt);
    const hour = mealTime.getHours();

    const isEveningMeal =
      mealType === "dinner" ||
      mealType === "snack" ||
      hour >= 18;

    if (!isEveningMeal) continue;

    const day = journalDayKey(event.occurredAt);
    if (!day) continue;

    eveningByDay.set(
      day,
      (eveningByDay.get(day) ?? 0) + Number(meal.calories || event.loggedValue || 0),
    );
  }

  const eveningSleepMatched = recentCheckIns
    .map((checkIn) => ({
      ...checkIn,
      eveningCalories: eveningByDay.get(checkIn.day),
    }))
    .filter(
      (item) =>
        item.eveningCalories != null &&
        item.sleepHours != null &&
        Number.isFinite(Number(item.sleepHours)),
    );

  if (eveningSleepMatched.length >= 6) {
    const lowerSleep = eveningSleepMatched.filter(
      (item) => Number(item.sleepHours) < 6,
    );
    const usualSleep = eveningSleepMatched.filter(
      (item) => Number(item.sleepHours) >= 6,
    );

    if (lowerSleep.length >= 3 && usualSleep.length >= 3) {
      const lowAverage =
        lowerSleep.reduce((sum, item) => sum + Number(item.eveningCalories), 0) /
        lowerSleep.length;
      const usualAverage =
        usualSleep.reduce((sum, item) => sum + Number(item.eveningCalories), 0) /
        usualSleep.length;
      const difference = lowAverage - usualAverage;

      if (Math.abs(difference) >= 75) {
        insights.push({
          title: "Sleep and evening meals show a pattern",
          text:
            "On " +
            lowerSleep.length +
            " days with less than 6 hours of recorded sleep, your logged evening meals averaged about " +
            formatNumber(Math.abs(difference)) +
            " kcal " +
            (difference > 0 ? "higher" : "lower") +
            " than on " +
            usualSleep.length +
            " days with 6 or more hours. This is an association in your records, not evidence that sleep caused the difference.",
        });
      }
    }
  }

  // Pattern 3: hydration vs activity.
  const hydrationMatched = recentCheckIns.filter(
    (item) =>
      item.waterIntakeMl != null &&
      item.exerciseMinutes != null &&
      Number.isFinite(Number(item.waterIntakeMl)) &&
      Number.isFinite(Number(item.exerciseMinutes)),
  );

  if (hydrationMatched.length >= 6) {
    const lowerActivity = hydrationMatched.filter(
      (item) => Number(item.exerciseMinutes) < 30,
    );
    const higherActivity = hydrationMatched.filter(
      (item) => Number(item.exerciseMinutes) >= 30,
    );

    if (lowerActivity.length >= 3 && higherActivity.length >= 3) {
      const lowAverage =
        lowerActivity.reduce((sum, item) => sum + Number(item.waterIntakeMl), 0) /
        lowerActivity.length;
      const highAverage =
        higherActivity.reduce((sum, item) => sum + Number(item.waterIntakeMl), 0) /
        higherActivity.length;
      const difference = lowAverage - highAverage;

      if (Math.abs(difference) >= 250) {
        insights.push({
          title: "Hydration and activity show a pattern",
          text:
            "On " +
            lowerActivity.length +
            " days with less than 30 minutes of recorded activity, your water intake averaged about " +
            formatNumber(Math.abs(difference)) +
            " ml " +
            (difference > 0 ? "higher" : "lower") +
            " than on " +
            higherActivity.length +
            " days with 30 minutes or more. This is an association in your records, not evidence that activity caused the difference.",
        });
      }
    }
  }

  // Pattern 4: nutrition completeness and meal regularity.
  const mealsByDay = new Map<string, Set<string>>();
  for (const event of nutritionEvents) {
    const meal = metadataMeal(event);
    if (!meal) continue;

    const day = journalDayKey(event.occurredAt);
    if (!day) continue;

    if (!mealsByDay.has(day)) mealsByDay.set(day, new Set());
    mealsByDay.get(day)?.add(meal.mealType.trim().toLowerCase());
  }

  const trackedMealDays = Array.from(mealsByDay.values()).filter(
    (mealTypes) => mealTypes.size > 0,
  );
  const completeMealDays = trackedMealDays.filter((mealTypes) =>
    ["breakfast", "lunch", "dinner"].every((meal) => mealTypes.has(meal)),
  );

  if (trackedMealDays.length >= 5 && completeMealDays.length >= 3) {
    insights.push({
      title: "Meal logging consistency",
      text:
        "You have recorded at least one meal on " +
        trackedMealDays.length +
        " recent days, with breakfast, lunch and dinner all represented on " +
        completeMealDays.length +
        " of those days. More consistent logging gives Sympto better data for identifying personal nutrition patterns.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Not enough data yet",
      text:
        "Sympto needs more recorded days of nutrition and supporting health data before it can identify a meaningful personal pattern or comparison.",
    });
  }

  return insights.slice(0, 4);
}
export default function TodayNutritionGoal({ goal, onUpdated }: Props) {
  const [events, setEvents] = useState<NutritionEvent[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<TodayCheckIn | null>(null);
  const [recentNutritionDays, setRecentNutritionDays] = useState<Array<{ day: string; calories: number }>>([]);
  const [recentNutritionEvents, setRecentNutritionEvents] = useState<NutritionEvent[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<Array<{ day: string; sleepHours: number | null; waterIntakeMl: number | null; exerciseMinutes: number | null }>>([]);
  const [foods, setFoods] = useState<NutritionFood[]>([]);
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState("Meal");
  const [selectedFood, setSelectedFood] = useState<NutritionFood | null>(null);
  const [grams, setGrams] = useState("");
  const [searchQuantity, setSearchQuantity] = useState(1);
  const [draftItems, setDraftItems] = useState<NutritionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const goalId = String(goal?.id ?? "");
  const target = targetFor(goal);
  const journey = useMemo(() => journeyFor(goal), [goal?.createdAt, goal?.targetDate]);

  const todayTotal = useMemo(
    () => events.reduce((sum, event) => sum + Number(event.loggedValue || 0), 0),
    [events],
  );

  const todayProtein = useMemo(
    () => events.reduce((sum, event) => sum + Number(metadataMeal(event)?.protein ?? 0), 0),
    [events],
  );

  const todayFibre = useMemo(
    () => events.reduce((sum, event) => sum + Number(metadataMeal(event)?.fibre ?? 0), 0),
    [events],
  );

  const meals = useMemo(
    () => events.map(metadataMeal).filter(Boolean) as NutritionMeal[],
    [events],
  );

  const remaining = target == null ? null : target - todayTotal;
  const overTarget = target != null && todayTotal > target;
  const targetReached = target != null && todayTotal >= target;
  const usagePercent = target != null && target > 0
    ? Math.min(100, Math.round((todayTotal / target) * 100))
    : 0;

  const draftCalories = draftItems.reduce((sum, item) => sum + item.calories, 0);
  const draftProtein = draftItems.reduce((sum, item) => sum + Number(item.protein ?? 0), 0);
  const draftFibre = draftItems.reduce((sum, item) => sum + Number(item.fibre ?? 0), 0);

  const nutritionInsights = useMemo(
    () =>
      buildNutritionInsights(
        todayTotal,
        target,
        recentNutritionEvents,
        recentNutritionDays,
        recentCheckIns,
      ),
    [
      todayTotal,
      target,
      recentNutritionEvents,
      recentNutritionDays,
      recentCheckIns,
    ],
  );

  async function loadToday() {
    if (!goalId) return;

    try {
      const { start, end } = todayBounds();
      const response = await healthGoalsService.getMetricEvents(
        "NUTRITION",
        "nutrition.calories",
        start,
        end,
        "goal-manual",
      );

      const loadedEvents = (response?.events ?? [])
        .map((event) => ({
          id: String(event.id),
          loggedValue: Number(event.loggedValue),
          occurredAt: String(event.occurredAt),
          source: String(event.source ?? ""),
          sourceId: event.sourceId ?? null,
          metadata: event.metadata ?? null,
        }))
        .filter((event) => Number.isFinite(event.loggedValue) && event.loggedValue >= 0);

      setEvents(loadedEvents);

      // Keep the longitudinal insight dataset current with today's newly
      // logged meals without waiting for the 14-day refresh effect.
      const currentDay = journalDayKey(new Date());
      setRecentNutritionEvents((current) => [
        ...current.filter((event) => journalDayKey(event.occurredAt) !== currentDay),
        ...loadedEvents,
      ]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadToday();

    const handleUpdated = () => void loadToday();
    window.addEventListener("sympto:health-goal-updated", handleUpdated);
    window.addEventListener("sympto:today-action-updated", handleUpdated);

    return () => {
      window.removeEventListener("sympto:health-goal-updated", handleUpdated);
      window.removeEventListener("sympto:today-action-updated", handleUpdated);
    };
  }, [goalId]);

  async function loadTodayCheckIn() {
    try {
      const response = await healthJournalService.getAll({ limit: 100 });
      const journals = Array.isArray(response.data) ? response.data : [];
      const entry = journals.find(isTodayJournal);
      setTodayCheckIn(
        entry
          ? {
              sleepHours: entry.sleepHours == null ? null : Number(entry.sleepHours),
              sleepQuality: entry.sleepQuality ?? null,
              exerciseMinutes: entry.exerciseMinutes == null ? null : Number(entry.exerciseMinutes),
              waterIntakeMl: entry.waterIntakeMl == null ? null : Number(entry.waterIntakeMl),
            }
          : null,
      );

      setRecentCheckIns(
        journals
          .filter((journal: any) => journal?.title === "Daily Health Check-in" && journal?.createdAt)
          .map((journal: any) => ({
            day: journalDayKey(journal.createdAt),
            sleepHours: journal.sleepHours == null ? null : Number(journal.sleepHours),
            waterIntakeMl: journal.waterIntakeMl == null ? null : Number(journal.waterIntakeMl),
            exerciseMinutes: journal.exerciseMinutes == null ? null : Number(journal.exerciseMinutes),
          }))
          .filter((item) => Boolean(item.day))
          .sort((a, b) => b.day.localeCompare(a.day))
          .slice(0, 14),
      );
    } catch {
      setTodayCheckIn(null);
      setRecentCheckIns([]);
    }
  }

  useEffect(() => {
    void loadTodayCheckIn();

    const handleCheckInUpdated = () => void loadTodayCheckIn();
    window.addEventListener("sympto:health-checkin-updated", handleCheckInUpdated);

    return () => {
      window.removeEventListener("sympto:health-checkin-updated", handleCheckInUpdated);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecentNutrition() {
      try {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 13);
        start.setHours(0, 0, 0, 0);

        const response = await healthGoalsService.getMetricEvents(
          "NUTRITION",
          "nutrition.calories",
          start,
          end,
          "goal-manual",
        );

        const loadedEvents = (response.events ?? []).map((event) => ({
          id: String(event.id),
          loggedValue: Number(event.loggedValue),
          occurredAt: String(event.occurredAt),
          source: String(event.source ?? ""),
          sourceId: event.sourceId ?? null,
          metadata: event.metadata ?? null,
        })).filter((event) => Number.isFinite(event.loggedValue) && event.loggedValue >= 0);

        const byDay = new Map<string, number>();
        for (const event of loadedEvents) {
          const day = journalDayKey(event.occurredAt);
          if (!day) continue;
          byDay.set(day, (byDay.get(day) ?? 0) + Number(event.loggedValue ?? 0));
        }

        if (active) {
          setRecentNutritionEvents(loadedEvents);
          setRecentNutritionDays(
            Array.from(byDay.entries()).map(([day, calories]) => ({
              day,
              calories,
            })),
          );
        }
      } catch {
        if (active) setRecentNutritionDays([]);
      }
    }

    void loadRecentNutrition();

    return () => {
      active = false;
    };
  }, [goalId]);

  async function searchFood() {
    const parsed = extractFoodSearchTerm(query);
    if (!parsed.query) {
      toast.error("Enter a food or meal item first.");
      return;
    }

    setSearching(true);
    setSelectedFood(null);
    setSearchQuantity(parsed.quantity);

    try {
      const result = await healthGoalsService.searchNutritionFoods(parsed.query, 8);
      setFoods(result.foods ?? []);

      if (!result.foods?.length) {
        toast.info("No matching foods were found. Try a simpler food name.");
      }
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        String(
          Array.isArray(message)
            ? message.join(" ")
            : message || "Nutrition search is unavailable right now.",
        ),
      );
    } finally {
      setSearching(false);
    }
  }

  async function selectFood(food: NutritionFood) {
    try {
      const detailed = await healthGoalsService.getNutritionFood(food.fdcId);
      setSelectedFood(detailed ?? food);

      const suggested =
        detailed?.portions?.find((portion) => /medium|large|small|cup|slice|serving/i.test(String(portion.modifier ?? "") + " " + String(portion.unit ?? ""))) ??
        detailed?.portions?.[0];

      const suggestedWeight = suggested?.gramWeight
        ? Number(suggested.gramWeight) * Math.max(1, searchQuantity)
        : 100 * Math.max(1, searchQuantity);
      setGrams(String(Math.round(suggestedWeight)));
    } catch {
      setSelectedFood(food);
      setGrams("100");
    }
  }

  function addDraftItem() {
    if (!selectedFood) return;

    const amount = Number(grams);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter the food portion in grams.");
      return;
    }

    const caloriesPer100 = Number(selectedFood.caloriesPer100g);
    const proteinPer100 = selectedFood.proteinPer100g == null ? null : Number(selectedFood.proteinPer100g);
    const fibrePer100 = selectedFood.fibrePer100g == null ? null : Number(selectedFood.fibrePer100g);

    if (!Number.isFinite(caloriesPer100) || caloriesPer100 <= 0) {
      toast.error("This food does not have a reliable calorie value available, so it cannot be logged yet.");
      return;
    }

    const multiplier = amount / 100;
    const item: NutritionItem = {
      id: selectedFood.fdcId + "-" + Date.now(),
      foodName: selectedFood.description,
      fdcId: selectedFood.fdcId,
      grams: amount,
      calories: Math.round(caloriesPer100 * multiplier),
      protein: proteinPer100 == null ? null : Number((proteinPer100 * multiplier).toFixed(1)),
      fibre: fibrePer100 == null ? null : Number((fibrePer100 * multiplier).toFixed(1)),
      source: "USDA FoodData Central",
    };

    setDraftItems((current) => [...current, item]);
    setSelectedFood(null);
    setFoods([]);
    setQuery("");
    setGrams("");
  }

  async function saveMeal() {
    if (!draftItems.length || draftCalories <= 0 || !goalId) return;

    setSaving(true);
    try {
      const occurredAt = new Date().toISOString();
      const mealName = draftItems.map((item) => item.foodName).join(" + ");

      await healthGoalsService.syncMetricEvent({
        metricType: "NUTRITION",
        metricKey: "nutrition.calories",
        loggedValue: draftCalories,
        occurredAt,
        source: "goal-manual",
        sourceId: "goal-" + goalId + "-nutrition-meal-" + Date.now(),
        metadata: {
          kind: "nutrition-meal",
          mealType,
          mealName,
          calories: draftCalories,
          protein: Number(draftProtein.toFixed(1)),
          fibre: Number(draftFibre.toFixed(1)),
          items: draftItems,
          nutritionSource: "USDA FoodData Central",
        },
      });

      setDraftItems([]);
      toast.success("Meal added to today's nutrition log.");
      await loadToday();
      await onUpdated?.();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        String(
          Array.isArray(message)
            ? message.join(" ")
            : message || "We could not save this meal.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const review = nutritionTargetReview(target);
  const showThreeDayReminder =
    review != null && journey.journeyDay % 3 === 0;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dce9ee] bg-white shadow-[0_18px_48px_rgba(11,45,84,.06)]">
      <header className="flex items-start justify-between gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d8efed]">
            <Utensils className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">
              Nutrition
            </p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-[.15em] text-[#0b7b80]">
              Nutrition · Daily calorie target
            </p>
            <p className="mt-1 text-[9px] font-semibold text-[#84969e]">
              Day {journey.journeyDay}
              {journey.daysLeft === null
                ? " · Journey active"
                : ` · ${journey.daysLeft} days left`}
            </p>
          </div>
        </div>

        <Link
          href={"/health-goals#goal-" + encodeURIComponent(goalId)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#dce7eb] bg-white px-2.5 text-[9px] font-black text-[#0b2d54]"
        >
          Goal <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="px-4 pb-5 sm:px-5 sm:pb-6">
        <section className="relative overflow-hidden rounded-[28px] bg-[#0b2d54] px-5 py-6 text-white shadow-[0_16px_34px_rgba(11,45,84,.18)] sm:px-6 sm:py-7">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#24c1c4]/14 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div
              className="relative grid h-[154px] w-[154px] shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#24c1c4 0 ${usagePercent}%, rgba(255,255,255,.12) ${usagePercent}% 100%)`,
              }}
            >
              <div className="absolute inset-[10px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" />
              <div className="relative z-10 text-center">
                <p className="text-[38px] font-black leading-none tracking-[-.08em]">
                  {loading ? "—" : formatNumber(todayTotal)}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-white/50">
                  kcal today
                </p>
                <p className="mt-2 text-[9px] font-bold text-white/45">
                  {target == null ? "No target" : `of ${formatNumber(target)}`}
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/45">
                Daily nutrition
              </p>
              <p className="mt-2 text-[30px] font-black leading-none tracking-[-.07em]">
                {target == null ? "—" : formatNumber(Math.abs(remaining ?? 0))}
                <span className="ml-2 text-sm font-bold tracking-normal text-white/50">
                  {overTarget ? "over target" : "kcal remaining"}
                </span>
              </p>

              <p className="mt-2 text-[10px] font-semibold text-white/55">
                {overTarget
                  ? `Today's logged intake is above the set target.`
                  : targetReached
                    ? "Today's logged intake has reached the set target."
                    : "Log meals as you eat so the daily total stays accurate."}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#24c1c4] transition-all"
                  style={{ width: Math.max(0, usagePercent) + "%" }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-[.12em] text-white/35">
                <span>0</span>
                <span>{target == null ? "Target not set" : formatNumber(target) + " kcal"}</span>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            <div className="rounded-[15px] bg-white/[.06] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-white/35">Protein from meals</p>
              <p className="mt-1 text-lg font-black">{todayProtein > 0 ? todayProtein.toFixed(1) : "—"}<span className="ml-1 text-[9px] text-white/40">g</span></p>
            </div>
            <div className="rounded-[15px] bg-white/[.06] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-white/35">Fibre from meals</p>
              <p className="mt-1 text-lg font-black">{todayFibre > 0 ? todayFibre.toFixed(1) : "—"}<span className="ml-1 text-[9px] text-white/40">g</span></p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-[#dfeaec] bg-[#f8fbfb] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#0b7b80]">Meal log</p>
              <h3 className="mt-1 text-base font-black text-[#0b2d54]">What did you eat?</h3>
              <p className="mt-1 text-[10px] leading-5 text-[#758896]">
                Search a food, choose the matching USDA food record, enter the portion, and add it to the meal.
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {["Breakfast", "Lunch", "Dinner", "Snack"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMealType(item)}
                  className={`rounded-xl px-2.5 py-2 text-[8px] font-black ${mealType === item ? "bg-[#0b2d54] text-white" : "bg-white text-[#71839a] ring-1 ring-[#dce7eb]"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchFood();
              }}
              placeholder="e.g. 2 boiled eggs"
              aria-label="Search for food"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#d8e5e9] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none placeholder:text-[#a2afb8] focus:border-[#24c1c4]"
            />
            <button
              type="button"
              onClick={() => void searchFood()}
              disabled={searching || !query.trim()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 text-[9px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          {foods.length > 0 && !selectedFood && (
            <div className="mt-3 space-y-2">
              {foods.map((food) => (
                <button
                  type="button"
                  key={food.fdcId}
                  onClick={() => void selectFood(food)}
                  className="w-full rounded-[17px] border border-[#dce8eb] bg-white p-3 text-left transition hover:border-[#24c1c4]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs font-black text-[#0b2d54]">{food.description}</p>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#24c1c4]" />
                  </div>
                  <p className="mt-1 text-[9px] font-semibold text-[#7c8d98]">
                    {food.caloriesPer100g == null || food.caloriesPer100g <= 0 ? "Calories unavailable" : `${Math.round(food.caloriesPer100g)} kcal / 100 g`}
                    {" · "}
                    {food.proteinPer100g == null ? "Protein —" : `${food.proteinPer100g.toFixed(1)} g protein / 100 g`}
                    {" · "}
                    {food.fibrePer100g == null ? "Fibre —" : `${food.fibrePer100g.toFixed(1)} g fibre / 100 g`}
                  </p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-[.1em] text-[#9aa8b1]">USDA FoodData Central</p>
                </button>
              ))}
            </div>
          )}

          {selectedFood && (
            <div className="mt-3 rounded-[18px] border border-[#cfe8e8] bg-white p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#0b2d54]">{selectedFood.description}</p>
                  <p className="mt-1 text-[9px] font-semibold text-[#7c8d98]">
                    {selectedFood.caloriesPer100g == null || selectedFood.caloriesPer100g <= 0 ? "Calories unavailable" : `${Math.round(selectedFood.caloriesPer100g)} kcal / 100 g`}
                    {" · "}
                    {selectedFood.proteinPer100g == null ? "Protein —" : `${selectedFood.proteinPer100g.toFixed(1)} g protein / 100 g`}
                    {" · "}
                    {selectedFood.fibrePer100g == null ? "Fibre —" : `${selectedFood.fibrePer100g.toFixed(1)} g fibre / 100 g`}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedFood(null)} className="text-[8px] font-black text-[#74859a]">Change</button>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="min-w-0 flex-1">
                  <label className="text-[8px] font-black uppercase tracking-[.13em] text-[#74859a]">Portion (grams)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={grams}
                    onChange={(event) => setGrams(event.target.value)}
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d8e5e9] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]"
                  />
                </div>
                <button
                  type="button"
                  onClick={addDraftItem}
                  className="mt-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2 text-[9px] font-black text-white"
                >
                  <Plus className="h-3.5 w-3.5 text-[#24c1c4]" />Add food
                </button>
              </div>
            </div>
          )}

          {draftItems.length > 0 && (
            <div className="mt-3 rounded-[18px] border border-[#dce7eb] bg-white p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#74859a]">{mealType} draft</p>
                  <p className="mt-1 text-sm font-black text-[#0b2d54]">{formatNumber(draftCalories)} kcal</p>
                </div>
                <button type="button" disabled={saving || draftCalories <= 0} onClick={() => void saveMeal()} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[9px] font-black text-white disabled:opacity-50">
                  <Check className="h-3.5 w-3.5 text-[#24c1c4]" />
                  {saving ? "Saving…" : "Log meal"}
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {draftItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbfb] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-[#0b2d54]">{item.foodName}</p>
                      <p className="mt-0.5 text-[8px] text-[#84959f]">{formatNumber(item.grams)} g</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black text-[#0b6f73]">{formatNumber(item.calories)} kcal</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[8px] font-semibold text-[#8b9aa4]">
                {draftProtein.toFixed(1)} g protein · {draftFibre.toFixed(1)} g fibre
              </p>
            </div>
          )}
        </section>

        {meals.length > 0 && (
          <section className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#74859a]">Today's meals</p>
                <h3 className="mt-1 text-base font-black text-[#0b2d54]">
                  {meals.length} detailed meal{meals.length === 1 ? "" : "s"}
                </h3>
              </div>
              <span className="text-[9px] font-black text-[#0b7b80]">
                {formatNumber(meals.reduce((sum, meal) => sum + meal.calories, 0))} kcal from meals
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {meals.map((meal) => (
                <div key={meal.id} className="rounded-[18px] border border-[#e0ebef] bg-white p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-[#0b2d54]">{meal.mealName}</p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-[#8b9aa4]">
                        {meal.mealType} · {localTime(meal.occurredAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-[#0b6f73]">
                      {formatNumber(meal.calories)} kcal
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-bold text-[#7d8e99]">
                    <span>{meal.protein.toFixed(1)} g protein</span>
                    <span>·</span>
                    <span>{meal.fibre.toFixed(1)} g fibre</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="#daily-health-check-in"
            className={`rounded-[18px] border p-3.5 transition ${
              todayCheckIn?.waterIntakeMl != null
                ? "border-[#24c1c4] bg-[#24c1c4] text-white shadow-[0_0_30px_rgba(36,193,196,.55)] hover:shadow-[0_0_42px_rgba(36,193,196,.7)]"
                : "border-[#dfeaec] bg-[#f7fbfb] hover:border-[#24c1c4]"
            }`}
          >
            <p className={`text-[8px] font-black uppercase tracking-[.13em] ${todayCheckIn?.waterIntakeMl != null ? "text-white/75" : "text-[#0b7b80]"}`}>Hydration</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className={`text-xs font-black ${todayCheckIn?.waterIntakeMl != null ? "text-white" : "text-[#0b2d54]"}`}>{todayCheckIn?.waterIntakeMl == null ? "Not logged" : todayCheckIn.waterIntakeMl.toLocaleString("en-ZA") + " ml"}</p>
              <span className={`text-[8px] font-black uppercase tracking-[.1em] ${todayCheckIn?.waterIntakeMl != null ? "text-white/80" : "text-[#0b7b80]"}`}>{todayCheckIn?.waterIntakeMl == null ? "Action needed" : "Logged today"}</span>
            </div>
            <p className={`mt-1 text-[9px] leading-4 ${todayCheckIn?.waterIntakeMl != null ? "text-white/70" : "text-[#8a99a4]"}`}>{todayCheckIn?.waterIntakeMl == null ? "Log your water intake in the Daily Health Check-in." : "Water recorded in today's Daily Health Check-in."}</p>
          </Link>

          <Link
            href="#daily-health-check-in"
            className={`rounded-[18px] border p-3.5 transition ${
              todayCheckIn?.sleepHours != null
                ? "border-[#5265a9] bg-[#5265a9] text-white shadow-[0_0_30px_rgba(82,101,169,.5)] hover:shadow-[0_0_42px_rgba(82,101,169,.65)]"
                : "border-[#dfeaec] bg-[#f7fbfb] hover:border-[#5265a9]"
            }`}
          >
            <p className={`text-[8px] font-black uppercase tracking-[.13em] ${todayCheckIn?.sleepHours != null ? "text-white/75" : "text-[#5265a9]"}`}>Sleep</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className={`text-xs font-black ${todayCheckIn?.sleepHours != null ? "text-white" : "text-[#0b2d54]"}`}>{todayCheckIn?.sleepHours == null ? "Not logged" : todayCheckIn.sleepHours + " h"}</p>
              <span className={`text-[8px] font-black uppercase tracking-[.1em] ${todayCheckIn?.sleepHours != null ? "text-white/80" : "text-[#5265a9]"}`}>{todayCheckIn?.sleepHours == null ? "Action needed" : "Logged today"}</span>
            </div>
            <p className={`mt-1 text-[9px] leading-4 ${todayCheckIn?.sleepHours != null ? "text-white/70" : "text-[#8a99a4]"}`}>{todayCheckIn?.sleepHours == null ? "Record last night's sleep in the Daily Health Check-in." : "Sleep recorded in today's Daily Health Check-in."}</p>
          </Link>

          <Link
            href="#daily-health-check-in"
            className={`rounded-[18px] border p-3.5 transition ${
              todayCheckIn?.exerciseMinutes != null
                ? "border-[#3f75bd] bg-[#3f75bd] text-white shadow-[0_0_30px_rgba(63,117,189,.5)] hover:shadow-[0_0_42px_rgba(63,117,189,.65)]"
                : "border-[#dfeaec] bg-[#f7fbfb] hover:border-[#3f75bd]"
            }`}
          >
            <p className={`text-[8px] font-black uppercase tracking-[.13em] ${todayCheckIn?.exerciseMinutes != null ? "text-white/75" : "text-[#3f75bd]"}`}>Activity</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className={`text-xs font-black ${todayCheckIn?.exerciseMinutes != null ? "text-white" : "text-[#0b2d54]"}`}>{todayCheckIn?.exerciseMinutes == null ? "Not logged" : todayCheckIn.exerciseMinutes + " min"}</p>
              <span className={`text-[8px] font-black uppercase tracking-[.1em] ${todayCheckIn?.exerciseMinutes != null ? "text-white/80" : "text-[#3f75bd]"}`}>{todayCheckIn?.exerciseMinutes == null ? "Action needed" : "Logged today"}</span>
            </div>
            <p className={`mt-1 text-[9px] leading-4 ${todayCheckIn?.exerciseMinutes != null ? "text-white/70" : "text-[#8a99a4]"}`}>{todayCheckIn?.exerciseMinutes == null ? "Record physical activity in the Daily Health Check-in." : "Movement recorded in today's Daily Health Check-in."}</p>
          </Link>
        </section>

        {nutritionInsights.length > 0 && (
          <section className="mt-4 rounded-[22px] border border-[#d8e9eb] bg-[#f5fbfb] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#0b7b80]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#0b7b80]">Sympto insight</p>
                <h3 className="mt-1 text-base font-black tracking-[-.025em] text-[#0b2d54]">Nutrition in context</h3>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {nutritionInsights.map((insight, index) => (
                <div key={insight.title + "-" + index} className="rounded-[17px] bg-white px-3.5 py-3 ring-1 ring-[#e2edef]">
                  <p className="text-[10px] font-black text-[#0b2d54]">{insight.title}</p>
                  <p className="mt-1 text-[10px] leading-5 text-[#748694]">{insight.text}</p>
                </div>
              ))}
            </div>

          </section>
        )}

        {showThreeDayReminder && (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="text-[9px] font-black uppercase tracking-[.13em] text-amber-900">Three-day review</p>
            <p className="mt-1 text-[10px] leading-5 text-amber-900/85">
              You have been tracking this target for {journey.journeyDay} days. Because this is a low-energy target, review it with a dietitian or other qualified healthcare professional.
            </p>
          </div>
        )}

        {review && (
          <div className="mt-4 rounded-[18px] border border-[#dce8eb] bg-[#f8fbfb] px-3.5 py-3">
            <p className="text-[9px] font-black uppercase tracking-[.13em] text-[#6f8290]">Target review</p>
            <p className="mt-1 text-[10px] leading-5 text-[#647784]">{review.text}</p>
          </div>
        )}

        <div className="mt-4 flex items-start justify-between gap-3 border-t border-[#edf2f5] pt-4">
          <div>
            <p className="text-[9px] font-black text-[#74859a]">
              Day {journey.journeyDay}
              {journey.daysLeft === null ? " · Journey active" : ` · ${journey.daysLeft} days left`}
            </p>
            <p className="mt-1 text-[8px] leading-4 text-[#9aa8b1]">
              Changing a low-energy calorie target should be reviewed with your healthcare team. Sympto does not automatically recommend a lower or higher calorie target.
            </p>
          </div>
          <Link href={"/health-goals#goal-" + encodeURIComponent(goalId)} className="shrink-0 text-[9px] font-black text-[#0b2d54]">
            Review goal <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
