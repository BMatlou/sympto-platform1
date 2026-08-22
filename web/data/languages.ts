export interface Language {
  code: string;
  name: string;
}


export const LANGUAGES: Language[] = [
  // South Africa
  { code: "af", name: "Afrikaans" },
  { code: "en", name: "English" },
  { code: "zu", name: "isiZulu" },
  { code: "xh", name: "isiXhosa" },
  { code: "st", name: "Sesotho" },
  { code: "tn", name: "Setswana" },
  { code: "nso", name: "Sepedi" },
  { code: "ss", name: "siSwati" },
  { code: "ts", name: "Xitsonga" },
  { code: "ve", name: "Tshivenda" },
  { code: "nr", name: "isiNdebele" },

  // Africa
  { code: "sw", name: "Swahili" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yorùbá" },
  { code: "ig", name: "Igbo" },
  { code: "rw", name: "Kinyarwanda" },
  { code: "lg", name: "Luganda" },
  { code: "sn", name: "Shona" },
  { code: "ny", name: "Chichewa" },
  { code: "kg", name: "Kikongo" },
  { code: "ln", name: "Lingala" },
  { code: "so", name: "Somali" },

  // Europe
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "el", name: "Greek" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ru", name: "Russian" },

  // Asia
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ur", name: "Urdu" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "fa", name: "Persian (Farsi)" },
  { code: "he", name: "Hebrew" },
  { code: "tr", name: "Turkish" },

  // Americas
  { code: "en-US", name: "English (US)" },
  { code: "en-CA", name: "English (Canada)" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "es-MX", name: "Spanish (Mexico)" },

  // Oceania
  { code: "en-AU", name: "English (Australia)" },
  { code: "en-NZ", name: "English (New Zealand)" },
];