import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const BASELINE_WEIGHT_KG = 68.0;
const METRIC_TYPE = "WEIGHT";
const METRIC_KEY = "weight.kg";
const COMPARISON = "CLOSEST";

async function main() {
  console.log("🔧 Starting local weight-data synchronization...");

  const patient = await prisma.patient.findFirst({
    where: {
      deceased: false,
      user: {
        status: "ACTIVE",
        userType: "PATIENT",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          userType: true,
        },
      },
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
        },
      },
      healthPassport: {
        include: {
          patientMedications: {
            where: {
              status: "ACTIVE",
            },
            include: {
              medication: true,
            },
          },
          conditions: {
            where: {
              status: "ACTIVE",
            },
            include: {
              condition: true,
            },
          },
        },
      },
      baseline: true,
    },
  });

  if (!patient) {
    throw new Error("No active patient/user context was found.");
  }

  const activeMetformin = patient.healthPassport?.patientMedications.find(
    (pm) =>
      /metformin/i.test(pm.medication?.name ?? "") ||
      /metformin/i.test(pm.medication?.genericName ?? ""),
  );

  console.log("👤 Active patient context:", {
    patientId: patient.id,
    userId: patient.user.id,
    email: patient.user.email,
    name: `${patient.person.firstName} ${patient.person.lastName}`,
    heightCm: patient.heightCm?.toString() ?? null,
    weightKg: patient.weightKg?.toString() ?? null,
    activeMetformin: activeMetformin
      ? {
          patientMedicationId: activeMetformin.id,
          medicationId: activeMetformin.medicationId,
          name: activeMetformin.medication.name,
          dosage: activeMetformin.dosage,
          frequency: activeMetformin.frequency,
        }
      : null,
    activeConditions:
      patient.healthPassport?.conditions.map((pc) => ({
        patientConditionId: pc.id,
        conditionId: pc.conditionId,
        name: pc.condition.name,
        severity: pc.severity,
      })) ?? [],
  });

  const weightGoal = await prisma.healthGoal.findFirst({
    where: {
      patientId: patient.id,
      category: "WEIGHT",
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!weightGoal) {
    throw new Error(
      `No ACTIVE WEIGHT health goal was found for patient ${patient.id}.`,
    );
  }

  const now = new Date();

  const updatedGoal = await prisma.$transaction(async (tx) => {
    const goal = await tx.healthGoal.update({
      where: { id: weightGoal.id },
      data: {
        // Maintenance is represented by CLOSEST in HealthGoalMetricConfig.
        // targetValue is the requested change amount, therefore 0 means no
        // requested gain/loss rather than a destination weight of 0 kg.
        targetValue: 0,
        currentValue: BASELINE_WEIGHT_KG,
        unit: "kg",
      },
    });

    const configRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "HealthGoalMetricConfig"
      WHERE "healthGoalId" = ${goal.id}
      LIMIT 1
    `;

    const guidanceText =
      "Maintain weight close to the established baseline. Monitor trends rather than pursuing weight loss or gain.";

    if (configRows.length) {
      await tx.$executeRaw`
        UPDATE "HealthGoalMetricConfig"
        SET
          "metricType" = ${METRIC_TYPE},
          "metricKey" = ${METRIC_KEY},
          "frequency" = 'DAILY',
          "frequencyTarget" = 0,
          "aggregation" = 'LAST',
          "comparison" = ${COMPARISON},
          "guidanceText" = ${guidanceText}
        WHERE "id" = ${configRows[0].id}::uuid
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO "HealthGoalMetricConfig"
          ("id", "healthGoalId", "metricType", "metricKey", "frequency",
           "frequencyTarget", "aggregation", "comparison", "guidanceText")
        VALUES
          (gen_random_uuid(), ${goal.id}, ${METRIC_TYPE}, ${METRIC_KEY},
           'DAILY', 0, 'LAST', ${COMPARISON}, ${guidanceText})
      `;
    }

    const baselineRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patient.id}
        AND "metricType" = ${METRIC_TYPE}
        AND "metricKey" = ${METRIC_KEY}
        AND "source" = 'goal-baseline'
        AND "sourceId" = ${goal.id}
      LIMIT 1
    `;

    if (baselineRows.length) {
      await tx.$executeRaw`
        UPDATE "HealthGoalMetricEvent"
        SET
          "loggedValue" = ${BASELINE_WEIGHT_KG},
          "occurredAt" = ${new Date(goal.createdAt)}
        WHERE "id" = ${baselineRows[0].id}::uuid
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO "HealthGoalMetricEvent"
          ("id", "patientId", "metricType", "metricKey", "loggedValue",
           "occurredAt", "source", "sourceId")
        VALUES
          (gen_random_uuid(), ${patient.id}, ${METRIC_TYPE}, ${METRIC_KEY},
           ${BASELINE_WEIGHT_KG}, ${new Date(goal.createdAt)},
           'goal-baseline', ${goal.id})
      `;
    }

    // Keep the patient's profile baseline synchronized with the goal baseline.
    await tx.patientBaseline.upsert({
      where: { patientId: patient.id },
      update: {
        weightKg: BASELINE_WEIGHT_KG,
        heightCm: patient.heightCm ?? undefined,
        updatedAt: now,
      },
      create: {
        patientId: patient.id,
        weightKg: BASELINE_WEIGHT_KG,
        heightCm: patient.heightCm ?? undefined,
        establishedAt: new Date(goal.createdAt),
      },
    });

    return goal;
  });

  const metricConfig = await prisma.$queryRaw<
    Array<{
      id: string;
      healthGoalId: string;
      metricType: string;
      metricKey: string;
      frequency: string | null;
      frequencyTarget: unknown;
      aggregation: string | null;
      comparison: string | null;
      guidanceText: string | null;
    }>
  >`
    SELECT
      "id",
      "healthGoalId",
      "metricType",
      "metricKey",
      "frequency",
      "frequencyTarget",
      "aggregation",
      "comparison",
      "guidanceText"
    FROM "HealthGoalMetricConfig"
    WHERE "healthGoalId" = ${updatedGoal.id}
    LIMIT 1
  `;

  const baselineEvent = await prisma.$queryRaw<
    Array<{
      id: string;
      patientId: string;
      metricType: string;
      metricKey: string;
      loggedValue: unknown;
      occurredAt: Date;
      source: string | null;
      sourceId: string | null;
    }>
  >`
    SELECT
      "id",
      "patientId",
      "metricType",
      "metricKey",
      "loggedValue",
      "occurredAt",
      "source",
      "sourceId"
    FROM "HealthGoalMetricEvent"
    WHERE "patientId" = ${patient.id}
      AND "source" = 'goal-baseline'
      AND "sourceId" = ${updatedGoal.id}
    LIMIT 1
  `;

  const finalPatient = await prisma.patient.findUnique({
    where: { id: patient.id },
    select: {
      id: true,
      heightCm: true,
      weightKg: true,
      baseline: true,
    },
  });

  const finalGoal = await prisma.healthGoal.findUnique({
    where: { id: updatedGoal.id },
    include: {
      patientMedication: {
        include: {
          medication: true,
        },
      },
      progress: {
        orderBy: { measuredAt: "desc" },
        take: 5,
      },
    },
  });

  console.log("\n✅ Weight data synchronization complete.");
  console.dir(
    {
      patient: finalPatient,
      activeMetformin: activeMetformin
        ? {
            patientMedicationId: activeMetformin.id,
            medicationId: activeMetformin.medicationId,
            name: activeMetformin.medication.name,
          }
        : null,
      activeConditions:
        patient.healthPassport?.conditions.map((pc) => ({
          patientConditionId: pc.id,
          conditionId: pc.conditionId,
          name: pc.condition.name,
        })) ?? [],
      healthGoal: finalGoal,
      metricConfig,
      baselineEvent,
    },
    { depth: null, colors: true },
  );
}

main()
  .catch((error) => {
    console.error("\n❌ Weight data synchronization failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
