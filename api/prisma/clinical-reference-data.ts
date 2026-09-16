export type ClinicalReferenceEntry = {
  category: string;
  name: string;
  synonyms?: string[];
};

/**
 * Patient-facing symptom vocabulary. This is intentionally separate from
 * conditions: a symptom is something the patient experiences/reports, while
 * a condition is a diagnosis/reference disease.
 */
export const SYMPTOM_REFERENCE: ClinicalReferenceEntry[] = [
  ...[
    ['General','Fever',['Pyrexia']],['General','Chills',['Rigors']],['General','Fatigue',['Tiredness']],['General','Weakness',['Asthenia']],['General','Malaise',['Feeling unwell']],['General','Sweating',['Diaphoresis']],['General','Night sweats',['Nocturnal sweating']],['General','Unintentional weight loss'],['General','Unintentional weight gain'],['General','Dehydration'],['General','Increased thirst',['Polydipsia']],['General','Loss of appetite',['Anorexia']],
    ['Pain','Headache',['Cephalgia']],['Pain','Migraine'],['Pain','Facial pain'],['Pain','Eye pain'],['Pain','Ear pain',['Otalgia']],['Pain','Sore throat'],['Pain','Neck pain',['Cervicalgia']],['Pain','Back pain',['Dorsalgia']],['Pain','Chest pain'],['Pain','Abdominal pain',['Stomach pain']],['Pain','Pelvic pain'],['Pain','Joint pain',['Arthralgia']],['Pain','Muscle pain',['Myalgia']],['Pain','Bone pain'],['Pain','Toothache',['Dental pain']],['Pain','Skin pain'],['Pain','Burning pain'],['Pain','Cramping pain'],['Pain','Painful urination',['Dysuria']],
    ['Respiratory','Cough'],['Respiratory','Dry cough'],['Respiratory','Cough with mucus',['Productive cough']],['Respiratory','Shortness of breath',['Dyspnea']],['Respiratory','Difficulty breathing'],['Respiratory','Wheezing'],['Respiratory','Chest tightness'],['Respiratory','Rapid breathing',['Tachypnea']],['Respiratory','Slow breathing',['Bradypnea']],['Respiratory','Coughing blood',['Hemoptysis']],['Respiratory','Runny nose',['Rhinorrhea']],['Respiratory','Blocked nose',['Nasal congestion']],['Respiratory','Sneezing'],['Respiratory','Nasal discharge'],['Respiratory','Loss of smell',['Anosmia']],['Respiratory','Reduced sense of smell',['Hyposmia']],['Respiratory','Loss of taste',['Ageusia']],['Respiratory','Sputum',['Phlegm']],
    ['Neurological','Dizziness',['Lightheadedness']],['Neurological','Vertigo'],['Neurological','Fainting',['Syncope']],['Neurological','Near fainting',['Presyncope']],['Neurological','Tremor',['Shaking']],['Neurological','Numbness',['Hypoesthesia']],['Neurological','Tingling',['Paresthesia']],['Neurological','Pins and needles',['Paresthesia']],['Neurological','One-sided weakness'],['Neurological','Confusion'],['Neurological','Memory problems',['Memory impairment']],['Neurological','Difficulty concentrating'],['Neurological','Seizure',['Convulsion']],['Neurological','Loss of consciousness'],['Neurological','Balance problems'],['Neurological','Unsteady walking',['Gait disturbance']],
    ['Gastrointestinal','Nausea'],['Gastrointestinal','Vomiting',['Emesis']],['Gastrointestinal','Diarrhea',['Loose stools']],['Gastrointestinal','Constipation'],['Gastrointestinal','Bloating',['Abdominal distension']],['Gastrointestinal','Heartburn',['Pyrosis']],['Gastrointestinal','Indigestion',['Dyspepsia']],['Gastrointestinal','Difficulty swallowing',['Dysphagia']],['Gastrointestinal','Painful swallowing',['Odynophagia']],['Gastrointestinal','Abdominal cramps'],['Gastrointestinal','Blood in stool',['Hematochezia']],['Gastrointestinal','Black stool',['Melena']],['Gastrointestinal','Vomiting blood',['Hematemesis']],['Gastrointestinal','Bowel-control problems'],['Gastrointestinal','Gas',['Flatulence']],['Gastrointestinal','Hiccups',['Singultus']],
    ['Cardiovascular','Palpitations',['Awareness of heartbeat']],['Cardiovascular','Fast heartbeat',['Tachycardia']],['Cardiovascular','Slow heartbeat',['Bradycardia']],['Cardiovascular','Irregular heartbeat',['Arrhythmia']],['Cardiovascular','Leg swelling',['Peripheral edema']],['Cardiovascular','General swelling',['Edema']],['Cardiovascular','Cold hands or feet'],['Cardiovascular','Blue lips',['Cyanosis']],
    ['Skin','Rash',['Skin eruption']],['Skin','Itching',['Pruritus']],['Skin','Hives',['Urticaria']],['Skin','Red skin',['Erythema']],['Skin','Dry skin',['Xerosis']],['Skin','Peeling skin',['Desquamation']],['Skin','Blisters',['Bullae']],['Skin','Skin swelling'],['Skin','Bruising',['Ecchymosis']],['Skin','Pale skin',['Pallor']],['Skin','Yellow skin',['Jaundice']],['Skin','Hair loss',['Alopecia']],['Skin','Excessive sweating',['Hyperhidrosis']],
    ['Eyes','Blurred vision'],['Eyes','Double vision',['Diplopia']],['Eyes','Eye redness'],['Eyes','Watery eyes',['Lacrimation']],['Eyes','Dry eyes'],['Eyes','Eye discharge'],['Eyes','Light sensitivity',['Photophobia']],['Eyes','Vision loss'],
    ['Ear','Hearing loss'],['Ear','Ringing in ears',['Tinnitus']],['Ear','Ear discharge',['Otorrhea']],['Ear','Ear fullness'],
    ['Urinary','Frequent urination',['Frequency']],['Urinary','Urgent urination',['Urgency']],['Urinary','Blood in urine',['Hematuria']],['Urinary','Cloudy urine'],['Urinary','Dark urine'],['Urinary','Urinary leakage',['Urinary incontinence']],['Urinary','Difficulty starting urination',['Hesitancy']],['Urinary','Reduced urine output',['Oliguria']],
    ['Mental health','Anxiety'],['Mental health','Panic',['Panic attack']],['Mental health','Low mood',['Depressed mood']],['Mental health','Irritability'],['Mental health','Restlessness',['Agitation']],['Mental health','Insomnia',['Difficulty sleeping']],['Mental health','Excessive sleepiness',['Somnolence']],['Mental health','Nightmares'],['Mental health','Mood changes'],
    ['Musculoskeletal','Muscle stiffness'],['Musculoskeletal','Muscle cramps'],['Musculoskeletal','Reduced range of motion'],['Musculoskeletal','Joint stiffness'],['Musculoskeletal','Joint swelling'],['Musculoskeletal','Muscle weakness'],['Musculoskeletal','Difficulty walking'],
    ['Reproductive','Vaginal bleeding'],['Reproductive','Heavy menstrual bleeding',['Menorrhagia']],['Reproductive','Irregular periods',['Menstrual irregularity']],['Reproductive','Painful periods',['Dysmenorrhea']],['Reproductive','Vaginal discharge'],['Reproductive','Vaginal itching'],['Reproductive','Pelvic pressure'],['Reproductive','Erectile difficulty',['Erectile dysfunction']],
    ['Mouth','Mouth sores',['Oral ulcer']],['Mouth','Dry mouth',['Xerostomia']],['Mouth','Excess saliva',['Hypersalivation']],['Mouth','Bad breath',['Halitosis']],['Mouth','Swollen tongue'],['Mouth','Difficulty speaking',['Dysarthria']],
    ['Bleeding','Nosebleed',['Epistaxis']],['Bleeding','Easy bleeding',['Bleeding tendency']],['Bleeding','Easy bruising']
  ].map(([category,name,synonyms]) => ({ category: category as string, name: name as string, synonyms: (synonyms as string[] | undefined) ?? [] }))
];

