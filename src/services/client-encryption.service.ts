"use client";

import { EncryptionService } from "./encryption.service";

export class ClientEncryptionService {
  private static keyPairs: Map<
    string,
    { publicKey: string; privateKey: string }
  > = new Map();
  private static sharedSecrets: Map<string, string> = new Map();
  private static debug: boolean = true; // Set to false in production

  /**
   * Enable or disable debug logging
   */
  static setDebug(enabled: boolean): void {
    this.debug = enabled;
    this.log("🔧 Debug mode " + (enabled ? "enabled" : "disabled"));
  }

  /**
   * Internal logging function
   */
  private static log(...args: any[]): void {
    if (this.debug) {
      console.log(...args);
    }
  }

  /**
   * Generate key pair for a room
   */
  static generateRoomKeyPair(roomId: string): {
    publicKey: string;
    privateKey: string;
  } {
    this.log(`🔑 Generating key pair for room: ${roomId}`);

    const startTime = performance.now();
    const keyPair = EncryptionService.generateDHKeyPair();
    const endTime = performance.now();

    this.log(`✅ Key pair generated in ${(endTime - startTime).toFixed(2)}ms`);
    this.log(`📤 Public key: ${keyPair.publicKey.substring(0, 20)}...`);
    this.log(
      `🔐 Private key: ${keyPair.privateKey.substring(0, 10)}... (hidden)`
    );

    this.keyPairs.set(roomId, keyPair);

    // Debug info about stored keys
    this.log(`📊 Total key pairs stored: ${this.keyPairs.size}`);
    return keyPair;
  }

  /**
   * Compute shared secret with another user
   */
  static computeSharedSecret(roomId: string, otherPublicKey: string): string {
    this.log(`🔄 Computing shared secret for room: ${roomId}`);
    this.log(
      `📥 Using other public key: ${otherPublicKey.substring(0, 20)}...`
    );

    const keyPair = this.keyPairs.get(roomId);
    if (!keyPair) {
      const error = `❌ No key pair found for room: ${roomId}`;
      this.log(error);
      throw new Error(error);
    }

    const startTime = performance.now();
    const sharedSecret = EncryptionService.computeSharedSecret(
      keyPair.privateKey,
      otherPublicKey
    );
    const endTime = performance.now();

    this.log(
      `✅ Shared secret computed in ${(endTime - startTime).toFixed(2)}ms`
    );
    this.log(`🔐 Shared secret: ${sharedSecret.substring(0, 10)}... (hidden)`);

    this.sharedSecrets.set(`${roomId}-shared`, sharedSecret);

    // Debug info about stored secrets
    this.log(`📊 Total shared secrets stored: ${this.sharedSecrets.size}`);
    return sharedSecret;
  }

  /**
   * Encrypt message for sending
   */
  static encryptMessage(roomId: string, content: string, keyId: string): any {
    this.log(`🔒 Encrypting message for room: ${roomId}`);
    this.log(`📝 Original content length: ${content.length} chars`);

    const sharedSecret = this.sharedSecrets.get(`${roomId}-shared`);
    if (!sharedSecret) {
      const error = `❌ No shared secret found for room: ${roomId}`;
      this.log(error);
      throw new Error(error);
    }

    const startTime = performance.now();
    const encryptedMessage = EncryptionService.encryptMessage(
      content,
      sharedSecret,
      keyId
    );
    const endTime = performance.now();

    this.log(`✅ Message encrypted in ${(endTime - startTime).toFixed(2)}ms`);
    this.log(`🔑 Using key ID: ${keyId}`);
    this.log(
      `📊 Encrypted content length: ${encryptedMessage.encryptedContent.length} chars`
    );
    this.log(`🔢 IV: ${encryptedMessage.iv}`);

    return encryptedMessage;
  }

  /**
   * Decrypt received message
   */
  static decryptMessage(roomId: string, encryptedMessage: any): string {
    this.log(`🔓 Decrypting message for room: ${roomId}`);
    this.log(`📦 Encrypted input: ${encryptedMessage.encryptedContent}`);
    this.log(
      `📊 Encrypted content length: ${encryptedMessage.encryptedContent.length} chars`
    );
    this.log(`🔢 IV: ${encryptedMessage.iv}`);
    this.log(`🔑 Key ID: ${encryptedMessage.keyId}`);
    this.log(`🔍 Looking up shared secret for room: ${roomId}`);

    const sharedSecret = this.sharedSecrets.get(`${roomId}-shared`);
    if (!sharedSecret) {
      const error = `❌ No shared secret found for room: ${roomId}`;
      this.log(error);
      throw new Error(error);
    }

    this.log(`🔐 Found shared secret: ${sharedSecret.substring(0, 16)}...`);
    this.log(`🚀 Starting client-side decryption process...`);

    try {
      const startTime = performance.now();
      const decryptedContent = EncryptionService.decryptMessage(
        encryptedMessage,
        sharedSecret
      );
      const endTime = performance.now();

      this.log(`✅ Message decrypted in ${(endTime - startTime).toFixed(2)}ms`);
      this.log(`📝 Decrypted content: "${decryptedContent}"`);
      this.log(`📝 Decrypted content length: ${decryptedContent.length} chars`);
      this.log(`🎉 Client decryption process completed successfully!`);
      this.log(`📋 Final client decrypted output: "${decryptedContent}"`);
      this.log(`🔓 Client decryption summary:`);
      this.log(`   🏠 Room: ${roomId}`);
      this.log(
        `   📦 Input: ${encryptedMessage.encryptedContent.substring(0, 20)}...`
      );
      this.log(`   📝 Output: "${decryptedContent}"`);
      this.log(`   ⏱️  Time: ${(endTime - startTime).toFixed(2)}ms`);
      this.log(`   🔑 Key ID: ${encryptedMessage.keyId}`);

      return decryptedContent;
    } catch (error) {
      this.log(`❌ Decryption failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get public key for a room
   */
  static getPublicKey(roomId: string): string | null {
    this.log(`🔍 Getting public key for room: ${roomId}`);

    const keyPair = this.keyPairs.get(roomId);
    if (!keyPair) {
      this.log(`⚠️ No key pair found for room: ${roomId}`);
      return null;
    }

    this.log(`✅ Found public key: ${keyPair.publicKey.substring(0, 20)}...`);
    return keyPair.publicKey;
  }

  /**
   * Clear encryption data for a room
   */
  static clearRoomData(roomId: string): void {
    this.log(`🧹 Clearing encryption data for room: ${roomId}`);

    this.keyPairs.delete(roomId);
    this.sharedSecrets.delete(`${roomId}-shared`);

    this.log(`✅ Encryption data cleared`);
    this.log(`📊 Remaining key pairs: ${this.keyPairs.size}`);
    this.log(`📊 Remaining shared secrets: ${this.sharedSecrets.size}`);
  }

  /**
   * Get debug info about current encryption state
   */
  static getDebugInfo(): {
    keyPairs: number;
    sharedSecrets: number;
    roomIds: string[];
  } {
    const roomIds = Array.from(this.keyPairs.keys());

    return {
      keyPairs: this.keyPairs.size,
      sharedSecrets: this.sharedSecrets.size,
      roomIds,
    };
  }
}
