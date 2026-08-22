"use client";

import { useMemo, useState } from "react";

import {
  useForm,
  useWatch,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";

import LegalModal from "@/components/legal/legal-modal";

import { TERMS_DOCUMENT } from "@/data/legal/terms";
import { PRIVACY_DOCUMENT } from "@/data/legal/privacy";
import { POPIA_DOCUMENT } from "@/data/legal/popia";

import { useSignUp } from "@/hooks/use-sign-up";

import AccountType from "./account-type";
import IndividualForm from "./individual-form";
import PractitionerForm from "./practitioner-form";
import OrganizationForm from "./organization-form";
import OrganizationReview from "./organization-review";

import {
  signUpSchema,
  SignUpSchema,
} from "@/schemas/auth.schema";

export default function SignUpForm() {
  const [step, setStep] = useState(1);

  const [accountType, setAccountType] = useState<
    "INDIVIDUAL" | "PRACTITIONER" | "ORGANIZATION" | null
  >(null);

  const signUp = useSignUp();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),

    defaultValues: {
      accountType: "INDIVIDUAL",

      firstName: "",
      lastName: "",

      email: "",
      phoneNumber: "",

      country: "",
      province: "",
      city: "",

      preferredLanguage: "",

      medicalAuthority: "",
      profession: "",
      licenseNumber: "",
      practiceName: "",

      password: "",
      confirmPassword: "",

      organizationName: "",
      organizationType: "",
      registrationNumber: "",
      addressLine1: "",
      postalCode: "",
      website: "",
      organizationEmail: "",
      organizationPhone: "",
      agreeTerms: false,
      agreePrivacy: false,
      agreePOPIA: false,
    },
  });

  const agreeTerms = watch("agreeTerms");
  const agreePrivacy = watch("agreePrivacy");
  const agreePOPIA = watch("agreePOPIA");

  /*
   ---------------------------------------------------
   Legal Documents
   ---------------------------------------------------
  */

  const [showTerms, setShowTerms] = useState(false);

  const [showPrivacy, setShowPrivacy] = useState(false);

  const [showPOPIA, setShowPOPIA] = useState(false);

  const [viewedTerms, setViewedTerms] = useState(false);

  const [viewedPrivacy, setViewedPrivacy] = useState(false);

  const [viewedPOPIA, setViewedPOPIA] = useState(false);

  const handleTermsClose = () => {
    setShowTerms(false);
    setViewedTerms(true);
  };

  const handlePrivacyClose = () => {
    setShowPrivacy(false);
    setViewedPrivacy(true);
  };

  const handlePOPIAClose = () => {
    setShowPOPIA(false);
    setViewedPOPIA(true);
  };

  const values = useWatch({
    control,
  });

  const handleStep2Continue = async () => {
    if (!accountType) return;

    const fields: Array<keyof SignUpSchema> = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",

      "country",
      "province",
      "city",

      "password",
      "confirmPassword",
    ];

    if (accountType === "INDIVIDUAL") {
      fields.push("preferredLanguage");
    }

    if (accountType === "PRACTITIONER") {
      fields.push(
        "medicalAuthority",
        "licenseNumber",
        "profession"
      );
    }

    if (accountType === "ORGANIZATION") {
      fields.push(
        "organizationName",
        "organizationType",
        "registrationNumber",
        "addressLine1",
        "postalCode",
        "organizationEmail",
        "organizationPhone",
      );
    }

    console.log("Fields being validated:", fields);

const valid = await trigger(fields);

console.log("Validation result:", valid);
console.log("Form errors:", errors);