/** Existing condition reference should remain diagnosis-oriented. These are
 * additional common conditions to complement the existing seed list. */
export const ADDITIONAL_CONDITIONS = [
  'Allergic rhinitis','Anaphylaxis','Atopic dermatitis','Eczema','Psoriasis','Acne','Rosacea','Urticaria',
  'Gastroesophageal reflux disease','Irritable bowel syndrome','Inflammatory bowel disease','Crohn disease','Ulcerative colitis','Peptic ulcer disease','Gallstones','Fatty liver disease','Hepatitis','Celiac disease','Hemorrhoids',
  'Urinary tract infection','Kidney stones','Chronic kidney disease','Acute kidney injury','Overactive bladder','Benign prostatic hyperplasia','Polycystic kidney syndrome',
  'Iron deficiency anemia','Vitamin B12 deficiency','Vitamin D deficiency','Dehydration','Electrolyte imbalance',
  'Osteoarthritis','Rheumatoid arthritis','Osteoporosis','Fibromyalgia','Tendinitis','Bursitis','Gouty arthritis',
  'Depression','Generalized anxiety disorder','Panic disorder','Post-traumatic stress disorder','Bipolar disorder','Obsessive-compulsive disorder','Attention-deficit/hyperactivity disorder','Insomnia',
  'Epilepsy','Parkinson disease','Multiple sclerosis','Peripheral neuropathy','Dementia','Alzheimer disease','Stroke','Transient ischemic attack',
  'Glaucoma','Cataract','Conjunctivitis','Dry eye disease','Macular degeneration','Diabetic retinopathy',
  'Otitis media','Otitis externa','Hearing loss','Tinnitus',
  'Menopause','Endometriosis','Polycystic ovary syndrome','Erectile dysfunction','Benign prostatic hyperplasia',
  'Pregnancy','Postpartum depression','Menstrual disorder',
  'Influenza','COVID-19','Common cold','Tuberculosis','Pneumonia','Bronchitis','Sinusitis','Pharyngitis','Tonsillitis','Gastroenteritis','Malaria',
  'HIV infection','Hepatitis B','Hepatitis C','Herpes simplex infection','Shingles','Chickenpox',
  'Hypothyroidism','Hyperthyroidism','Type 1 diabetes','Type 2 diabetes','Prediabetes','Metabolic syndrome','Polycystic ovary syndrome',
  'Obesity','High blood pressure','Heart failure','Coronary artery disease','Atrial fibrillation','Peripheral artery disease','High cholesterol','Deep vein thrombosis','Pulmonary embolism',
  'Migraine','Tension headache','Cluster headache','Chronic pain','Chronic fatigue syndrome'
] as const;

