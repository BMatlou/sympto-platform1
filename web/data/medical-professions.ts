const DOCTORS = [
  "Medical Practitioner",
  "General Practitioner",
  "Medical Specialist",
];

const DENTAL = [
  "Dentist",
  "Dental Therapist",
  "Dental Hygienist",
];

const NURSING = [
  "Professional Nurse",
  "Registered Nurse",
  "Enrolled Nurse",
  "Midwife",
  "Nursing Assistant",
];

const PHARMACY = [
  "Pharmacist",
  "Pharmacy Technician",
  "Pharmacist Assistant",
  "Pharmacy Intern",
  "Pharmacy Support Personnel",
];

const ALLIED_HEALTH = [
  "Psychologist",
  "Physiotherapist",
  "Occupational Therapist",
  "Speech Therapist",
  "Audiologist",
  "Dietitian",
  "Nutritionist",
  "Radiographer",
  "Clinical Technologist",
  "Medical Scientist",
  "Optometrist",
  "Podiatrist",
];

export const MEDICAL_PROFESSIONS: Record<string, string[]> = {
      // ===========================
  // SOUTH AFRICA
  // ===========================

  HPCSA: [
    ...DOCTORS,
    ...DENTAL,
    ...ALLIED_HEALTH,
    "Clinical Associate",
    "Biokineticist",
    "Emergency Care Practitioner",
    "Medical Orthotist & Prosthetist",
  ],

  SANC: NURSING,

  SAPC: PHARMACY,

  AHPCSA: [
    "Chiropractor",
    "Homeopath",
    "Acupuncturist",
    "Ayurveda Practitioner",
    "Chinese Medicine Practitioner",
    "Naturopath",
    "Osteopath",
    "Therapeutic Aromatherapist",
    "Therapeutic Massage Therapist",
    "Therapeutic Reflexologist",
    "Unani-Tibb Practitioner",
  ],

  // ===========================
  // BOTSWANA
  // ===========================

  BHPC: [
    ...DOCTORS,
    ...DENTAL,
    ...NURSING,
    ...PHARMACY,
    ...ALLIED_HEALTH,
  ],

  // ===========================
  // NAMIBIA
  // ===========================

  HPCNA: [
    ...DOCTORS,
    ...DENTAL,
    ...NURSING,
    ...PHARMACY,
    ...ALLIED_HEALTH,
  ],

  // ===========================
  // ZIMBABWE
  // ===========================

  HPAZ: [
    ...DOCTORS,
    ...DENTAL,
    ...PHARMACY,
    ...ALLIED_HEALTH,
  ],

  NCZ: NURSING,

  // ===========================
  // ZAMBIA
  // ===========================

  HPCZ: [
    ...DOCTORS,
    ...DENTAL,
    ...PHARMACY,
    ...ALLIED_HEALTH,
  ],

  GNCZ: NURSING,

  // ===========================
  // MALAWI
  // ===========================

  MCM: [
    ...DOCTORS,
    ...DENTAL,
    ...PHARMACY,
    ...ALLIED_HEALTH,
  ],

  NMCM: NURSING,

  // ===========================
  // MOZAMBIQUE
  // ===========================

  OMM: DOCTORS,

  // ===========================
  // KENYA
  // ===========================

  KMPDC: DOCTORS,

  NCK: NURSING,

  PPB: PHARMACY,

  // ===========================
  // UGANDA
  // ===========================

  UMDPC: DOCTORS,

  UNMC: NURSING,

  AHPC: ALLIED_HEALTH,

  // ===========================
  // TANZANIA
  // ===========================

  MCT: DOCTORS,

  TNMC: NURSING,

  TPC: PHARMACY,

  // ===========================
  // RWANDA
  // ===========================

  RMC: DOCTORS,

  NCNM: NURSING,

  // ===========================
  // NIGERIA
  // ===========================

  MDCN: DOCTORS,

  NMCN: NURSING,

  PCN: PHARMACY,

  // ===========================
  // GHANA
  // ===========================

  MDC: DOCTORS,

  NMC: NURSING,

  PCG: PHARMACY,

  // ===========================
  // ETHIOPIA
  // ===========================

  EMA: DOCTORS,

  // ===========================
  // EGYPT
  // ===========================

  EMS: DOCTORS,

  // ===========================
  // ANGOLA
  // ===========================

  OMA: DOCTORS,

  // ===========================
  // MOROCCO
  // ===========================

  ONM: DOCTORS,

  // ===========================
  // TUNISIA
  // ===========================

  OMT: DOCTORS,

    // ===========================
  // UNITED KINGDOM
  // ===========================

  GMC: DOCTORS,

  GDC: DENTAL,

  GPhC: PHARMACY,

  // ===========================
  // UNITED STATES
  // ===========================

  FSMB: [
    "Medical Doctor (MD)",
    "Doctor of Osteopathic Medicine (DO)",
    "Medical Specialist",
  ],

  BON: [
    "Registered Nurse",
    "Licensed Practical Nurse",
    "Advanced Practice Registered Nurse",
    "Nurse Practitioner",
  ],

  BOP: PHARMACY,

  // ===========================
  // CANADA
  // ===========================

  MCC: DOCTORS,

  CNA: NURSING,

  // ===========================
  // AUSTRALIA
  // ===========================

  AHPRA: [
    ...DOCTORS,
    ...DENTAL,
    ...NURSING,
    ...PHARMACY,
    ...ALLIED_HEALTH,
  ],

  // ===========================
  // NEW ZEALAND
  // ===========================

  MCNZ: DOCTORS,
};