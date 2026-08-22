import { api } from "@/lib/api";
import { SignUpSchema } from "@/schemas/auth.schema";

function unwrap<T>(response: { data: { data?: T } | T }): T {
  const payload = response.data;
  return typeof payload === "object" && payload !== null && "data" in payload
    ? payload.data as T
    : payload as T;
}

function createRegistrationPayload(data: SignUpSchema) {
  const sharedFields = {
    accountType: data.accountType,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    country: data.country,
    province: data.province,
    city: data.city,
    password: data.password,
    confirmPassword: data.confirmPassword,
    agreeTerms: data.agreeTerms,
    agreePrivacy: data.agreePrivacy,
    agreePOPIA: data.agreePOPIA,
  };

  switch (data.accountType) {
    case "INDIVIDUAL":
      return {
        ...sharedFields,
        preferredLanguage: data.preferredLanguage,
      };

    case "PRACTITIONER":
      return {
        ...sharedFields,
        medicalAuthority: data.medicalAuthority,
        licenseNumber: data.licenseNumber,
        profession: data.profession,
        practiceName: data.practiceName,
      };

    case "ORGANIZATION":
      return {
        ...sharedFields,
        organizationName: data.organizationName,
        organizationType: data.organizationType,
        registrationNumber: data.registrationNumber,
        addressLine1: data.addressLine1,
        postalCode: data.postalCode,
        website: data.website,
        organizationEmail: data.organizationEmail,
        organizationPhone: data.organizationPhone,
      };

    default:
      throw new Error(`Unsupported account type: ${data.accountType}`);
  }
}

export const authService = {
  signUp: async (data: SignUpSchema) => {
    const response = await api.post(
      "/auth/register",
      createRegistrationPayload(data),
    );
    return unwrap(response);
  },

  signIn: async (data: {
    email: string;
    password: string;
  }) => {
    const response = await api.post("/auth/login", data);
    return unwrap(response);
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return unwrap(response);
  },

  me: async () => {
    const response = await api.get("/auth/profile");
    return unwrap(response);
  },

  refresh: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await api.post("/auth/refresh", { refreshToken });
    return unwrap(response);
  },
};
