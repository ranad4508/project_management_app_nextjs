import * as crypto from "crypto";

export class EncryptionUtils {
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;

  // Store key pairs for automated management
  private static keyStore: {
    rsa?: { publicKey: string; privateKey: string };
    dh?: { publicKey: string; privateKey: string };
    sharedSecret?: string;
  } = {};

  /**
   * Initializes the encryption system by generating necessary key pairs
   */
  static async initialize(): Promise<void> {
    try {
      this.keyStore.rsa = this.generateRSAKeyPair();
      this.keyStore.dh = this.generateDHKeyPair();
    } catch (error) {
      console.error("Failed to initialize encryption system:", error);
      throw error;
    }
  }

  /**
   * Generates RSA key pair for asymmetric encryption
   */
  private static generateRSAKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    return { publicKey, privateKey };
  }

  /**
   * Generates Diffie-Hellman key pair for key exchange
   */
  private static generateDHKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();
    return {
      publicKey: dh.getPublicKey("hex"),
      privateKey: dh.getPrivateKey("hex"),
    };
  }

  /**
   * Generates a cryptographically secure salt
   */
  static async generateSalt(): Promise<string> {
    return crypto.randomBytes(this.SALT_LENGTH).toString("hex");
  }

  /**
   * Derives a key from password and salt using PBKDF2
   */
  static async deriveKey(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        "sha256",
        (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            resolve(derivedKey.toString("hex"));
          }
        }
      );
    });
  }

  /**
   * Generate a random token
   */
  static generateToken(length = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Generate a random secret key
   */
  static generateSecretKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString("hex");
  }
  static generateMfaCode(length = 6): string {
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
  /**
   * Hashes a password with salt for storage
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await this.generateSalt();
    const hash = await this.deriveKey(password, salt);
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a password against a stored hash
   */
  static async verifyPassword(
    password: string,
    storedHash: string
  ): Promise<boolean> {
    try {
      const [salt, hash] = storedHash.split(":");
      if (!salt || !hash) return false;

      const derivedHash = await this.deriveKey(password, salt);
      return hash === derivedHash;
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  }

  /**
   * Automates key exchange with another party
   */
  static async exchangeKeys(otherPartyPublicDHKey: string): Promise<string> {
    if (!this.keyStore.dh) {
      throw new Error("Encryption system not initialized");
    }

    const sharedSecret = this.generateSharedSecret(
      this.keyStore.dh.privateKey,
      otherPartyPublicDHKey
    );
    this.keyStore.sharedSecret = sharedSecret;

    // Derive a secure key using PBKDF2 with salt
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");
    const derivedKey = crypto
      .pbkdf2Sync(
        sharedSecret,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        "sha256"
      )
      .toString("hex");

    return this.keyStore.dh.publicKey;
  }

  /**
   * Generates shared secret from DH keys
   */
  private static generateSharedSecret(
    privateKey: string,
    publicKey: string
  ): string {
    const dh = crypto.createDiffieHellman(2048);
    dh.setPrivateKey(Buffer.from(privateKey, "hex"));
    return dh.computeSecret(Buffer.from(publicKey, "hex")).toString("hex");
  }

  /**
   * Encrypts private key with password, salt, and hashing
   */
  static encryptPrivateKey(
    privateKey: string,
    password: string
  ): { encrypted: string; salt: string; iv: string } {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");
    const iv = crypto.randomBytes(this.IV_LENGTH).toString("hex");

    // Derive key using PBKDF2 with salt
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      "sha256"
    );

    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex")
    );

    let encrypted = cipher.update(
      this.hashContent(privateKey), // Hash the input
      "utf8",
      "hex"
    );
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
      encrypted: encrypted + tag,
      salt,
      iv,
    };
  }

  /**
   * Decrypts private key with password, salt, and hash verification
   */
  static decryptPrivateKey(
    encrypted: string,
    password: string,
    salt: string,
    iv: string
  ): string {
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      "sha256"
    );

    const tag = encrypted.slice(-32);
    const data = encrypted.slice(0, -32);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypts data with RSA public key
   */
  static encryptWithRSA(data: string): string {
    if (!this.keyStore.rsa) {
      throw new Error("Encryption system not initialized");
    }

    const hashedData = this.hashContent(data);
    return crypto
      .publicEncrypt(this.keyStore.rsa.publicKey, Buffer.from(hashedData))
      .toString("hex");
  }

  /**
   * Decrypts data with RSA private key
   */
  static decryptWithRSA(encrypted: string): string {
    if (!this.keyStore.rsa) {
      throw new Error("Encryption system not initialized");
    }

    return crypto
      .privateDecrypt(
        this.keyStore.rsa.privateKey,
        Buffer.from(encrypted, "hex")
      )
      .toString("utf8");
  }

  /**
   * Generates a secure room key
   */
  static generateRoomKey(): string {
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");

    // Hash the random bytes with salt
    return crypto
      .pbkdf2Sync(
        randomBytes,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        "sha256"
      )
      .toString("hex");
  }

  /**
   * Encrypts message with symmetric key, salt, and hashing
   */
  static encryptMessage(content: string): {
    encrypted: string;
    iv: string;
    tag: string;
    salt: string;
  } {
    if (!this.keyStore.sharedSecret) {
      throw new Error("Shared secret not established");
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");

    // Derive encryption key from shared secret and salt
    const key = crypto.pbkdf2Sync(
      this.keyStore.sharedSecret,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      "sha256"
    );

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(
      this.hashContent(content), // Hash the input
      "utf8",
      "hex"
    );
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      salt,
    };
  }

  /**
   * Decrypts message with symmetric key, salt, and hash verification
   */
  static decryptMessage(
    encrypted: string,
    iv: string,
    tag: string,
    salt: string
  ): string {
    if (!this.keyStore.sharedSecret) {
      throw new Error("Shared secret not established");
    }

    // Derive same key using shared secret and provided salt
    const key = crypto.pbkdf2Sync(
      this.keyStore.sharedSecret,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      "sha256"
    );

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Creates a secure hash of content with SHA-256
   */
  static hashContent(content: string): string {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");
    return crypto
      .createHash("sha256")
      .update(content + salt)
      .digest("hex");
  }

  /**
   * Gets the public RSA key for sharing
   */
  static getPublicRSAKey(): string {
    if (!this.keyStore.rsa) {
      throw new Error("Encryption system not initialized");
    }
    return this.keyStore.rsa.publicKey;
  }

  /**
   * Gets the public DH key for sharing
   */
  static getPublicDHKey(): string {
    if (!this.keyStore.dh) {
      throw new Error("Encryption system not initialized");
    }
    return this.keyStore.dh.publicKey;
  }

  /**
   * Encrypts data with AES-256-GCM using a provided key
   */
  static encryptWithKey(
    data: string,
    key: string
  ): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      iv
    );

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    };
  }

  /**
   * Decrypts data with AES-256-GCM using a provided key
   */
  static decryptWithKey(
    encrypted: string,
    key: string,
    iv: string,
    tag: string
  ): string {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Clears all stored keys (for logout/cleanup)
   */
  static clearKeys(): void {
    this.keyStore = {};
  }
}
