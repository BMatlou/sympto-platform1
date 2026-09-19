import { api } from "@/lib/api";
import { SignUpSchema } from "@/schemas/auth.schema";
import type { AuthResponse } from "@/types/auth";

function unwrap<T>(response: { data: unknown }): T {
  const payload = response.data;
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as { data?: unknown }).data as T;
  }
  return payload as T;
}

function createRegistrationPayload(data: SignUpSchema) {
  const sharedFields = { accountType: data.accountType, firstName: data.firstName, lastName: data.lastName, email: data.email, phoneNumber: data.phoneNumber, country: data.country, province: data.province, city: data.city, password: data.password, confirmPassword: data.confirmPassword, agreeTerms: data.agreeTerms, agreePrivacy: data.agreePrivacy, agreePOPIA: data.agreePOPIA };
  switch (data.accountType) {
    case "INDIVIDUAL": return { ...sharedFields, preferredLanguage: data.preferredLanguage };
    case "PRACTITIONER": return { ...sharedFields, medicalAuthority: data.medicalAuthority, licenseNumber: data.licenseNumber, profession: data.profession, practiceName: data.practiceName };
    case "ORGANIZATION": return { ...sharedFields, organizationName: data.organizationName, organizationType: data.organizationType, registrationNumber: data.registrationNumber, addressLine1: data.addressLine1, postalCode: data.postalCode, website: data.website, organizationEmail: data.organizationEmail, organizationPhone: data.organizationPhone };
    default: throw new Error(`Unsupported account type: ${data.accountType}`);
  }
}

export const authService = {
  signUp: async (data: SignUpSchema) => unwrap(await api.post("/auth/register", createRegistrationPayload(data))),
  signIn: async (data: { email: string; password: string }): Promise<AuthResponse> => unwrap<AuthResponse>(await api.post("/auth/login", data)),
  logout: async () => unwrap(await api.post("/auth/logout")),
  me: async (): Promise<AuthResponse["user"]> => unwrap<AuthResponse["user"]>(await api.get("/auth/profile")),
  refresh: async (): Promise<Pick<AuthResponse, "accessToken" | "refreshToken">> => { const refreshToken = localStorage.getItem("refreshToken"); return unwrap<Pick<AuthResponse, "accessToken" | "refreshToken">>(await api.post("/auth/refresh", { refreshToken })); },
  forgotPassword: async (email: string) => unwrap(await api.post("/auth/forgot-password", { email })),
  resetPassword: async (data: { token: string; password: string }) => unwrap(await api.post("/auth/reset-password", data)),
  verifyEmail: async (token: string) => unwrap(await api.post("/auth/verify-email", { token })),
};
