import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { SYMPTOM_REFERENCE } from './clinical-reference-data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const API = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

type CoreClinicalReference = { synonyms: string[]; sideEffects: string[]; relievedSymptoms: string[]; maskingSymptoms?: string[] };

const CORE_CLINICAL_REFERENCES: Record<string, CoreClinicalReference> = {
  Paracetamol: { synonyms: ['Acetaminophen'], sideEffects: ['Nausea', 'Rash', 'Allergic reaction'], relievedSymptoms: ['Headache', 'Fever', 'Muscle pain', 'Body aches'], maskingSymptoms: ['Fever'] },
  Aspirin: { synonyms: ['Acetylsalicylic acid'], sideEffects: ['Stomach upset', 'Heartburn', 'Nausea', 'Easy bruising'], relievedSymptoms: ['Headache', 'Fever', 'Muscle pain', 'Joint pain', 'Inflammation'] },
  Metformin: { synonyms: [], sideEffects: ['Abdominal pain', 'Diarrhea', 'Loss of appetite', 'Nausea'], relievedSymptoms: [] },
  Amlodipine: { synonyms: [], sideEffects: ['Dizziness', 'Fatigue', 'Leg swelling', 'Palpitations'], relievedSymptoms: [] },
  Carbimazole: { synonyms: ['Methimazole'], sideEffects: ['Nausea', 'Headache', 'Joint pain', 'Skin rash'], relievedSymptoms: [] },
  'Benzoyl peroxide': { synonyms: [], sideEffects: ['Skin irritation', 'Dry skin', 'Peeling', 'Redness'], relievedSymptoms: ['Acne', 'Pimple'] },
};

/** Conservative class fallback used only when drug-specific data is absent. */
const CATEGORY_CLINICAL_FALLBACKS: Record<string, CoreClinicalReference> = {
  ANALGESIC: { synonyms: [], sideEffects: ['Nausea', 'Stomach upset'], relievedSymptoms: ['Headache', 'Fever', 'Muscle pain', 'Joint pain'] },
  NSAID: { synonyms: [], sideEffects: ['Nausea', 'Abdominal pain', 'Heartburn', 'Dizziness'], relievedSymptoms: ['Headache', 'Fever', 'Muscle pain', 'Joint pain'] },
  ANTIHISTAMINE: { synonyms: [], sideEffects: ['Excessive sleepiness', 'Dry mouth', 'Fatigue'], relievedSymptoms: ['Itching', 'Hives', 'Runny nose', 'Sneezing'] },
  BRONCHODILATOR: { synonyms: [], sideEffects: ['Tremor', 'Fast heartbeat', 'Palpitations', 'Headache'], relievedSymptoms: ['Wheezing', 'Shortness of breath', 'Chest tightness', 'Cough'] },
};

type Row = { setid?: string; title?: string; published_date?: string };

