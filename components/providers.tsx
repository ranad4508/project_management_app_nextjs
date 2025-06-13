"use client";

import type React from "react";

import { SessionProvider } from "@/components/providers/SessionProvider";

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
    <SessionProvider>
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
