export type GoalMetricRule = {
  metricType: string;
  metricKey: string;
  frequency: 'DAILY' | 'WEEKLY' | 'TOTAL';
  aggregation: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX';
  comparison: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO';
};

export const DEFAULT_GOAL_METRIC_RULES: Record<string, GoalMetricRule> = {
  WEIGHT: { metricType: 'WEIGHT', metricKey: 'weight.kg', frequency: 'TOTAL', aggregation: 'LATEST', comparison: 'DECREASE_TO' },
  EXERCISE: { metricType: 'EXERCISE', metricKey: 'exercise.minutes', frequency: 'DAILY', aggregation: 'SUM', comparison: 'AT_LEAST' },
  NUTRITION: { metricType: 'NUTRITION', metricKey: 'nutrition.calories', frequency: 'DAILY', aggregation: 'SUM', comparison: 'AT_MOST' },
  BLOOD_PRESSURE: { metricType: 'BLOOD_PRESSURE', metricKey: 'blood_pressure.systolic', frequency: 'DAILY', aggregation: 'LATEST', comparison: 'AT_MOST' },
  BLOOD_GLUCOSE: { metricType: 'BLOOD_GLUCOSE', metricKey: 'blood_glucose.value', frequency: 'DAILY', aggregation: 'LATEST', comparison: 'AT_MOST' },
  CHOLESTEROL: { metricType: 'CHOLESTEROL', metricKey: 'cholesterol.total', frequency: 'TOTAL', aggregation: 'LATEST', comparison: 'AT_MOST' },
  MEDICATION: { metricType: 'MEDICATION', metricKey: 'medication.adherence', frequency: 'WEEKLY', aggregation: 'AVERAGE', comparison: 'AT_LEAST' },
  SLEEP: { metricType: 'SLEEP', metricKey: 'sleep.hours', frequency: 'DAILY', aggregation: 'LATEST', comparison: 'AT_LEAST' },
  MENTAL_HEALTH: { metricType: 'MENTAL_HEALTH', metricKey: 'mental.stress', frequency: 'DAILY', aggregation: 'LATEST', comparison: 'AT_MOST' },
  HYDRATION: { metricType: 'HYDRATION', metricKey: 'hydration.ml', frequency: 'DAILY', aggregation: 'SUM', comparison: 'AT_LEAST' },
  SMOKING: { metricType: 'SMOKING', metricKey: 'smoking.status', frequency: 'TOTAL', aggregation: 'LATEST', comparison: 'AT_MOST' },
  ALCOHOL: { metricType: 'ALCOHOL', metricKey: 'alcohol.frequency', frequency: 'WEEKLY', aggregation: 'LATEST', comparison: 'AT_MOST' },
  HEART_RATE: { metricType: 'HEART_RATE', metricKey: 'heart_rate.bpm', frequency: 'DAILY', aggregation: 'LATEST', comparison: 'AT_MOST' },
  OTHER: { metricType: 'OTHER', metricKey: 'other.value', frequency: 'TOTAL', aggregation: 'LATEST', comparison: 'CLOSEST' },
};

export function goalRuleFor(category: string): GoalMetricRule {
  return DEFAULT_GOAL_METRIC_RULES[category] ?? DEFAULT_GOAL_METRIC_RULES.OTHER;
}
