import "next-auth";
import { UserRole } from "@/src/enums/user.enum";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
      isVerified?: boolean;
      mfaEnabled?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
    isVerified?: boolean;
    mfaEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: UserRole;
    isVerified?: boolean;
    mfaEnabled?: boolean;
  }
}
