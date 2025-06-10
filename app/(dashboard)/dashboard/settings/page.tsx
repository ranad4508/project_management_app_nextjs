"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  useGetProfileQuery,
  useUpdateSettingsMutation,
  useChangePasswordMutation,
  useEnableMFAMutation,
  useVerifyMFAMutation,
  useDisableMFAMutation,
} from "@/src/store/api/userApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield,
  Bell,
  Palette,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const { data: profileData, isLoading, refetch } = useGetProfileQuery();
  const [updateSettings, { isLoading: isUpdatingSettings }] =
    useUpdateSettingsMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();
  const [enableMFA, { isLoading: isEnablingMFA }] = useEnableMFAMutation();
  const [verifyMFA, { isLoading: isVerifyingMFA }] = useVerifyMFAMutation();
  const [disableMFA, { isLoading: isDisablingMFA }] = useDisableMFAMutation();

  const [settings, setSettings] = useState({
    theme: "system" as "light" | "dark" | "system",
    emailNotifications: true,
    pushNotifications: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  );

  const [mfaSetup, setMfaSetup] = useState({
    isOpen: false,
    secret: "",
    qrCode: "",
    verificationCode: "",
  });

  const [disableMfaForm, setDisableMfaForm] = useState({
    isOpen: false,
    password: "",
  });

  // Update settings when profile data loads
  useEffect(() => {
    if (profileData?.data) {
      setSettings({
        theme: profileData.data.theme || "system",
        emailNotifications: profileData.data.emailNotifications ?? true,
        pushNotifications: profileData.data.pushNotifications ?? true,
      });
    }
  }, [profileData]);

  const handleSettingsChange = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updateSettings(newSettings).unwrap();
      toast.success("Settings updated successfully");
    } catch (error: any) {
      console.error("Update settings error:", error);
      toast.error(error?.data?.error || "Failed to update settings");
      // Revert the change
      setSettings(settings);
    }
  };

  const validatePassword = () => {
    const errors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters long";
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)
    ) {
      errors.newPassword =
        "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "New passwords don't match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();

      toast.success("Password changed successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    } catch (error: any) {
      console.error("Change password error:", error);
      toast.error(error?.data?.error || "Failed to change password");
    }
  };

  const handleEnableMFA = async () => {
    try {
      const result = await enableMFA().unwrap();
      setMfaSetup({
        isOpen: true,
        secret: result.secret,
        qrCode: result.qrCode,
        verificationCode: "",
      });
      toast.success(
        "MFA setup initiated. Check your email for the verification code."
      );
    } catch (error: any) {
      console.error("Enable MFA error:", error);
      toast.error(error?.data?.error || "Failed to enable MFA");
    }
  };

  const handleVerifyMFA = async () => {
    if (!mfaSetup.verificationCode || mfaSetup.verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit verification code");
      return;
    }

    try {
      await verifyMFA({ code: mfaSetup.verificationCode }).unwrap();
      toast.success("MFA enabled successfully");
      setMfaSetup({
        isOpen: false,
        secret: "",
        qrCode: "",
        verificationCode: "",
      });
      refetch(); // Refresh profile data
    } catch (error: any) {
      console.error("Verify MFA error:", error);
      toast.error(error?.data?.error || "Invalid verification code");
    }
  };

  const handleDisableMFA = async () => {
    if (!disableMfaForm.password) {
      toast.error("Please enter your password");
      return;
    }

    try {
      await disableMFA({ password: disableMfaForm.password }).unwrap();
      toast.success("MFA disabled successfully");
      setDisableMfaForm({
        isOpen: false,
        password: "",
      });
      refetch(); // Refresh profile data
    } catch (error: any) {
      console.error("Disable MFA error:", error);
      toast.error(error?.data?.error || "Failed to disable MFA");
    }
  };

  const togglePasswordVisibility = (field: keyof typeof passwordVisibility) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const profile = profileData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize how WorkSphere looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme
                </p>
              </div>
              <Select
                value={settings.theme}
                onValueChange={(value: "light" | "dark" | "system") =>
                  handleSettingsChange("theme", value)
                }
                disabled={isUpdatingSettings}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  handleSettingsChange("emailNotifications", checked)
                }
                disabled={isUpdatingSettings}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in your browser
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) =>
                  handleSettingsChange("pushNotifications", checked)
                }
                disabled={isUpdatingSettings}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profile?.mfaEnabled ? (
                  <>
                    <span className="text-sm text-green-600 font-medium">
                      Enabled
                    </span>
                    <Dialog
                      open={disableMfaForm.isOpen}
                      onOpenChange={(open) =>
                        setDisableMfaForm({ ...disableMfaForm, isOpen: open })
                      }
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Shield className="h-4 w-4 mr-2" />
                          Disable
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Disable Two-Factor Authentication
                          </DialogTitle>
                          <DialogDescription>
                            Enter your password to disable two-factor
                            authentication for your account. This will make your
                            account less secure.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="disable-mfa-password">
                              Password
                            </Label>
                            <Input
                              id="disable-mfa-password"
                              type="password"
                              value={disableMfaForm.password}
                              onChange={(e) =>
                                setDisableMfaForm({
                                  ...disableMfaForm,
                                  password: e.target.value,
                                })
                              }
                              placeholder="Enter your password"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setDisableMfaForm({
                                  isOpen: false,
                                  password: "",
                                })
                              }
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDisableMFA}
                              disabled={isDisablingMFA}
                            >
                              {isDisablingMFA ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Disabling...
                                </>
                              ) : (
                                "Disable MFA"
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleEnableMFA}
                    disabled={isEnablingMFA}
                  >
                    {isEnablingMFA ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Enable 2FA
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={passwordVisibility.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }));
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          currentPassword: "",
                        }));
                      }
                    }}
                    className={
                      passwordErrors.currentPassword ? "border-red-500" : ""
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("current")}
                  >
                    {passwordVisibility.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-500">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={passwordVisibility.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }));
                      if (passwordErrors.newPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          newPassword: "",
                        }));
                      }
                    }}
                    className={
                      passwordErrors.newPassword ? "border-red-500" : ""
                    }
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("new")}
                  >
                    {passwordVisibility.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-500">
                    {passwordErrors.newPassword}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long and contain
                  uppercase, lowercase, and numbers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={passwordVisibility.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          confirmPassword: "",
                        }));
                      }
                    }}
                    className={
                      passwordErrors.confirmPassword ? "border-red-500" : ""
                    }
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("confirm")}
                  >
                    {passwordVisibility.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* MFA Setup Dialog */}
      <Dialog
        open={mfaSetup.isOpen}
        onOpenChange={(open) => setMfaSetup({ ...mfaSetup, isOpen: open })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app or enter the
              verification code sent to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {mfaSetup.qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={mfaSetup.qrCode || "/placeholder.svg"}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                value={mfaSetup.verificationCode}
                onChange={(e) =>
                  setMfaSetup({
                    ...mfaSetup,
                    verificationCode: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6),
                  })
                }
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app or the code
                sent to your email.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setMfaSetup({
                    isOpen: false,
                    secret: "",
                    qrCode: "",
                    verificationCode: "",
                  })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyMFA}
                disabled={
                  isVerifyingMFA || mfaSetup.verificationCode.length !== 6
                }
              >
                {isVerifyingMFA ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
