import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { goalRuleFor } from './goal-metric-rules';

export type MedicationDoseAction = 'TAKEN' | 'SKIPPED';
export type MedicationDailyTrend =
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'INCONSISTENT'
  | 'INSUFFICIENT_DATA';

export interface MedicationGoalConfig {
  healthGoalId: string;
  createdAt: string;
  targetDate: string | null;
  targetAdherence: number;
  status: string;
}

export interface MedicationSchedule {
  patientMedicationId: string;
  medicationId: string | null;
  name: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: string | null;
  timezone: string;
  dosesPerDay: number;
  activeDaysOfWeek: number[] | null;
  reminderSlots: string[];
  scheduleSource: 'REMINDER_SCHEDULE' | 'FREQUENCY_FALLBACK';
}

export interface MedicationAdherenceEvent {
  timestamp: string;
  action: MedicationDoseAction;
  sourceId: string | null;
}

export interface ConnectedSupportingGoal {
  healthGoalId: string;
  category: 'NUTRITION' | 'EXERCISE' | 'SLEEP' | 'HYDRATION';
  title: string;
  status: string;
  createdAt: string;
  relationshipType: 'SUPPORTS';
  rationale: string | null;
  metricType: string;
  metricKey: string;
  frequency: string;
  frequencyTarget: number | null;
  aggregation: string;
  comparison: string;
}

export interface SupportingGoalEvent {
  timestamp: string;
  value: number;
  source: string;
  sourceId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface MedicationDayBucket {
  day: string;
  expectedDoses: number;
  takenDoses: number;
  skippedDoses: number;
  recordedActions: number;
  unrecordedDoses: number;
  adherencePercent: number;
}

export interface MedicationJourneyAdherence {
  takenDoses: number;
  expectedScheduledDoses: number;
  adherencePercent: number;
  scheduledDays: number;
}

export interface MedicationTodayStatus {
  day: string;
  expectedDoses: number;
  takenDoses: number;
  skippedDoses: number;
  recordedActions: number;
  remainingDoses: number;
  adherencePercent: number;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'NO_SCHEDULED_DOSES';
}

export interface MedicationTrendResult {
  state: MedicationDailyTrend;
  daysAnalyzed: number;
  daysWithExplicitActions: number;
  baselinePercent: number | null;
  recentPercent: number | null;
  deltaPercentagePoints: number | null;
}

export interface SupportingGoalAssociation {
  supportingGoalId: string;
  supportingGoalName: string;
  supportingGoalCategory: ConnectedSupportingGoal['category'];
  loggedDays: number;
  nonLoggedDays: number;
  adherenceOnLoggedDays: number;
  adherenceOnNonLoggedDays: number;
  deltaPercentagePoints: number;
  statisticallyRelevant: boolean;
  insight: string | null;
}

export type ConnectedGoalEvidenceLevel = 'STRONG' | 'EMERGING' | 'EARLY' | 'INSUFFICIENT_DATA';

export interface ConnectedGoalInsight {
  supportingGoalId: string;
  supportingGoalName: string;
  supportingGoalCategory: ConnectedSupportingGoal['category'];
  targetValue: number | null;
  unit: string;
  frequency: string;
  comparison: string;
  aggregation: string;
  observedPeriods: number;
  targetMetPeriods: number;
  targetMissedPeriods: number;
  latestValue: number | null;
  latestPeriodLabel: string | null;
  latestStatus: 'ON_TARGET' | 'BELOW_TARGET' | 'ABOVE_TARGET' | 'INSUFFICIENT_DATA';
  medicationAdherenceOnTargetPeriods: number | null;
  medicationAdherenceOnMissedTargetPeriods: number | null;
  medicationDeltaPercentagePoints: number | null;
  evidenceLevel: ConnectedGoalEvidenceLevel;
  insight: string | null;
}

export interface MedicationInsightResult {
  unified: {
    goalConfig: MedicationGoalConfig;
    medicationSchedule: MedicationSchedule;
    adherenceStream: MedicationAdherenceEvent[];
    healthGoalRelationGraph: {
      supportingGoals: ConnectedSupportingGoal[];
    };
    supportingGoalEvents: Record<string, SupportingGoalEvent[]>;
  };
  analysis: {
    journeyAdherence: MedicationJourneyAdherence;
    todayStatus: MedicationTodayStatus;
    dailyBuckets: MedicationDayBucket[];
    trend: MedicationTrendResult;
    associations: SupportingGoalAssociation[];
    dataQuality: {
      explicitAdherenceEvents: number;
      legacyAdherenceEventsIgnored: number;
      expectedScheduledDoses: number;
      scheduledDays: number;
      todayExcludedFromLongitudinalAnalysis: boolean;
    };
  };
}

type GoalRow = {
  healthGoalId: string;
  patientId: string;
  createdAt: Date;
  targetDate: Date | null;
  targetAdherence: number | null;
  status: string;
  patientMedicationId: string | null;
  medicationId: string | null;
  medicationName: string | null;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  medicationStartedAt: Date | null;
  medicationEndedAt: Date | null;
  medicationStatus: string | null;
};

type DoseRow = {
  occurredAt: Date;
  action: string | null;
  sourceId: string | null;
};

type RelationRow = {
  relatedGoalId: string;
  relatedCategory: string;
  relatedTitle: string;
  relatedStatus: string;
  relatedCreatedAt: Date;
  rationale: string | null;
  metricType: string | null;
  metricKey: string | null;
  frequency: string | null;
  frequencyTarget: number | null;
  relatedTargetValue: number | null;
  aggregation: string | null;
  comparison: string | null;
};

type SupportEventRow = {
  healthGoalId: string;
  occurredAt: Date;
  loggedValue: number;
  source: string;
  sourceId: string | null;
  metadata: Record<string, unknown> | null;
};

const TZ = 'Africa/Johannesburg';
const MIN_ASSOCIATION_GROUP_DAYS = 3;
const MIN_ASSOCIATION_TOTAL_DAYS = 8;
const MIN_ASSOCIATION_ACTION_DAYS = 6;
const MIN_ASSOCIATION_DELTA = 10;
const MIN_TREND_ACTION_DAYS = 4;
const TREND_DELTA = 10;
const INCONSISTENCY_SWING = 30;
const INCONSISTENCY_STD_DEV = 25;

@Injectable()
export class MedicationInsightService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForGoal(goalId: string): Promise<MedicationInsightResult> {
    const goal = await this.loadGoal(goalId);
    if (!goal) throw new BadRequestException('Medication goal not found.');
    if (!goal.patientMedicationId) {
      throw new BadRequestException('Medication goal is not linked to a PatientMedication record.');
    }

