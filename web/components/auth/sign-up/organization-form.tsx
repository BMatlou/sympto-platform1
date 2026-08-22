"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Mail, Lock } from "lucide-react";
import { Controller, Control, FieldErrors, UseFormRegister, UseFormSetValue, useWatch } from "react-hook-form";
import PhoneInput from "react-phone-number-input";

import { SignUpSchema } from "@/schemas/auth.schema";
import { getCities, getCountries, getStates } from "@/lib/locations";
import { ORGANIZATION_TYPES } from "@/data/organization-types";

export interface OrganizationFormProps {
  register: UseFormRegister<SignUpSchema>;
  errors: FieldErrors<SignUpSchema>;
  control: Control<SignUpSchema>;
  setValue: UseFormSetValue<SignUpSchema>;
}

export default function OrganizationForm({ register, errors, control, setValue }: OrganizationFormProps) {
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const country = useWatch({ control, name: "country" });
  const province = useWatch({ control, name: "province" });

const password = useWatch({
  control,
  name: "password",
});

  const countryOptions = useMemo(() => getCountries(), []);
  const stateOptions = useMemo(() => (country ? getStates(country) : []), [country]);
  const cityOptions = useMemo(() => (country && province ? getCities(country, province) : []), [country, province]);

  useEffect(() => {
    setValue("province", "");
    setValue("city", "");
  }, [country, setValue]);

  useEffect(() => {
    setValue("city", "");
  }, [province, setValue]);

  return (
    <div className="space-y-5">

<div className="grid gap-4 md:grid-cols-2">
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-700">
      First Name
    </label>
    <input
      {...register("firstName")}
      type="text"
      placeholder="John"
      className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
    />
    {errors.firstName && (
      <p className="mt-1 text-sm text-red-500">
        {errors.firstName.message}
      </p>
    )}
  </div>

  <div>
    <label className="mb-2 block text-sm font-medium text-slate-700">
      Last Name
    </label>
    <input
      {...register("lastName")}
      type="text"
      placeholder="Doe"
      className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
    />
    {errors.lastName && (
      <p className="mt-1 text-sm text-red-500">
        {errors.lastName.message}
      </p>
    )}
  </div>
</div>

<div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    Email Address
  </label>

  <div className="relative">
    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      {...register("email")}
      type="email"
      placeholder="owner@example.com"
      className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
    />
  </div>

  {errors.email && (
    <p className="mt-1 text-sm text-red-500">
      {errors.email.message}
    </p>
  )}
</div>

<div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    Mobile Number
  </label>

  <Controller
    name="phoneNumber"
    control={control}
    render={({ field }) => (
      <PhoneInput
        {...field}
        international
        defaultCountry="ZA"
        countryCallingCodeEditable={false}
        value={field.value || ""}
        onChange={(value) => field.onChange(value ?? "")}
        onBlur={field.onBlur}
        className="w-full"
        numberInputProps={{
          className:
            "w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20",
        }}
      />
    )}
  />

  {errors.phoneNumber && (
    <p className="mt-1 text-sm text-red-500">
      {errors.phoneNumber.message}
    </p>
  )}
</div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Organization Name</label>
        <input {...register("organizationName")} type="text" placeholder="Example Health Centre" className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
        {errors.organizationName && <p className="mt-1 text-sm text-red-500">{errors.organizationName.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Organization Type</label>
        <select {...register("organizationType")} className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
          <option value="">Select organization type</option>
          {ORGANIZATION_TYPES.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        {errors.organizationType && <p className="mt-1 text-sm text-red-500">{errors.organizationType.message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Registration Number</label>
          <input {...register("registrationNumber")} type="text" placeholder="123456789" className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          {errors.registrationNumber && <p className="mt-1 text-sm text-red-500">{errors.registrationNumber.message}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Website</label>
          <input {...register("website")} type="url" placeholder="https://example.com" className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          {errors.website && <p className="mt-1 text-sm text-red-500">{errors.website.message}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <select {...register("country")} className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
            <option value="">Select country</option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country.message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Province / State</label>
          <select {...register("province")} disabled={!country} className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
            <option value="">{country ? "Select province / state" : "Select country first"}</option>
            {stateOptions.map((state) => (
              <option key={state.code} value={state.code}>{state.name}</option>
            ))}
          </select>
          {errors.province && <p className="mt-1 text-sm text-red-500">{errors.province.message}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
          <select {...register("city")} disabled={!province} className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20">
            <option value="">{province ? "Select city" : "Select state first"}</option>
            {cityOptions.map((city) => (
              <option key={city.name} value={city.name}>{city.name}</option>
            ))}
          </select>
          {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Address Line 1</label>
        <input {...register("addressLine1")} type="text" placeholder="123 Main Road" className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
        {errors.addressLine1 && <p className="mt-1 text-sm text-red-500">{errors.addressLine1.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Postal Code</label>
        <input {...register("postalCode")} type="text" placeholder="0000" className="w-full rounded-xl border border-slate-300 py-3 px-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
        {errors.postalCode && <p className="mt-1 text-sm text-red-500">{errors.postalCode.message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Organization Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input {...register("organizationEmail")} type="email" placeholder="contact@example.com" className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20" />
          </div>
          {errors.organizationEmail && <p className="mt-1 text-sm text-red-500">{errors.organizationEmail.message}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Organization Phone</label>
          <Controller name="organizationPhone" control={control} render={({ field }) => (
            <PhoneInput
              {...field}
              international
              defaultCountry="ZA"
              countryCallingCodeEditable={false}
              value={field.value || ""}
              onChange={(value) => field.onChange(value ?? "")}
              onBlur={field.onBlur}
              className="w-full"
              numberInputProps={{
                className: "w-full rounded-xl border border-slate-300 py-3 pl-4 pr-4 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20",
              }}
            />
          )} />
          {errors.organizationPhone && <p className="mt-1 text-sm text-red-500">{errors.organizationPhone.message}</p>}
        </div>
      </div>

<div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    Password
  </label>

  <div className="relative">
    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      {...register("password")}
      type={showPassword ? "text" : "password"}
      placeholder="••••••••"
      className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-12 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2D54]"
    >
      {showPassword ? "Hide" : "Show"}
    </button>
  </div>

  {errors.password && (
    <p className="mt-1 text-sm text-red-500">
      {errors.password.message}
    </p>
  )}
</div>

<div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    Confirm Password
  </label>

  <div className="relative">
    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
  {...register("confirmPassword", {
    validate: (value) =>
      value === password || "Passwords do not match",
  })}
      className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-12 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
    />

    <button
      type="button"
      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2D54]"
    >
      {showConfirmPassword ? "Hide" : "Show"}
    </button>
  </div>

  {errors.confirmPassword && (
    <p className="mt-1 text-sm text-red-500">
      {errors.confirmPassword.message}
    </p>
  )}
</div>

    </div>
  );
}
