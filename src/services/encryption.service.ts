import { UserKeyPair, ChatRoomKey } from "@/src/models/chat"
import { EncryptionUtils } from "@/src/utils/encryption.utils"
import { DateUtils } from "@/src/utils/date.utils"
import { NotFoundError, ValidationError } from "@/src/errors/AppError"
import type { UserKeyPairData } from "@/src/types/chat.types"

export class EncryptionService {
  /**
   * Generate and store user key pair
   */
  async generateUserKeyPair(userId: string, password: string): Promise<UserKeyPairData> {
    // Check if user already has a key pair
    const existingKeyPair = await UserKeyPair.findOne({ user: userId })
    if (existingKeyPair && !DateUtils.isExpired(existingKeyPair.expiresAt)) {
      throw new ValidationError("User already has a valid key pair")
    }

    // Generate RSA key pair
    const { publicKey, privateKey } = EncryptionUtils.generateRSAKeyPair()

    // Encrypt private key with user's password
    const { encrypted, salt, iv } = EncryptionUtils.encryptPrivateKey(privateKey, password)
    const privateKeyEncrypted = `${encrypted}:${salt}:${iv}`

    // Set expiration to 1 year
    const expiresAt = DateUtils.addTime(new Date(), 365, "days")

    // Delete old key pair if exists
    if (existingKeyPair) {
      await UserKeyPair.findByIdAndDelete(existingKeyPair._id)
    }

    // Store new key pair
    const userKeyPair = new UserKeyPair({
      user: userId,
      publicKey,
      privateKeyEncrypted,
      keyVersion: 1,
      expiresAt,
    })

    await userKeyPair.save()

    return {
      publicKey,
      privateKeyEncrypted,
      keyVersion: 1,
    }
  }

  /**
   * Get user's public key
   */
  async getUserPublicKey(userId: string): Promise<string> {
    const keyPair = await UserKeyPair.findOne({
      user: userId,
      expiresAt: { $gt: new Date() },
    })

    if (!keyPair) {
      throw new NotFoundError("User key pair not found or expired")
    }

    return keyPair.publicKey
  }

  /**
   * Get user's private key (decrypted)
   */
  async getUserPrivateKey(userId: string, password: string): Promise<string> {
    const keyPair = await UserKeyPair.findOne({
      user: userId,
      expiresAt: { $gt: new Date() },
    })

    if (!keyPair) {
      throw new NotFoundError("User key pair not found or expired")
    }

    try {
      const [encrypted, salt, iv] = keyPair.privateKeyEncrypted.split(":")
      return EncryptionUtils.decryptPrivateKey(encrypted, password, salt, iv)
    } catch (error) {
      throw new ValidationError("Invalid password or corrupted private key")
    }
  }

  /**
   * Generate and distribute room key to participants
   */
  async generateRoomKey(roomId: string, participantIds: string[]): Promise<void> {
    // Generate room encryption key
    const roomKey = EncryptionUtils.generateRoomKey()

    // Get public keys for all participants
    const participantKeys = await Promise.all(
      participantIds.map(async (userId) => {
        const publicKey = await this.getUserPublicKey(userId)
        return { userId, publicKey }
      }),
    )

    // Encrypt room key for each participant
    const roomKeys = participantKeys.map(({ userId, publicKey }) => {
      const encryptedRoomKey = EncryptionUtils.encryptWithRSA(roomKey, publicKey)
      return {
        room: roomId,
        user: userId,
        encryptedRoomKey,
        keyVersion: 1,
      }
    })

    // Store encrypted room keys
    await ChatRoomKey.insertMany(roomKeys)
  }

  /**
   * Get room key for user
   */
  async getRoomKey(roomId: string, userId: string, password: string): Promise<string> {
    // Get encrypted room key
    const roomKeyData = await ChatRoomKey.findOne({
      room: roomId,
      user: userId,
    })

    if (!roomKeyData) {
      throw new NotFoundError("Room key not found for user")
    }

    // Get user's private key
    const privateKey = await this.getUserPrivateKey(userId, password)

    // Decrypt room key
    try {
      return EncryptionUtils.decryptWithRSA(roomKeyData.encryptedRoomKey, privateKey)
    } catch (error) {
      throw new ValidationError("Failed to decrypt room key")
    }
  }

  /**
   * Add new participant to room (distribute room key)
   */
  async addParticipantToRoom(roomId: string, newParticipantId: string): Promise<void> {
    // Check if participant already has room key
    const existingKey = await ChatRoomKey.findOne({
      room: roomId,
      user: newParticipantId,
    })

    if (existingKey) {
      return // Already has access
    }

    // Get an existing room key to decrypt and re-encrypt
    const existingRoomKey = await ChatRoomKey.findOne({ room: roomId })
    if (!existingRoomKey) {
      throw new NotFoundError("No existing room keys found")
    }

    // For now, we'll generate a new room key and update all participants
    // In a production system, you'd want to implement proper key rotation
    const allParticipants = await ChatRoomKey.find({ room: roomId }).distinct("user")
    allParticipants.push(newParticipantId)

    // Delete old keys
    await ChatRoomKey.deleteMany({ room: roomId })

    // Generate new room key for all participants
    await this.generateRoomKey(
      roomId,
      allParticipants.map((id) => id.toString()),
    )
  }

  /**
   * Remove participant from room (revoke access)
   */
  async removeParticipantFromRoom(roomId: string, participantId: string): Promise<void> {
    // Remove participant's room key
    await ChatRoomKey.deleteOne({
      room: roomId,
      user: participantId,
    })

    // In a production system, you'd want to rotate the room key
    // and re-encrypt for remaining participants to ensure forward secrecy
  }

  /**
   * Encrypt message content
   */
  async encryptMessage(
    content: string,
    roomId: string,
    senderId: string,
    password: string,
  ): Promise<{
    encryptedContent: string
    encryptionData: {
      iv: string
      tag: string
      senderPublicKey: string
    }
  }> {
    // Get room key
    const roomKey = await this.getRoomKey(roomId, senderId, password)

    // Get sender's public key
    const senderPublicKey = await this.getUserPublicKey(senderId)

    // Encrypt content
    const { encrypted, iv, tag } = EncryptionUtils.encryptMessage(content, roomKey)

    return {
      encryptedContent: encrypted,
      encryptionData: {
        iv,
        tag,
        senderPublicKey,
      },
    }
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(
    encryptedContent: string,
    encryptionData: { iv: string; tag: string; senderPublicKey: string },
    roomId: string,
    userId: string,
    password: string,
  ): Promise<string> {
    // Get room key
    const roomKey = await this.getRoomKey(roomId, userId, password)

    // Decrypt content
    return EncryptionUtils.decryptMessage(encryptedContent, roomKey, encryptionData.iv, encryptionData.tag)
  }

  /**
   * Rotate user key pair
   */
  async rotateUserKeyPair(userId: string, oldPassword: string, newPassword: string): Promise<UserKeyPairData> {
    // Verify old password by trying to decrypt current private key
    await this.getUserPrivateKey(userId, oldPassword)

    // Delete old key pair
    await UserKeyPair.deleteOne({ user: userId })

    // Generate new key pair
    return this.generateUserKeyPair(userId, newPassword)
  }

  /**
   * Check if user has valid key pair
   */
  async hasValidKeyPair(userId: string): Promise<boolean> {
    const keyPair = await UserKeyPair.findOne({
      user: userId,
      expiresAt: { $gt: new Date() },
    })

    return !!keyPair
  }
}