    const schedule = await this.loadSchedule(goal);
    const doseRows = await this.loadExplicitDoseEvents(goal.patientId, goal.patientMedicationId, goal.createdAt);
    const relations = await this.loadRelations(goal.patientId, goalId);
    const supportingEvents = await this.loadSupportingEvents(goal.patientId, goal.createdAt, relations);
    const now = new Date();

    const dailyBuckets = buildDailyBuckets(goal.createdAt, now, schedule, doseRows);
    const journeyAdherence = calculateJourneyAdherence(dailyBuckets, now, goal.targetDate);
    const todayStatus = calculateTodayStatus(dailyBuckets, now);
    const trend = classifyTrend(dailyBuckets, now);
    const associations = calculateAssociations(dailyBuckets, now, relations, supportingEvents);
    const connectedGoalInsights = calculateConnectedGoalInsights(
      dailyBuckets,
      now,
      relations,
      supportingEvents,
    );

    const supportingGoalEvents: Record<string, SupportingGoalEvent[]> = {};
    for (const relation of relations) {
      supportingGoalEvents[relation.healthGoalId] = supportingEvents
        .filter((event) => event.healthGoalId === relation.healthGoalId)
        .map((event) => ({
          timestamp: event.occurredAt.toISOString(),
          value: Number(event.loggedValue),
          source: event.source,
          sourceId: event.sourceId,
          metadata: event.metadata ?? null,
        }));
    }

    const legacyAdherenceEventsIgnored = await this.countNonExplicitDoseEvents(
      goal.patientId,
      goal.patientMedicationId,
      goal.createdAt,
    );

    return {
      unified: {
        goalConfig: {
          healthGoalId: goal.healthGoalId,
          createdAt: goal.createdAt.toISOString(),
          targetDate: goal.targetDate?.toISOString() ?? null,
          targetAdherence: Number.isFinite(Number(goal.targetAdherence)) && Number(goal.targetAdherence) > 0
            ? Number(goal.targetAdherence)
            : 90,
          status: goal.status,
        },
        medicationSchedule: schedule,
        adherenceStream: doseRows.map((event) => ({
          timestamp: event.occurredAt.toISOString(),
          action: event.action as MedicationDoseAction,
          sourceId: event.sourceId,
        })),
        healthGoalRelationGraph: {
          supportingGoals: relations,
        },
        supportingGoalEvents,
      },
      analysis: {
        journeyAdherence,
        todayStatus,
        dailyBuckets,
        trend,
        associations,
        connectedGoalInsights,
        dataQuality: {
          explicitAdherenceEvents: doseRows.length,
          legacyAdherenceEventsIgnored,
          expectedScheduledDoses: journeyAdherence.expectedScheduledDoses,
          scheduledDays: journeyAdherence.scheduledDays,
          todayExcludedFromLongitudinalAnalysis: true,
        },
      },
    };
  }