const aliases: Record<string, string[]> = {
  'Abdominal pain': ['abdominal discomfort', 'stomach pain', 'belly pain', 'abdominal pains'],
  'Leg swelling': ['peripheral edema', 'peripheral oedema', 'edema of the extremities', 'oedema of the extremities'],
  'General swelling': ['edema', 'oedema', 'swelling'],
  'Skin rash': ['skin eruption', 'skin eruptions', 'cutaneous eruption', 'skin rash', 'rashes'],
  Itching: ['pruritus', 'itch', 'itching'], Hives: ['urticaria', 'hives'], Fever: ['pyrexia', 'elevated temperature', 'fevers', 'feverish'],
  Fatigue: ['tiredness', 'fatigue'], Weakness: ['asthenia', 'weakness'], Dizziness: ['lightheadedness', 'dizziness'],
  Nausea: ['nausea'], Vomiting: ['emesis', 'vomiting'], Diarrhea: ['diarrhoea', 'loose stools', 'diarrhea'],
  Headache: ['cephalgia', 'headaches', 'headache'], 'Muscle pain': ['myalgia', 'muscle aches', 'muscle pains', 'muscle pain'],
  'Joint pain': ['arthralgia', 'joint pains', 'joint pain'], 'Muscle weakness': ['muscular weakness'], Numbness: ['hypoesthesia'], Tingling: ['paresthesia', 'paraesthesia', 'pins and needles'],
  'Excessive sleepiness': ['somnolence', 'drowsiness'], Insomnia: ['difficulty sleeping'], Confusion: ['confusional state'], Tremor: ['shaking', 'tremors'], Palpitations: ['palpitation'],
  'Fast heartbeat': ['tachycardia', 'rapid heartbeat', 'fast heart rate'], 'Slow heartbeat': ['bradycardia'], 'Irregular heartbeat': ['arrhythmia', 'dysrhythmia'],
  'Shortness of breath': ['dyspnea', 'dyspnoea', 'breathlessness'], 'Dry mouth': ['xerostomia'], 'Loss of appetite': ['anorexia', 'poor appetite'], 'Hair loss': ['alopecia'],
  'Yellow skin': ['jaundice', 'icterus'], 'Reduced urine output': ['oliguria', 'decreased urine output'], 'Blood in urine': ['hematuria', 'haematuria'],
  'Blood in stool': ['hematochezia', 'haematochezia'], 'Black stool': ['melena', 'melaena'], 'Vomiting blood': ['hematemesis', 'haematemesis'],
  Nosebleed: ['epistaxis'], 'Easy bruising': ['ecchymosis'], 'Blurred vision': ['visual disturbance'], 'Hearing loss': ['hearing impairment'], 'Ringing in ears': ['tinnitus'],
  'Runny nose': ['rhinorrhea', 'rhinorrhoea'], 'Blocked nose': ['nasal congestion'], Sweating: ['perspiration'], 'Excessive sweating': ['hyperhidrosis'], Restlessness: ['agitation'],
  'Low mood': ['depressed mood'], Seizure: ['convulsion'], Fainting: ['syncope'], 'Red skin': ['erythema', 'redness'], 'Dry skin': ['xerosis', 'dryness'],
  'Peeling skin': ['desquamation', 'scaling', 'peeling'], Blisters: ['bullae', 'blistering'], 'Skin swelling': ['facial edema', 'facial oedema', 'angioedema'],
  'Mouth sores': ['oral ulcer', 'stomatitis'], 'Swollen tongue': ['tongue edema', 'tongue oedema'], Toothache: ['tooth pain', 'dental pain'], Heartburn: ['pyrosis', 'acid reflux'], Indigestion: ['dyspepsia'],
  Cough: ['coughing'], Wheezing: ['wheeze'], 'Chest tightness': ['tightness in the chest'], Sneezing: ['sneezes'], 'Body aches': ['body ache', 'body aches', 'general aches'],
};

