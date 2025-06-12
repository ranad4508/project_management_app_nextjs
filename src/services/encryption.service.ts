import crypto from "crypto";
import type { EncryptionKeys, EncryptedMessage } from "@/src/types/chat.types";

export class EncryptionService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;

  /**
   * Generate Diffie-Hellman key pair
   */
  static generateDHKeyPair(): EncryptionKeys {
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();

    return {
      publicKey: dh.getPublicKey("hex"),
      privateKey: dh.getPrivateKey("hex"),
    };
  }

  /**
   * Compute shared secret from DH key exchange
   */
  static computeSharedSecret(
    privateKey: string,
    otherPublicKey: string
  ): string {
    const dh = crypto.createDiffieHellman(2048);
    dh.setPrivateKey(Buffer.from(privateKey, "hex"));

    const sharedSecret = dh.computeSecret(Buffer.from(otherPublicKey, "hex"));

    return crypto
      .createHash("sha256")
      .update(sharedSecret)
      .digest("hex")
      .substring(0, this.KEY_LENGTH * 2);
  }

  /**
   * Generate AES key from shared secret
   */
  static deriveAESKey(sharedSecret: string, salt?: string): Buffer {
    const saltBuffer = salt ? Buffer.from(salt, "hex") : crypto.randomBytes(16);

    return crypto.pbkdf2Sync(
      Buffer.from(sharedSecret, "hex"),
      saltBuffer,
      100000,
      this.KEY_LENGTH,
      "sha256"
    );
  }

  /**
   * Encrypt message content
   */
  static encryptMessage(
    content: string,
    sharedSecret: string,
    keyId: string
  ): EncryptedMessage {
    const key = this.deriveAESKey(sharedSecret);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(keyId));

    let encrypted = cipher.update(content, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

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
    const key = this.deriveAESKey(sharedSecret);
    const iv = Buffer.from(encryptedMessage.iv, "hex");

    const [encryptedContent, authTagHex] =
      encryptedMessage.encryptedContent.split(":");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from(encryptedMessage.keyId));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedContent, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypt file
   */
  static encryptFile(
    fileBuffer: Buffer,
    sharedSecret: string,
    keyId: string
  ): { encryptedBuffer: Buffer; iv: string } {
    const key = this.deriveAESKey(sharedSecret);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(keyId));

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

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
    const key = this.deriveAESKey(sharedSecret);
    const ivBuffer = Buffer.from(iv, "hex");

    const authTag = encryptedBuffer.slice(-16);
    const encrypted = encryptedBuffer.slice(0, -16);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
    decipher.setAAD(Buffer.from(keyId));
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Generate room encryption key ID
   */
  static generateKeyId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Hash password for room access
   */
  static hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }
}
