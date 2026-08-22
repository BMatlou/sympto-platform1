import { LegalDocument } from "@/types/legal";

export const TERMS_DOCUMENT: LegalDocument = {
  title: "Sympto Terms & Conditions",

  version: "1.0",

  effectiveDate: "01 January 2026",

  lastUpdated: "01 January 2026",

  sections: [
    {
      id: "introduction",

      title: "Introduction",

      content: [
        "Welcome to Sympto. These Terms and Conditions govern your access to and use of the Sympto platform.",
        "By creating an account or using Sympto, you agree to be bound by these Terms.",
        "If you do not agree with these Terms, you must not use the platform.",
      ],
    },

    {
      id: "eligibility",

      title: "Eligibility",

      content: [
        "You must be at least 18 years old or have the consent of a parent or legal guardian where applicable.",
        "Healthcare practitioners must maintain a valid registration with the appropriate regulatory authority within their country.",
      ],
    },

    {
      id: "accounts",

      title: "User Accounts",

      content: [
        "You are responsible for maintaining the confidentiality of your account credentials.",
        "You agree to provide accurate and complete information.",
        "You are responsible for all activity occurring under your account.",
      ],
    },

    {
      id: "organization-accounts",

      title: "Organization Accounts",

      content: [
        "Organizations must provide accurate and current facility details when registering.",
        "Organization administrators must maintain valid contact information and registration credentials.",
        "Organization accounts must not act on behalf of unauthorized third parties or facilitate misuse of the platform.",
      ],
    },

    {
      id: "services",

      title: "Healthcare Services",

      content: [
        "Sympto provides technology that connects patients with licensed healthcare professionals.",
        "Sympto is not itself a healthcare provider.",
        "Clinical decisions remain the responsibility of the treating practitioner.",
      ],
    },

    {
      id: "acceptable-use",

      title: "Acceptable Use",

      content: [
        "You must not misuse the platform.",
        "You must not upload malicious software.",
        "You must not impersonate another individual.",
        "You must not provide false medical information intentionally.",
      ],
    },

    {
      id: "payments",

      title: "Payments",

      content: [
        "Some services may require payment.",
        "Applicable fees will always be displayed before payment.",
        "Refund policies may vary depending on the service provided.",
      ],
    },

    {
      id: "termination",

      title: "Termination",

      content: [
        "Sympto may suspend or terminate accounts that violate these Terms.",
        "Users may request deletion of their account at any time, subject to legal record retention requirements.",
      ],
    },

    {
      id: "liability",

      title: "Limitation of Liability",

      content: [
        "Sympto shall not be liable for clinical decisions made by independent healthcare practitioners.",
        "The platform is provided on an 'as available' basis.",
      ],
    },

    {
      id: "changes",

      title: "Changes",

      content: [
        "Sympto may update these Terms periodically.",
        "Material updates will be communicated through the platform.",
      ],
    },

    {
      id: "contact",

      title: "Contact",

      content: [
        "Questions regarding these Terms may be directed to support@sympto.co.za.",
      ],
    },
  ],
};