export const ADDITIONAL_ALLERGIES = [
  'Peanut','Tree nuts','Almond','Cashew','Hazelnut','Pistachio','Walnut','Pecan','Brazil nut','Macadamia nut',
  'Milk','Egg','Wheat','Soy','Sesame','Fish','Shellfish','Crustacean shellfish','Mollusk shellfish',
  'Beef','Chicken','Pork','Gelatin','Corn','Mustard','Celery','Lupin','Buckwheat',
  'Penicillin','Amoxicillin','Ampicillin','Cephalosporin','Sulfonamide antibiotic','Trimethoprim-sulfamethoxazole','Macrolide antibiotic','Tetracycline antibiotic','Fluoroquinolone antibiotic','Metronidazole',
  'Aspirin','Ibuprofen','Naproxen','Diclofenac','Ketoprofen','Paracetamol','Acetaminophen',
  'Morphine','Codeine','Tramadol','Local anesthetic','Lidocaine','General anesthetic',
  'Latex','Nickel','Cobalt','Chromium','Adhesive','Acrylic','Hair dye','Fragrance','Cosmetics',
  'Dust mite','House dust','Grass pollen','Tree pollen','Weed pollen','Mold','Alternaria mold','Aspergillus mold','Cat dander','Dog dander','Cockroach','Bee venom','Wasp venom','Ant venom',
  'Insect bite','Mosquito bite','Sunlight','Animal dander'
] as const;

