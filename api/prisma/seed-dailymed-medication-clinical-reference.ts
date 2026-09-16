import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { SYMPTOM_REFERENCE } from './clinical-reference-data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DAILYMED = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';
const MAX_CONCURRENT = 5;

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionByCode(xml: string, code: string) {
  const pattern = new RegExp(
    `<section\\b[\\s\\S]*?<code[^>]+code=["']${code}["'][^>]*>[\\s\\S]*?<\\/section>`,
    'i',
  );
  const match = xml.match(pattern);
  return match ? xmlText(match[0]) : '';
}

function findCanonicalSymptoms(text: string) {
  const normalisedText = normalise(text);
  const matches = new Set<string>();

  for (const symptom of SYMPTOM_REFERENCE) {
    const candidates = [symptom.name, ...(symptom.synonyms ?? [])]
      .map(normalise)
      .filter(Boolean);

    if (candidates.some((candidate) => normalisedText.includes(candidate))) {
      matches.add(symptom.name);
    }
  }

  const aliases: Record<string, string[]> = {
    'Abdominal pain': ['abdominal discomfort', 'stomach pain', 'belly pain'],
    'Leg swelling': ['peripheral edema', 'peripheral oedema', 'edema of the extremities', 'oedema of the extremities'],
    'General swelling': ['edema', 'oedema', 'swelling'],
    'Skin rash': ['skin eruption', 'skin eruptions', 'cutaneous eruption'],
    'Itching': ['pruritus'],
    'Hives': ['urticaria'],
    'Fever': ['pyrexia', 'elevated temperature', 'rise in temperature'],
    'Fatigue': ['tiredness'],
    'Weakness': ['asthenia'],
    'Malaise': ['feeling unwell'],
    'Dizziness': ['lightheadedness'],
    'Vertigo': ['vertigo'],
    'Nausea': ['nausea'],
    'Vomiting': ['emesis'],
    'Diarrhea': ['diarrhea', 'diarrhoea', 'loose stools'],
    'Constipation': ['constipation'],
    'Headache': ['headache', 'cephalgia'],
    'Muscle pain': ['myalgia', 'muscle aches'],
    'Joint pain': ['arthralgia', 'joint pain'],
    'Muscle weakness': ['muscular weakness'],
    'Numbness': ['hypoesthesia'],
    'Tingling': ['paresthesia', 'paraesthesia', 'pins and needles'],
    'Excessive sleepiness': ['somnolence', 'drowsiness'],
    'Insomnia': ['difficulty sleeping'],
    'Confusion': ['confusional state'],
    'Tremor': ['tremor', 'shaking'],
    'Palpitations': ['palpitation', 'palpitations'],
    'Fast heartbeat': ['tachycardia', 'rapid heartbeat'],
    'Slow heartbeat': ['bradycardia'],
    'Irregular heartbeat': ['arrhythmia', 'dysrhythmia'],
    'Shortness of breath': ['dyspnea', 'dyspnoea', 'breathlessness'],
    'Difficulty breathing': ['difficulty breathing'],
    'Wheezing': ['wheezing'],
    'Cough': ['cough'],
    'Chest pain': ['chest pain'],
    'Chest tightness': ['chest tightness'],
    'Dry mouth': ['xerostomia'],
    'Loss of appetite': ['anorexia', 'poor appetite'],
    'Hair loss': ['alopecia'],
    'Yellow skin': ['jaundice', 'icterus'],
    'Dark urine': ['dark urine'],
    'Reduced urine output': ['oliguria', 'decreased urine output'],
    'Blood in urine': ['hematuria', 'haematuria'],
    'Blood in stool': ['hematochezia', 'haematochezia'],
    'Black stool': ['melena', 'melaena'],
    'Vomiting blood': ['hematemesis', 'haematemesis'],
    'Nosebleed': ['epistaxis'],
    'Easy bruising': ['ecchymosis'],
    'Easy bleeding': ['bleeding tendency'],
    'Hair loss': ['alopecia'],
    'Eye redness': ['ocular hyperemia'],
    'Vision loss': ['visual loss'],
    'Blurred vision': ['visual disturbance', 'blurred vision'],
    'Hearing loss': ['hearing impairment'],
    'Ringing in ears': ['tinnitus'],
    'Sore throat': ['pharyngitis', 'throat irritation'],
    'Runny nose': ['rhinorrhea', 'rhinorrhoea'],
    'Blocked nose': ['nasal congestion'],
    'Sneezing': ['sneezing'],
    'Sweating': ['perspiration'],
    'Excessive sweating': ['hyperhidrosis'],
    'Anxiety': ['anxiety'],
    'Restlessness': ['agitation', 'restlessness'],
    'Low mood': ['depressed mood', 'depression'],
    'Seizure': ['convulsion', 'seizures'],
    'Fainting': ['syncope'],
    'Near fainting': ['presyncope'],
    'Rash': ['rash'],
    'Red skin': ['erythema', 'redness'],
    'Dry skin': ['xerosis', 'dryness'],
    'Peeling skin': ['desquamation', 'scaling'],
    'Blisters': ['bullae', 'blistering'],
    'Skin swelling': ['facial edema', 'facial oedema', 'angioedema'],
    'Hair loss': ['alopecia'],
    'Mouth sores': ['oral ulcer', 'stomatitis'],
    'Swollen tongue': ['tongue edema', 'tongue oedema'],
  };

  for (const [canonical, aliasesForSymptom] of Object.entries(aliases)) {
    if (aliasesForSymptom.some((alias) => normalisedText.includes(normalise(alias)))) {
      matches.add(canonical);
    }
  }

  return [...matches];
}