if (!valid) {
  toast.error("Please complete all required fields before continuing.");
  return;
}

    setStep(3);
  };

  const reviewItems = useMemo(
    () => [
      {
        label: "Account Type",
        value:
          accountType === "INDIVIDUAL"
            ? "Individual"
            : accountType === "PRACTITIONER"
            ? "Practitioner"
            : accountType === "ORGANIZATION"
            ? "Organization"
            : "",
      },

      {
        label: "First Name",
        value: values.firstName,
      },

      {
        label: "Last Name",
        value: values.lastName,
      },

      {
        label: "Email",
        value: values.email,
      },

      {
        label: "Mobile Number",
        value: values.phoneNumber,
      },

      {
        label: "Country",
        value: values.country,
      },

      {
        label: "Province / State",
        value: values.province,
      },

      {
        label: "City",
        value: values.city,
      },

      ...(accountType === "INDIVIDUAL"
        ? [
            {
              label: "Preferred Language",
              value: values.preferredLanguage,
            },
          ]
        : []),

      ...(accountType === "PRACTITIONER"
        ? [
            {
              label: "Medical Authority",
              value: values.medicalAuthority,
            },

            {
              label: "Profession",
              value: values.profession,
            },

            {
              label: "Registration Number",
              value: values.licenseNumber,
            },

            {
              label: "Practice Name",
              value: values.practiceName || "-",
            },
          ]
        : []),

      ...(accountType === "ORGANIZATION"
        ? [
            {
              label: "Organization Name",
              value: values.organizationName,
            },
            {
              label: "Organization Type",
              value: values.organizationType,
            },
            {
              label: "Registration Number",
              value: values.registrationNumber,
            },
            {
              label: "Address",
              value: values.addressLine1,
            },
            {
              label: "Postal Code",
              value: values.postalCode,
            },
            {
              label: "Organization Email",
              value: values.organizationEmail,
            },
            {
              label: "Organization Phone",
              value: values.organizationPhone,
            },
          ]
        : []),
    ],
    [
      accountType,

      values.firstName,
      values.lastName,

      values.email,
      values.phoneNumber,

      values.country,
      values.province,
      values.city,

      values.preferredLanguage,

      values.medicalAuthority,
      values.profession,
      values.licenseNumber,
      values.practiceName,
    ]
  );

  const onSubmit = (data: SignUpSchema) => {
    if (!viewedTerms) {
      toast.error(
        "Please read the Terms & Conditions."
      );
      return;
    }

    if (!viewedPrivacy) {
      toast.error(
        "Please read the Privacy Policy."
      );
      return;
    }

    if (!viewedPOPIA) {
      toast.error(
        "Please read the POPIA Notice."
      );
      return;
    }

    signUp.mutate(data);
  };

  const progress = (step / 3) * 100;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
    >
      {/* Progress */}

      <div>

        <div className="mb-2 flex items-center justify-between">

          <span className="text-sm font-medium text-[#0B2D54]">
            Step {step} of 3
          </span>

          <span className="text-sm text-slate-500">
            {Math.round(progress)}%
          </span>

        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">

          <div
            className="h-full rounded-full bg-[#24C1C4] transition-all duration-300"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>

            {/* STEP 1 */}

      {step === 1 && (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0B2D54]">
              Choose your account type
            </h2>

            <p className="mt-2 text-slate-500">
              Select how you'll use Sympto.
            </p>
          </div>

          <AccountType
            value={accountType}
            onChange={(value) => {
              setAccountType(value);
              setValue("accountType", value);
            }}
          />

          <button
            type="button"
            disabled={!accountType}
            onClick={() => setStep(2)}
            className="w-full rounded-xl bg-[#0B2D54] py-3 font-semibold text-white transition hover:bg-[#082443] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </>
      )}

      {/* STEP 2 */}

      {step === 2 && (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0B2D54]">
              {accountType === "ORGANIZATION" ? "Organization Information" : "Personal Information"}
            </h2>

            <p className="mt-2 text-slate-500">
              {accountType === "ORGANIZATION"
                ? "Tell us about your organization."
                : "Tell us a little about yourself."}
            </p>
          </div>

          {accountType === "INDIVIDUAL" && (
            <IndividualForm
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          )}

          {accountType === "PRACTITIONER" && (
            <PractitionerForm
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          )}

          {accountType === "ORGANIZATION" && (
            <OrganizationForm
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full rounded-xl border border-slate-300 py-3 font-semibold transition hover:bg-slate-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleStep2Continue}
              className="w-full rounded-xl bg-[#0B2D54] py-3 font-semibold text-white transition hover:bg-[#082443]"
            >
              Continue
            </button>
          </div>
        </>
      )}

            {/* STEP 3 */}

      {step === 3 && (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0B2D54]">
              Review & Agreements
            </h2>

            <p className="mt-2 text-slate-500">
              Please review your information before creating your account.
            </p>
          </div>

          {/* Review */}

          {accountType === "ORGANIZATION" ? (
            <OrganizationReview values={values} />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">

              <h3 className="mb-5 text-lg font-semibold text-[#0B2D54]">
                Review Information
              </h3>

              <div className="grid gap-5 md:grid-cols-2">

                {reviewItems.map((item) => (

                  <div key={item.label}>

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-1 font-medium text-slate-900">
                      {item.value || "-"}
                    </p>

                  </div>

                ))}

              </div>

            </div>
          )}

          {/* Agreements */}

<div className="rounded-3xl border border-slate-200 bg-white p-6">
  <h3 className="mb-2 text-lg font-semibold text-[#0B2D54]">
    Legal Agreements
  </h3>

  <p className="mb-6 text-sm text-slate-500">
    Please read each document before you can agree and continue with your
    registration.
  </p>

  <div className="space-y-6">

    {/* Terms */}

    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-[#0B2D54]">
            Terms & Conditions
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Read the terms governing the use of Sympto.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="rounded-xl bg-[#24C1C4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1aaeb1]"
        >
          Read Document
        </button>
      </div>

      {!viewedTerms && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Please read the Terms & Conditions before agreeing.
        </p>
      )}

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          {...register("agreeTerms")}
          disabled={!viewedTerms}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#24C1C4] focus:ring-[#24C1C4] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <span
          className={`text-sm ${
            viewedTerms ? "text-slate-700" : "text-slate-400"
          }`}
        >
          I have read and agree to the Sympto Terms & Conditions.
        </span>
      </label>

      {errors.agreeTerms && (
        <p className="mt-2 text-sm text-red-500">
          {errors.agreeTerms.message}
        </p>
      )}
    </div>

    {/* Privacy */}

    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-[#0B2D54]">
            Privacy Policy
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Learn how Sympto stores and protects your information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="rounded-xl bg-[#24C1C4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1aaeb1]"
        >
          Read Document
        </button>
      </div>

      {!viewedPrivacy && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Please read the Privacy Policy before agreeing.
        </p>
      )}

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          {...register("agreePrivacy")}
          disabled={!viewedPrivacy}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#24C1C4] focus:ring-[#24C1C4] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <span
          className={`text-sm ${
            viewedPrivacy ? "text-slate-700" : "text-slate-400"
          }`}
        >
          I have read and agree to the Privacy Policy.
        </span>
      </label>

      {errors.agreePrivacy && (
        <p className="mt-2 text-sm text-red-500">
          {errors.agreePrivacy.message}
        </p>
      )}
    </div>

    {/* POPIA */}

    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-[#0B2D54]">
            POPIA Consent
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Read how Sympto complies with South Africa's Protection of Personal
            Information Act.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPOPIA(true)}
          className="rounded-xl bg-[#24C1C4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1aaeb1]"
        >
          Read Document
        </button>
      </div>

      {!viewedPOPIA && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Please read the POPIA Consent before agreeing.
        </p>
      )}

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          {...register("agreePOPIA")}
          disabled={!viewedPOPIA}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#24C1C4] focus:ring-[#24C1C4] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <span
          className={`text-sm ${
            viewedPOPIA ? "text-slate-700" : "text-slate-400"
          }`}
        >
          I consent to the processing of my personal information under POPIA.
        </span>
      </label>

      {errors.agreePOPIA && (
        <p className="mt-2 text-sm text-red-500">
          {errors.agreePOPIA.message}
        </p>
      )}
    </div>

  </div>
