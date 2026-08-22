import { LegalDocument } from "@/types/legal";

export const PRIVACY_DOCUMENT: LegalDocument = {
  title: "Sympto Privacy Policy",

  version: "1.0",

  effectiveDate: "01 January 2026",

  lastUpdated: "01 January 2026",

  sections: [
    {
      id: "overview",

      title: "Overview",

      content: [
        "Your privacy is important to Sympto.",
        "This Privacy Policy explains how we collect, use, store, disclose and protect your personal information.",
        "By using Sympto, you consent to the practices described in this Privacy Policy.",
      ],
    },

    {
      id: "information-collected",

      title: "Information We Collect",

      content: [
        "Personal identification information such as your name, email address, mobile number and location.",
        "Organization details and administrator contact information for organizational accounts.",
        "Healthcare practitioner registration details where applicable.",
        "Medical information that you voluntarily provide.",
        "Appointment history and communication records.",
        "Device information including browser type, operating system and IP address.",
      ],
    },

    {
      id: "organization-accounts",

      title: "Organization Accounts",

      content: [
        "We collect organization profile details and administrator contact information when organizations register.",
        "This information is used to manage organizational access, verify credentials, and support account administration.",
        "Organization administrators may be contacted for service and compliance purposes.",
      ],
    },

    {
      id: "how-we-use",

      title: "How We Use Your Information",

      content: [
        "To create and manage your Sympto account.",
        "To verify and administer organization accounts and administrator access.",
        "To connect patients with verified healthcare practitioners.",
        "To improve our services.",
        "To communicate important service notifications.",
        "To comply with applicable healthcare and legal obligations.",
      ],
    },

    {
      id: "sharing",

      title: "Sharing Your Information",

      content: [
        "We only share information when necessary to provide healthcare services.",
        "Healthcare practitioners can only access information required to deliver care.",
        "We may share information when required by law or regulatory authorities.",
        "We do not sell your personal information.",
      ],
    },

    {
      id: "security",

      title: "Security",

      content: [
        "Sympto uses industry-standard encryption and security controls.",
        "Access to personal information is restricted to authorised personnel.",
        "We continuously monitor and improve our security practices.",
      ],
    },

    {
      id: "retention",

      title: "Data Retention",

      content: [
        "We retain personal information only as long as necessary for healthcare, legal and regulatory purposes.",
        "Some healthcare records may be retained for legally required periods even after account deletion.",
      ],
    },

    {
      id: "your-rights",

      title: "Your Rights",

      content: [
        "You may request access to your personal information.",
        "You may request correction of inaccurate information.",
        "You may request deletion where legally permissible.",
        "You may withdraw consent where processing relies on consent.",
      ],
    },

    {
      id: "international",

      title: "International Users",

      content: [
        "Sympto serves users across multiple countries.",
        "Where data is transferred internationally, appropriate safeguards are implemented to protect your information.",
      ],
    },

    {
      id: "cookies",

      title: "Cookies",

      content: [
        "We use cookies and similar technologies to improve your experience, remember preferences and analyse platform usage.",
      ],
    },

    {
      id: "changes",

      title: "Changes to this Policy",

      content: [
        "We may update this Privacy Policy from time to time.",
        "Material changes will be communicated through the platform.",
      ],
    },

    {
      id: "contact",

      title: "Contact",

      content: [
        "Questions about privacy may be sent to support@sympto.co.za.",
      ],
    },
  ],
};