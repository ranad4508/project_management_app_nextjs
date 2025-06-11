// /app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Import your providers here
// import GoogleProvider from 'next-auth/providers/google';
// import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    // Add your providers here
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // CredentialsProvider({
    //   name: 'credentials',
    //   credentials: {
    //     email: { label: 'Email', type: 'email' },
    //     password: { label: 'Password', type: 'password' }
    //   },
    //   async authorize(credentials) {
    //     // Add your authentication logic here
    //     return null;
    //   }
    // })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Custom handler to ensure proper JSON responses
async function handler(req: NextRequest, context: any) {
  try {
    const response = await NextAuth(req as any, context, authOptions);

    // Ensure we always return a proper Response object
    if (response instanceof Response) {
      return response;
    }

    // If it's not a Response object, wrap it
    return NextResponse.json(response || null, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("NextAuth handler error:", error);

    // Return proper JSON error response
    return NextResponse.json(
      { error: "Authentication error" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export { handler as GET, handler as POST };

// /middleware.ts (if you need custom middleware)
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Define your authorization logic
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/chat/:path*", "/api/chat/:path*"],
};
