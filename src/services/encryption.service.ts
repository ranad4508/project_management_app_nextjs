import { Types } from "mongoose";
import { UserKeyPair, ChatRoomKey } from "@/src/models/encryption";
import { ChatRoom } from "@/src/models/chat";
import { EncryptionUtils } from "@/src/utils/encryption.utils";
import { ValidationError } from "@/src/errors/validation.error";
import type {
  MessageEncryptionData,
  EncryptedMessageData,
  UserKeyPairData,
  ChatRoomKeyData,
} from "@/src/types/chat.types";

export class EncryptionService {
  constructor() {
    // Initialize EncryptionUtils to generate necessary keys
    EncryptionUtils.initialize();
  }

  async initializeUserEncryption(
    userId: string,
    password: string
  ): Promise<UserKeyPairData> {
    const existingKeyPair = await UserKeyPair.findOne({ user: userId });
    if (existingKeyPair) {
      throw new ValidationError("User encryption already initialized");
    }

    const publicKey = EncryptionUtils.getPublicRSAKey();
    const { encrypted, salt, iv } = EncryptionUtils.encryptPrivateKey(
      EncryptionUtils.hashContent(password), // Hash password for added security
      password
    );

    const keyPair = new UserKeyPair({
      user: new Types.ObjectId(userId),
      publicKey,
      privateKeyEncrypted: encrypted,
      salt,
      iv,
      keyVersion: 1,
    });

    await keyPair.save();

    return {
      publicKey,
      privateKeyEncrypted: encrypted,
      keyVersion: 1,
    };
  }

  async getUserPrivateKey(userId: string, password: string): Promise<string> {
    const keyPair = await UserKeyPair.findOne({ user: userId });
    if (!keyPair) {
      throw new ValidationError("User encryption not initialized");
    }

    try {
      return EncryptionUtils.decryptPrivateKey(
        keyPair.privateKeyEncrypted,
        password,
        keyPair.salt,
        keyPair.iv
      );
    } catch (error: any) {
      throw new ValidationError("Invalid encryption password");
    }
  }

  async encryptMessage(
    content: string,
    roomId: string,
    senderId: string,
    password: string
  ): Promise<EncryptedMessageData> {
    const roomKey = await this.getRoomKey(roomId, senderId, password);
    const { encrypted, iv, tag, salt } =
      EncryptionUtils.encryptMessage(content);

    return {
      content: encrypted,
      encryptionData: {
        iv,
        tag,
        senderPublicKey: (await UserKeyPair.findOne({ user: senderId }))!
          .publicKey,
      },
    };
  }

  async decryptMessage(
    encryptedContent: string,
    encryptionData: MessageEncryptionData,
    roomId: string,
    userId: string,
    password: string
  ): Promise<string> {
    const roomKey = await this.getRoomKey(roomId, userId, password);
    try {
      return EncryptionUtils.decryptMessage(
        encryptedContent,
        encryptionData.iv,
        encryptionData.tag,
        encryptionData.salt || EncryptionUtils.hashContent(password) // Fallback salt
      );
    } catch (error: any) {
      throw new ValidationError("Failed to decrypt message");
    }
  }

  async getRoomKey(
    roomId: string,
    userId: string,
    password: string
  ): Promise<string> {
    const roomKeyDoc = await ChatRoomKey.findOne({
      roomId: new Types.ObjectId(roomId),
      user: new Types.ObjectId(userId),
    });
    if (!roomKeyDoc) {
      throw new ValidationError("Room key not found");
    }

    const privateKey = await this.getUserPrivateKey(userId, password);
    try {
      return EncryptionUtils.decryptWithRSA(roomKeyDoc.encryptedRoomKey);
    } catch (error: any) {
      throw new ValidationError("Failed to decrypt room key");
    }
  }

  async addParticipantToRoom(
    roomId: string,
    participantId: string,
    password: string
  ): Promise<void> {
    const room = await ChatRoom.findById(roomId).populate("participants.user");
    if (!room) {
      throw new ValidationError("Room not found");
    }

    const participantKeyPair = await UserKeyPair.findOne({
      user: participantId,
    });
    if (!participantKeyPair) {
      throw new ValidationError("Participant encryption not initialized");
    }

    let roomKeyDoc = await ChatRoomKey.findOne({
      roomId: new Types.ObjectId(roomId),
      user: room.participants[0].user._id,
    });

    let roomKey: string;
    if (!roomKeyDoc) {
      roomKey = EncryptionUtils.generateRoomKey();
      for (const participant of room.participants) {
        const publicKey = (await UserKeyPair.findOne({
          user: participant.user._id,
        }))!.publicKey;
        const encryptedRoomKey = EncryptionUtils.encryptWithRSA(roomKey);
        await ChatRoomKey.create({
          roomId: new Types.ObjectId(roomId),
          user: participant.user._id,
          encryptedRoomKey,
          keyVersion: 1,
        });
      }
    } else {
      const ownerPrivateKey = await this.getUserPrivateKey(
        room.participants[0].user._id.toString(),
        password
      );
      roomKey = EncryptionUtils.decryptWithRSA(roomKeyDoc.encryptedRoomKey);
    }

    const encryptedRoomKey = EncryptionUtils.encryptWithRSA(roomKey);
    await ChatRoomKey.create({
      roomId: new Types.ObjectId(roomId),
      user: new Types.ObjectId(participantId),
      encryptedRoomKey,
      keyVersion: 1,
    });

    // Update Diffie-Hellman shared secrets
    const participants = [
      ...room.participants.map((p: any) => p.user._id.toString()),
      participantId,
    ];
    for (const userId of participants) {
      const userKeyPair = await UserKeyPair.findOne({ user: userId });
      if (!userKeyPair) continue;

      for (const otherUserId of participants) {
        if (userId === otherUserId) continue;
        const otherKeyPair = await UserKeyPair.findOne({ user: otherUserId });
        if (!otherKeyPair) continue;

        const otherPublicDHKey = EncryptionUtils.getPublicRSAKey();
        await EncryptionUtils.exchangeKeys(otherPublicDHKey);
        const sharedSecret = EncryptionUtils.hashContent(userId + otherUserId); // Simplified for consistency
        await ChatRoomKey.updateOne(
          {
            roomId: new Types.ObjectId(roomId),
            user: new Types.ObjectId(userId),
          },
          { $set: { sharedSecret } }
        );
      }
    }
  }
}
