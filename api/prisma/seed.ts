import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, AllergyCategory } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function main() {
  /*
  |--------------------------------------------------------------------------
  | ROLES
  |--------------------------------------------------------------------------
  */

  const patientRole = await prisma.role.upsert({
    where: { name: 'PATIENT' },
    update: {},
    create: {
      name: 'PATIENT',
      description: 'Patient',
      isSystem: true,
    },
  });

  const practitionerRole = await prisma.role.upsert({
    where: { name: 'PRACTITIONER' },
    update: {},
    create: {
      name: 'PRACTITIONER',
      description: 'Healthcare Practitioner',
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator',
      isSystem: true,
    },
  });

  /*
|--------------------------------------------------------------------------
| MODULES
|--------------------------------------------------------------------------
*/

const modulesPath = path.resolve(process.cwd(), 'src/modules');

const modules = fs
  .readdirSync(modulesPath, { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .map((dir) => dir.name)
  .sort();
  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const permissions = modules.flatMap((module) => [
    `${module}.read`,
    `${module}.create`,
    `${module}.update`,
    `${module}.delete`,
  ]);

  permissions.push(
    'roles.manage',
    'permissions.manage',
    'system.admin',
  );

  const permissionMap: Record<string, string> = {};

    /*
  |--------------------------------------------------------------------------
  | CREATE PERMISSIONS
  |--------------------------------------------------------------------------
  */

  for (const permission of permissions) {
    const created = await prisma.permission.upsert({
      where: {
        name: permission,
      },
      update: {},
      create: {
        name: permission,
      },
    });

    permissionMap[permission] = created.id;
  }

  /*
  |--------------------------------------------------------------------------
  | ROLE PERMISSION HELPER
  |--------------------------------------------------------------------------
  */

  async function assign(
    roleId: string,
    permission: string,
  ) {
    const permissionId = permissionMap[permission];

    if (!permissionId) {
      throw new Error(
        `Permission "${permission}" was not found.`,
      );
    }

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId,
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | PATIENT PERMISSIONS
  |--------------------------------------------------------------------------
  */
   /*
  |--------------------------------------------------------------------------
  | PATIENT PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const patientPermissions = [
    // Profile
    'patients.read',
    'patients.update',

    // Allergies
  'allergies.read',

  // Conditions
'conditions.read',

// Medications
'medications.read',

// Immunizations
'immunizations.read',

    // Appointments
    'appointments.read',
    'appointments.create',

    // Medical Records
    'medical-records.read',

    // Health Journals
    'health-journals.read',
    'health-journals.create',
    'health-journals.update',

    // Symptom Logs
    'symptom-logs.read',
    'symptom-logs.create',
    'symptom-logs.update',

    // Symptom Log Items
    'symptom-log-items.read',
    'symptom-log-items.create',
    'symptom-log-items.update',

    // Symptom Triggers
    'symptom-triggers.read',
    'symptom-triggers.create',
    'symptom-triggers.update',

    // Symptom Attachments
    'symptom-log-attachments.read',
    'symptom-log-attachments.create',

    // Clinical Episodes
    'clinical-episodes.read',

    // Clinical Episode Attachments
    'clinical-episode-attachments.read',

    // Medication Effects
    'medication-effects.read',

    // AI Observations
    'ai-observations.read',

    // Health Goals
    'health-goals.read',

    // Goal Progress
    'health-goal-progress.read',

    // Baseline
    'patient-baselines.read',

    // Risk Assessments
    'risk-assessments.read',
    'risk-assessment-results.read',
  ];

  for (const permission of patientPermissions) {
    await assign(patientRole.id, permission);
  }

  /*
  |--------------------------------------------------------------------------
  | PRACTITIONER PERMISSIONS
  |--------------------------------------------------------------------------
  */  /*
  |--------------------------------------------------------------------------
  | PRACTITIONER PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const practitionerPermissions = permissions.filter(
    (permission) =>
      permission !== 'roles.manage' &&
      permission !== 'permissions.manage' &&
      permission !== 'system.admin',
  );

  for (const permission of practitionerPermissions) {
    await assign(practitionerRole.id, permission);
  }

  /*
  |--------------------------------------------------------------------------
  | ADMIN PERMISSIONS
  |--------------------------------------------------------------------------
  */  /*
  |--------------------------------------------------------------------------
  | ADMIN PERMISSIONS
  |--------------------------------------------------------------------------
  */

  for (const permission of permissions) {
    await assign(adminRole.id, permission);
  }

  await assign(adminRole.id, 'roles.manage');
  await assign(adminRole.id, 'permissions.manage');
  await assign(adminRole.id, 'system.admin');


/*
| --------------------------------------------------------------------------
| ALLERGY REFERENCE DATA
| --------------------------------------------------------------------------
*/
const allergies = [
  // FOOD
  { name: 'Peanut', category: 'FOOD', common: true },
  { name: 'Tree nut', category: 'FOOD', common: true },
  { name: 'Almond', category: 'FOOD', common: true },
  { name: 'Cashew', category: 'FOOD', common: true },
  { name: 'Walnut', category: 'FOOD', common: true },
  { name: 'Hazelnut', category: 'FOOD', common: true },
  { name: 'Pistachio', category: 'FOOD', common: true },
  { name: 'Macadamia nut', category: 'FOOD', common: false },
  { name: 'Milk', category: 'FOOD', common: true },
  { name: 'Egg', category: 'FOOD', common: true },
  { name: 'Wheat', category: 'FOOD', common: true },
  { name: 'Soy', category: 'FOOD', common: true },
  { name: 'Fish', category: 'FOOD', common: true },
  { name: 'Shellfish', category: 'FOOD', common: true },
  { name: 'Crustaceans', category: 'FOOD', common: true },
  { name: 'Molluscs', category: 'FOOD', common: false },
  { name: 'Sesame', category: 'FOOD', common: true },
  { name: 'Corn', category: 'FOOD', common: false },
  { name: 'Mustard', category: 'FOOD', common: false },
  { name: 'Celery', category: 'FOOD', common: false },
  { name: 'Rice', category: 'FOOD', common: false },
  { name: 'Tomato', category: 'FOOD', common: false },
  { name: 'Strawberry', category: 'FOOD', common: false },
  { name: 'Banana', category: 'FOOD', common: false },
  { name: 'Avocado', category: 'FOOD', common: false },

  // DRUG
  { name: 'Penicillin', category: 'DRUG', common: true },
  { name: 'Amoxicillin', category: 'DRUG', common: true },
  { name: 'Ampicillin', category: 'DRUG', common: false },
  { name: 'Cephalosporins', category: 'DRUG', common: true },
  { name: 'Sulfonamide antibiotics', category: 'DRUG', common: true },
  { name: 'Aspirin', category: 'DRUG', common: true },
  { name: 'Ibuprofen', category: 'DRUG', common: true },
  { name: 'NSAIDs', category: 'DRUG', common: true },
  { name: 'Paracetamol', category: 'DRUG', common: true },
  { name: 'Codeine', category: 'DRUG', common: true },
  { name: 'Morphine', category: 'DRUG', common: false },
  { name: 'Tramadol', category: 'DRUG', common: false },
  { name: 'Opioids', category: 'DRUG', common: false },
  { name: 'Local anesthetics', category: 'DRUG', common: false },
  { name: 'General anesthetics', category: 'DRUG', common: false },
  { name: 'Contrast media', category: 'DRUG', common: false },
  { name: 'Iodine-containing contrast', category: 'DRUG', common: false },
  { name: 'Insulin', category: 'DRUG', common: false },
  { name: 'Metformin', category: 'DRUG', common: false },
  { name: 'ACE inhibitors', category: 'DRUG', common: false },

  // ENVIRONMENT
  { name: 'Pollen', category: 'ENVIRONMENT', common: true },
  { name: 'Grass pollen', category: 'ENVIRONMENT', common: true },
  { name: 'Tree pollen', category: 'ENVIRONMENT', common: true },
  { name: 'Ragweed pollen', category: 'ENVIRONMENT', common: false },
  { name: 'Dust mites', category: 'ENVIRONMENT', common: true },
  { name: 'House dust', category: 'ENVIRONMENT', common: true },
  { name: 'Mold', category: 'ENVIRONMENT', common: true },
  { name: 'Animal dander', category: 'ENVIRONMENT', common: true },
  { name: 'Cat dander', category: 'ENVIRONMENT', common: true },
  { name: 'Dog dander', category: 'ENVIRONMENT', common: true },
  { name: 'Cockroach', category: 'ENVIRONMENT', common: false },
  { name: 'Fragrance', category: 'ENVIRONMENT', common: false },
  { name: 'Perfume', category: 'ENVIRONMENT', common: false },

  // INSECT
  { name: 'Bee venom', category: 'INSECT', common: true },
  { name: 'Wasp venom', category: 'INSECT', common: true },
  { name: 'Hornet venom', category: 'INSECT', common: false },
  { name: 'Fire ant venom', category: 'INSECT', common: false },
  { name: 'Mosquito bites', category: 'INSECT', common: false },
  { name: 'Flea bites', category: 'INSECT', common: false },

  // LATEX
  { name: 'Latex', category: 'LATEX', common: true },

  // OTHER
  { name: 'Nickel', category: 'OTHER', common: true },
  { name: 'Cobalt', category: 'OTHER', common: false },
  { name: 'Chromium', category: 'OTHER', common: false },
  { name: 'Formaldehyde', category: 'OTHER', common: false },
  { name: 'Hair dye', category: 'OTHER', common: false },
  { name: 'Adhesives', category: 'OTHER', common: false }
];

for (const allergy of allergies) {
const existing = await prisma.allergy.findFirst({
where: {
name: allergy.name,
},
});

if (existing) {
  await prisma.allergy.update({
    where: {
      id: existing.id,
    },
    data: {
      category: allergy.category as AllergyCategory,
      common: allergy.common,
      searchable: true,
      active: true,
    },
  });
} else {
  await prisma.allergy.create({
    data: {
      name: allergy.name,
      category: allergy.category as AllergyCategory,
      common: allergy.common,
      searchable: true,
      active: true,
    },
  });
}

}

console.log(`Allergy reference data seeded: ${allergies.length}`);


/*
|--------------------------------------------------------------------------
| CONDITION REFERENCE DATA
|--------------------------------------------------------------------------
*/

const conditions = [
  // RESPIRATORY
  { name: 'Asthma', category: 'RESPIRATORY' },
  { name: 'Chronic obstructive pulmonary disease', category: 'RESPIRATORY' },
  { name: 'Chronic bronchitis', category: 'RESPIRATORY' },
  { name: 'Emphysema', category: 'RESPIRATORY' },
  { name: 'Pneumonia', category: 'RESPIRATORY' },
  { name: 'Sleep apnea', category: 'RESPIRATORY' },
  { name: 'Pulmonary fibrosis', category: 'RESPIRATORY' },
  { name: 'Bronchiectasis', category: 'RESPIRATORY' },

  // CARDIOVASCULAR
  { name: 'High blood pressure', category: 'CARDIOVASCULAR' },
  { name: 'Heart disease', category: 'CARDIOVASCULAR' },
  { name: 'Coronary artery disease', category: 'CARDIOVASCULAR' },
  { name: 'Heart failure', category: 'CARDIOVASCULAR' },
  { name: 'Atrial fibrillation', category: 'CARDIOVASCULAR' },
  { name: 'Heart valve disease', category: 'CARDIOVASCULAR' },
  { name: 'Peripheral artery disease', category: 'CARDIOVASCULAR' },
  { name: 'High cholesterol', category: 'CARDIOVASCULAR' },

  // ENDOCRINE / METABOLIC
  { name: 'Diabetes', category: 'ENDOCRINE' },
  { name: 'Type 1 diabetes', category: 'ENDOCRINE' },
  { name: 'Type 2 diabetes', category: 'ENDOCRINE' },
  { name: 'Prediabetes', category: 'ENDOCRINE' },
  { name: 'Thyroid condition', category: 'ENDOCRINE' },
  { name: 'Hypothyroidism', category: 'ENDOCRINE' },
  { name: 'Hyperthyroidism', category: 'ENDOCRINE' },
  { name: 'Obesity', category: 'METABOLIC' },
  { name: 'Gout', category: 'METABOLIC' },

  // NEUROLOGICAL
  { name: 'Migraine', category: 'NEUROLOGICAL' },
  { name: 'Epilepsy', category: 'NEUROLOGICAL' },
  { name: 'Multiple sclerosis', category: 'NEUROLOGICAL' },
  { name: 'Parkinson disease', category: 'NEUROLOGICAL' },
  { name: 'Dementia', category: 'NEUROLOGICAL' },
  { name: 'Alzheimer disease', category: 'NEUROLOGICAL' },
  { name: 'Peripheral neuropathy', category: 'NEUROLOGICAL' },
  { name: 'Stroke', category: 'NEUROLOGICAL' },

  // MUSCULOSKELETAL
  { name: 'Arthritis', category: 'MUSCULOSKELETAL' },
  { name: 'Osteoarthritis', category: 'MUSCULOSKELETAL' },
  { name: 'Rheumatoid arthritis', category: 'MUSCULOSKELETAL' },
  { name: 'Osteoporosis', category: 'MUSCULOSKELETAL' },
  { name: 'Fibromyalgia', category: 'MUSCULOSKELETAL' },
  { name: 'Chronic back pain', category: 'MUSCULOSKELETAL' },
  { name: 'Chronic neck pain', category: 'MUSCULOSKELETAL' },

  // MENTAL HEALTH
  { name: 'Depression', category: 'MENTAL_HEALTH' },
  { name: 'Anxiety', category: 'MENTAL_HEALTH' },
  { name: 'Bipolar disorder', category: 'MENTAL_HEALTH' },
  { name: 'Post-traumatic stress disorder', category: 'MENTAL_HEALTH' },
  { name: 'Obsessive-compulsive disorder', category: 'MENTAL_HEALTH' },
  { name: 'Panic disorder', category: 'MENTAL_HEALTH' },
  { name: 'Attention deficit hyperactivity disorder', category: 'MENTAL_HEALTH' },

  // GASTROINTESTINAL
  { name: 'Gastroesophageal reflux disease', category: 'GASTROINTESTINAL' },
  { name: 'Irritable bowel syndrome', category: 'GASTROINTESTINAL' },
  { name: 'Inflammatory bowel disease', category: 'GASTROINTESTINAL' },
  { name: 'Crohn disease', category: 'GASTROINTESTINAL' },
  { name: 'Ulcerative colitis', category: 'GASTROINTESTINAL' },
  { name: 'Celiac disease', category: 'GASTROINTESTINAL' },
  { name: 'Peptic ulcer disease', category: 'GASTROINTESTINAL' },
  { name: 'Gallstones', category: 'GASTROINTESTINAL' },

  // KIDNEY / URINARY
  { name: 'Kidney disease', category: 'RENAL' },
  { name: 'Chronic kidney disease', category: 'RENAL' },
  { name: 'Kidney stones', category: 'RENAL' },
  { name: 'Urinary tract infection', category: 'URINARY' },
  { name: 'Kidney failure', category: 'RENAL' },

  // LIVER
  { name: 'Liver disease', category: 'HEPATIC' },
  { name: 'Fatty liver disease', category: 'HEPATIC' },
  { name: 'Hepatitis B', category: 'HEPATIC' },
  { name: 'Hepatitis C', category: 'HEPATIC' },
  { name: 'Cirrhosis', category: 'HEPATIC' },

  // SKIN
  { name: 'Eczema', category: 'DERMATOLOGICAL' },
  { name: 'Psoriasis', category: 'DERMATOLOGICAL' },
  { name: 'Acne', category: 'DERMATOLOGICAL' },
  { name: 'Rosacea', category: 'DERMATOLOGICAL' },
  { name: 'Dermatitis', category: 'DERMATOLOGICAL' },

  // REPRODUCTIVE / GYNECOLOGICAL
  { name: 'Endometriosis', category: 'GYNECOLOGICAL' },
  { name: 'Uterine fibroids', category: 'GYNECOLOGICAL' },
  { name: 'Polycystic ovary syndrome', category: 'GYNECOLOGICAL' },
  { name: 'Menstrual disorder', category: 'GYNECOLOGICAL' },

  // INFECTIOUS
  { name: 'HIV infection', category: 'INFECTIOUS' },
  { name: 'Tuberculosis', category: 'INFECTIOUS' },
  { name: 'Malaria', category: 'INFECTIOUS' },
  { name: 'COVID-19', category: 'INFECTIOUS' },
  { name: 'Hepatitis', category: 'INFECTIOUS' },

  // CANCER
  { name: 'Cancer', category: 'ONCOLOGY' },
  { name: 'Breast cancer', category: 'ONCOLOGY' },
  { name: 'Prostate cancer', category: 'ONCOLOGY' },
  { name: 'Lung cancer', category: 'ONCOLOGY' },
  { name: 'Colorectal cancer', category: 'ONCOLOGY' },
  { name: 'Skin cancer', category: 'ONCOLOGY' },

  // EYE
  { name: 'Glaucoma', category: 'OPHTHALMOLOGY' },
  { name: 'Cataracts', category: 'OPHTHALMOLOGY' },
  { name: 'Macular degeneration', category: 'OPHTHALMOLOGY' },

  // EAR / NOSE / THROAT
  { name: 'Hearing loss', category: 'ENT' },
  { name: 'Chronic sinusitis', category: 'ENT' },
  { name: 'Tinnitus', category: 'ENT' },

  // BLOOD
  { name: 'Anemia', category: 'HEMATOLOGY' },
  { name: 'Sickle cell disease', category: 'HEMATOLOGY' },
  { name: 'Blood clotting disorder', category: 'HEMATOLOGY' },

  // AUTOIMMUNE
  { name: 'Autoimmune disease', category: 'AUTOIMMUNE' },
];

for (const condition of conditions) {
  const existing = await prisma.condition.findFirst({
    where: {
      name: condition.name,
    },
  });

  if (existing) {
    await prisma.condition.update({
      where: {
        id: existing.id,
      },
      data: {
        category: condition.category,
        searchable: true,
        active: true,
      },
    });
  } else {
    await prisma.condition.create({
      data: {
        name: condition.name,
        category: condition.category,
        searchable: true,
        active: true,
      },
    });
  }
}

console.log(`Condition reference data seeded: ${conditions.length}`);

  

/*
|--------------------------------------------------------------------------
| MEDICATION REFERENCE DATA
|--------------------------------------------------------------------------
|
| Medication is the reference drug/ingredient.
|
| Patient-specific dosage belongs to PatientMedication.dosage.
| Patient-specific frequency belongs to PatientMedication.frequency.
| Patient-specific route belongs to PatientMedication.route.
|
|--------------------------------------------------------------------------
*/

type SeedMedication = {
  name: string;
  genericName: string;
  brandName?: string;
  category: string;
  strength?: string;
  dosageForm: string;
  route: string;
  prescriptionRequired: boolean;
  controlled?: boolean;
};

const medications: SeedMedication[] = [
  /*
  |--------------------------------------------------------------------------
  | PAIN / FEVER
  |--------------------------------------------------------------------------
  */

  {
    name: 'Paracetamol',
    genericName: 'Paracetamol',
    brandName: 'Panado',
    category: 'ANALGESIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    brandName: 'Advil',
    category: 'NSAID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Aspirin',
    genericName: 'Aspirin',
    brandName: 'Disprin',
    category: 'NSAID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Naproxen',
    genericName: 'Naproxen',
    category: 'NSAID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Diclofenac',
    genericName: 'Diclofenac',
    brandName: 'Voltaren',
    category: 'NSAID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Celecoxib',
    genericName: 'Celecoxib',
    brandName: 'Celebrex',
    category: 'NSAID',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | OPIOID / STRONG ANALGESICS
  |--------------------------------------------------------------------------
  */

  {
    name: 'Codeine',
    genericName: 'Codeine',
    category: 'OPIOID_ANALGESIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    controlled: true,
    prescriptionRequired: true,
  },
  {
    name: 'Tramadol',
    genericName: 'Tramadol',
    category: 'OPIOID_ANALGESIC',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    controlled: true,
    prescriptionRequired: true,
  },
  {
    name: 'Morphine',
    genericName: 'Morphine',
    category: 'OPIOID_ANALGESIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    controlled: true,
    prescriptionRequired: true,
  },
  {
    name: 'Oxycodone',
    genericName: 'Oxycodone',
    category: 'OPIOID_ANALGESIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    controlled: true,
    prescriptionRequired: true,
  },
  {
    name: 'Fentanyl',
    genericName: 'Fentanyl',
    category: 'OPIOID_ANALGESIC',
    dosageForm: 'PATCH',
    route: 'TRANSDERMAL',
    controlled: true,
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | DIABETES
  |--------------------------------------------------------------------------
  */

  {
    name: 'Metformin',
    genericName: 'Metformin',
    brandName: 'Glucophage',
    category: 'ANTIDIABETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Gliclazide',
    genericName: 'Gliclazide',
    category: 'ANTIDIABETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Glimepiride',
    genericName: 'Glimepiride',
    category: 'ANTIDIABETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Glipizide',
    genericName: 'Glipizide',
    category: 'ANTIDIABETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Sitagliptin',
    genericName: 'Sitagliptin',
    category: 'ANTIDIABETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Empagliflozin',
    genericName: 'Empagliflozin',
    brandName: 'Jardiance',
    category: 'SGLT2_INHIBITOR',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Dapagliflozin',
    genericName: 'Dapagliflozin',
    brandName: 'Forxiga',
    category: 'SGLT2_INHIBITOR',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Liraglutide',
    genericName: 'Liraglutide',
    brandName: 'Victoza',
    category: 'GLP1_AGONIST',
    dosageForm: 'INJECTION',
    route: 'SUBCUTANEOUS',
    prescriptionRequired: true,
  },
  {
    name: 'Semaglutide',
    genericName: 'Semaglutide',
    brandName: 'Ozempic',
    category: 'GLP1_AGONIST',
    dosageForm: 'INJECTION',
    route: 'SUBCUTANEOUS',
    prescriptionRequired: true,
  },
  {
    name: 'Insulin',
    genericName: 'Insulin',
    category: 'ANTIDIABETIC',
    dosageForm: 'INJECTION',
    route: 'SUBCUTANEOUS',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | BLOOD PRESSURE / CARDIOVASCULAR
  |--------------------------------------------------------------------------
  */

  {
    name: 'Amlodipine',
    genericName: 'Amlodipine',
    brandName: 'Norvasc',
    category: 'CALCIUM_CHANNEL_BLOCKER',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    category: 'ACE_INHIBITOR',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Enalapril',
    genericName: 'Enalapril',
    category: 'ACE_INHIBITOR',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Ramipril',
    genericName: 'Ramipril',
    brandName: 'Tritace',
    category: 'ACE_INHIBITOR',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Losartan',
    genericName: 'Losartan',
    category: 'ARB',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Valsartan',
    genericName: 'Valsartan',
    category: 'ARB',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Telmisartan',
    genericName: 'Telmisartan',
    category: 'ARB',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Hydrochlorothiazide',
    genericName: 'Hydrochlorothiazide',
    category: 'DIURETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Furosemide',
    genericName: 'Furosemide',
    brandName: 'Lasix',
    category: 'LOOP_DIURETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Spironolactone',
    genericName: 'Spironolactone',
    category: 'DIURETIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Bisoprolol',
    genericName: 'Bisoprolol',
    category: 'BETA_BLOCKER',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Atenolol',
    genericName: 'Atenolol',
    category: 'BETA_BLOCKER',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Carvedilol',
    genericName: 'Carvedilol',
    category: 'BETA_BLOCKER',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | CHOLESTEROL
  |--------------------------------------------------------------------------
  */

  {
    name: 'Atorvastatin',
    genericName: 'Atorvastatin',
    brandName: 'Lipitor',
    category: 'STATIN',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Rosuvastatin',
    genericName: 'Rosuvastatin',
    brandName: 'Crestor',
    category: 'STATIN',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Simvastatin',
    genericName: 'Simvastatin',
    category: 'STATIN',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Pravastatin',
    genericName: 'Pravastatin',
    category: 'STATIN',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Ezetimibe',
    genericName: 'Ezetimibe',
    category: 'LIPID_LOWERING',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | ASTHMA / COPD
  |--------------------------------------------------------------------------
  */

  {
    name: 'Salbutamol',
    genericName: 'Salbutamol',
    brandName: 'Ventolin',
    category: 'BRONCHODILATOR',
    dosageForm: 'INHALER',
    route: 'INHALATION',
    prescriptionRequired: false,
  },
  {
    name: 'Budesonide',
    genericName: 'Budesonide',
    category: 'CORTICOSTEROID',
    dosageForm: 'INHALER',
    route: 'INHALATION',
    prescriptionRequired: true,
  },
  {
    name: 'Beclometasone',
    genericName: 'Beclometasone',
    category: 'CORTICOSTEROID',
    dosageForm: 'INHALER',
    route: 'INHALATION',
    prescriptionRequired: true,
  },
  {
    name: 'Fluticasone',
    genericName: 'Fluticasone',
    category: 'CORTICOSTEROID',
    dosageForm: 'INHALER',
    route: 'INHALATION',
    prescriptionRequired: true,
  },
  {
    name: 'Ipratropium',
    genericName: 'Ipratropium',
    category: 'BRONCHODILATOR',
    dosageForm: 'INHALER',
    route: 'INHALATION',
    prescriptionRequired: true,
  },
  {
    name: 'Tiotropium',
    genericName: 'Tiotropium',
    brandName: 'Spiriva',
    category: 'BRONCHODILATOR',
    dosageForm: 'INHALER',
    route: 'INHALATION',
    prescriptionRequired: true,
  },
  {
    name: 'Montelukast',
    genericName: 'Montelukast',
    brandName: 'Singulair',
    category: 'ASTHMA',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | ANTIBIOTICS
  |--------------------------------------------------------------------------
  */

  {
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    category: 'ANTIBIOTIC',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Amoxicillin and Clavulanic Acid',
    genericName: 'Amoxicillin/Clavulanate',
    brandName: 'Augmentin',
    category: 'ANTIBIOTIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Azithromycin',
    genericName: 'Azithromycin',
    category: 'ANTIBIOTIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Clarithromycin',
    genericName: 'Clarithromycin',
    category: 'ANTIBIOTIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Doxycycline',
    genericName: 'Doxycycline',
    category: 'ANTIBIOTIC',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Ciprofloxacin',
    genericName: 'Ciprofloxacin',
    category: 'ANTIBIOTIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Metronidazole',
    genericName: 'Metronidazole',
    category: 'ANTIBIOTIC',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Cefalexin',
    genericName: 'Cefalexin',
    category: 'ANTIBIOTIC',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Ceftriaxone',
    genericName: 'Ceftriaxone',
    category: 'ANTIBIOTIC',
    dosageForm: 'INJECTION',
    route: 'INTRAVENOUS',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | STOMACH / GI
  |--------------------------------------------------------------------------
  */

  {
    name: 'Omeprazole',
    genericName: 'Omeprazole',
    brandName: 'Losec',
    category: 'PROTON_PUMP_INHIBITOR',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Esomeprazole',
    genericName: 'Esomeprazole',
    brandName: 'Nexium',
    category: 'PROTON_PUMP_INHIBITOR',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Pantoprazole',
    genericName: 'Pantoprazole',
    category: 'PROTON_PUMP_INHIBITOR',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Lansoprazole',
    genericName: 'Lansoprazole',
    category: 'PROTON_PUMP_INHIBITOR',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Famotidine',
    genericName: 'Famotidine',
    category: 'H2_BLOCKER',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },

  /*
  |--------------------------------------------------------------------------
  | THYROID
  |--------------------------------------------------------------------------
  */

  {
    name: 'Levothyroxine',
    genericName: 'Levothyroxine',
    brandName: 'Eltroxin',
    category: 'THYROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Carbimazole',
    genericName: 'Carbimazole',
    category: 'THYROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Propylthiouracil',
    genericName: 'Propylthiouracil',
    category: 'THYROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | MENTAL HEALTH
  |--------------------------------------------------------------------------
  */

  {
    name: 'Fluoxetine',
    genericName: 'Fluoxetine',
    brandName: 'Prozac',
    category: 'SSRI',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Sertraline',
    genericName: 'Sertraline',
    brandName: 'Zoloft',
    category: 'SSRI',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Citalopram',
    genericName: 'Citalopram',
    category: 'SSRI',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Escitalopram',
    genericName: 'Escitalopram',
    category: 'SSRI',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Paroxetine',
    genericName: 'Paroxetine',
    category: 'SSRI',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Venlafaxine',
    genericName: 'Venlafaxine',
    category: 'SNRI',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Duloxetine',
    genericName: 'Duloxetine',
    category: 'SNRI',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Amitriptyline',
    genericName: 'Amitriptyline',
    category: 'ANTIDEPRESSANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Mirtazapine',
    genericName: 'Mirtazapine',
    category: 'ANTIDEPRESSANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | EPILEPSY / NEUROLOGY
  |--------------------------------------------------------------------------
  */

  {
    name: 'Gabapentin',
    genericName: 'Gabapentin',
    category: 'ANTICONVULSANT',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Pregabalin',
    genericName: 'Pregabalin',
    category: 'ANTICONVULSANT',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Carbamazepine',
    genericName: 'Carbamazepine',
    category: 'ANTICONVULSANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Sodium valproate',
    genericName: 'Valproate',
    category: 'ANTICONVULSANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Lamotrigine',
    genericName: 'Lamotrigine',
    category: 'ANTICONVULSANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Levetiracetam',
    genericName: 'Levetiracetam',
    category: 'ANTICONVULSANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | CORTICOSTEROIDS
  |--------------------------------------------------------------------------
  */

  {
    name: 'Prednisone',
    genericName: 'Prednisone',
    category: 'CORTICOSTEROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Prednisolone',
    genericName: 'Prednisolone',
    category: 'CORTICOSTEROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Dexamethasone',
    genericName: 'Dexamethasone',
    category: 'CORTICOSTEROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Hydrocortisone',
    genericName: 'Hydrocortisone',
    category: 'CORTICOSTEROID',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | ANTIHISTAMINES / ALLERGY
  |--------------------------------------------------------------------------
  */

  {
    name: 'Cetirizine',
    genericName: 'Cetirizine',
    category: 'ANTIHISTAMINE',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Loratadine',
    genericName: 'Loratadine',
    brandName: 'Claritin',
    category: 'ANTIHISTAMINE',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Fexofenadine',
    genericName: 'Fexofenadine',
    category: 'ANTIHISTAMINE',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Chlorpheniramine',
    genericName: 'Chlorpheniramine',
    category: 'ANTIHISTAMINE',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },

  /*
  |--------------------------------------------------------------------------
  | ANTICOAGULANTS / ANTIPLATELETS
  |--------------------------------------------------------------------------
  */

  {
    name: 'Warfarin',
    genericName: 'Warfarin',
    category: 'ANTICOAGULANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Apixaban',
    genericName: 'Apixaban',
    brandName: 'Eliquis',
    category: 'ANTICOAGULANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Rivaroxaban',
    genericName: 'Rivaroxaban',
    brandName: 'Xarelto',
    category: 'ANTICOAGULANT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Clopidogrel',
    genericName: 'Clopidogrel',
    brandName: 'Plavix',
    category: 'ANTIPLATELET',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | HIV / ANTIVIRALS
  |--------------------------------------------------------------------------
  */

  {
    name: 'Dolutegravir',
    genericName: 'Dolutegravir',
    category: 'ANTIRETROVIRAL',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Tenofovir',
    genericName: 'Tenofovir',
    category: 'ANTIRETROVIRAL',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Emtricitabine',
    genericName: 'Emtricitabine',
    category: 'ANTIRETROVIRAL',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Efavirenz',
    genericName: 'Efavirenz',
    category: 'ANTIRETROVIRAL',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Acyclovir',
    genericName: 'Acyclovir',
    category: 'ANTIVIRAL',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Valaciclovir',
    genericName: 'Valaciclovir',
    category: 'ANTIVIRAL',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | KIDNEY / GOUT
  |--------------------------------------------------------------------------
  */

  {
    name: 'Allopurinol',
    genericName: 'Allopurinol',
    category: 'GOUT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Colchicine',
    genericName: 'Colchicine',
    category: 'GOUT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | CONTRACEPTION / HORMONES
  |--------------------------------------------------------------------------
  */

  {
    name: 'Ethinylestradiol and Levonorgestrel',
    genericName: 'Ethinylestradiol/Levonorgestrel',
    category: 'CONTRACEPTIVE',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Progesterone',
    genericName: 'Progesterone',
    category: 'HORMONE',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: true,
  },
  {
    name: 'Oestrogen',
    genericName: 'Oestrogen',
    category: 'HORMONE',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | DERMATOLOGY
  |--------------------------------------------------------------------------
  */

  {
    name: 'Hydrocortisone topical',
    genericName: 'Hydrocortisone',
    category: 'CORTICOSTEROID',
    dosageForm: 'CREAM',
    route: 'TOPICAL',
    prescriptionRequired: false,
  },
  {
    name: 'Clotrimazole',
    genericName: 'Clotrimazole',
    category: 'ANTIFUNGAL',
    dosageForm: 'CREAM',
    route: 'TOPICAL',
    prescriptionRequired: false,
  },
  {
    name: 'Miconazole',
    genericName: 'Miconazole',
    category: 'ANTIFUNGAL',
    dosageForm: 'CREAM',
    route: 'TOPICAL',
    prescriptionRequired: false,
  },
  {
    name: 'Benzoyl peroxide',
    genericName: 'Benzoyl peroxide',
    category: 'DERMATOLOGY',
    dosageForm: 'GEL',
    route: 'TOPICAL',
    prescriptionRequired: false,
  },

  /*
  |--------------------------------------------------------------------------
  | EYE
  |--------------------------------------------------------------------------
  */

  {
    name: 'Timolol',
    genericName: 'Timolol',
    category: 'OPHTHALMIC',
    dosageForm: 'EYE_DROPS',
    route: 'OPHTHALMIC',
    prescriptionRequired: true,
  },
  {
    name: 'Latanoprost',
    genericName: 'Latanoprost',
    category: 'OPHTHALMIC',
    dosageForm: 'EYE_DROPS',
    route: 'OPHTHALMIC',
    prescriptionRequired: true,
  },

  /*
  |--------------------------------------------------------------------------
  | MISCELLANEOUS COMMON MEDICINES
  |--------------------------------------------------------------------------
  */

  {
    name: 'Ferrous sulfate',
    genericName: 'Ferrous sulfate',
    category: 'IRON_SUPPLEMENT',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Folic acid',
    genericName: 'Folic acid',
    category: 'VITAMIN',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Vitamin D',
    genericName: 'Vitamin D',
    category: 'VITAMIN',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    prescriptionRequired: false,
  },
  {
    name: 'Vitamin B12',
    genericName: 'Vitamin B12',
    category: 'VITAMIN',
    dosageForm: 'TABLET',
    route: 'ORAL',
    prescriptionRequired: false,
  },
];

/*
|--------------------------------------------------------------------------
| UPSERT MEDICATIONS
|--------------------------------------------------------------------------
*/

for (const medication of medications) {
  const existing = await prisma.medication.findFirst({
    where: {
      name: {
        equals: medication.name,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    await prisma.medication.update({
      where: {
        id: existing.id,
      },
      data: {
        genericName: medication.genericName,
        brandName: medication.brandName,
        category: medication.category,
        controlled: medication.controlled ?? false,
        prescriptionRequired:
          medication.prescriptionRequired ?? true,
        searchable: true,
        active: true,
      },
    });

   // Create the strength only if one was provided
if (medication.strength) {
  const existingStrength = await prisma.medicationStrength.findFirst({
    where: {
      medicationId: existing.id,
      strength: medication.strength,
      dosageForm: medication.dosageForm,
      route: medication.route,
    },
  });

  if (!existingStrength) {
    await prisma.medicationStrength.create({
      data: {
        medicationId: existing.id,
        strength: medication.strength,
        dosageForm: medication.dosageForm,
        route: medication.route,
        active: true,
      },
    });
  }
}
} else {
  await prisma.medication.create({
    data: {
      name: medication.name,
      genericName: medication.genericName,
      brandName: medication.brandName,
      category: medication.category,
      prescriptionRequired:
        medication.prescriptionRequired ?? true,
      controlled:
        medication.controlled ?? false,
      searchable: true,
      active: true,

      ...(medication.strength
        ? {
            strengths: {
              create: [
                {
                  strength: medication.strength,
                  dosageForm: medication.dosageForm,
                  route: medication.route,
                  active: true,
                },
              ],
            },
          }
        : {}),
    },
  });
}
}

console.log(
  `Medication reference data seeded: ${medications.length}`,
);


const immunizations = [
  {
    name: 'COVID-19',
    cvxCode: 'COVID_19',
    category: 'COVID-19',
    diseaseProtected: 'COVID-19',
    dosageSchedule: 'Varies by vaccine and age',
  },
  {
    name: 'Influenza',
    cvxCode: 'INFLUENZA',
    category: 'INFLUENZA',
    diseaseProtected: 'Influenza',
    dosageSchedule: 'Usually once annually',
  },
  {
    name: 'Tetanus',
    cvxCode: 'TETANUS',
    category: 'TETANUS',
    diseaseProtected: 'Tetanus',
    dosageSchedule: 'Booster generally every 10 years',
  },
  {
    name: 'Tetanus, diphtheria and pertussis (Tdap)',
    cvxCode: 'TDAP',
    category: 'TETANUS',
    diseaseProtected: 'Tetanus, diphtheria and pertussis',
    dosageSchedule: 'Single adult booster with subsequent boosters as recommended',
  },
  {
    name: 'Hepatitis A',
    cvxCode: 'HEPATITIS_A',
    category: 'HEPATITIS',
    diseaseProtected: 'Hepatitis A',
    dosageSchedule: 'Usually 2-dose series',
  },
  {
    name: 'Hepatitis B',
    cvxCode: 'HEPATITIS_B',
    category: 'HEPATITIS',
    diseaseProtected: 'Hepatitis B',
    dosageSchedule: 'Multi-dose series',
  },
  {
    name: 'Human papillomavirus (HPV)',
    cvxCode: 'HPV',
    category: 'HPV',
    diseaseProtected: 'Human papillomavirus',
    dosageSchedule: 'Usually 2 or 3 doses depending on age and circumstances',
  },
  {
    name: 'Measles, mumps and rubella (MMR)',
    cvxCode: 'MMR',
    category: 'MMR',
    diseaseProtected: 'Measles, mumps and rubella',
    dosageSchedule: 'Usually 2-dose series',
  },
  {
    name: 'Polio',
    cvxCode: 'POLIO',
    category: 'POLIO',
    diseaseProtected: 'Poliomyelitis',
    dosageSchedule: 'Multi-dose series',
  },
  {
    name: 'Pneumococcal',
    cvxCode: 'PNEUMOCOCCAL',
    category: 'PNEUMOCOCCAL',
    diseaseProtected: 'Pneumococcal disease',
    dosageSchedule: 'Schedule varies by vaccine and patient factors',
  },
  {
    name: 'Meningococcal',
    cvxCode: 'MENINGOCOCCAL',
    category: 'MENINGOCOCCAL',
    diseaseProtected: 'Meningococcal disease',
    dosageSchedule: 'Schedule varies by vaccine and patient factors',
  },
  {
    name: 'Chickenpox (Varicella)',
    cvxCode: 'VARICELLA',
    category: 'VARICELLA',
    diseaseProtected: 'Varicella (chickenpox)',
    dosageSchedule: 'Usually 2-dose series',
  },
  {
    name: 'Shingles (Zoster)',
    cvxCode: 'ZOSTER',
    category: 'ZOSTER',
    diseaseProtected: 'Herpes zoster (shingles)',
    dosageSchedule: 'Usually 2-dose series for recombinant zoster vaccine',
  },
];

for (const immunization of immunizations) {
  await prisma.immunization.upsert({
    where: {
      cvxCode: immunization.cvxCode,
    },
    update: {
      name: immunization.name,
      category: immunization.category,
      diseaseProtected: immunization.diseaseProtected,
      dosageSchedule: immunization.dosageSchedule,
      searchable: true,
      active: true,
    },
    create: {
      name: immunization.name,
      cvxCode: immunization.cvxCode,
      category: immunization.category,
      diseaseProtected: immunization.diseaseProtected,
      dosageSchedule: immunization.dosageSchedule,
      searchable: true,
      active: true,
    },
  });
}

console.log(
  `Immunization reference data seeded: ${immunizations.length}`,
);



  /*
  |--------------------------------------------------------------------------
  | COMPLETE
  |--------------------------------------------------------------------------
  */

  console.log('✅ Roles seeded');
  console.log(`✅ ${permissions.length} permissions seeded`);
  console.log('✅ Patient permissions assigned');
  console.log('✅ Practitioner permissions assigned');
  console.log('✅ Administrator permissions assigned');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });