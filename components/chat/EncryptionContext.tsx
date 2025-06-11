"use client";

import { createContext, useContext, ReactNode } from "react";
import { useEncryption } from "@/hooks/use-encryption";

interface EncryptionContextType {
  isPasswordSet: boolean;
  isClient: boolean;
  setPassword: (password: string) => Promise<boolean>;
  clearPassword: () => void;
  verifyPassword: (password: string) => Promise<boolean>;
  getSessionKey: () => Promise<string | undefined>;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(
  undefined
);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const encryption = useEncryption();
  return (
    <EncryptionContext.Provider value={encryption}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryptionContext() {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error(
      "useEncryptionContext must be used within an EncryptionProvider"
    );
  }
  return context;
}
