
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Lock, Mail, User } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import {
  Controller,
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { SignUpSchema } from "@/schemas/auth.schema";
import { getCities, getCountries, getStates } from "@/lib/locations";
import { getLanguagesByCountry } from "@/data/country-languages";

export interface IndividualFormProps {
  register: UseFormRegister<SignUpSchema>;
  errors: FieldErrors<SignUpSchema>;
  control: Control<SignUpSchema>;
  setValue: UseFormSetValue<SignUpSchema>;
}

function getPasswordStrength(password: string) {
  if (!password) return { label: "", color: "", score: 0 };
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  if (score <= 2) return { label: "Weak", color: "text-red-500", score };
  if (score <= 4) return { label: "Medium", color: "text-amber-500", score };
  return { label: "Strong", color: "text-emerald-500", score };
}

export default function IndividualForm(props: IndividualFormProps) {
  const { register, errors, control, setValue } = props;
  const [countryFilter, setCountryFilter] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const country = useWatch({ control, name: "country" });
  const province = useWatch({ control, name: "province" });
  const password = useWatch({ control, name: "password" });

  const languageOptions = useMemo(() => (country ? getLanguagesByCountry(country) : []), [country]);
  const countryOptions = useMemo(() => getCountries(), []);
  const filteredCountries = useMemo(
    () =>
      countryFilter.trim()
        ? countryOptions.filter((c) => c.name.toLowerCase().includes(countryFilter.toLowerCase()))
        : countryOptions,
    [countryFilter, countryOptions]
  );

  // debounce search input -> countryFilter
  useEffect(() => {
    const t = setTimeout(() => setCountryFilter(countrySearch), 180);
    return () => clearTimeout(t);
  }, [countrySearch]);

  // close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsCountryListOpen(false);
        setHighlightedIndex(null);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);
  const stateOptions = useMemo(() => (country ? getStates(country) : []), [country]);
  const cityOptions = useMemo(() => (country && province ? getCities(country, province) : []), [country, province]);

  useEffect(() => {
    setValue("province", "");
    setValue("city", "");
    setValue("preferredLanguage", "");
  }, [country, setValue]);

  // keep input label in sync when country code changes
  useEffect(() => {
    const selected = countryOptions.find((c) => c.code === country);
    if (selected) setCountrySearch(selected.name);
  }, [country, countryOptions]);

  useEffect(() => {
    setValue("city", "");
  }, [province, setValue]);

  const passwordStrength = getPasswordStrength(password || "");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input {...register("firstName")} type="text" placeholder="John" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          </div>
          {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input {...register("lastName")} type="text" placeholder="Doe" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          </div>
          {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input {...register("email")} type="email" placeholder="john@example.com" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Mobile Number</label>
        <Controller name="phoneNumber" control={control} render={({ field }) => (
          <PhoneInput {...field} international defaultCountry="ZA" countryCallingCodeEditable={false} value={field.value || ""} onChange={(value) => field.onChange(value ?? "")} onBlur={field.onBlur} className="w-full" numberInputProps={{ className: "w-full rounded-xl border border-slate-300 py-3 pl-4 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" }} />
        )} />
        {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber.message}</p>}
      </div>

      <div className="space-y-3">
        <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
        <div ref={containerRef} className="relative">
          <input
            ref={inputRef}
            value={countrySearch}
            onChange={(e) => {
              setCountrySearch(e.target.value);
              setIsCountryListOpen(true);
            }}
            onFocus={() => setIsCountryListOpen(true)}
            onKeyDown={(e) => {
              if (!isCountryListOpen) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((i) => {
                  const next = i === null ? 0 : Math.min(filteredCountries.length - 1, i + 1);
                  return next;
                });
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((i) => {
                  if (i === null) return Math.max(0, filteredCountries.length - 1);
                  return Math.max(0, i - 1);
                });
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (highlightedIndex !== null) {
                  const sel = filteredCountries[highlightedIndex];
                  if (sel) {
                    setValue("country", sel.code);
                    setCountrySearch(sel.name);
                    setIsCountryListOpen(false);
                    setHighlightedIndex(null);
                  }
                }
              } else if (e.key === "Escape") {
                setIsCountryListOpen(false);
                setHighlightedIndex(null);
              }
            }}
            placeholder="Search countries"
            className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
          />
          <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          {/* clear button */}
          {countrySearch && (
            <button
              type="button"
              onClick={() => {
                setCountrySearch("");
                setCountryFilter("");
                setValue("country", "");
                setIsCountryListOpen(false);
                setHighlightedIndex(null);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
              ✕
            </button>
          )}

          {/* hidden select bound to form control for accessibility */}
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <select {...field} value={field.value || ""} onChange={(e) => {
                const code = e.target.value;
                const sel = countryOptions.find((c) => c.code === code);
                if (sel) setCountrySearch(sel.name);
                field.onChange(code);
              }} className="sr-only">
                <option value="">Select country</option>
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            )}
          />

          {/* dropdown list */}
          {isCountryListOpen && filteredCountries.length > 0 && (
            <ul className="absolute z-20 mt-2 max-h-40 w-full overflow-auto rounded-lg border bg-white shadow-lg">
              {filteredCountries.map((c, idx) => (
                <li
                  key={c.code}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    setValue("country", c.code);
                    setCountrySearch(c.name);
                    setIsCountryListOpen(false);
                    setHighlightedIndex(null);
                  }}
                  className={`px-4 py-2 cursor-pointer ${highlightedIndex === idx ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Province / State</label>
        <select {...register("province")} disabled={!country} className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
          <option value="">{country ? "Select province / state" : "Select country first"}</option>
          {stateOptions.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        {errors.province && <p className="mt-1 text-sm text-red-500">{errors.province.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
        <select {...register("city")} disabled={!province} className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
          <option value="">{province ? "Select city" : "Select state first"}</option>
          {cityOptions.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Preferred Language</label>
        <select {...register("preferredLanguage")} disabled={!country} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
          <option value="">{country ? "Select preferred language" : "Select country first"}</option>
          {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        {errors.preferredLanguage && <p className="mt-1 text-sm text-red-500">{errors.preferredLanguage.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-12 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2D54]">{showPassword ? "Hide" : "Show"}</button>
        </div>
        {passwordStrength.label && <p className={`${passwordStrength.color} mt-2 text-sm font-semibold`}>{passwordStrength.label}</p>}
        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-12 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2D54]">{showConfirmPassword ? "Hide" : "Show"}</button>
        </div>
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>}
      </div>
    </div>
  );
}