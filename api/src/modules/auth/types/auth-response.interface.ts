export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    userType: string;
    person: {
      firstName: string;
      lastName: string;
      preferredName?: string | null;
    };
  };
}
