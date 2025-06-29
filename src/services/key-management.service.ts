import crypto from "crypto";
import { ChatRoom } from "@/src/models/chat-room";
import { ChatRoomKey } from "@/src/models/encryption";
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

    // Get the current highest key version for this user-room combination
    const existingKey = await ChatRoomKey.findOne({
      roomId: roomId,
      user: userId,
    }).sort({ keyVersion: -1 });

    const nextVersion = existingKey ? existingKey.keyVersion + 1 : 1;

    // Store the shared secret for this user-pair-room combination
    await ChatRoomKey.findOneAndUpdate(
      {
        roomId: roomId,
        user: userId,
        keyVersion: nextVersion,
      },
      {
        roomId: roomId,
        user: userId,
        encryptedRoomKey: pairKey, // Using this field to store the pair identifier
        sharedSecret: sharedSecret,
        keyVersion: nextVersion,
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

      // Generate a consistent fallback shared secret based on room and user
      this.log(
        `🔄 [KEY-MGMT] Generating fallback shared secret for user ${userId} in room ${roomId}`
      );

      // Create a deterministic shared secret that will be the same for all users in the room
      // This ensures all users can decrypt messages encrypted with this key
      const fallbackSecret = crypto
        .createHash("sha256")
        .update(`room-${roomId}-shared-secret`)
        .digest("hex");

      // Store the fallback secret for future use with required fields
      try {
        await ChatRoomKey.create({
          roomId: roomId,
          user: userId,
          sharedSecret: fallbackSecret,
          keyVersion: 1,
          createdAt: new Date(),
          // Add required fields for validation
          dhParams: {
            generator: "2", // Standard DH generator
            prime:
              "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF", // Standard 2048-bit prime
          },
          encryptedRoomKey: fallbackSecret, // Use the same secret as encrypted room key
        });

        this.log(
          `✅ [KEY-MGMT] Created fallback shared secret for user ${userId} in room ${roomId}`
        );

        return fallbackSecret;
      } catch (error) {
        this.log(
          `❌ [KEY-MGMT] Failed to create fallback shared secret:`,
          error
        );
        return fallbackSecret; // Return it anyway, even if we can't store it
      }
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
   * Get all key versions for a user in a room (for backward compatibility)
   */
  static async getAllKeyVersions(
    userId: string,
    roomId: string
  ): Promise<{ version: number; sharedSecret: string }[]> {
    this.log(
      `🔍 [KEY-MGMT] Getting all key versions for user ${userId} in room ${roomId}`
    );

    const keys = await ChatRoomKey.find({
      roomId: roomId,
      user: userId,
    }).sort({ keyVersion: -1 }); // Sort by version descending (newest first)

    const keyVersions = keys.map((key) => ({
      version: key.keyVersion,
      sharedSecret: key.sharedSecret,
    }));

    this.log(
      `📋 [KEY-MGMT] Found ${keyVersions.length} key versions for user ${userId} in room ${roomId}`
    );

    return keyVersions;
  }

  /**
   * Regenerate keys for a room (when decryption fails)
   */
  static async regenerateRoomKeys(roomId: string): Promise<void> {
    this.log(`🔄 [KEY-MGMT] Regenerating keys for room ${roomId}`);

    try {
      // Get all room members
      const room = await ChatRoom.findById(roomId).populate("members.user");
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Clear existing keys for this room
      await ChatRoomKey.deleteMany({ roomId });
      this.log(`🗑️ [KEY-MGMT] Cleared existing keys for room ${roomId}`);

      // Generate new keys for each member
      for (const member of room.members) {
        if (member.user && member.user._id) {
          await this.generateUserKeyPairForRoom(
            member.user._id.toString(),
            roomId
          );
          this.log(
            `🔑 [KEY-MGMT] Generated new key for user ${member.user._id} in room ${roomId}`
          );
        }
      }

      // Initialize key exchange for all members
      for (let i = 0; i < room.members.length; i++) {
        for (let j = i + 1; j < room.members.length; j++) {
          const user1 = room.members[i].user;
          const user2 = room.members[j].user;

          if (user1 && user2 && user1._id && user2._id) {
            await this.initializeRoomKeyExchange(
              user1._id.toString(),
              user2._id.toString(),
              roomId
            );
            this.log(
              `🤝 [KEY-MGMT] Initialized key exchange between ${user1._id} and ${user2._id} in room ${roomId}`
            );
          }
        }
      }

      this.log(
        `✅ [KEY-MGMT] Successfully regenerated keys for room ${roomId}`
      );
    } catch (error) {
      this.log(
        `❌ [KEY-MGMT] Failed to regenerate keys for room ${roomId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clean up old shared secrets for a room (keep recent versions for backward compatibility)
   */
  static async cleanupRoomKeys(
    roomId: string,
    keepVersions: number = 3
  ): Promise<void> {
    this.log(
      `🧹 [KEY-MGMT] Cleaning up old keys for room ${roomId}, keeping ${keepVersions} recent versions`
    );

    // Get all users in the room
    const users = await ChatRoomKey.distinct("user", { roomId: roomId });

    for (const userId of users) {
      // Get all keys for this user-room combination, sorted by version descending
      const userKeys = await ChatRoomKey.find({
        roomId: roomId,
        user: userId,
      }).sort({ keyVersion: -1 });

      // Keep only the most recent versions
      if (userKeys.length > keepVersions) {
        const keysToDelete = userKeys.slice(keepVersions);
        const idsToDelete = keysToDelete.map((key) => key._id);

        await ChatRoomKey.deleteMany({ _id: { $in: idsToDelete } });

        this.log(
          `🗑️ [KEY-MGMT] Deleted ${keysToDelete.length} old key versions for user ${userId} in room ${roomId}`
        );
      }
    }

    this.log(`✅ [KEY-MGMT] Cleaned up old keys for room ${roomId}`);
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
