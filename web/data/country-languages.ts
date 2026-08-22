import { LANGUAGES, type Language } from "./languages";

export const COUNTRY_LANGUAGE_MAP: Record<string, string[]> = {
  // South Africa
  ZA: ["af", "en", "zu", "xh", "st", "tn", "nso", "ss", "ts", "ve", "nr"],

  // Namibia
  NA: ["en", "af"],

  // Botswana
  BW: ["en", "tn"],

  // Zimbabwe
  ZW: ["en", "sn"],

  // Zambia
  ZM: ["en"],

  // Mozambique
  MZ: ["pt"],

  // Malawi
  MW: ["en", "ny"],

  // Angola
  AO: ["pt"],

  // Tanzania
  TZ: ["sw", "en"],

  // Kenya
  KE: ["sw", "en"],

  // Uganda
  UG: ["en", "sw", "lg"],

  // Rwanda
  RW: ["rw", "en", "fr"],

  // Nigeria
  NG: ["en", "ha", "yo", "ig"],

  // Ghana
  GH: ["en"],

  // Ethiopia
  ET: ["am"],

  // Egypt
  EG: ["ar"],

  // Morocco
  MA: ["ar", "fr"],

  // France
  FR: ["fr"],

  // Germany
  DE: ["de"],

  // Spain
  ES: ["es"],

  // Portugal
  PT: ["pt"],

  // Italy
  IT: ["it"],

  // Netherlands
  NL: ["nl"],

  // Belgium
  BE: ["nl", "fr", "de"],

  // Switzerland
  CH: ["de", "fr", "it"],

  // United Kingdom
  GB: ["en"],

  // Ireland
  IE: ["en"],

  // United States
  US: ["en-US", "es"],

  // Canada
  CA: ["en-CA", "fr-CA"],

  // Mexico
  MX: ["es-MX"],

  // Brazil
  BR: ["pt-BR"],

  // Australia
  AU: ["en-AU"],

  // New Zealand
  NZ: ["en-NZ"],

  // China
  CN: ["zh"],

  // Japan
  JP: ["ja"],

  // South Korea
  KR: ["ko"],

  // India
  IN: ["hi", "bn", "ta", "te", "ml", "ur", "en"],

  // Pakistan
  PK: ["ur", "en"],

  // Bangladesh
  BD: ["bn"],

  // Thailand
  TH: ["th"],

  // Vietnam
  VN: ["vi"],

  // Indonesia
  ID: ["id"],

  // Malaysia
  MY: ["ms", "en"],

  // Turkey
  TR: ["tr"],

  // Israel
  IL: ["he", "ar"],

  // Iran
  IR: ["fa"],
};


export function getLanguagesByCountry(
  countryCode: string
): Language[] {

  const languageCodes =
    COUNTRY_LANGUAGE_MAP[countryCode] ?? [];


  return LANGUAGES.filter((language) =>
    languageCodes.includes(language.code)
  );
}