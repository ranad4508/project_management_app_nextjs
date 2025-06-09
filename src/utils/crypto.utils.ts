import crypto from "crypto"

export class CryptoUtils {
  private static readonly ALGORITHM = "aes-256-gcm"
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16

  /**
   * Generate a random token
   */
  static generateToken(length = 32): string {
    return crypto.randomBytes(length).toString("hex")
  }

  /**
   * Generate a random secret key
   */
  static generateSecretKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString("hex")
  }

  /**
   * Hash a password using bcrypt-like approach with crypto
   */
  static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString("hex")
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err)
        resolve(`${salt}:${derivedKey.toString("hex")}`)
      })
    })
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(":")
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err)
        resolve(key === derivedKey.toString("hex"))
      })
    })
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static encrypt(data: string, secretKey: string): { encrypted: string; iv: string; tag: string } {
    const key = Buffer.from(secretKey, "hex")
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

    let encrypted = cipher.update(data, "utf8", "hex")
    encrypted += cipher.final("hex")

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encryptedData: string, secretKey: string, iv: string, tag: string): string {
    const key = Buffer.from(secretKey, "hex")
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, Buffer.from(iv, "hex"))

    decipher.setAuthTag(Buffer.from(tag, "hex"))

    let decrypted = decipher.update(encryptedData, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  }

  /**
   * Generate MFA code
   */
  static generateMfaCode(length = 6): string {
    const max = Math.pow(10, length) - 1
    const min = Math.pow(10, length - 1)
    return Math.floor(Math.random() * (max - min + 1) + min).toString()
  }

  /**
   * Generate HMAC signature
   */
  static generateHmac(data: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(data).digest("hex")
  }

  /**
   * Verify HMAC signature
   */
  static verifyHmac(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHmac(data, secret)
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))
  }
}
