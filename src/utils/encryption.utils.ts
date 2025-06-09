import crypto from "crypto"

export class EncryptionUtils {
  private static readonly ALGORITHM = "aes-256-gcm"
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16

  /**
   * Generate Diffie-Hellman key pair
   */
  static generateDHKeyPair(): { publicKey: string; privateKey: string } {
    const dh = crypto.createDiffieHellman(2048)
    dh.generateKeys()

    return {
      publicKey: dh.getPublicKey("hex"),
      privateKey: dh.getPrivateKey("hex"),
    }
  }

  /**
   * Generate shared secret using Diffie-Hellman
   */
  static generateSharedSecret(privateKey: string, otherPublicKey: string): string {
    const dh = crypto.createDiffieHellman(2048)
    dh.setPrivateKey(Buffer.from(privateKey, "hex"))

    const sharedSecret = dh.computeSecret(Buffer.from(otherPublicKey, "hex"))
    return crypto.createHash("sha256").update(sharedSecret).digest("hex")
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  static generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    })

    return { publicKey, privateKey }
  }

  /**
   * Encrypt data with RSA public key
   */
  static encryptWithRSA(data: string, publicKey: string): string {
    const buffer = Buffer.from(data, "utf8")
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer,
    )
    return encrypted.toString("base64")
  }

  /**
   * Decrypt data with RSA private key
   */
  static decryptWithRSA(encryptedData: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedData, "base64")
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer,
    )
    return decrypted.toString("utf8")
  }

  /**
   * Encrypt message content with AES
   */
  static encryptMessage(content: string, sharedKey: string): { encrypted: string; iv: string; tag: string } {
    const key = Buffer.from(sharedKey.substring(0, 64), "hex")
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

    let encrypted = cipher.update(content, "utf8", "hex")
    encrypted += cipher.final("hex")

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    }
  }

  /**
   * Decrypt message content with AES
   */
  static decryptMessage(encryptedData: string, sharedKey: string, iv: string, tag: string): string {
    const key = Buffer.from(sharedKey.substring(0, 64), "hex")
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, Buffer.from(iv, "hex"))

    decipher.setAuthTag(Buffer.from(tag, "hex"))

    let decrypted = decipher.update(encryptedData, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  }

  /**
   * Generate room encryption key
   */
  static generateRoomKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString("hex")
  }

  /**
   * Encrypt private key with password
   */
  static encryptPrivateKey(privateKey: string, password: string): { encrypted: string; salt: string; iv: string } {
    const salt = crypto.randomBytes(16)
    const iv = crypto.randomBytes(this.IV_LENGTH)

    // Derive key from password using PBKDF2
    const key = crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, "sha256")

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
    let encrypted = cipher.update(privateKey, "utf8", "hex")
    encrypted += cipher.final("hex")

    const tag = cipher.getAuthTag()

    return {
      encrypted: encrypted + ":" + tag.toString("hex"),
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
    }
  }

  /**
   * Decrypt private key with password
   */
  static decryptPrivateKey(encryptedData: string, password: string, salt: string, iv: string): string {
    const [encrypted, tag] = encryptedData.split(":")

    // Derive key from password using PBKDF2
    const key = crypto.pbkdf2Sync(password, Buffer.from(salt, "hex"), 100000, this.KEY_LENGTH, "sha256")

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, Buffer.from(iv, "hex"))
    decipher.setAuthTag(Buffer.from(tag, "hex"))

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  }

  /**
   * Hash content for integrity verification
   */
  static hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex")
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString("hex")
  }
}
