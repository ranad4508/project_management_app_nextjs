import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { EncryptionProvider } from "@/components/chat/EncryptionContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WorkSphere - Project Management Platform",
  description: "A comprehensive project management platform for teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={null}>
          <EncryptionProvider>
            {children}
            <Toaster position="top-right" />
          </EncryptionProvider>
        </Providers>
      </body>
    </html>
  );
}
