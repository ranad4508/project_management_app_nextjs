import { UserKeyPair, ChatRoomKey } from "@/src/models/chat";
import { EncryptionUtils } from "@/src/utils/encryption.utils";
import { NotFoundError, ValidationError } from "@/src/errors/AppError";
import type {
  MessageEncryptionData,
  EncryptedMessageData,
} from "@/src/types/chat.types";

export class EncryptionService {
  /**
   * Generate user key pair for encryption
   */
  async generateUserKeyPair(userId: string, password: string) {
    // Check if user already has a key pair
    const existingKeyPair = await UserKeyPair.findOne({ user: userId });
    if (existingKeyPair && existingKeyPair.expiresAt > new Date()) {
      return {
        publicKey: existingKeyPair.publicKey,
        message: "Key pair already exists",
      };
    }

    // Generate RSA key pair for this user
    const { publicKey, privateKey } = EncryptionUtils.generateRSAKeyPair();

    // Encrypt private key with user's password
    const {
      encrypted: encryptedPrivateKey,
      salt,
      iv,
    } = EncryptionUtils.encryptPrivateKey(privateKey, password);

    // Store encrypted private key and public key
    const keyPair = new UserKeyPair({
      user: userId,
      publicKey,
      privateKeyEncrypted: `${encryptedPrivateKey}:${salt}:${iv}`,
      keyVersion: 1,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    await keyPair.save();

    return {
      publicKey,
      message: "Key pair generated successfully",
    };
  }

  /**
   * Get user's public key
   */
  async getUserPublicKey(userId: string): Promise<string> {
    const keyPair = await UserKeyPair.findOne({
      user: userId,
      expiresAt: { $gt: new Date() },
    });
    if (!keyPair) {
      throw new NotFoundError("User encryption keys not found");
    }
    return keyPair.publicKey;
  }

  /**
   * Get user's private key (decrypted)
   */
  async getUserPrivateKey(userId: string, password: string): Promise<string> {
    const keyPair = await UserKeyPair.findOne({
      user: userId,
      expiresAt: { $gt: new Date() },
    });
    if (!keyPair) {
      throw new NotFoundError("User encryption keys not found");
    }

    const [encrypted, salt, iv] = keyPair.privateKeyEncrypted.split(":");
    try {
      return EncryptionUtils.decryptPrivateKey(encrypted, password, salt, iv);
    } catch (error) {
      throw new ValidationError("Invalid encryption password");
    }
  }

  /**
   * Check if user has valid key pair
   */
  async hasValidKeyPair(userId: string): Promise<boolean> {
    const keyPair = await UserKeyPair.findOne({
      user: userId,
      expiresAt: { $gt: new Date() },
    });
    return !!keyPair;
  }

  /**
   * Generate room encryption key and distribute to participants
   */
  async generateRoomKey(
    roomId: string,
    participantIds: string[]
  ): Promise<void> {
    // Generate a random room key
    const roomKey = EncryptionUtils.generateRoomKey();

    // Encrypt room key for each participant using their public key
    await Promise.all(
      participantIds.map(async (participantId) => {
        try {
          const publicKey = await this.getUserPublicKey(participantId);
          const encryptedRoomKey = EncryptionUtils.encryptWithRSA(
            roomKey,
            publicKey
          );

          // Store encrypted room key for this user
          await ChatRoomKey.findOneAndUpdate(
            { room: roomId, user: participantId },
            {
              room: roomId,
              user: participantId,
              encryptedRoomKey,
              keyVersion: 1,
            },
            { upsert: true }
          );
        } catch (error) {
          console.error(
            `Failed to encrypt room key for user ${participantId}:`,
            error
          );
          // Continue with other participants
        }
      })
    );
  }

  /**
   * Get room key for a specific user
   */
  async getRoomKey(
    roomId: string,
    userId: string,
    password: string
  ): Promise<string> {
    // Get encrypted room key for this user
    const roomKeyData = await ChatRoomKey.findOne({
      room: roomId,
      user: userId,
    });
    if (!roomKeyData) {
      throw new NotFoundError("Room key not found for user");
    }

    // Get user's private key
    const privateKey = await this.getUserPrivateKey(userId, password);

    // Decrypt room key
    try {
      return EncryptionUtils.decryptWithRSA(
        roomKeyData.encryptedRoomKey,
        privateKey
      );
    } catch (error) {
      throw new ValidationError("Failed to decrypt room key");
    }
  }

  /**
   * Add participant to room (encrypt room key for new participant)
   */
  async addParticipantToRoom(
    roomId: string,
    participantId: string
  ): Promise<void> {
    // Get existing room key from any participant
    const existingRoomKey = await ChatRoomKey.findOne({ room: roomId });
    if (!existingRoomKey) {
      throw new NotFoundError("Room key not found");
    }

    // For simplicity, we'll generate a new room key
    // In production, you'd want to decrypt the existing key and re-encrypt for the new participant
    await this.generateRoomKey(roomId, [participantId]);
  }

  /**
   * Remove participant from room
   */
  async removeParticipantFromRoom(
    roomId: string,
    participantId: string
  ): Promise<void> {
    await ChatRoomKey.deleteOne({ room: roomId, user: participantId });
  }

  /**
   * Encrypt message content
   */
  async encryptMessage(
    content: string,
    roomId: string,
    senderId: string,
    password: string
  ): Promise<EncryptedMessageData> {
    try {
      // Get room key for sender
      const roomKey = await this.getRoomKey(roomId, senderId, password);

      // Get sender's public key for verification
      const senderPublicKey = await this.getUserPublicKey(senderId);

      // Encrypt message with AES using room key
      const { encrypted, iv, tag } = EncryptionUtils.encryptMessage(
        content,
        roomKey
      );

      return {
        content: encrypted,
        encryptionData: {
          iv,
          tag,
          senderPublicKey,
        },
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw new ValidationError("Failed to encrypt message");
    }
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(
    encryptedContent: string,
    encryptionData: MessageEncryptionData,
    roomId: string,
    userId: string,
    password: string
  ): Promise<string> {
    try {
      // Get room key for user
      const roomKey = await this.getRoomKey(roomId, userId, password);

      // Decrypt message with AES using room key
      return EncryptionUtils.decryptMessage(
        encryptedContent,
        roomKey,
        encryptionData.iv,
        encryptionData.tag
      );
    } catch (error) {
      console.error("Decryption error:", error);
      throw new ValidationError("Failed to decrypt message");
    }
  }

  /**
   * Re-encrypt room for security (when participants change)
   */
  async reEncryptRoom(roomId: string, participantIds: string[]): Promise<void> {
    // Remove all existing room keys
    await ChatRoomKey.deleteMany({ room: roomId });

    // Generate new room key for all current participants
    await this.generateRoomKey(roomId, participantIds);
  }
}
