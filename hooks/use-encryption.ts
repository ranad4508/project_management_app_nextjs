"use client";

import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setEncryptionPassword,
  clearEncryptionPassword,
} from "@/src/store/slices/chatSlice";
import type { RootState } from "@/src/store";

const ENCRYPTION_PASSWORD_KEY = "worksphere_encryption_password";

export const useEncryption = () => {
  const dispatch = useDispatch();
  const encryptionPassword = useSelector(
    (state: RootState) => state.chat.encryptionPassword
  );
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set password in both Redux and sessionStorage
  const setPassword = useCallback(
    (password: string): boolean => {
      if (!password || password.length < 8) {
        console.error("Password must be at least 8 characters");
        return false;
      }

      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.setItem(ENCRYPTION_PASSWORD_KEY, password);
        }
        dispatch(setEncryptionPassword(password));
        return true;
      } catch (error) {
        console.error("Error setting encryption password:", error);
        return false;
      }
    },
    [dispatch]
  );

  // Get password from Redux or sessionStorage
  const getPassword = useCallback((): string => {
    if (encryptionPassword) {
      return encryptionPassword;
    }

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const storedPassword = sessionStorage.getItem(ENCRYPTION_PASSWORD_KEY);
        if (storedPassword) {
          dispatch(setEncryptionPassword(storedPassword));
          return storedPassword;
        }
      }
    } catch (error) {
      console.error("Error getting encryption password:", error);
    }

    return "";
  }, [encryptionPassword, dispatch]);

  // Check if password is set
  const isPasswordSet = useCallback((): boolean => {
    if (!isClient) return false;

    if (encryptionPassword) {
      return true;
    }

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const storedPassword = sessionStorage.getItem(ENCRYPTION_PASSWORD_KEY);
        if (storedPassword) {
          dispatch(setEncryptionPassword(storedPassword));
          return true;
        }
      }
    } catch (error) {
      console.error("Error checking encryption password:", error);
    }

    return false;
  }, [encryptionPassword, dispatch, isClient]);

  // Clear password from both Redux and sessionStorage
  const clearPassword = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem(ENCRYPTION_PASSWORD_KEY);
      }
      dispatch(clearEncryptionPassword());
    } catch (error) {
      console.error("Error clearing encryption password:", error);
    }
  }, [dispatch]);

  return {
    setPassword,
    getPassword,
    isPasswordSet,
    clearPassword,
    isClient,
  };
};
