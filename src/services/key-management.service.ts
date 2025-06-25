import crypto from "crypto";
import { ChatRoom } from "@/src/models/chat-room";
import { ChatRoomKey, UserKeyPair } from "@/src/models/encryption";
import { EncryptionService } from "./encryption.service";
import type { EncryptionKeys } from "@/src/types/chat.types";

export class KeyManagementService {
  private static debug: boolean = true;

  /**
   * Enable or disable debug logging
   */
  static setDebug(enabled: boolean): void {
    this.debug = enabled;
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
   * Generate and store user's key pair for a room
   */
  static async generateUserKeyPairForRoom(
    userId: string,
    roomId: string
  ): Promise<EncryptionKeys> {
    this.log(
      `🔑 [KEY-MGMT] Generating key pair for user ${userId} in room ${roomId}`
    );

    const keyPair = EncryptionService.generateDHKeyPair();

    // Store the public key in the room member record
    await ChatRoom.updateOne(
      { _id: roomId, "members.user": userId },
      { $set: { "members.$.publicKey": keyPair.publicKey } }
    );

    this.log(
      `✅ [KEY-MGMT] Key pair generated and stored for user ${userId} in room ${roomId}`
    );

    return keyPair;
  }

  /**
   * Get user's public key from room
   */
  static async getUserPublicKeyFromRoom(
    userId: string,
    roomId: string
  ): Promise<string | null> {
    this.log(
      `🔍 [KEY-MGMT] Getting public key for user ${userId} in room ${roomId}`
    );

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const member = room.members.find(
      (member: any) => member.user.toString() === userId
    );

    if (!member || !member.publicKey) {
      this.log(
        `❌ [KEY-MGMT] No public key found for user ${userId} in room ${roomId}`
      );
      return null;
    }

    this.log(
      `✅ [KEY-MGMT] Found public key for user ${userId} in room ${roomId}`
    );
    return member.publicKey;
  }

  /**
   * Get all public keys for room members (excluding the requesting user)
   */
  static async getRoomMemberPublicKeys(
    roomId: string,
    excludeUserId?: string
  ): Promise<{ userId: string; publicKey: string }[]> {
    this.log(`📋 [KEY-MGMT] Getting all public keys for room ${roomId}`);

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const memberKeys = room.members
      .filter((member: any) => {
        return (
          member.publicKey &&
          (!excludeUserId || member.user.toString() !== excludeUserId)
        );
      })
      .map((member: any) => ({
        userId: member.user.toString(),
        publicKey: member.publicKey,
      }));

    this.log(
      `✅ [KEY-MGMT] Found ${memberKeys.length} public keys for room ${roomId}`
    );
    return memberKeys;
  }

  /**
   * Compute and store shared secret between two users for a room
   */
  static async computeAndStoreSharedSecret(
    userId: string,
    otherUserId: string,
    roomId: string,
    userPrivateKey: string,
    otherUserPublicKey: string,
    dhParams?: { prime: string; generator: string }
  ): Promise<string> {
    this.log(
      `🔄 [KEY-MGMT] Computing shared secret between users ${userId} and ${otherUserId} for room ${roomId}`
    );

    // Compute the shared secret using DH
    const sharedSecret = EncryptionService.computeSharedSecret(
      userPrivateKey,
      otherUserPublicKey,
      dhParams
    );

    // Create a deterministic key for the pair (always same order)
    const pairKey = [userId, otherUserId].sort().join("-");

    // Store the shared secret for this user-pair-room combination
    await ChatRoomKey.findOneAndUpdate(
      {
        roomId: roomId,
        user: userId,
      },
      {
        roomId: roomId,
        user: userId,
        encryptedRoomKey: pairKey, // Using this field to store the pair identifier
        sharedSecret: sharedSecret,
        keyVersion: 1,
      },
      { upsert: true, new: true }
    );

    this.log(
      `✅ [KEY-MGMT] Shared secret computed and stored for users ${userId}-${otherUserId} in room ${roomId}`
    );

    return sharedSecret;
  }

  /**
   * Get stored shared secret for a user in a room
   */
  static async getSharedSecret(
    userId: string,
    roomId: string
  ): Promise<string | null> {
    this.log(
      `🔍 [KEY-MGMT] Getting shared secret for user ${userId} in room ${roomId}`
    );

    const roomKey = await ChatRoomKey.findOne({
      roomId: roomId,
      user: userId,
    });

    if (!roomKey || !roomKey.sharedSecret) {
      this.log(
        `❌ [KEY-MGMT] No shared secret found for user ${userId} in room ${roomId}`
      );
      return null;
    }

    this.log(
      `✅ [KEY-MGMT] Found shared secret for user ${userId} in room ${roomId}`
    );
    return roomKey.sharedSecret;
  }

  /**
   * Initialize key exchange for a room - compute shared secrets with all members
   */
  static async initializeRoomKeyExchange(
    userId: string,
    roomId: string,
    userPrivateKey: string,
    dhParams?: { prime: string; generator: string }
  ): Promise<void> {
    this.log(
      `🚀 [KEY-MGMT] Initializing key exchange for user ${userId} in room ${roomId}`
    );

    // Get all other members' public keys
    const memberKeys = await this.getRoomMemberPublicKeys(roomId, userId);

    if (memberKeys.length === 0) {
      this.log(
        `ℹ️ [KEY-MGMT] No other members with public keys in room ${roomId}`
      );
      return;
    }

    // Compute shared secret with each member
    for (const member of memberKeys) {
      try {
        await this.computeAndStoreSharedSecret(
          userId,
          member.userId,
          roomId,
          userPrivateKey,
          member.publicKey,
          dhParams
        );
      } catch (error) {
        console.error(
          `❌ [KEY-MGMT] Failed to compute shared secret with user ${member.userId}:`,
          error
        );
      }
    }

    this.log(
      `✅ [KEY-MGMT] Key exchange completed for user ${userId} in room ${roomId}`
    );
  }

  /**
   * Get the primary shared secret for encryption/decryption in a room
   * For simplicity, we'll use the first available shared secret
   */
  static async getPrimarySharedSecret(
    userId: string,
    roomId: string
  ): Promise<string | null> {
    this.log(
      `🔑 [KEY-MGMT] Getting primary shared secret for user ${userId} in room ${roomId}`
    );

    const sharedSecret = await this.getSharedSecret(userId, roomId);

    if (!sharedSecret) {
      // If no shared secret exists, try to initialize key exchange
      this.log(
        `⚠️ [KEY-MGMT] No shared secret found, attempting to initialize key exchange`
      );

      // Get user's public key to derive private key (this is a simplified approach)
      // In a real implementation, you'd need to securely store and retrieve private keys
      const userPublicKey = await this.getUserPublicKeyFromRoom(userId, roomId);
      if (!userPublicKey) {
        this.log(
          `❌ [KEY-MGMT] Cannot initialize key exchange - no public key for user`
        );
        return null;
      }

      // For now, return null and let the calling code handle the missing key
      return null;
    }

    return sharedSecret;
  }

  /**
   * Clean up old shared secrets for a room
   */
  static async cleanupRoomKeys(roomId: string): Promise<void> {
    this.log(`🧹 [KEY-MGMT] Cleaning up old keys for room ${roomId}`);

    await ChatRoomKey.deleteMany({ roomId: roomId });

    this.log(`✅ [KEY-MGMT] Cleaned up keys for room ${roomId}`);
  }

  /**
   * Remove user's keys from a room when they leave
   */
  static async removeUserFromRoom(
    userId: string,
    roomId: string
  ): Promise<void> {
    this.log(`🚪 [KEY-MGMT] Removing user ${userId} keys from room ${roomId}`);

    // Remove user's shared secrets
    await ChatRoomKey.deleteMany({
      roomId: roomId,
      user: userId,
    });

    // Remove user's public key from room
    await ChatRoom.updateOne(
      { _id: roomId, "members.user": userId },
      { $unset: { "members.$.publicKey": "" } }
    );

    this.log(`✅ [KEY-MGMT] Removed user ${userId} keys from room ${roomId}`);
  }
}