function maskingSymptoms(fullText: string) {
  const text = normalise(fullText);
  const matches = new Set<string>();

  for (const symptom of findCanonicalSymptoms(fullText)) {
    const canonical = normalise(symptom);
    const index = text.indexOf(canonical);
    if (index < 0) continue;
    const window = text.slice(Math.max(0, index - 140), Math.min(text.length, index + canonical.length + 140));
    if (/\b(mask|masks|masking|masked|may conceal|conceal)\b/.test(window)) {
      matches.add(symptom);
    }
  }

  return [...matches];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch (error) {
      if (attempt === 3) {
        console.warn(`DailyMed request failed: ${url}`, error);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return null;
}

async function fetchText(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/xml,text/xml' },
      });
      if (!response.ok) return null;
      return await response.text();
    } catch (error) {
      if (attempt === 3) {
        console.warn(`DailyMed request failed: ${url}`, error);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return null;
}

interface DailyMedList {
  data?: Array<Array<string | number>>;
}

async function getLatestSetId(rxNormCode: string) {
  const url = `${DAILYMED}/spls.json?rxcui=${encodeURIComponent(rxNormCode)}&pagesize=1&page=1`;
  const result = await fetchJson<DailyMedList>(url);
  const row = result?.data?.[0];
  return row?.[0] ? String(row[0]) : undefined;
}

async function findOrCreateSymptom(name: string) {
  const existing = await prisma.symptom.findFirst({ where: { name } });
  if (existing) return existing;

  const reference = SYMPTOM_REFERENCE.find(
    (symptom) => normalise(symptom.name) === normalise(name),
  );

  return prisma.symptom.create({
    data: {
      name,
      category: reference?.category ?? 'General',
      bodySystem: reference?.category ?? 'General',
      description: reference?.synonyms?.length
        ? `Also known as: ${reference.synonyms.join(', ')}`
        : undefined,
      searchable: true,
      active: true,
    },
  });
}

async function upsertRelation(
  medicationId: string,
  symptomName: string,
  relationType: 'SIDE_EFFECT' | 'RELIEVES_SYMPTOM' | 'MAY_MASK_SYMPTOM',
  notes: string,
) {
  const symptom = await findOrCreateSymptom(symptomName);

  await prisma.medicationClinicalReference.upsert({
    where: {
      medicationId_symptomId_relationType: {
        medicationId,
        symptomId: symptom.id,
        relationType,
      },
    },
    update: {
      evidenceLevel: 'CURATED',
      source: 'DailyMed',
      notes,
      active: true,
    },
    create: {
      medicationId,
      symptomId: symptom.id,
      relationType,
      evidenceLevel: 'CURATED',
      source: 'DailyMed',
      notes,
      active: true,
    },
  });
}

async function enrichMedication(medication: {
  id: string;
  name: string;
  genericName: string | null;
  rxNormCode: string | null;
}) {
  if (!medication.rxNormCode) {
    return { status: 'no-rxcui', medication: medication.name, sideEffects: 0, relieved: 0, masked: 0 };
  }

  const setId = await getLatestSetId(medication.rxNormCode);
  if (!setId) {
    return { status: 'no-dailymed', medication: medication.name, sideEffects: 0, relieved: 0, masked: 0 };
  }

  const xml = await fetchText(`${DAILYMED}/spls/${setId}.xml`);
  if (!xml) {
    return { status: 'label-fetch-failed', medication: medication.name, sideEffects: 0, relieved: 0, masked: 0 };
  }

  const adverse = sectionByCode(xml, '34084-4');
  const indications = sectionByCode(xml, '34067-9');
  const combined = `${adverse} ${indications}`;

  const sideEffects = findCanonicalSymptoms(adverse);
  const relieved = findCanonicalSymptoms(indications);
  const masked = maskingSymptoms(combined);

  for (const symptom of sideEffects) {
    await upsertRelation(
      medication.id,
      symptom,
      'SIDE_EFFECT',
      'Documented in the DailyMed ADVERSE REACTIONS section.',
    );
  }

  for (const symptom of relieved) {
    await upsertRelation(
      medication.id,
      symptom,
      'RELIEVES_SYMPTOM',
      'Symptom appears in the DailyMed INDICATIONS AND USAGE section. This does not imply the medicine treats every cause of that symptom.',
    );
  }

  for (const symptom of masked) {
    await upsertRelation(
      medication.id,
      symptom,
      'MAY_MASK_SYMPTOM',
      'DailyMed labeling contains language indicating that the medication may mask or conceal this symptom.',
    );
  }

  return {
    status: 'enriched',
    medication: medication.name,
    sideEffects: sideEffects.length,
    relieved: relieved.length,
    masked: masked.length,
  };
}

async function main() {
  console.log('💊 Starting complete DailyMed medication clinical-reference enrichment...');

  const medications = await prisma.medication.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      genericName: true,
      rxNormCode: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`💊 Active medications to enrich: ${medications.length}`);

  let cursor = 0;
  const results: Awaited<ReturnType<typeof enrichMedication>>[] = [];

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= medications.length) return;

      const medication = medications[index];
      const result = await enrichMedication(medication);
      results.push(result);

      console.log(
        `${index + 1}/${medications.length} ${result.status}: ${result.medication} (${result.sideEffects} side effects, ${result.relieved} relieved symptoms, ${result.masked} masking relationships)`,
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, medications.length) }, () => worker()));

  const enriched = results.filter((result) => result.status === 'enriched').length;
  const noRxcui = results.filter((result) => result.status === 'no-rxcui').length;
  const noDailymed = results.filter((result) => result.status === 'no-dailymed').length;
  const failed = results.filter((result) => result.status === 'label-fetch-failed').length;

  const relationshipCount = await prisma.medicationClinicalReference.count({
    where: { active: true },
  });

  console.log('');
  console.log('✅ DailyMed medication clinical-reference enrichment complete.');
  console.log(`   Medications: ${medications.length}`);
  console.log(`   Enriched from DailyMed: ${enriched}`);
  console.log(`   Missing RxNorm code: ${noRxcui}`);
  console.log(`   No DailyMed label found: ${noDailymed}`);
  console.log(`   Label fetch failures: ${failed}`);
  console.log(`   Active medication clinical relationships: ${relationshipCount}`);
  console.log('');
  console.log('No clinical relationship is fabricated when an authoritative label does not document it.');
}

main()
  .catch((error) => {
    console.error('DailyMed medication clinical-reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
