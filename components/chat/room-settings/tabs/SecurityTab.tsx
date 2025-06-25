"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { TabProps } from "../types";
import { regenerateEncryptionKeys } from "@/src/lib/api/room-settings";

interface SecurityTabProps extends TabProps {
  isOwner: boolean;
  isAdmin: boolean;
}

export default function SecurityTab({
  room,
  currentUser,
  onRoomUpdate,
  isOwner,
  isAdmin,
}: SecurityTabProps) {
  const [isLoading, setIsLoading] = useState(false);

  const canManageSecurity = isOwner || isAdmin; // Owners and admins can manage security settings

  const handleEncryptionToggle = async (enabled: boolean) => {
    if (!onRoomUpdate || !canManageSecurity) return;

    setIsLoading(true);
    try {
      await onRoomUpdate(room._id, {
        isEncrypted: enabled,
      });

      toast.success(
        enabled
          ? "End-to-end encryption has been enabled"
          : "End-to-end encryption has been disabled"
      );
    } catch (error) {
      toast.error("Failed to update encryption settings");
      console.error("Error updating encryption:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!canManageSecurity) return;

    const confirmed = window.confirm(
      `Are you sure you want to regenerate encryption keys for "${room.name}"?\n\n` +
        "This will make all existing encrypted messages unreadable. " +
        "Only new messages will be encrypted with the new keys. " +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await regenerateEncryptionKeys(room._id);
      toast.success("Encryption keys have been regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate encryption keys");
      console.error("Error regenerating keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Encryption Settings</span>
          </CardTitle>
          <CardDescription>
            Manage end-to-end encryption for this room
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>End-to-End Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Encrypt all messages in this room for maximum security
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={room.isEncrypted || false}
                onCheckedChange={handleEncryptionToggle}
                disabled={!canManageSecurity || isLoading}
              />
              {room.isEncrypted && (
                <Badge variant="secondary" className="text-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Encrypted
                </Badge>
              )}
            </div>
          </div>

          {room.isEncrypted && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Encryption Key ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {room.encryptionKeyId || "Not available"}
                  </p>
                </div>
                <Badge variant="outline">
                  <Key className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>

              {canManageSecurity && (
                <div className="space-y-4 pt-4 border-t border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-red-600">
                        Regenerate Encryption Keys
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Generate new encryption keys. This will make old
                        messages unreadable.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRegenerateKeys}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {isLoading ? "Regenerating..." : "Regenerate Keys"}
                    </Button>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Warning: Key Regeneration
                      </p>
                      <p className="text-sm text-red-700">
                        Regenerating encryption keys will make all existing
                        encrypted messages unreadable. Only new messages will be
                        encrypted with the new keys. This action cannot be
                        undone.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                End-to-End Encryption
              </p>
              <p className="text-sm text-blue-700">
                When enabled, messages are encrypted on your device and can only
                be decrypted by room members. Even the server cannot read your
                messages.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Key Management
              </p>
              <p className="text-sm text-amber-700">
                Regenerating encryption keys will make old messages unreadable.
                Only do this if you suspect your keys have been compromised.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
