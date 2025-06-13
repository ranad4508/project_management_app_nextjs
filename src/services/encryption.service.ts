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

  /**
   * Generate Diffie-Hellman key pair
   */
  static generateDHKeyPair(): EncryptionKeys {
    this.log("🔑 Generating Diffie-Hellman key pair");

    const startTime = performance.now();
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();
    const endTime = performance.now();

    const publicKey = dh.getPublicKey("hex");
    const privateKey = dh.getPrivateKey("hex");

    this.log(
      `✅ DH key pair generated in ${(endTime - startTime).toFixed(2)}ms`
    );
    this.log(`📤 Public key: ${publicKey.substring(0, 20)}...`);
    this.log(`🔐 Private key: ${privateKey.substring(0, 10)}... (hidden)`);

    return {
      publicKey,
      privateKey,
    };
  }

  /**
   * Compute shared secret from DH key exchange
   */
  static computeSharedSecret(
    privateKey: string,
    otherPublicKey: string
  ): string {
    this.log("🔄 Computing shared secret");
    this.log(
      `📥 Using other public key: ${otherPublicKey.substring(0, 20)}...`
    );

    const startTime = performance.now();
    const dh = crypto.createDiffieHellman(2048);
    dh.setPrivateKey(Buffer.from(privateKey, "hex"));

    const sharedSecret = dh.computeSecret(Buffer.from(otherPublicKey, "hex"));
    const endTime = performance.now();

    const hashedSecret = crypto
      .createHash("sha256")
      .update(sharedSecret)
      .digest("hex")
      .substring(0, this.KEY_LENGTH * 2);

    this.log(
      `✅ Shared secret computed in ${(endTime - startTime).toFixed(2)}ms`
    );
    this.log(
      `🔐 Shared secret hash: ${hashedSecret.substring(0, 10)}... (hidden)`
    );

    return hashedSecret;
  }

  /**
   * Generate AES key from shared secret
   */
  static deriveAESKey(sharedSecret: string, salt?: string): Buffer {
    this.log("🔑 Deriving AES key from shared secret");

    const startTime = performance.now();
    const saltBuffer = salt ? Buffer.from(salt, "hex") : crypto.randomBytes(16);

    const key = crypto.pbkdf2Sync(
      Buffer.from(sharedSecret, "hex"),
      saltBuffer,
      100000,
      this.KEY_LENGTH,
      "sha256"
    );
    const endTime = performance.now();

    this.log(`✅ AES key derived in ${(endTime - startTime).toFixed(2)}ms`);
    this.log(`🧂 Salt: ${saltBuffer.toString("hex")}`);

    return key;
  }

  /**
   * Encrypt message content
   */
  static encryptMessage(
    content: string,
    sharedSecret: string,
    keyId: string
  ): EncryptedMessage {
    this.log("🔒 Encrypting message");
    this.log(`📝 Original content length: ${content.length} chars`);
    this.log(`🔑 Using key ID: ${keyId}`);

    const key = this.deriveAESKey(sharedSecret);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    this.log(`🔢 Generated IV: ${iv.toString("hex")}`);

    const startTime = performance.now();
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(keyId));

    let encrypted = cipher.update(content, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();
    const endTime = performance.now();

    this.log(`✅ Message encrypted in ${(endTime - startTime).toFixed(2)}ms`);
    this.log(`📊 Encrypted content length: ${encrypted.length} chars`);
    this.log(`🔖 Auth tag: ${authTag.toString("hex")}`);

    return {
      encryptedContent: encrypted + ":" + authTag.toString("hex"),
      iv: iv.toString("hex"),
      keyId,
    };
  }

  /**
   * Decrypt message content
   */
  static decryptMessage(
    encryptedMessage: EncryptedMessage,
    sharedSecret: string
  ): string {
    this.log("🔓 Decrypting message");
    this.log(
      `📊 Encrypted content length: ${encryptedMessage.encryptedContent.length} chars`
    );
    this.log(`🔢 IV: ${encryptedMessage.iv}`);
    this.log(`🔑 Key ID: ${encryptedMessage.keyId}`);

    const key = this.deriveAESKey(sharedSecret);
    const iv = Buffer.from(encryptedMessage.iv, "hex");

    const [encryptedContent, authTagHex] =
      encryptedMessage.encryptedContent.split(":");
    const authTag = Buffer.from(authTagHex, "hex");

    this.log(`🔖 Auth tag: ${authTagHex}`);

    try {
      const startTime = performance.now();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from(encryptedMessage.keyId));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedContent, "hex", "utf8");
      decrypted += decipher.final("utf8");
      const endTime = performance.now();

      this.log(`✅ Message decrypted in ${(endTime - startTime).toFixed(2)}ms`);
      this.log(`📝 Decrypted content length: ${decrypted.length} chars`);

      return decrypted;
    } catch (error) {
      this.log(`❌ Decryption failed: ${(error as Error).message}`);
      throw error;
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

    const authTag = encryptedBuffer.slice(-16);
    const encrypted = encryptedBuffer.slice(0, -16);

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