</div>

          <div className="flex gap-3">
  <button
    type="button"
    onClick={() => setStep(2)}
    className="w-full rounded-xl border border-slate-300 py-3 font-semibold transition hover:bg-slate-50"
  >
    Back
  </button>

  <button
    type="submit"
    disabled={
      !viewedTerms ||
      !viewedPrivacy ||
      !viewedPOPIA ||
      !agreeTerms ||
      !agreePrivacy ||
      !agreePOPIA ||
      signUp.isPending
    }
    className={`w-full rounded-xl py-3 font-semibold transition ${
      viewedTerms &&
      viewedPrivacy &&
      viewedPOPIA &&
      agreeTerms &&
      agreePrivacy &&
      agreePOPIA
        ? "bg-[#24C1C4] text-white hover:bg-[#1aaeb1]"
        : "cursor-not-allowed bg-slate-300 text-slate-500"
    }`}
  >
    {signUp.isPending ? "Creating Account..." : "Create Account"}
  </button>
</div>

        </>
      )}

            {/* Terms Modal */}

      <LegalModal
  open={showTerms}
  document={TERMS_DOCUMENT}
  onClose={handleTermsClose}
/>

      {/* Privacy Modal */}

      <LegalModal
  open={showPrivacy}
  document={PRIVACY_DOCUMENT}
  onClose={handlePrivacyClose}
/>

      {/* POPIA Modal */}

     <LegalModal
  open={showPOPIA}
  document={POPIA_DOCUMENT}
  onClose={handlePOPIAClose}
/>
    </form>
  );
}