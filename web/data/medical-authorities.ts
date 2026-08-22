import { MedicalAuthority } from "@/types/location";

export const MEDICAL_AUTHORITIES: Record<string, MedicalAuthority[]> = {
  ZA: [
    { id: "HPCSA", name: "Health Professions Council of South Africa" },
    { id: "SANC", name: "South African Nursing Council" },
    { id: "SAPC", name: "South African Pharmacy Council" },
    { id: "AHPCSA", name: "Allied Health Professions Council of South Africa" },
  ],

  BW: [
    { id: "BHPC", name: "Botswana Health Professions Council" },
  ],

  NA: [
    { id: "HPCNA", name: "Health Professions Councils of Namibia" },
  ],

  ZW: [
    { id: "HPAZ", name: "Health Professions Authority of Zimbabwe" },
    { id: "NCZ", name: "Nurses Council of Zimbabwe" },
  ],

  ZM: [
    { id: "HPCZ", name: "Health Professions Council of Zambia" },
    { id: "GNCZ", name: "General Nursing Council of Zambia" },
  ],

  MW: [
    { id: "MCM", name: "Medical Council of Malawi" },
    { id: "NMCM", name: "Nurses and Midwives Council of Malawi" },
  ],

  MZ: [
    { id: "OMM", name: "Ordem dos Médicos de Moçambique" },
  ],

  KE: [
    { id: "KMPDC", name: "Kenya Medical Practitioners and Dentists Council" },
    { id: "NCK", name: "Nursing Council of Kenya" },
    { id: "PPB", name: "Pharmacy and Poisons Board" },
  ],

  UG: [
    { id: "UMDPC", name: "Uganda Medical and Dental Practitioners Council" },
    { id: "UNMC", name: "Uganda Nurses and Midwives Council" },
    { id: "AHPC", name: "Allied Health Professionals Council" },
  ],

  TZ: [
    { id: "MCT", name: "Medical Council of Tanganyika" },
    { id: "TNMC", name: "Tanzania Nursing and Midwifery Council" },
    { id: "TPC", name: "Tanzania Pharmacy Council" },
  ],

  RW: [
    { id: "RMC", name: "Rwanda Medical Council" },
    { id: "NCNM", name: "National Council of Nurses and Midwives" },
  ],

  NG: [
    { id: "MDCN", name: "Medical and Dental Council of Nigeria" },
    { id: "NMCN", name: "Nursing and Midwifery Council of Nigeria" },
    { id: "PCN", name: "Pharmacists Council of Nigeria" },
  ],

  GH: [
    { id: "MDC", name: "Medical and Dental Council" },
    { id: "NMC", name: "Nursing and Midwifery Council" },
    { id: "PCG", name: "Pharmacy Council Ghana" },
  ],

  ET: [
    { id: "EMA", name: "Ethiopian Medical Association" },
  ],

  EG: [
    { id: "EMS", name: "Egyptian Medical Syndicate" },
  ],

  GB: [
    { id: "GMC", name: "General Medical Council" },
    { id: "NMC", name: "Nursing and Midwifery Council" },
    { id: "GDC", name: "General Dental Council" },
    { id: "GPhC", name: "General Pharmaceutical Council" },
  ],

  US: [
    { id: "FSMB", name: "Federation of State Medical Boards" },
    { id: "BON", name: "Board of Nursing" },
    { id: "BOP", name: "Board of Pharmacy" },
  ],

  CA: [
    { id: "MCC", name: "Medical Council of Canada" },
    { id: "CNA", name: "Canadian Nurses Association" },
  ],

  AU: [
    { id: "AHPRA", name: "Australian Health Practitioner Regulation Agency" },
  ],

  NZ: [
    { id: "MCNZ", name: "Medical Council of New Zealand" },
  ],
};