import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { SYMPTOM_REFERENCE } from './clinical-reference-data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const API = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

type CoreClinicalReference = {
  synonyms: string[];
  sideEffects: string[];
  relievedSymptoms: string[];
  maskingSymptoms?: string[];
};

/**
 * Baseline clinical truth for core patient-facing medicines.
 *
 * This layer is deliberately independent of DailyMed. DailyMed is enrichment,
 * not a prerequisite for the core medication experience to work.
 */
const CORE_CLINICAL_REFERENCES: Record<string, CoreClinicalReference> = {
  Paracetamol: {
    synonyms: ['Acetaminophen'],
    sideEffects: ['Nausea', 'Rash', 'Allergic reaction'],
    relievedSymptoms: ['Headache', 'Fever', 'Muscle pain', 'Body aches'],
    maskingSymptoms: ['Fever'],
  },
  Aspirin: {
    synonyms: ['Acetylsalicylic acid'],
    sideEffects: ['Stomach upset', 'Heartburn', 'Nausea', 'Easy bruising'],
    relievedSymptoms: ['Headache', 'Fever', 'Muscle pain', 'Joint pain', 'Inflammation'],
  },
  Metformin: {
    synonyms: [],
    sideEffects: ['Abdominal pain', 'Diarrhea', 'Loss of appetite', 'Nausea'],
    relievedSymptoms: [],
  },
  Amlodipine: {
    synonyms: [],
    sideEffects: ['Dizziness', 'Fatigue', 'Leg swelling', 'Palpitations'],
    relievedSymptoms: [],
  },
  Carbimazole: {
    synonyms: ['Methimazole'],
    sideEffects: ['Nausea', 'Headache', 'Joint pain', 'Skin rash'],
    relievedSymptoms: [],
  },
  'Benzoyl peroxide': {
    synonyms: [],
    sideEffects: ['Skin irritation', 'Dry skin', 'Peeling', 'Redness'],
    relievedSymptoms: ['Acne', 'Pimple'],
  },
};

type Row = { setid?: string; title?: string; published_date?: string };

const aliases: Record<string, string[]> = {
  'Abdominal pain': ['abdominal discomfort', 'stomach pain', 'belly pain'],
  'Leg swelling': ['peripheral edema', 'peripheral oedema', 'edema of the extremities', 'oedema of the extremities'],
  'General swelling': ['edema', 'oedema', 'swelling'],
  'Skin rash': ['skin eruption', 'skin eruptions', 'cutaneous eruption'],
  Itching: ['pruritus'], Hives: ['urticaria'], Fever: ['pyrexia', 'elevated temperature'],
  Fatigue: ['tiredness'], Weakness: ['asthenia'], Dizziness: ['lightheadedness'],
  Nausea: ['nausea'], Vomiting: ['emesis'], Diarrhea: ['diarrhoea', 'loose stools'],
  Headache: ['cephalgia'], 'Muscle pain': ['myalgia', 'muscle aches'], 'Joint pain': ['arthralgia'],
  'Muscle weakness': ['muscular weakness'], Numbness: ['hypoesthesia'], Tingling: ['paresthesia', 'paraesthesia'],
  'Excessive sleepiness': ['somnolence', 'drowsiness'], Insomnia: ['difficulty sleeping'],
  Confusion: ['confusional state'], Tremor: ['shaking'], Palpitations: ['palpitation'],
  'Fast heartbeat': ['tachycardia', 'rapid heartbeat'], 'Slow heartbeat': ['bradycardia'],
  'Irregular heartbeat': ['arrhythmia', 'dysrhythmia'], 'Shortness of breath': ['dyspnea', 'dyspnoea', 'breathlessness'],
  'Dry mouth': ['xerostomia'], 'Loss of appetite': ['anorexia', 'poor appetite'], 'Hair loss': ['alopecia'],
  'Yellow skin': ['jaundice', 'icterus'], 'Reduced urine output': ['oliguria', 'decreased urine output'],
  'Blood in urine': ['hematuria', 'haematuria'], 'Blood in stool': ['hematochezia', 'haematochezia'],
  'Black stool': ['melena', 'melaena'], 'Vomiting blood': ['hematemesis', 'haematemesis'],
  Nosebleed: ['epistaxis'], 'Easy bruising': ['ecchymosis'], 'Blurred vision': ['visual disturbance'],
  'Hearing loss': ['hearing impairment'], 'Ringing in ears': ['tinnitus'], 'Runny nose': ['rhinorrhea', 'rhinorrhoea'],
  'Blocked nose': ['nasal congestion'], Sweating: ['perspiration'], 'Excessive sweating': ['hyperhidrosis'],
  Restlessness: ['agitation'], 'Low mood': ['depressed mood'], Seizure: ['convulsion'], Fainting: ['syncope'],
  'Red skin': ['erythema', 'redness'], 'Dry skin': ['xerosis', 'dryness'], 'Peeling skin': ['desquamation', 'scaling'],
  Blisters: ['bullae', 'blistering'], 'Skin swelling': ['facial edema', 'facial oedema', 'angioedema'],
  'Mouth sores': ['oral ulcer', 'stomatitis'], 'Swollen tongue': ['tongue edema', 'tongue oedema'],
};