  private async loadGoal(goalId: string): Promise<GoalRow | null> {
    const sql = 'SELECT hg."id" AS "healthGoalId", hg."patientId", hg."createdAt", hg."targetDate", ' +
      'hg."targetValue"::double precision AS "targetAdherence", hg."status"::text AS "status", ' +
      'hg."patientMedicationId", pm."medicationId", m."name" AS "medicationName", pm."dosage", ' +
      'pm."frequency", pm."instructions", pm."startedAt" AS "medicationStartedAt", ' +
      'pm."endedAt" AS "medicationEndedAt", pm."status"::text AS "medicationStatus" ' +
      'FROM "HealthGoal" hg LEFT JOIN "PatientMedication" pm ON pm."id" = hg."patientMedicationId" ' +
      'LEFT JOIN "Medication" m ON m."id" = pm."medicationId" ' +
      'WHERE hg."id" = $1 AND hg."category" = \'MEDICATION\' LIMIT 1';
    const rows = await this.prisma.$queryRawUnsafe<GoalRow[]>(sql, goalId);
    return rows[0] ?? null;
  }

  private async loadSchedule(goal: GoalRow): Promise<MedicationSchedule> {
    const scheduleSql =
      'SELECT mrs."enabled", mrs."daysOfWeek", mrs."timezone", COUNT(ms."id")::bigint AS "slotCount" ' +
      'FROM "MedicationReminderSchedule" mrs LEFT JOIN "MedicationReminderSlot" ms ON ms."scheduleId" = mrs."id" ' +
      'WHERE mrs."patientMedicationId" = $1 GROUP BY mrs."enabled", mrs."daysOfWeek", mrs."timezone" LIMIT 1';
    const scheduleRows = await this.prisma.$queryRawUnsafe<Array<{
      enabled: boolean;
      daysOfWeek: number[] | null;
      timezone: string | null;
      slotCount: bigint | number;
    }>>(scheduleSql, goal.patientMedicationId);

    const reminder = scheduleRows[0] ?? null;
    const frequency = String(goal.frequency ?? '').trim().toUpperCase();
    const frequencyDoses = fixedDailyDoses(frequency);
    const configuredSlots = reminder ? Number(reminder.slotCount ?? 0) : 0;
    const dosesPerDay = reminder?.enabled && configuredSlots > 0 ? configuredSlots : frequencyDoses;

    if (dosesPerDay <= 0) {
      throw new BadRequestException(
        'Medication schedule does not define a fixed daily dose frequency required for journey adherence.',
      );
    }

    const slotsSql =
      'SELECT ms."time" FROM "MedicationReminderSlot" ms ' +
      'WHERE ms."scheduleId" = (SELECT "id" FROM "MedicationReminderSchedule" WHERE "patientMedicationId" = $1 LIMIT 1) ' +
      'ORDER BY ms."doseIndex" ASC';
    const slots = await this.prisma.$queryRawUnsafe<Array<{ time: string }>>(slotsSql, goal.patientMedicationId);

    return {
      patientMedicationId: goal.patientMedicationId!,
      medicationId: goal.medicationId,
      name: goal.medicationName ?? 'Medication',
      dosage: goal.dosage,
      frequency: goal.frequency,
      instructions: goal.instructions,
      startedAt: goal.medicationStartedAt?.toISOString() ?? null,
      endedAt: goal.medicationEndedAt?.toISOString() ?? null,
      status: goal.medicationStatus,
      timezone: String(reminder?.timezone ?? '').trim() || TZ,
      dosesPerDay,
      activeDaysOfWeek: Array.isArray(reminder?.daysOfWeek) ? reminder.daysOfWeek.map(Number).filter(Number.isInteger) : null,
      reminderSlots: slots.map((slot) => String(slot.time)),
      scheduleSource: reminder?.enabled && configuredSlots > 0 ? 'REMINDER_SCHEDULE' : 'FREQUENCY_FALLBACK',
    };
  }

  private async loadExplicitDoseEvents(patientId: string, patientMedicationId: string, from: Date): Promise<DoseRow[]> {
    const sql =
      'SELECT "occurredAt", "loggedValue", "metadata", "sourceId" FROM "HealthGoalMetricEvent" ' +
      'WHERE "patientId" = $1 AND "metricType" = \'MEDICATION\' AND "metricKey" = \'medication.adherence\' ' +
      'AND "source" = \'medication-adherence\' AND "occurredAt" >= $2 ' +
      'AND ("metadata"->>\'patientMedicationId\' = $3 OR "sourceId" LIKE $4) ORDER BY "occurredAt" ASC';

    const rows = await this.prisma.$queryRawUnsafe<Array<{
      occurredAt: Date;
      loggedValue: number | null;
      metadata: Record<string, unknown> | null;
      sourceId: string | null;
    }>>(sql, patientId, from, patientMedicationId, patientMedicationId + ':%');

    let previousInferredTaken = 0;
    let validActionIndex = 0;

    return rows.flatMap((row) => {
      const explicitAction = String(row.metadata?.action ?? '').trim().toUpperCase();
      const adherence = Number(row.loggedValue);

      // Ignore structurally empty legacy events; they cannot safely contribute
      // either a taken or skipped dose to longitudinal medication insight.
      if (
        explicitAction !== 'TAKEN' &&
        explicitAction !== 'SKIPPED' &&
        !Number.isFinite(adherence)
      ) {
        return [];
      }

      validActionIndex += 1;
      const totalActions = validActionIndex;
      const inferredTaken = Number.isFinite(adherence)
        ? Math.max(0, Math.min(totalActions, Math.round((totalActions * adherence) / 100)))
        : previousInferredTaken;

      const action =
        explicitAction === 'TAKEN' || explicitAction === 'SKIPPED'
          ? explicitAction
          : inferredTaken > previousInferredTaken
            ? 'TAKEN'
            : 'SKIPPED';

      previousInferredTaken = Math.max(previousInferredTaken, inferredTaken);

      return [{
        occurredAt: row.occurredAt,
        action,
        sourceId: row.sourceId,
      }];
    });
  }

