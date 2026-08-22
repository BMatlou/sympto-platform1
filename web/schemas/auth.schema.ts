import { z } from "zod";

export const signUpSchema = z
  .object({
    accountType: z.enum([
  "INDIVIDUAL",
  "PRACTITIONER",
  "ORGANIZATION",
]),

    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters."),

    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters."),

    email: z
      .string()
      .email("Please enter a valid email address."),

    phoneNumber: z
      .string()
      .min(8, "Please enter a valid mobile number."),

    country: z
      .string()
      .min(1, "Country is required."),

    province: z.string().optional(),

    city: z.string().optional(),

    preferredLanguage: z.string().optional(),

    medicalAuthority: z.string().optional(),

    licenseNumber: z.string().optional(),

    profession: z.string().optional(),

    practiceName: z.string().optional(),

    organizationName: z.string().optional(),
    organizationType: z.string().optional(),
    registrationNumber: z.string().optional(),
    addressLine1: z.string().optional(),
    postalCode: z.string().optional(),
    website: z
  .string()
  .url("Please enter a valid website URL.")
  .optional()
  .or(z.literal("")),
    organizationEmail: z
  .string()
  .email("Please enter a valid organization email.")
  .optional()
  .or(z.literal("")),
    organizationPhone: z.string().optional(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),

    confirmPassword: z.string(),

    agreeTerms: z.boolean(),

    agreePrivacy: z.boolean(),

    agreePOPIA: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Password confirmation
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    // Required for everyone
    if (!data.province) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["province"],
        message: "Province / State is required.",
      });
    }

    if (!data.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "City is required.",
      });
    }

    // Individual validation
    if (data.accountType === "INDIVIDUAL") {
      if (!data.preferredLanguage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["preferredLanguage"],
          message: "Preferred language is required.",
        });
      }
    }

    // Practitioner validation
    if (data.accountType === "PRACTITIONER") {
      if (!data.medicalAuthority) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["medicalAuthority"],
          message: "Medical authority is required.",
        });
      }

      if (!data.licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["licenseNumber"],
          message: "Registration / License number is required.",
        });
      }

      if (!data.profession) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["profession"],
          message: "Profession is required.",
        });
      }
    }

    if (data.accountType === "ORGANIZATION") {
      if (!data.organizationName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["organizationName"],
          message: "Organization name is required.",
        });
      }

      if (!data.organizationType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["organizationType"],
          message: "Organization type is required.",
        });
      }

      if (!data.registrationNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["registrationNumber"],
          message: "Registration number is required.",
        });
      }

      if (!data.addressLine1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["addressLine1"],
          message: "Address line 1 is required.",
        });
      }

      if (!data.postalCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postalCode"],
          message: "Postal code is required.",
        });
      }

      if (!data.organizationEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["organizationEmail"],
          message: "Organization email is required.",
        });
      }

      if (!data.organizationPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["organizationPhone"],
          message: "Organization phone is required.",
        });
      }
    }

    // Agreements
    if (!data.agreeTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agreeTerms"],
        message: "You must agree to the Terms and Conditions.",
      });
    }

    if (!data.agreePrivacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agreePrivacy"],
        message: "You must agree to the Privacy Policy.",
      });
    }

    if (!data.agreePOPIA) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agreePOPIA"],
        message: "You must agree to POPIA.",
      });
    }
  });

export type SignUpSchema = z.infer<typeof signUpSchema>;