function norm(v: string) { return v.toLowerCase().replace(/&[a-z0-9#]+;/gi, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }

function variants(value: string) {
  const base = norm(value); const out = new Set([base]);
  if (base.endsWith('ies')) out.add(`${base.slice(0, -3)}y`);
  if (base.endsWith('es')) out.add(base.slice(0, -2));
  if (base.endsWith('s')) out.add(base.slice(0, -1));
  if (base.endsWith('ing') && base.length > 5) out.add(base.slice(0, -3));
  if (base.endsWith('ed') && base.length > 4) out.add(base.slice(0, -2));
  return [...out];
}

function containsTerm(haystack: string, needle: string) {
  const hay = norm(haystack);
  return variants(needle).some(term => term && hay.includes(term));
}

function text(xml: string) {
  return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, ' and ').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function section(xml: string, code: string) {
  const re = new RegExp(`<section\\b[^>]*>[\\s\\S]*?<code\\b[^>]*\\bcode=["']${code}["'][^>]*>[\\s\\S]*?<\\/section>`, 'i');
  const m = xml.match(re); return m ? text(m[0]) : '';
}

function symptoms(input: string) {
  const out = new Set<string>();
  for (const s of SYMPTOM_REFERENCE) {
    const candidates = [s.name, ...(s.synonyms ?? []), ...(aliases[s.name] ?? [])];
    if (candidates.some(candidate => containsTerm(input, candidate))) out.add(s.name);
  }
  return [...out];
}

function masks(input: string) {
  const hay = norm(input); const out = new Set<string>();
  for (const s of symptoms(input)) {
    for (const term of [s, ...(aliases[s] ?? [])]) {
      const i = hay.indexOf(norm(term)); if (i < 0) continue;
      const window = hay.slice(Math.max(0, i - 220), i + norm(term).length + 220);
      if (/\b(mask|masks|masking|masked|conceal|concealed|may conceal|hide|hidden)\b/.test(window)) { out.add(s); break; }
    }
  }
  return [...out];
}

async function json<T>(url: string): Promise<T | null> { try { const r = await fetch(url, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() as T : null; } catch { return null; } }
async function xml(url: string) { try { const r = await fetch(url, { headers: { Accept: 'application/xml,text/xml' } }); return r.ok ? await r.text() : null; } catch { return null; } }

function coreReferenceForMedication(name: string, genericName: string | null) {
  const candidates = [name, genericName].filter(Boolean).map(norm);
  for (const [canonical, reference] of Object.entries(CORE_CLINICAL_REFERENCES)) {
    const names = [canonical, ...reference.synonyms].map(norm);
    if (candidates.some(candidate => names.some(alias => candidate === alias || candidate.includes(alias)))) return { canonical, reference };
  }
  return undefined;
}

function stripFormulation(value: string) {
  return norm(value)
    .replace(/\b\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|l|%)\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|kg|ml|l|iu|units?|%)\b/g, ' ')
    .replace(/\b(?:tablet|tablets|capsule|capsules|caplet|caplets|syrup|solution|suspension|cream|ointment|gel|lotion|inhaler|injection|injectable|drops|spray|patch|powder)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function dailyMedQueryNames(name: string, genericName: string | null) {
  const raw = [genericName, name].filter(Boolean) as string[];
  const stripped = raw.map(stripFormulation).filter(Boolean);
  const out: string[] = [];
  for (const candidate of [...new Set([...stripped, ...raw])]) {
    if (containsTerm(candidate, 'Paracetamol')) out.push('Acetaminophen');
    out.push(candidate);
  }
  const core = coreReferenceForMedication(name, genericName);
  if (core) out.push(core.canonical, ...core.reference.synonyms);
  return [...new Set(out)];
}

async function findSetId(rxNormCode: string | null, name: string, genericName: string | null) {
  const names = dailyMedQueryNames(name, genericName);
  if (rxNormCode) {
    const result = await json<{ data?: Row[] }>(`${API}/spls.json?rxcui=${encodeURIComponent(rxNormCode)}&pagesize=100&page=1`);
    const rows = result?.data ?? []; rows.sort((a, b) => String(b.published_date ?? '').localeCompare(String(a.published_date ?? '')));
    if (rows[0]?.setid) return rows[0].setid;
  }
  for (const n of names) {
    const result = await json<{ data?: Row[] }>(`${API}/spls.json?drug_name=${encodeURIComponent(n)}&name_type=both&pagesize=100&page=1`);
    const rows = result?.data ?? []; const wanted = stripFormulation(n);
    rows.sort((a, b) => {
      const ae = containsTerm(a.title ?? '', wanted) ? 1 : 0; const be = containsTerm(b.title ?? '', wanted) ? 1 : 0;
      return be - ae || String(b.published_date ?? '').localeCompare(String(a.published_date ?? ''));
    });
    if (rows[0]?.setid) return rows[0].setid;
  }
  return undefined;
}

async function symptomRecord(name: string) {
  const ref = SYMPTOM_REFERENCE.find(s => [s.name, ...(s.synonyms ?? []), ...(aliases[s.name] ?? [])].some(v => norm(v) === norm(name)));
  if (ref) {
    const existing = await prisma.symptom.findFirst({ where: { name: ref.name } });
    if (existing) return existing;
    return prisma.symptom.create({ data: { name: ref.name, category: ref.category, bodySystem: ref.category, description: ref.synonyms?.length ? `Also known as: ${ref.synonyms.join(', ')}` : undefined, searchable: true, active: true } });
  }
  const existing = await prisma.symptom.findFirst({ where: { name } }); if (existing) return existing;
  return prisma.symptom.create({ data: { name, category: 'General', bodySystem: 'General', searchable: true, active: true } });
}

async function relation(medicationId: string, symptomName: string, relationType: 'SIDE_EFFECT' | 'RELIEVES_SYMPTOM' | 'MAY_MASK_SYMPTOM', source: string, notes: string) {
  const s = await symptomRecord(symptomName);
  await prisma.medicationClinicalReference.upsert({
    where: { medicationId_symptomId_relationType: { medicationId, symptomId: s.id, relationType } },
    update: { evidenceLevel: 'CURATED', source, notes, active: true },
    create: { medicationId, symptomId: s.id, relationType, evidenceLevel: 'CURATED', source, notes, active: true },
  });
}

async function activeRelationCount(medicationId: string, relationType: 'SIDE_EFFECT' | 'RELIEVES_SYMPTOM' | 'MAY_MASK_SYMPTOM') {
  return prisma.medicationClinicalReference.count({ where: { medicationId, relationType, active: true } });
}

async function seedCoreClinicalReference(medicationId: string, medicationName: string, reference: CoreClinicalReference) {
  for (const symptom of reference.sideEffects) await relation(medicationId, symptom, 'SIDE_EFFECT', 'CORE_CLINICAL_REFERENCE', `Static core clinical reference for ${medicationName}.`);
  for (const symptom of reference.relievedSymptoms) await relation(medicationId, symptom, 'RELIEVES_SYMPTOM', 'CORE_CLINICAL_REFERENCE', `Static core clinical reference for ${medicationName}.`);
  for (const symptom of reference.maskingSymptoms ?? []) await relation(medicationId, symptom, 'MAY_MASK_SYMPTOM', 'CORE_CLINICAL_REFERENCE', `Static core clinical reference for ${medicationName}.`);
}

async function seedCategoryFallback(medicationId: string, medicationName: string, category: string | null) {
  if (!category) return { sideEffects: 0, relievedSymptoms: 0 };
  const reference = CATEGORY_CLINICAL_FALLBACKS[category.trim().toUpperCase()]; if (!reference) return { sideEffects: 0, relievedSymptoms: 0 };
  const existingSideEffects = await activeRelationCount(medicationId, 'SIDE_EFFECT');
  const existingRelief = await activeRelationCount(medicationId, 'RELIEVES_SYMPTOM');
  let sideEffects = 0, relievedSymptoms = 0;
  if (existingSideEffects === 0) {
    for (const symptom of reference.sideEffects) { await relation(medicationId, symptom, 'SIDE_EFFECT', 'CATEGORY_CLINICAL_FALLBACK', `Category fallback for ${medicationName} (${category}); no drug-specific side-effect relationships were available.`); sideEffects++; }
  }
  if (existingRelief === 0) {
    for (const symptom of reference.relievedSymptoms) { await relation(medicationId, symptom, 'RELIEVES_SYMPTOM', 'CATEGORY_CLINICAL_FALLBACK', `Category fallback for ${medicationName} (${category}); no drug-specific symptom-relief relationships were available.`); relievedSymptoms++; }
  }
  return { sideEffects, relievedSymptoms };
}

async function main() {
  const meds = await prisma.medication.findMany({ where: { active: true }, select: { id: true, name: true, genericName: true, rxNormCode: true, category: true }, orderBy: { name: 'asc' } });
  console.log(`Clinical enrichment: ${meds.length} active medications`);
  console.log(`Core fallback references: ${Object.keys(CORE_CLINICAL_REFERENCES).length}`);
  console.log(`Category fallback references: ${Object.keys(CATEGORY_CLINICAL_FALLBACKS).length}`);
  let coreSeeded = 0, categorySeeded = 0, enriched = 0, unavailable = 0;

  for (const med of meds) {
    const core = coreReferenceForMedication(med.name, med.genericName);
    if (core) { await seedCoreClinicalReference(med.id, med.name, core.reference); coreSeeded++; }

    const setId = await findSetId(med.rxNormCode, med.name, med.genericName);
    if (setId) {
      const raw = await xml(`${API}/spls/${setId}.xml`);
      if (raw) {
        const adverse = section(raw, '34084-4');
        const indications = section(raw, '34067-9');
        for (const s of symptoms(adverse)) await relation(med.id, s, 'SIDE_EFFECT', 'DailyMed', 'DailyMed ADVERSE REACTIONS.');
        for (const s of symptoms(indications)) await relation(med.id, s, 'RELIEVES_SYMPTOM', 'DailyMed', 'DailyMed INDICATIONS AND USAGE. This does not imply treatment of every cause of the symptom.');
        for (const s of masks(`${adverse} ${indications}`)) await relation(med.id, s, 'MAY_MASK_SYMPTOM', 'DailyMed', 'DailyMed explicitly indicates that the medication may mask or conceal the symptom.');
        enriched++;
      } else { unavailable++; console.log(`${core ? 'CORE ONLY / LABEL ERROR' : 'LABEL ERROR'}: ${med.name}`); }
    } else { unavailable++; console.log(`${core ? 'CORE ONLY' : 'NO LABEL'}: ${med.name}`); }

    const categoryResult = await seedCategoryFallback(med.id, med.name, med.category);
    if (categoryResult.sideEffects || categoryResult.relievedSymptoms) categorySeeded++;
    const finalSideEffects = await activeRelationCount(med.id, 'SIDE_EFFECT');
    const finalRelief = await activeRelationCount(med.id, 'RELIEVES_SYMPTOM');
    console.log(`READY: ${med.name} -> ${finalSideEffects} side effects, ${finalRelief} relieved symptoms${categoryResult.sideEffects || categoryResult.relievedSymptoms ? ' (category fallback used)' : ''}`);
  }

  const total = await prisma.medicationClinicalReference.count({ where: { active: true } });
  console.log(`DONE: coreSeeded=${coreSeeded}, categorySeeded=${categorySeeded}, enriched=${enriched}, unavailable=${unavailable}, active clinical relationships=${total}`);
}

main().catch(e => { console.error('Complete medication clinical seed failed:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
