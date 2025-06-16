import crypto from "crypto";
import type { EncryptionKeys, EncryptedMessage } from "@/src/types/chat.types";

export class EncryptionService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static debug: boolean = true; // Set to false in production

  /**
   * Enable or disable debug logging
   */
  static setDebug(enabled: boolean): void {
    this.debug = enabled;
    this.log(
      "🔧 Server encryption debug mode " + (enabled ? "enabled" : "disabled")
    );
  }

  /**
   * Internal logging function
   */
  private static log(...args: any[]): void {
    if (this.debug) {
      console.log(...args);
    }
  }

  // Store DH parameters to ensure consistency
  private static dhParams: { prime: Buffer; generator: Buffer } | null = null;

  /**
   * Generate Diffie-Hellman key pair
   */
  static generateDHKeyPair(): EncryptionKeys & {
    dhParams: { prime: string; generator: string };
  } {
    const startTime = performance.now();
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();

    // Store DH parameters for later use
    this.dhParams = {
      prime: dh.getPrime(),
      generator: dh.getGenerator(),
    };

    const endTime = performance.now();

    const publicKey = dh.getPublicKey("hex");
    const privateKey = dh.getPrivateKey("hex");

    // Log key generation for real-time chat
    console.log("🔑 [CHAT-ENCRYPTION] Key Generation Started");
    console.log(
      `   ⏱️  Generation Time: ${(endTime - startTime).toFixed(2)}ms`
    );
    console.log(`   📤 Public Key: ${publicKey.substring(0, 32)}...`);
    console.log(`   🔐 Private Key: [HIDDEN] (${privateKey.length} chars)`);
    console.log(`   🔧 Algorithm: Diffie-Hellman 2048-bit`);
    console.log("✅ [CHAT-ENCRYPTION] Key Generation Completed");

    return {
      publicKey,
      privateKey,
      dhParams: {
        prime: this.dhParams.prime.toString("hex"),
        generator: this.dhParams.generator.toString("hex"),
      },
    };
  }

  /**
   * Compute shared secret from DH key exchange
   */
  static computeSharedSecret(
    privateKey: string,
    otherPublicKey: string,
    dhParams?: { prime: string; generator: string }
  ): string {
    const startTime = performance.now();

    let dh: crypto.DiffieHellman;

    if (dhParams) {
      // Use provided DH parameters
      dh = crypto.createDiffieHellman(
        Buffer.from(dhParams.prime, "hex"),
        Buffer.from(dhParams.generator, "hex")
      );
    } else if (this.dhParams) {
      // Use stored DH parameters
      dh = crypto.createDiffieHellman(
        this.dhParams.prime,
        this.dhParams.generator
      );
    } else {
      // Fallback to generating new parameters (not recommended for production)
      console.log(
        "⚠️ [CHAT-ENCRYPTION] Warning: No DH parameters available, generating new ones"
      );
      dh = crypto.createDiffieHellman(2048);
    }

    dh.setPrivateKey(Buffer.from(privateKey, "hex"));

    const sharedSecret = dh.computeSecret(Buffer.from(otherPublicKey, "hex"));
    const endTime = performance.now();

    const hashedSecret = crypto
      .createHash("sha256")
      .update(sharedSecret)
      .digest("hex")
      .substring(0, this.KEY_LENGTH * 2);

    // Log key exchange for real-time chat
    console.log("🔄 [CHAT-ENCRYPTION] Key Exchange Started");
    console.log(
      `   📥 Other Public Key: ${otherPublicKey.substring(0, 32)}...`
    );
    console.log(`   ⏱️  Exchange Time: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`   🔐 Shared Secret: [HIDDEN] (${hashedSecret.length} chars)`);
    console.log(`   🔧 Method: Diffie-Hellman Key Exchange + SHA256`);
    console.log("✅ [CHAT-ENCRYPTION] Key Exchange Completed");

    return hashedSecret;
  }

  /**
   * Generate AES key from shared secret using simple hashing
   */
  static deriveAESKey(sharedSecret: string): Buffer {
    const startTime = performance.now();

    // Simple hash-based key derivation - consistent and reliable
    const key = crypto
      .createHash("sha256")
      .update(Buffer.from(sharedSecret, "hex"))
      .digest()
      .subarray(0, this.KEY_LENGTH);

    const endTime = performance.now();

    return key;
  }

  /**
   * Encrypt message content
   */
  static encryptMessage(
    content: string,
    sharedSecret: string,
    keyId: string,
    userId?: string,
    roomId?: string,
    messageId?: string
  ): EncryptedMessage {
    const startTime = performance.now();

    // Log encryption for real-time chat messages
    console.log("🔒 [REAL-TIME-CHAT] Message Encryption Started");
    console.log(`   👤 User ID: ${userId || "Not provided"}`);
    console.log(`   🏠 Room ID: ${roomId || "Not provided"}`);
    console.log(`   📨 Message ID: ${messageId || "Not provided"}`);
    console.log(`   📝 Original Content: "${content}"`);
    console.log(`   📏 Content Length: ${content.length} characters`);
    console.log(`   🔑 Key ID: ${keyId}`);
    console.log(`   🔧 Algorithm: AES-256-GCM`);

    const key = this.deriveAESKey(sharedSecret);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(keyId));

    let encrypted = cipher.update(content, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();
    const endTime = performance.now();

    const finalEncrypted = encrypted + ":" + authTag.toString("hex");

    // Log encryption results for real-time chat messages
    console.log(`   🔢 Generated IV: ${iv.toString("hex")}`);
    console.log(`   🔖 Auth Tag: ${authTag.toString("hex")}`);
    console.log(`   � Encrypted Content: ${finalEncrypted}`);
    console.log(`   � Encrypted Length: ${finalEncrypted.length} characters`);
    console.log(
      `   ⏱️  Encryption Time: ${(endTime - startTime).toFixed(2)}ms`
    );
    console.log("✅ [REAL-TIME-CHAT] Message Encryption Completed");

    return {
      encryptedContent: finalEncrypted,
      iv: iv.toString("hex"),
      keyId,
    };
  }

  /**
   * Decrypt message content using simple hashing
   */
  static decryptMessage(
    encryptedMessage: EncryptedMessage,
    sharedSecret: string,
    userId?: string,
    roomId?: string,
    messageId?: string
  ): string {
    const startTime = performance.now();

    // Log decryption for real-time chat messages
    console.log("🔓 [REAL-TIME-CHAT] Message Decryption Started");
    console.log(`   👤 User ID: ${userId || "Not provided"}`);
    console.log(`   🏠 Room ID: ${roomId || "Not provided"}`);
    console.log(`   📨 Message ID: ${messageId || "Not provided"}`);
    console.log(
      `   📦 Encrypted Content: ${encryptedMessage.encryptedContent}`
    );
    console.log(
      `   📊 Encrypted Length: ${encryptedMessage.encryptedContent.length} characters`
    );
    console.log(`   🔢 IV: ${encryptedMessage.iv}`);
    console.log(`   🔑 Key ID: ${encryptedMessage.keyId}`);
    console.log(`   � Algorithm: AES-256-GCM`);

    const key = this.deriveAESKey(sharedSecret);
    const iv = Buffer.from(encryptedMessage.iv, "hex");
    const [encryptedContent, authTagHex] =
      encryptedMessage.encryptedContent.split(":");
    const authTag = Buffer.from(authTagHex, "hex");

    try {
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from(encryptedMessage.keyId));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedContent, "hex", "utf8");
      decrypted += decipher.final("utf8");
      const endTime = performance.now();

      // Log decryption results for real-time chat messages
      console.log(`   � Auth Tag: ${authTagHex}`);
      console.log(`   📝 Decrypted Content: "${decrypted}"`);
      console.log(`   📏 Decrypted Length: ${decrypted.length} characters`);
      console.log(
        `   ⏱️  Decryption Time: ${(endTime - startTime).toFixed(2)}ms`
      );
      console.log("✅ [REAL-TIME-CHAT] Message Decryption Completed");

      return decrypted;
    } catch (error) {
      const endTime = performance.now();
      console.log(
        `❌ [REAL-TIME-CHAT] Decryption Failed: ${(error as Error).message}`
      );
      console.log(`   ⏱️  Failed After: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`   🔍 Key ID: ${encryptedMessage.keyId}`);
      console.log(`   🔍 IV: ${encryptedMessage.iv}`);
      console.log("❌ [REAL-TIME-CHAT] Message Decryption Failed");
      return "[Encrypted message - unable to decrypt]";
    }
  }

  /**
   * Encrypt file
   */
  static encryptFile(
    fileBuffer: Buffer,
    sharedSecret: string,
    keyId: string
  ): { encryptedBuffer: Buffer; iv: string } {
    this.log("🔒 Encrypting file");
    this.log(`📊 Original file size: ${fileBuffer.length} bytes`);
    this.log(`🔑 Using key ID: ${keyId}`);

    const key = this.deriveAESKey(sharedSecret);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    this.log(`🔢 Generated IV: ${iv.toString("hex")}`);

    const startTime = performance.now();
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(keyId));

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    const endTime = performance.now();

    this.log(`✅ File encrypted in ${(endTime - startTime).toFixed(2)}ms`);
    this.log(`📊 Encrypted file size: ${encrypted.length} bytes`);

    return {
      encryptedBuffer: encrypted,
      iv: iv.toString("hex"),
    };
  }

  /**
   * Decrypt file
   */
  static decryptFile(
    encryptedBuffer: Buffer,
    iv: string,
    sharedSecret: string,
    keyId: string
  ): Buffer {
    this.log("🔓 Decrypting file");
    this.log(`📊 Encrypted file size: ${encryptedBuffer.length} bytes`);
    this.log(`🔢 IV: ${iv}`);
    this.log(`🔑 Key ID: ${keyId}`);

    const key = this.deriveAESKey(sharedSecret);
    const ivBuffer = Buffer.from(iv, "hex");

    const authTag = encryptedBuffer.subarray(-16);
    const encrypted = encryptedBuffer.subarray(0, -16);

    this.log(`🔖 Auth tag length: ${authTag.length} bytes`);
    this.log(`📊 Encrypted content length: ${encrypted.length} bytes`);

    try {
      const startTime = performance.now();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
      decipher.setAAD(Buffer.from(keyId));
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      const endTime = performance.now();

      this.log(`✅ File decrypted in ${(endTime - startTime).toFixed(2)}ms`);
      this.log(`📊 Decrypted file size: ${decrypted.length} bytes`);

      return decrypted;
    } catch (error) {
      this.log(`❌ File decryption failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Generate room encryption key ID
   */
  static generateKeyId(): string {
    const keyId = crypto.randomBytes(16).toString("hex");
    this.log(`🔑 Generated key ID: ${keyId}`);
    return keyId;
  }

  /**
   * Hash password for room access
   */
  static hashPassword(password: string): string {
    this.log(`🔒 Hashing password`);
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    this.log(`✅ Password hashed`);
    return hash;
  }
}
