import "dotenv/config";

import fs from "fs";
import path from "path";
import readline from "readline";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
|
| Download the current RxNorm Prescribable Content release from NLM:
|
| https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
|
| Extract the zip and point RXNORM_DIR at the extracted directory.
|
*/

const RXNORM_DIR =
  process.env.RXNORM_DIR ??
  path.resolve(process.cwd(), "rxnorm");

const RXNCONSO_FILE = path.join(
  RXNORM_DIR,
  "rrf",
  "RXNCONSO.RRF",
);

const RXNSAT_FILE = path.join(
  RXNORM_DIR,
  "rrf",
  "RXNSAT.RRF",
);

/*
|--------------------------------------------------------------------------
| RxNorm term types
|--------------------------------------------------------------------------
|
| IN   = Ingredient
| PIN  = Precise Ingredient
| SCD  = Semantic Clinical Drug
| SBD  = Semantic Branded Drug
|
| We deliberately do not create one Medication row for every package.
|
*/

const MEDICATION_TTYS = new Set([
  "IN",
  "PIN",
  "SCD",
  "SBD",
]);

interface RxConcept {
  rxcui: string;
  name: string;
  tty: string;
  suppress: string;
  sab: string;
}

interface MedicationRecord {
  rxNormCode: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category?: string;
  dosageForm?: string;
  strength?: string;
  route?: string;
  controlled: boolean;
  prescriptionRequired: boolean;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function splitRrfLine(line: string): string[] {
  /*
   * RRF uses "|" as delimiter and normally ends with
   * an additional "|".
   */
  return line.split("|");
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function inferPrescriptionRequired(
  tty: string,
): boolean {
  /*
   * This is intentionally conservative.
   *
   * RxNorm itself is not a universal legal authority for
   * prescription status in every country.
   *
   * We therefore default to true and allow this field
   * to be adjusted by your organization/admin data later.
   */

  return true;
}

function inferControlled(
  name: string,
): boolean {
  /*
   * Do NOT try to determine controlled-substance status
   * purely from medication names.
   *
   * Controlled status differs by jurisdiction.
   *
   * Default false and maintain jurisdiction-specific
   * regulatory data separately.
   */

  return false;
}

/*
|--------------------------------------------------------------------------
| Parse RXNCONSO
|--------------------------------------------------------------------------
*/

async function loadConcepts(): Promise<
  Map<string, RxConcept>
> {
  if (!fs.existsSync(RXNCONSO_FILE)) {
    throw new Error(
      `RXNCONSO.RRF not found:\n${RXNCONSO_FILE}`,
    );
  }

  const concepts = new Map<string, RxConcept>();

  const stream = fs.createReadStream(
    RXNCONSO_FILE,
    {
      encoding: "utf8",
    },
  );

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    const fields = splitRrfLine(line);

    /*
     * RXNCONSO columns:
     *
     * 0  RXCUI
     * 1  LAT
     * 2  TS
     * 3  LUI
     * 4  STT
     * 5  SUI
     * 6  ISPREF
     * 7  RXAUI
     * 8  SAUI
     * 9  SCUI
     * 10 SDUI
     * 11 SAB
     * 12 TTY
     * 13 CODE
     * 14 STR
     * ...
     */

    const rxcui = clean(fields[0]);
    const lat = clean(fields[1]);
    const sab = clean(fields[11]);
    const tty = clean(fields[12]);
    const name = clean(fields[14]);

    if (!rxcui || !name || !sab || !tty) {
      continue;
    }

    if (lat !== "ENG") {
      continue;
    }

    if (sab !== "RXNORM") {
      continue;
    }

    if (!MEDICATION_TTYS.has(tty)) {
      continue;
    }

    /*
     * We only keep active RxNorm concepts.
     *
     * SUPPRESS lives in RXNCONSO later columns depending
     * on release format, so we additionally rely on the
     * active RxNorm vocabulary rows.
     */

    if (!concepts.has(rxcui)) {
      concepts.set(rxcui, {
        rxcui,
        name,
        tty,
        suppress: "",
        sab,
      });
    }
  }

  return concepts;
}

/*
|--------------------------------------------------------------------------
| Parse RXNSAT
|--------------------------------------------------------------------------
*/

async function loadAttributes(
  concepts: Map<string, RxConcept>,
): Promise<
  Map<
    string,
    {
      strength?: string;
      doseForm?: string;
      route?: string;
      genericName?: string;
      brandName?: string;
    }
  >
> {
  if (!fs.existsSync(RXNSAT_FILE)) {
    throw new Error(
      `RXNSAT.RRF not found:\n${RXNSAT_FILE}`,
    );
  }

  const attributes = new Map<
    string,
    {
      strength?: string;
      doseForm?: string;
      route?: string;
      genericName?: string;
      brandName?: string;
    }
  >();

  const stream = fs.createReadStream(
    RXNSAT_FILE,
    {
      encoding: "utf8",
    },
  );

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    const fields = splitRrfLine(line);

    /*
     * RXNSAT:
     *
     * 0  RXCUI
     * 1  LUI
     * 2  SUI
     * 3  RXAUI
     * 4  STYPE
     * 5  CODE
     * 6  ATN
     * 7  SAB
     * 8  ATV
     * ...
     */

    const rxcui = clean(fields[0]);
    const atn = clean(fields[6]);
    const sab = clean(fields[7]);
    const atv = clean(fields[8]);

    if (!rxcui || !atn || !atv) {
      continue;
    }

    if (sab !== "RXNORM") {
      continue;
    }

    if (!concepts.has(rxcui)) {
      continue;
    }

    const existing =
      attributes.get(rxcui) ?? {};

    /*
     * Common RxNorm attributes.
     *
     * These names can vary depending on the
     * source/release, so we keep the importer
     * deliberately tolerant.
     */

    switch (atn) {
      case "STRENGTH":
      case "STRENGTH_UNIT":
        existing.strength =
          existing.strength
            ? `${existing.strength} ${atv}`
            : atv;
        break;

      case "DOSE_FORM":
      case "DOSEFORM":
        existing.doseForm = atv;
        break;

      case "ROUTE":
        existing.route = atv;
        break;

      default:
        break;
    }

    attributes.set(rxcui, existing);
  }

