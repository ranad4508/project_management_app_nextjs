"use client";

import type React from "react";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ReduxProvider } from "@/src/providers/redux-provider";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  return (
    <SessionProvider
      session={session}
      // Reduce refetch interval to prevent unnecessary requests
      refetchInterval={5 * 60} // 5 minutes
      refetchOnWindowFocus={false}
    >
      <ReduxProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
