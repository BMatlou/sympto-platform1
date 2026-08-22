export interface UserResponse {
  id: string;
  email: string;
  username?: string | null;
  phoneNumber?: string | null;
  userType: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;

  person: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    preferredName?: string | null;
  };
}