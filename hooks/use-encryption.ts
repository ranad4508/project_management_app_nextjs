import { useState, useEffect, useCallback } from "react";
import CryptoJS from "crypto-js";

interface EncryptionData {
  hash: string;
  timestamp: number;
}

export function useEncryption() {
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    checkExistingPassword();
  }, []);

  const checkExistingPassword = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("chat_encryption_data");
      if (stored) {
        const data: EncryptionData = JSON.parse(stored);
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        // Check if password has expired (1 day)
        if (now - data.timestamp > dayInMs) {
          localStorage.removeItem("chat_encryption_data");
          setIsPasswordSet(false);
          setCurrentPassword(null);
        } else {
          setIsPasswordSet(true);
        }
      } else {
        setIsPasswordSet(false);
      }
    } catch (error) {
      console.error("Error checking existing password:", error);
      localStorage.removeItem("chat_encryption_data");
      setIsPasswordSet(false);
    }
  }, []);

  const setPassword = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        const hash = CryptoJS.SHA256(password).toString();
        const encryptionData: EncryptionData = {
          hash,
          timestamp: Date.now(),
        };

        localStorage.setItem(
          "chat_encryption_data",
          JSON.stringify(encryptionData)
        );
        setCurrentPassword(password);
        setIsPasswordSet(true);
        return true;
      } catch (error) {
        console.error("Error setting password:", error);
        return false;
      }
    },
    []
  );

  const verifyPassword = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        const stored = localStorage.getItem("chat_encryption_data");
        if (!stored) return false;

        const data: EncryptionData = JSON.parse(stored);
        const inputHash = CryptoJS.SHA256(password).toString();

        if (inputHash === data.hash) {
          setCurrentPassword(password);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error verifying password:", error);
        return false;
      }
    },
    []
  );

  const clearPassword = useCallback(() => {
    localStorage.removeItem("chat_encryption_data");
    setIsPasswordSet(false);
    setCurrentPassword(null);
  }, []);

  const getSessionKey = useCallback(async (): Promise<string | undefined> => {
    if (!currentPassword) return undefined;

    try {
      // Generate a session key based on the current password
      return CryptoJS.SHA256(currentPassword + Date.now().toString())
        .toString()
        .substring(0, 32);
    } catch (error) {
      console.error("Error generating session key:", error);
      return undefined;
    }
  }, [currentPassword]);

  return {
    isPasswordSet,
    isClient,
    setPassword,
    clearPassword,
    verifyPassword,
    getSessionKey,
  };
}
