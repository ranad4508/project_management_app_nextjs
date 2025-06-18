import crypto from "crypto";
import type { EncryptionKeys, EncryptedMessage } from "@/src/types/chat.types";
import { UserKeyPair, ChatRoomKey } from "@/src/models/encryption";

export class EncryptionService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static debug: boolean = true;

  static setDebug(enabled: boolean): void {
    this.debug = enabled;
    this.log(
      "🔧 Server encryption debug mode " + (enabled ? "enabled" : "disabled")
    );
  }

  private static log(...args: any[]): void {
    if (this.debug) {
      console.log(...args);
    }
  }

  /**
   * Generate Diffie-Hellman key pair with consistent parameters
   */
  static generateDHKeyPair(): EncryptionKeys & {
    dhParams: { prime: string; generator: string };
  } {
    const startTime = performance.now();
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();

    const endTime = performance.now();

    const publicKey = dh.getPublicKey("hex");
    const privateKey = dh.getPrivateKey("hex");
    const prime = dh.getPrime("hex");
    const generator = dh.getGenerator("hex");

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
        prime,
        generator,
      },
    };
  }

  /**
   * Store user's key pair in database
   */
  static async storeUserKeyPair(
    userId: string,
    keyPair: EncryptionKeys & {
      dhParams: { prime: string; generator: string };
    },
    userPassword: string
  ): Promise<void> {
    const salt = crypto.randomBytes(32).toString("hex");
    const iv = crypto.randomBytes(16).toString("hex");

    // Encrypt private key with user's password
    const key = crypto.pbkdf2Sync(userPassword, salt, 100000, 32, "sha256");
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      key,
      Buffer.from(iv, "hex")
    );
    let encryptedPrivateKey = cipher.update(keyPair.privateKey, "utf8", "hex");
    encryptedPrivateKey += cipher.final("hex");

    await UserKeyPair.findOneAndUpdate(
      { user: userId },
      {
        publicKey: keyPair.publicKey,
        privateKeyEncrypted: encryptedPrivateKey,
        salt,
        iv,
        dhParams: keyPair.dhParams,
        keyVersion: 1,
      },
      { upsert: true, new: true }
    );

    console.log(`🔐 Stored encrypted key pair for user: ${userId}`);
  }

  /**
   * Retrieve and decrypt user's private key
   */
  static async getUserPrivateKey(
    userId: string,
    userPassword: string
  ): Promise<{
    privateKey: string;
    dhParams: { prime: string; generator: string };
  } | null> {
    const userKeyPair = await UserKeyPair.findOne({ user: userId });
    if (!userKeyPair) return null;

    try {
      const key = crypto.pbkdf2Sync(
        userPassword,
        userKeyPair.salt,
        100000,
        32,
        "sha256"
      );
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        key,
        Buffer.from(userKeyPair.iv, "hex")
      );
      let privateKey = decipher.update(
        userKeyPair.privateKeyEncrypted,
        "hex",
        "utf8"
      );
      privateKey += decipher.final("utf8");

      return {
        privateKey,
        dhParams: userKeyPair.dhParams,
      };
    } catch (error) {
      console.error("❌ Failed to decrypt private key:", error);
      return null;
    }
  }

  /**
   * Compute shared secret from DH key exchange
   */
  static computeSharedSecret(
    privateKey: string,
    otherPublicKey: string,
    dhParams: { prime: string; generator: string }
  ): string {
    const startTime = performance.now();

    const dh = crypto.createDiffieHellman(
      Buffer.from(dhParams.prime, "hex"),
      Buffer.from(dhParams.generator, "hex")
    );

    dh.setPrivateKey(Buffer.from(privateKey, "hex"));
    const sharedSecret = dh.computeSecret(Buffer.from(otherPublicKey, "hex"));
    const endTime = performance.now();

    const hashedSecret = crypto
      .createHash("sha256")
      .update(sharedSecret)
      .digest("hex")
      .substring(0, this.KEY_LENGTH * 2);

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
   * Store shared secret for room
   */
  static async storeRoomSharedSecret(
    roomId: string,
    userId: string,
    sharedSecret: string,
    dhParams: { prime: string; generator: string }
  ): Promise<void> {
    // Encrypt the shared secret before storing
    const encryptionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, encryptionKey, iv);

    let encryptedSecret = cipher.update(sharedSecret, "utf8", "hex");
    encryptedSecret += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    const encryptedRoomKey = `${encryptedSecret}:${authTag.toString(
      "hex"
    )}:${iv.toString("hex")}:${encryptionKey.toString("hex")}`;

    await ChatRoomKey.findOneAndUpdate(
      { roomId, user: userId },
      {
        encryptedRoomKey,
        sharedSecret,
        dhParams,
        keyVersion: 1,
      },
      { upsert: true, new: true }
    );

    console.log(`🔐 Stored shared secret for room ${roomId}, user ${userId}`);
  }

  /**
   * Get shared secret for room
   */
  static async getRoomSharedSecret(
    roomId: string,
    userId: string
  ): Promise<string | null> {
    const roomKey = await ChatRoomKey.findOne({ roomId, user: userId });
    return roomKey?.sharedSecret || null;
  }

  /**
   * Generate room keys for all members using real DH key exchange
   */
  static async generateRoomKeys(
    roomId: string,
    memberIds: string[],
    userPassword: string
  ): Promise<void> {
    console.log(`🔑 Generating room keys for ${memberIds.length} members`);

    // Get all member public keys
    const memberKeys = await UserKeyPair.find({
      user: { $in: memberIds },
    });

    if (memberKeys.length !== memberIds.length) {
      throw new Error("Some members don't have key pairs generated");
    }

    // For each pair of members, compute shared secrets
    for (let i = 0; i < memberKeys.length; i++) {
      const userA = memberKeys[i];

      // Get user A's private key
      const userAPrivateKey = await this.getUserPrivateKey(
        userA.user.toString(),
        userPassword
      );

      if (!userAPrivateKey) {
        console.error(
          `❌ Could not decrypt private key for user ${userA.user}`
        );
        continue;
      }

      for (let j = i + 1; j < memberKeys.length; j++) {
        const userB = memberKeys[j];

        // Compute shared secret between user A and user B
        const sharedSecret = this.computeSharedSecret(
          userAPrivateKey.privateKey,
          userB.publicKey,
          userAPrivateKey.dhParams
        );

        // Store shared secret for both users
        await this.storeRoomSharedSecret(
          roomId,
          userA.user.toString(),
          sharedSecret,
          userAPrivateKey.dhParams
        );

        await this.storeRoomSharedSecret(
          roomId,
          userB.user.toString(),
          sharedSecret,
          userAPrivateKey.dhParams
        );

        console.log(
          `✅ Generated shared secret between users ${userA.user} and ${userB.user}`
        );
      }
    }
  }

  /**
   * Generate AES key from shared secret
   */
  static deriveAESKey(sharedSecret: string): Buffer {
    const key = crypto
      .createHash("sha256")
      .update(Buffer.from(sharedSecret, "hex"))
      .digest()
      .subarray(0, this.KEY_LENGTH);

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

    console.log(`   🔢 Generated IV: ${iv.toString("hex")}`);
    console.log(`   🔖 Auth Tag: ${authTag.toString("hex")}`);
    console.log(`   🔐 Encrypted Content: ${finalEncrypted}`);
    console.log(`   📊 Encrypted Length: ${finalEncrypted.length} characters`);
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
   * Decrypt message content
   */
  static decryptMessage(
    encryptedMessage: EncryptedMessage,
    sharedSecret: string,
    userId?: string,
    roomId?: string,
    messageId?: string
  ): string {
    const startTime = performance.now();

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
    console.log(`   🔧 Algorithm: AES-256-GCM`);

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

      console.log(`   🔖 Auth Tag: ${authTagHex}`);
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
