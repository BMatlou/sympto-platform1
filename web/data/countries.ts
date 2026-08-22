import countries from "world-countries";

export type Country = {
  name: string;
  code: string;
  flag: string;
};

export const COUNTRIES: Country[] = countries
  .map((country) => ({
    name: country.name.common,
    code: country.cca2,
    flag: `https://flagcdn.com/${country.cca2.toLowerCase()}.svg`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));