  return attributes;
}

/*
|--------------------------------------------------------------------------
| Determine generic / brand information
|--------------------------------------------------------------------------
*/

function buildMedication(
  concept: RxConcept,
  attributes: Map<
    string,
    {
      strength?: string;
      doseForm?: string;
      route?: string;
      genericName?: string;
      brandName?: string;
    }
  >,
): MedicationRecord {
  const attrs =
    attributes.get(concept.rxcui) ?? {};

  const isBrand =
    concept.tty === "SBD";

  const isIngredient =
    concept.tty === "IN" ||
    concept.tty === "PIN";

  return {
    rxNormCode: concept.rxcui,

    name: concept.name,

    genericName:
      isBrand || isIngredient
        ? undefined
        : concept.name,

    brandName: isBrand
      ? concept.name
      : undefined,

    category: undefined,

    dosageForm: attrs.doseForm,

    strength: attrs.strength,

    route: attrs.route,

    controlled: inferControlled(
      concept.name,
    ),

    prescriptionRequired:
      inferPrescriptionRequired(
        concept.tty,
      ),
  };
}

/*
|--------------------------------------------------------------------------
| Upsert
|--------------------------------------------------------------------------
*/

async function upsertMedication(
  medication: MedicationRecord,
) {
  await prisma.medication.upsert({
    where: {
      rxNormCode: medication.rxNormCode,
    },

    update: {
      name: medication.name,

      genericName:
        medication.genericName,

      brandName:
        medication.brandName,

      dosageForm:
        medication.dosageForm,

      strength:
        medication.strength,

      route:
        medication.route,

      controlled:
        medication.controlled,

      prescriptionRequired:
        medication.prescriptionRequired,

      searchable: true,

      active: true,
    },

    create: {
      rxNormCode:
        medication.rxNormCode,

      name:
        medication.name,

      genericName:
        medication.genericName,

      brandName:
        medication.brandName,

      dosageForm:
        medication.dosageForm,

      strength:
        medication.strength,

      route:
        medication.route,

      controlled:
        medication.controlled,

      prescriptionRequired:
        medication.prescriptionRequired,

      searchable: true,

      active: true,
    },
  });
}

/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function main() {
  console.log(
    "💊 Starting RxNorm medication import...",
  );

  console.log(
    `📁 RxNorm directory: ${RXNORM_DIR}`,
  );

  const concepts =
    await loadConcepts();

  console.log(
    `📚 RxNorm medication concepts found: ${concepts.size}`,
  );

  const attributes =
    await loadAttributes(concepts);

  console.log(
    `📋 RxNorm attributes loaded: ${attributes.size}`,
  );

  let imported = 0;

  for (const concept of concepts.values()) {
    const medication =
      buildMedication(
        concept,
        attributes,
      );

    await upsertMedication(
      medication,
    );

    imported++;

    if (imported % 500 === 0) {
      console.log(
        `💊 Imported ${imported}/${concepts.size}`,
      );
    }
  }

  console.log("");
  console.log(
    `✅ Medication import complete: ${imported}`,
  );

  const count =
    await prisma.medication.count();

  console.log(
    `💊 Total medications in database: ${count}`,
  );
}

main()
  .catch((error) => {
    console.error(
      "❌ Medication import failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });