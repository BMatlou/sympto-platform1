import { Country, State, City } from "country-state-city";

export interface CountryOption {
  code: string;
  name: string;
  phoneCode: string;
  flag: string;
}

export interface StateOption {
  code: string;
  name: string;
}

export interface CityOption {
  name: string;
}

export function getCountries(): CountryOption[] {
  try {
    const allCountries = Country.getAllCountries();
    if (!allCountries) return [];
    
    return allCountries.map((country) => ({
      code: country.isoCode,
      name: country.name,
      phoneCode: country.phonecode || "",
      flag: country.flag || "",
    }));
  } catch (error) {
    console.error("Failed to load countries:", error);
    return [];
  }
}

export function getStates(countryCode: string): StateOption[] {
  if (!countryCode) return [];

  try {
    const states = State.getStatesOfCountry(countryCode);
    if (!states) return [];

    return states.map((state) => ({
      code: state.isoCode,
      name: state.name,
    }));
  } catch (error) {
    console.error(`Failed to load states for country ${countryCode}:`, error);
    return [];
  }
}

export function getCities(
  countryCode: string,
  stateCode: string
): CityOption[] {
  if (!countryCode || !stateCode) return [];

  try {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    if (!cities) return [];

    return cities.map((city) => ({
      name: city.name,
    }));
  } catch (error) {
    console.error(`Failed to load cities for state ${stateCode}:`, error);
    return [];
  }
}