function norm(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function text(xml: string) {
  return xml
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function section(xml: string, code: string) {
  const m = xml.match(new RegExp(`<section\\b[\\s\\S]*?<code[^>]+code=["']${code}["'][^>]*>[\\s\\S]*?<\\/section>`, 'i'));
  return m ? text(m[0]) : '';
}

function symptoms(input: string) {
  const hay = norm(input);
  const out = new Set<string>();

  for (const s of SYMPTOM_REFERENCE) {
    if ([s.name, ...(s.synonyms ?? [])].some(v => hay.includes(norm(v)))) out.add(s.name);
  }

  for (const [canonical, list] of Object.entries(aliases)) {
    if (list.some(v => hay.includes(norm(v)))) out.add(canonical);
  }

  return [...out];
}

function masks(input: string) {
  const hay = norm(input);
  const out = new Set<string>();

  for (const s of symptoms(input)) {
    const i = hay.indexOf(norm(s));
    if (
      i >= 0 &&
      /\b(mask|masks|masking|masked|conceal|concealed|may conceal)\b/.test(
        hay.slice(Math.max(0, i - 180), i + norm(s).length + 180),
      )
    ) {
      out.add(s);
    }
  }

  return [...out];
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    return r.ok ? await r.json() as T : null;
  } catch {
    return null;
  }
}

async function xml(url: string) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/xml,text/xml' } });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

function coreReferenceForMedication(name: string, genericName: string | null) {
  const candidates = [name, genericName].filter(Boolean).map(norm);

  for (const [canonical, reference] of Object.entries(CORE_CLINICAL_REFERENCES)) {
    const names = [canonical, ...reference.synonyms].map(norm);
    if (candidates.some(candidate => names.includes(candidate))) return { canonical, reference };
  }

  return undefined;
}

function dailyMedQueryNames(name: string, genericName: string | null) {
  const candidates = [genericName, name].filter(Boolean) as string[];
  const normalized = candidates.map(norm);

  // DailyMed is US-centric; Paracetamol is generally labelled as Acetaminophen.
  if (normalized.includes(norm('Paracetamol'))) {
    return ['Acetaminophen', ...candidates.filter(candidate => norm(candidate) !== norm('Paracetamol'))];
  }

  // Core synonyms are also useful fallback search names for DailyMed.
  const core = coreReferenceForMedication(name, genericName);
  if (core) {
    return [...new Set([core.canonical, ...core.reference.synonyms, ...candidates])];
  }

  return candidates;
}

async function findSetId(rxNormCode: string | null, name: string, genericName: string | null) {
  const names = dailyMedQueryNames(name, genericName);

  if (rxNormCode) {
    const result = await json<{ data?: Row[] }>(`${API}/spls.json?rxcui=${encodeURIComponent(rxNormCode)}&pagesize=100&page=1`);
    const rows = result?.data ?? [];
    rows.sort((a, b) => String(b.published_date ?? '').localeCompare(String(a.published_date ?? '')));
    if (rows[0]?.setid) return rows[0].setid;
  }

  for (const n of names) {
    const result = await json<{ data?: Row[] }>(`${API}/spls.json?drug_name=${encodeURIComponent(n)}&name_type=both&pagesize=100&page=1`);
    const rows = result?.data ?? [];
    const wanted = norm(n);

    rows.sort((a, b) => {
      const ae = norm(a.title ?? '').includes(wanted) ? 1 : 0;
      const be = norm(b.title ?? '').includes(wanted) ? 1 : 0;
      return be - ae || String(b.published_date ?? '').localeCompare(String(a.published_date ?? ''));
    });

    if (rows[0]?.setid) return rows[0].setid;
  }

  return undefined;
}

async function symptomRecord(name: string) {
  const ref = SYMPTOM_REFERENCE.find(
    s => [s.name, ...(s.synonyms ?? [])].some(v => norm(v) === norm(name)),
  );

  if (ref) {
    const existing = await prisma.symptom.findFirst({ where: { name: ref.name } });
    if (existing) return existing;

    return prisma.symptom.create({
      data: {
        name: ref.name,
        category: ref.category,
        bodySystem: ref.category,
        description: ref.synonyms?.length ? `Also known as: ${ref.synonyms.join(', ')}` : undefined,
        searchable: true,
        active: true,
      },
    });
  }

  const existing = await prisma.symptom.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.symptom.create({
    data: {
      name,
      category: 'General',
      bodySystem: 'General',
      searchable: true,
      active: true,
    },
  });
}

async function relation(
  medicationId: string,
  symptomName: string,
  relationType: 'SIDE_EFFECT' | 'RELIEVES_SYMPTOM' | 'MAY_MASK_SYMPTOM',
  source: string,
  notes: string,
) {
  const s = await symptomRecord(symptomName);

  await prisma.medicationClinicalReference.upsert({
    where: {
      medicationId_symptomId_relationType: {
        medicationId,
        symptomId: s.id,
        relationType,
      },
    },
    update: {
      evidenceLevel: 'CURATED',
      source,
      notes,
      active: true,
    },
    create: {
      medicationId,
      symptomId: s.id,
      relationType,
      evidenceLevel: 'CURATED',
      source,
      notes,
      active: true,
    },
  });
}

async function seedCoreClinicalReference(
  medicationId: string,
  medicationName: string,
  reference: CoreClinicalReference,
) {
  for (const symptom of reference.sideEffects) {
    await relation(
      medicationId,
      symptom,
      'SIDE_EFFECT',
      'CORE_CLINICAL_REFERENCE',
      `Static core clinical reference for ${medicationName}.`,
    );
  }

  for (const symptom of reference.relievedSymptoms) {
    await relation(
      medicationId,
      symptom,
      'RELIEVES_SYMPTOM',
      'CORE_CLINICAL_REFERENCE',
      `Static core clinical reference for ${medicationName}.`,
    );
  }

  for (const symptom of reference.maskingSymptoms ?? []) {
    await relation(
      medicationId,
      symptom,
      'MAY_MASK_SYMPTOM',
      'CORE_CLINICAL_REFERENCE',
      `Static core clinical reference for ${medicationName}.`,
    );
  }
}

async function main() {
  const meds = await prisma.medication.findMany({
    where: { active: true },
    select: { id: true, name: true, genericName: true, rxNormCode: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Clinical enrichment: ${meds.length} active medications`);
  console.log(`Core fallback references: ${Object.keys(CORE_CLINICAL_REFERENCES).length}`);

  let coreSeeded = 0;
  let enriched = 0;
  let unavailable = 0;

  for (const med of meds) {
    // 1. Static core reference is always seeded first and never depends on DailyMed.
    const core = coreReferenceForMedication(med.name, med.genericName);
    if (core) {
      await seedCoreClinicalReference(med.id, med.name, core.reference);
      coreSeeded++;
    }

    // 2. DailyMed is enrichment only. A missing label never removes the core data.
    const setId = await findSetId(med.rxNormCode, med.name, med.genericName);
    if (!setId) {
      unavailable++;
      console.log(`${core ? 'CORE ONLY' : 'NO LABEL'}: ${med.name}`);
      continue;
    }

    const raw = await xml(`${API}/spls/${setId}.xml`);
    if (!raw) {
      unavailable++;
      console.log(`${core ? 'CORE ONLY / LABEL ERROR' : 'LABEL ERROR'}: ${med.name}`);
      continue;
    }

    const adverse = section(raw, '34084-4');
    const indications = section(raw, '34067-9');
    const se = symptoms(adverse);
    const rel = symptoms(indications);
    const mask = masks(`${adverse} ${indications}`);

    // Merge: DailyMed adds/updates relationships but never clears static records.
    for (const s of se) {
      await relation(med.id, s, 'SIDE_EFFECT', 'DailyMed', 'DailyMed ADVERSE REACTIONS.');
    }
    for (const s of rel) {
      await relation(
        med.id,
        s,
        'RELIEVES_SYMPTOM',
        'DailyMed',
        'DailyMed INDICATIONS AND USAGE. This does not imply treatment of every cause of the symptom.',
      );
    }
    for (const s of mask) {
      await relation(
        med.id,
        s,
        'MAY_MASK_SYMPTOM',
        'DailyMed',
        'DailyMed explicitly indicates that the medication may mask or conceal the symptom.',
      );
    }

    enriched++;
    console.log(
      `OK: ${med.name} -> core=${core ? 'yes' : 'no'}, ${se.length} DailyMed side effects, ${rel.length} DailyMed symptom indications, ${mask.length} masking`,
    );
  }

  const total = await prisma.medicationClinicalReference.count({ where: { active: true } });
  console.log(`DONE: coreSeeded=${coreSeeded}, enriched=${enriched}, unavailable=${unavailable}, active clinical relationships=${total}`);
}

main()
  .catch(e => {
    console.error('Complete medication clinical seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
