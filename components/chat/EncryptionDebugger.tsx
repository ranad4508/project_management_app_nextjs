"use client";

import { useState, useEffect } from "react";
import { ClientEncryptionService } from "@/src/services/client-encryption.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
  Lock,
  Unlock,
} from "lucide-react";

export function EncryptionDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    keyPairs: number;
    sharedSecrets: number;
    roomIds: string[];
  }>({ keyPairs: 0, sharedSecrets: 0, roomIds: [] });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    time: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isOpen) {
        setDebugInfo(ClientEncryptionService.getDebugInfo());
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const runEncryptionTest = () => {
    try {
      const startTime = performance.now();

      // Generate test key pair
      const roomId = "test-room-" + Date.now();
      const keyPair = ClientEncryptionService.generateRoomKeyPair(roomId);

      // Simulate another user's key pair
      const otherKeyPair = ClientEncryptionService.generateRoomKeyPair(
        "other-" + roomId
      );

      // Compute shared secret
      const sharedSecret = ClientEncryptionService.computeSharedSecret(
        roomId,
        otherKeyPair.publicKey
      );

      // Test message
      const originalMessage =
        "This is a test message for encryption debugging: " + Date.now();
      const keyId = "test-key-" + Date.now();

      // Encrypt
      const encrypted = ClientEncryptionService.encryptMessage(
        roomId,
        originalMessage,
        keyId
      );

      // Decrypt
      const decrypted = ClientEncryptionService.decryptMessage(
        roomId,
        encrypted
      );

      // Verify
      const success = originalMessage === decrypted;
      const endTime = performance.now();

      // Clean up
      ClientEncryptionService.clearRoomData(roomId);
      ClientEncryptionService.clearRoomData("other-" + roomId);

      setTestResult({
        success,
        message: success
          ? `Successfully encrypted and decrypted message (${originalMessage.length} chars)`
          : `Decryption failed! Original: "${originalMessage}" vs Decrypted: "${decrypted}"`,
        time: endTime - startTime,
      });

      setDebugInfo(ClientEncryptionService.getDebugInfo());
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error: ${(error as Error).message}`,
        time: 0,
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Encryption Debugger
          </CardTitle>
          <CollapsibleTrigger asChild onClick={() => setIsOpen(!isOpen)}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
      </CardHeader>
      <Collapsible open={isOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span className="text-sm">Key Pairs:</span>
                  <Badge variant="outline">{debugInfo.keyPairs}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Shared Secrets:</span>
                  <Badge variant="outline">{debugInfo.sharedSecrets}</Badge>
                </div>
              </div>

              {debugInfo.roomIds.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Active Room IDs:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {debugInfo.roomIds.map((roomId) => (
                      <Badge
                        key={roomId}
                        variant="secondary"
                        className="text-xs"
                      >
                        {roomId.length > 15
                          ? roomId.substring(0, 15) + "..."
                          : roomId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={runEncryptionTest}
                  size="sm"
                  className="w-full"
                >
                  Run Encryption Test
                </Button>

                {testResult && (
                  <div
                    className={`p-2 rounded text-sm ${
                      testResult.success
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {testResult.success ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                      <span>{testResult.success ? "Success" : "Failed"}</span>
                      <Badge variant="outline">
                        {testResult.time.toFixed(2)}ms
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs">{testResult.message}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
