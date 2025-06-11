import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "@/src/models/user";
import { AuthService } from "@/src/services/auth.service";
import Database from "@/src/config/database";

const authService = new AuthService();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        try {
          await Database.connect();

          const result = await authService.login({
            email: credentials.email,
            password: credentials.password,
            mfaCode: credentials.mfaCode,
          });

          if (result.requiresMfa) {
            throw new Error("MFA_REQUIRED");
          }

          // Update last login
          await User.findByIdAndUpdate(result.user.id, {
            lastLoginAt: new Date(),
          });

          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            isVerified: result.user.isVerified,
            mfaEnabled: result.user.mfaEnabled,
          };
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.isVerified = user.isVerified;
        token.mfaEnabled = user.mfaEnabled;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.isVerified = token.isVerified;
        session.user.mfaEnabled = token.mfaEnabled;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
