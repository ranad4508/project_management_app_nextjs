"use client";

import type React from "react";

import { SessionProvider } from "@/components/providers/SessionProvider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { SocketProvider } from "@/contexts/socket-context";
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
        <SWRProvider>
          <SocketProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </SocketProvider>
        </SWRProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
