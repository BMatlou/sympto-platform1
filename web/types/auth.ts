export type AccountType = "INDIVIDUAL" | "PRACTITIONER" | "ORGANIZATION";

export interface SignUpRequest {
  accountType: AccountType;

  firstName: string;
  lastName: string;

  email: string;
  phoneNumber: string;

  password: string;
  confirmPassword: string;

  // Practitioner only
  hpcsaNumber?: string;
  profession?: string;
  practiceName?: string;

  // Organization only
  organizationName?: string;
  organizationType?: string;
  registrationNumber?: string;
  addressLine1?: string;
  postalCode?: string;
  website?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminEmail?: string;
  adminPhone?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;

  user: {
    id: string;
    email: string;

    firstName: string;
    lastName: string;

    accountType: AccountType;
  };
}