"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useEncryptionContext } from "./EncryptionContext";
import { toast } from "sonner";

interface EncryptionSetupProps {
  isLoading: boolean;
  onSubmit: (password: string) => void;
}

export default function EncryptionSetup({
  isLoading,
  onSubmit,
}: EncryptionSetupProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isNewPassword, setIsNewPassword] = useState(false);
  const { verifyPassword, isClient } = useEncryptionContext();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chat_encryption_data");
      setIsNewPassword(!stored);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        onSubmit(password);
      } else {
        toast.error("Invalid password. Please try again.");
      }
    } catch (error) {
      toast.error("Failed to verify password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNewPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    onSubmit(password);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isNewPassword ? "Set Up Encryption" : "Unlock Chat"}
          </h2>
          <p className="text-sm text-gray-600">
            {isNewPassword
              ? "Create a password to secure your chat messages"
              : "Enter your password to access encrypted messages"}
          </p>
        </div>

        <form onSubmit={isNewPassword ? handleNewPassword : handleVerify}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                {isNewPassword ? "Create Password" : "Password"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isNewPassword
                      ? "Create a strong password"
                      : "Enter your password"
                  }
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isNewPassword && (
                <p className="text-xs text-gray-500 mt-1">
                  Password will expire after 24 hours for security
                </p>
              )}
            </div>

            {isNewPassword && (
              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || isVerifying}
              className="w-full"
            >
              {isLoading || isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isVerifying ? "Verifying..." : "Setting up..."}
                </>
              ) : isNewPassword ? (
                "Set Password & Continue"
              ) : (
                "Unlock Chat"
              )}
            </Button>
          </div>
        </form>

        {isNewPassword && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>Important:</strong> Remember your password! We cannot
              recover it if lost. Your password secures your chat messages with
              end-to-end encryption.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