  private async countNonExplicitDoseEvents(patientId: string, patientMedicationId: string, from: Date): Promise<number> {
    const sql =
      'SELECT COUNT(*)::bigint AS "count" FROM "HealthGoalMetricEvent" ' +
      'WHERE "patientId" = $1 AND "metricType" = \'MEDICATION\' AND "metricKey" = \'medication.adherence\' ' +
      'AND "source" = \'medication-adherence\' AND "occurredAt" >= $2 ' +
      'AND ("metadata"->>\'patientMedicationId\' = $3 OR "sourceId" LIKE $4) ' +
      'AND "loggedValue" IS NULL ' +
      'AND COALESCE(UPPER("metadata"->>\'action\'), \'\') NOT IN (\'TAKEN\', \'SKIPPED\')';
    const rows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      sql,
      patientId,
      from,
      patientMedicationId,
      patientMedicationId + ':%',
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async loadRelations(patientId: string, medicationGoalId: string): Promise<ConnectedSupportingGoal[]> {
    const sql =
      'SELECT g."id" AS "relatedGoalId", g."category"::text AS "relatedCategory", g."title" AS "relatedTitle", ' +
      'g."status"::text AS "relatedStatus", g."createdAt" AS "relatedCreatedAt", ' +
      'g."targetValue"::double precision AS "relatedTargetValue", r."rationale", ' +
      'c."metricType", c."metricKey", c."frequency", c."frequencyTarget"::double precision AS "frequencyTarget", ' +
      'c."aggregation", c."comparison" FROM "HealthGoalRelation" r ' +
      'INNER JOIN "HealthGoal" g ON g."id" = r."sourceGoalId" ' +
      'LEFT JOIN "HealthGoalMetricConfig" c ON c."healthGoalId" = g."id" ' +
      'WHERE r."patientId" = $1 AND r."targetGoalId" = $2 AND r."relationshipType" = \'SUPPORTS\' ' +
      'AND g."category"::text IN (\'NUTRITION\', \'EXERCISE\', \'SLEEP\', \'HYDRATION\') ' +
      'AND g."status"::text IN (\'ACTIVE\', \'ON_HOLD\') ORDER BY g."category"::text, g."title"';
    const rows = await this.prisma.$queryRawUnsafe<RelationRow[]>(sql, patientId, medicationGoalId);

    return rows.map((row) => {
      const category = String(row.relatedCategory).toUpperCase() as ConnectedSupportingGoal['category'];
      const fallback = goalRuleFor(category);
      return {
        healthGoalId: String(row.relatedGoalId),
        category,
        title: String(row.relatedTitle),
        status: String(row.relatedStatus),
        createdAt: row.relatedCreatedAt.toISOString(),
        relationshipType: 'SUPPORTS',
        rationale: row.rationale,
        metricType: String(row.metricType ?? fallback.metricType),
        metricKey: String(row.metricKey ?? fallback.metricKey),
        frequency: String(row.frequency ?? fallback.frequency),
        frequencyTarget:
          row.frequencyTarget == null
            ? row.relatedTargetValue == null
              ? null
              : Number(row.relatedTargetValue)
            : Number(row.frequencyTarget),
        aggregation: String(row.aggregation ?? fallback.aggregation),
        comparison: String(row.comparison ?? fallback.comparison),
      };
    });
  }

  private async loadSupportingEvents(
    patientId: string,
    medicationGoalCreatedAt: Date,
    relations: ConnectedSupportingGoal[],
  ): Promise<SupportEventRow[]> {
    const result: SupportEventRow[] = [];
    for (const relation of relations) {
      const relationCreated = new Date(relation.createdAt);
      const start = new Date(Math.max(medicationGoalCreatedAt.getTime(), relationCreated.getTime()));
      const sql =
        'SELECT $1::text AS "healthGoalId", "occurredAt", "loggedValue"::double precision AS "loggedValue", ' +
        '"source", "sourceId", "metadata" FROM "HealthGoalMetricEvent" ' +
        'WHERE "patientId" = $2 AND "metricType" = $3 AND "metricKey" = $4 AND "occurredAt" >= $5 ' +
        'AND "occurredAt" <= CURRENT_TIMESTAMP ORDER BY "occurredAt" ASC';
      const rows = await this.prisma.$queryRawUnsafe<SupportEventRow[]>(
        sql,
        relation.healthGoalId,
        patientId,
        relation.metricType,
        relation.metricKey,
        start,
      );
      result.push(...rows);
    }
    return result.filter((event) => Number.isFinite(Number(event.loggedValue)));
  }
}

function fixedDailyDoses(frequency: string): number {
  switch (frequency) {
    case 'ONCE_DAILY': return 1;
    case 'TWICE_DAILY': return 2;
    case 'THREE_TIMES_DAILY': return 3;
    case 'FOUR_TIMES_DAILY': return 4;
    case 'EVERY_4_HOURS': return 6;
    case 'EVERY_6_HOURS': return 4;
    case 'EVERY_8_HOURS': return 3;
    case 'EVERY_12_HOURS': return 2;
    default: return 0;
  }
}

function dayKey(value: Date, timezone = TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function nextDay(day: string): string {
  const value = new Date(day + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function weekday(day: string): number {
  const sundayZero = new Date(day + 'T12:00:00Z').getUTCDay();
  return sundayZero === 0 ? 7 : sundayZero;
}

function scheduleActive(schedule: MedicationSchedule, day: string): boolean {
  const tz = schedule.timezone || TZ;
  if (schedule.startedAt && dayKey(new Date(schedule.startedAt), tz) > day) return false;
  if (schedule.endedAt && dayKey(new Date(schedule.endedAt), tz) < day) return false;
  if (schedule.activeDaysOfWeek?.length && !schedule.activeDaysOfWeek.includes(weekday(day))) return false;
  return true;
}

function expectedForDay(schedule: MedicationSchedule, day: string): number {
  if (!scheduleActive(schedule, day)) return 0;
  const frequency = String(schedule.frequency ?? '').trim().toUpperCase();
  if (frequency === 'AS_NEEDED') return 0;
  if ((frequency === 'WEEKLY' || frequency === 'MONTHLY') && schedule.scheduleSource !== 'REMINDER_SCHEDULE') return 0;
  return schedule.dosesPerDay;
}

function range(start: Date, end: Date, timezone: string): string[] {
  const first = dayKey(start, timezone);
  const last = dayKey(end, timezone);
  const result: string[] = [];
  let cursor = first;
  for (let guard = 0; guard < 1000 && cursor <= last; guard += 1) {
    result.push(cursor);
    if (cursor === last) break;
    cursor = nextDay(cursor);
  }
  return result;
}

function buildDailyBuckets(
  goalCreatedAt: Date,
  now: Date,
  schedule: MedicationSchedule,
  events: DoseRow[],
): MedicationDayBucket[] {
  const tz = schedule.timezone || TZ;
  const byDay = new Map<string, { taken: number; skipped: number }>();

  for (const event of events) {
    const key = dayKey(event.occurredAt, tz);
    const current = byDay.get(key) ?? { taken: 0, skipped: 0 };
    if (event.action === 'TAKEN') current.taken += 1;
    if (event.action === 'SKIPPED') current.skipped += 1;
    byDay.set(key, current);
  }

  return range(goalCreatedAt, now, tz).map((day) => {
    const expected = expectedForDay(schedule, day);
    const current = byDay.get(day) ?? { taken: 0, skipped: 0 };
    const taken = Math.min(expected, current.taken);
    const skipped = Math.min(Math.max(0, expected - taken), current.skipped);
    const recordedActions = Math.min(expected, taken + skipped);
    const unrecorded = Math.max(0, expected - recordedActions);

    return {
      day,
      expectedDoses: expected,
      takenDoses: taken,
      skippedDoses: skipped,
      recordedActions,
      unrecordedDoses: unrecorded,
      adherencePercent: expected > 0 ? Number(((taken / expected) * 100).toFixed(2)) : 0,
    };
  });
}

function weightedAdherence(days: MedicationDayBucket[]): number | null {
  const expected = days.reduce((sum, day) => sum + day.expectedDoses, 0);
  const taken = days.reduce((sum, day) => sum + day.takenDoses, 0);
  return expected > 0 ? Number(((taken / expected) * 100).toFixed(2)) : null;
}

function calculateJourneyAdherence(
  buckets: MedicationDayBucket[],
  now: Date,
  targetDate: Date | null,
): MedicationJourneyAdherence {
  const today = dayKey(now);
  const targetDay = targetDate ? dayKey(targetDate) : null;
  const days = buckets.filter((day) => day.day <= today && (!targetDay || day.day <= targetDay) && day.expectedDoses > 0);
  const expected = days.reduce((sum, day) => sum + day.expectedDoses, 0);
  const taken = days.reduce((sum, day) => sum + day.takenDoses, 0);
  return {
    takenDoses: taken,
    expectedScheduledDoses: expected,
    adherencePercent: expected > 0 ? Number(((taken / expected) * 100).toFixed(2)) : 0,
    scheduledDays: days.length,
  };
}

function calculateTodayStatus(buckets: MedicationDayBucket[], now: Date): MedicationTodayStatus {
  const today = dayKey(now);
  const bucket = buckets.find((day) => day.day === today);

  if (!bucket || bucket.expectedDoses <= 0) {
    return {
      day: today,
      expectedDoses: 0,
      takenDoses: 0,
      skippedDoses: 0,
      recordedActions: 0,
      remainingDoses: 0,
      adherencePercent: 0,
      status: 'NO_SCHEDULED_DOSES',
    };
  }

  return {
    day: today,
    expectedDoses: bucket.expectedDoses,
    takenDoses: bucket.takenDoses,
    skippedDoses: bucket.skippedDoses,
    recordedActions: bucket.recordedActions,
    remainingDoses: Math.max(0, bucket.expectedDoses - bucket.recordedActions),
    adherencePercent: bucket.adherencePercent,
    status: bucket.recordedActions >= bucket.expectedDoses ? 'COMPLETE' : 'IN_PROGRESS',
  };
}

function classifyTrend(buckets: MedicationDayBucket[], now: Date): MedicationTrendResult {
  const today = dayKey(now);
  const historical = buckets.filter((day) => day.day < today && day.expectedDoses > 0);
  const daysWithActions = historical.filter((day) => day.recordedActions > 0);

  if (daysWithActions.length < MIN_TREND_ACTION_DAYS) {
    return {
      state: 'INSUFFICIENT_DATA',
      daysAnalyzed: historical.length,
      daysWithExplicitActions: daysWithActions.length,
      baselinePercent: null,
      recentPercent: null,
      deltaPercentagePoints: null,
    };
  }

  const split = Math.max(1, Math.floor(historical.length / 2));
  const baseline = historical.slice(0, split);
  const recent = historical.slice(split);
  const baselinePercent = weightedAdherence(baseline);
  const recentPercent = weightedAdherence(recent);
  const delta = baselinePercent == null || recentPercent == null
    ? null
    : Number((recentPercent - baselinePercent).toFixed(2));

  const changes = historical.slice(1).map((day, index) =>
    Math.abs(day.adherencePercent - historical[index].adherencePercent));
  const mean = historical.reduce((sum, day) => sum + day.adherencePercent, 0) / historical.length;
  const variance = historical.reduce(
    (sum, day) => sum + ((day.adherencePercent - mean) ** 2),
    0,
  ) / historical.length;
  const standardDeviation = Math.sqrt(variance);
  const largeSwings = changes.filter((value) => value >= INCONSISTENCY_SWING).length;

  if (largeSwings >= 2 || standardDeviation >= INCONSISTENCY_STD_DEV) {
    return {
      state: 'INCONSISTENT',
      daysAnalyzed: historical.length,
      daysWithExplicitActions: daysWithActions.length,
      baselinePercent,
      recentPercent,
      deltaPercentagePoints: delta,
    };
  }

  const state =
    delta != null && delta >= TREND_DELTA
      ? 'IMPROVING'
      : delta != null && delta <= -TREND_DELTA
        ? 'DECLINING'
        : 'STABLE';

  return {
    state,
    daysAnalyzed: historical.length,
    daysWithExplicitActions: daysWithActions.length,
    baselinePercent,
    recentPercent,
    deltaPercentagePoints: delta,
  };
}

function calculateAssociations(
  buckets: MedicationDayBucket[],
  now: Date,
  relations: ConnectedSupportingGoal[],
  supportEvents: SupportEventRow[],
): SupportingGoalAssociation[] {
  const today = dayKey(now);
  const historical = buckets.filter((day) => day.day < today && day.expectedDoses > 0);

  return relations.map((relation) => {
    const relationDays = new Set(
      supportEvents
        .filter((event) => event.healthGoalId === relation.healthGoalId)
        .map((event) => dayKey(event.occurredAt)),
    );

    const loggedDays = historical.filter((day) => relationDays.has(day.day));
    const nonLoggedDays = historical.filter((day) => !relationDays.has(day.day));
    const onLogged = weightedAdherence(loggedDays) ?? 0;
    const onNonLogged = weightedAdherence(nonLoggedDays) ?? 0;
    const delta = Number((onLogged - onNonLogged).toFixed(2));
    const medicationActionDays = historical.filter((day) => day.recordedActions > 0).length;

    const relevant =
      loggedDays.length >= MIN_ASSOCIATION_GROUP_DAYS &&
      nonLoggedDays.length >= MIN_ASSOCIATION_GROUP_DAYS &&
      historical.length >= MIN_ASSOCIATION_TOTAL_DAYS &&
      medicationActionDays >= MIN_ASSOCIATION_ACTION_DAYS &&
      Math.abs(delta) >= MIN_ASSOCIATION_DELTA;

    return {
      supportingGoalId: relation.healthGoalId,
      supportingGoalName: relation.title,
      supportingGoalCategory: relation.category,
      loggedDays: loggedDays.length,
      nonLoggedDays: nonLoggedDays.length,
      adherenceOnLoggedDays: Number(onLogged.toFixed(2)),
      adherenceOnNonLoggedDays: Number(onNonLogged.toFixed(2)),
      deltaPercentagePoints: delta,
      statisticallyRelevant: relevant,
      insight: relevant
        ? 'Your medication routine was more consistent on days when you also logged your ' + relation.title + '.'
        : null,
    };
  });
}

function calculateConnectedGoalInsights(
  buckets: MedicationDayBucket[],
  now: Date,
  relations: ConnectedSupportingGoal[],
  supportEvents: SupportEventRow[],
): ConnectedGoalInsight[] {
  const today = dayKey(now);
  const historicalMedicationDays = buckets.filter(
    (day) => day.day < today && day.expectedDoses > 0,
  );

  return relations.map((relation) => {
    const events = supportEvents
      .filter((event) => event.healthGoalId === relation.healthGoalId)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const periods = buildSupportingGoalPeriods(events, relation);
    const relationStartDay = dayKey(new Date(relation.createdAt));
    const historicalPeriods = periods.filter(
      (period) =>
        period.endDay < today &&
        (relation.frequency !== 'WEEKLY' || period.startDay >= relationStartDay),
    );

    const latestPeriod = historicalPeriods.at(-1) ?? null;
    const latestValue = latestPeriod?.value ?? null;
    const latestStatus = latestPeriod
      ? compareSupportingGoalToTarget(latestValue, relation)
      : 'INSUFFICIENT_DATA';

    const targetPeriods = historicalPeriods.filter((period) => period.status === 'ON_TARGET');
    const missedPeriods = historicalPeriods.filter(
      (period) => period.status === 'BELOW_TARGET' || period.status === 'ABOVE_TARGET',
    );

    const periodByMedicationDay = new Map<string, SupportingGoalPeriod>();
    for (const period of historicalPeriods) {
      for (const day of period.days) {
        periodByMedicationDay.set(day, period);
      }
    }

    const metMedicationDays = historicalMedicationDays.filter(
      (day) => periodByMedicationDay.get(day.day)?.status === 'ON_TARGET',
    );
    const missedMedicationDays = historicalMedicationDays.filter((day) => {
      const status = periodByMedicationDay.get(day.day)?.status;
      return status === 'BELOW_TARGET' || status === 'ABOVE_TARGET';
    });

    const adherenceOnTarget = weightedAdherence(metMedicationDays);
    const adherenceOnMissed = weightedAdherence(missedMedicationDays);
    const delta =
      adherenceOnTarget != null && adherenceOnMissed != null
        ? Number((adherenceOnTarget - adherenceOnMissed).toFixed(2))
        : null;

    const observedPeriods = historicalPeriods.length;
    const medicationComparableDays = metMedicationDays.length + missedMedicationDays.length;
    const evidenceLevel: ConnectedGoalEvidenceLevel =
      observedPeriods >= 6 && medicationComparableDays >= 8
        ? 'STRONG'
        : observedPeriods >= 3 && medicationComparableDays >= 4
          ? 'EMERGING'
          : observedPeriods >= 1
            ? 'EARLY'
            : 'INSUFFICIENT_DATA';

    let insight: string | null = null;
    if (
      delta != null &&
      metMedicationDays.length >= 2 &&
      missedMedicationDays.length >= 2 &&
      Math.abs(delta) >= 10
    ) {
      const direction = delta > 0 ? 'higher' : 'lower';
      insight =
        `Your medication adherence was ${Math.abs(Math.round(delta))} percentage points ${direction} on days when your ${relation.title} target was met compared with days when it was not.`;
    } else if (
      delta != null &&
      metMedicationDays.length >= 2 &&
      missedMedicationDays.length >= 2
    ) {
      insight =
        `Medication adherence was ${Math.round(adherenceOnTarget ?? 0)}% on days when your ${relation.title} target was met versus ${Math.round(adherenceOnMissed ?? 0)}% when it was not.`;
    } else if (latestStatus !== 'INSUFFICIENT_DATA') {
      insight =
        latestStatus === 'ON_TARGET'
          ? `${relation.title} is currently on target in the latest recorded period.`
          : `${relation.title} is currently off target in the latest recorded period.`;
    }

    return {
      supportingGoalId: relation.healthGoalId,
      supportingGoalName: relation.title,
      supportingGoalCategory: relation.category,
      targetValue: relation.frequencyTarget,
      unit: metricUnitForRelation(relation),
      frequency: relation.frequency,
      comparison: relation.comparison,
      aggregation: relation.aggregation,
      observedPeriods,
      targetMetPeriods: targetPeriods.length,
      targetMissedPeriods: missedPeriods.length,
      latestValue,
      latestPeriodLabel: latestPeriod?.label ?? null,
      latestStatus,
      medicationAdherenceOnTargetPeriods:
        adherenceOnTarget == null ? null : Number(adherenceOnTarget.toFixed(2)),
      medicationAdherenceOnMissedTargetPeriods:
        adherenceOnMissed == null ? null : Number(adherenceOnMissed.toFixed(2)),
      medicationDeltaPercentagePoints: delta,
      evidenceLevel,
      insight,
    };
  });
}

type SupportingGoalPeriod = {
  key: string;
  startDay: string;
  endDay: string;
  label: string;
  value: number;
  status: 'ON_TARGET' | 'BELOW_TARGET' | 'ABOVE_TARGET' | 'INSUFFICIENT_DATA';
  days: string[];
};

function buildSupportingGoalPeriods(
  events: SupportEventRow[],
  relation: ConnectedSupportingGoal,
): SupportingGoalPeriod[] {
  const byKey = new Map<string, SupportEventRow[]>();

  for (const event of events) {
    const date = dayKey(event.occurredAt);
    const key =
      relation.frequency === 'WEEKLY'
        ? weekStartDay(date)
        : relation.frequency === 'TOTAL'
          ? 'TOTAL'
          : date;
    const current = byKey.get(key) ?? [];
    current.push(event);
    byKey.set(key, current);
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, periodEvents]) => {
      const value = aggregateSupportingGoalEvents(periodEvents, relation.aggregation);
      const startDay = key === 'TOTAL' ? dayKey(periodEvents[0].occurredAt) : key;
      const endDay =
        key === 'TOTAL'
          ? dayKey(periodEvents.at(-1)?.occurredAt ?? periodEvents[0].occurredAt)
          : relation.frequency === 'WEEKLY'
            ? nextDayAfterDays(startDay, 6)
            : startDay;
      return {
        key,
        startDay,
        endDay,
        label:
          relation.frequency === 'WEEKLY'
            ? `week of ${startDay}`
            : relation.frequency === 'TOTAL'
              ? 'recorded journey'
              : startDay,
        value,
        status: compareSupportingGoalToTarget(value, relation),
        days: enumerateDays(startDay, endDay),
      };
    });
}

function aggregateSupportingGoalEvents(
  events: SupportEventRow[],
  aggregation: string,
): number {
  const values = events
    .map((event) => Number(event.loggedValue))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return Number.NaN;

  switch (String(aggregation).toUpperCase()) {
    case 'AVERAGE':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'MIN':
      return Math.min(...values);
    case 'MAX':
      return Math.max(...values);
    case 'LATEST':
      return values[values.length - 1];
    case 'SUM':
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

function compareSupportingGoalToTarget(
  value: number,
  relation: ConnectedSupportingGoal,
): 'ON_TARGET' | 'BELOW_TARGET' | 'ABOVE_TARGET' | 'INSUFFICIENT_DATA' {
  const target = relation.frequencyTarget == null ? null : Number(relation.frequencyTarget);
  if (target == null || !Number.isFinite(target) || !Number.isFinite(value)) {
    return 'INSUFFICIENT_DATA';
  }

  const comparison = String(relation.comparison).toUpperCase();
  if (comparison === 'AT_MOST' || comparison === 'DECREASE_TO') {
    return value <= target ? 'ON_TARGET' : 'ABOVE_TARGET';
  }
  if (comparison === 'CLOSEST') {
    const tolerance = Math.max(Math.abs(target) * 0.1, 0.1);
    return Math.abs(value - target) <= tolerance
      ? 'ON_TARGET'
      : value < target
        ? 'BELOW_TARGET'
        : 'ABOVE_TARGET';
  }
  return value >= target ? 'ON_TARGET' : 'BELOW_TARGET';
}

function metricUnitForRelation(relation: ConnectedSupportingGoal): string {
  switch (String(relation.metricKey).toLowerCase()) {
    case 'nutrition.calories': return 'kcal/day';
    case 'exercise.minutes': return 'min/week';
    case 'sleep.hours': return 'hours/night';
    case 'hydration.ml': return 'ml/day';
    default: return '';
  }
}

function weekStartDay(day: string): string {
  const date = new Date(day + 'T12:00:00Z');
  const weekdayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (weekdayNumber - 1));
  return date.toISOString().slice(0, 10);
}

function nextDayAfterDays(day: string, days: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  for (let guard = 0; guard < 370; guard += 1) {
    days.push(cursor);
    if (cursor === end) break;
    cursor = nextDay(cursor);
  }
  return days;
}