/**
 * Medication intelligence is deliberately relationship-based. A medicine
 * can relieve a symptom without that symptom being a diagnosis, and a
 * therapeutic effect should not automatically be labelled as "masking".
 */
export const MEDICATION_CLINICAL_REFERENCE = {
  Paracetamol: {
    relieves: ['Headache','Fever','Muscle pain','Joint pain','Toothache'],
    sideEffects: ['Nausea','Skin rash','Itching'],
    watch: ['Yellow skin','Dark urine','Skin rash','Swelling','Difficulty breathing']
  },
  Ibuprofen: {
    relieves: ['Headache','Fever','Muscle pain','Joint pain','Menstrual pain'],
    sideEffects: ['Nausea','Indigestion','Abdominal pain','Heartburn','Dizziness','Skin rash'],
    watch: ['Black stool','Vomiting blood','Reduced urine output','Leg swelling','Difficulty breathing']
  },
  Amoxicillin: {
    relieves: [],
    sideEffects: ['Diarrhea','Nausea','Vomiting','Skin rash','Itching'],
    watch: ['Hives','Swelling','Difficulty breathing','Severe diarrhea','Yellow skin']
  },
  Metformin: {
    relieves: [],
    sideEffects: ['Nausea','Diarrhea','Abdominal pain','Loss of appetite','Metallic taste'],
    watch: ['Extreme weakness','Difficulty breathing','Confusion']
  },
  Amlodipine: {
    relieves: [],
    sideEffects: ['Leg swelling','Dizziness','Fatigue','Palpitations','Flushing'],
    watch: ['Fainting','Severe dizziness','Chest pain','Difficulty breathing']
  },
  Atorvastatin: {
    relieves: [],
    sideEffects: ['Muscle pain','Joint pain','Headache','Nausea','Diarrhea'],
    watch: ['Severe muscle pain','Muscle weakness','Dark urine','Yellow skin']
  },
  Omeprazole: {
    relieves: ['Heartburn','Indigestion','Upper abdominal pain'],
    sideEffects: ['Headache','Abdominal pain','Diarrhea','Constipation','Nausea'],
    watch: ['Severe diarrhea','Rash','Swelling','Difficulty breathing']
  },
  Salbutamol: {
    relieves: ['Wheezing','Shortness of breath','Chest tightness','Cough'],
    sideEffects: ['Tremor','Fast heartbeat','Palpitations','Headache','Nervousness'],
    watch: ['Worsening shortness of breath','Chest pain','Fainting','Irregular heartbeat']
  },
  Levothyroxine: {
    relieves: [],
    sideEffects: ['Palpitations','Fast heartbeat','Tremor','Sweating','Anxiety','Insomnia'],
    watch: ['Chest pain','Fast or irregular heartbeat','Fainting','Severe shortness of breath']
  },
  Losartan: {
    relieves: [],
    sideEffects: ['Dizziness','Fatigue','Headache'],
    watch: ['Fainting','Swelling','Difficulty breathing','Reduced urine output']
  },
  Fluoxetine: {
    relieves: [],
    sideEffects: ['Nausea','Headache','Insomnia','Anxiety','Sweating','Diarrhea'],
    watch: ['Seizure','Fainting','Severe agitation','Rash','Swelling','Difficulty breathing']
  },
  Cetirizine: {
    relieves: ['Itching','Hives','Runny nose','Sneezing'],
    sideEffects: ['Excessive sleepiness','Fatigue','Dry mouth','Headache'],
    watch: ['Difficulty breathing','Swelling','Fainting']
  }
} as const;
