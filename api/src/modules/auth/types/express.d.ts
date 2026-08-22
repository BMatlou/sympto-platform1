import { UserType } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      sub: string;
      email: string;
      userType: UserType;
      iat: number;
      exp: number;
    }
  }
}

export {};