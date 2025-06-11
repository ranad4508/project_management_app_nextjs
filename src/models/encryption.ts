import { Schema, model, models, type Document } from "mongoose";
import type { Types } from "mongoose";

interface IUserKeyPair extends Document {
  user: Types.ObjectId;
  publicKey: string;
  privateKeyEncrypted: string;
  salt: string;
  iv: string;
  keyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserKeyPairSchema = new Schema<IUserKeyPair>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    publicKey: { type: String, required: true },
    privateKeyEncrypted: { type: String, required: true },
    salt: { type: String, required: true },
    iv: { type: String, required: true },
    keyVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

interface IChatRoomKey extends Document {
  roomId: Types.ObjectId;
  user: Types.ObjectId;
  encryptedRoomKey: string;
  sharedSecret?: string;
  keyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomKeySchema = new Schema<IChatRoomKey>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    encryptedRoomKey: { type: String, required: true },
    sharedSecret: { type: String },
    keyVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Add compound index for roomId and user queries
ChatRoomKeySchema.index({ roomId: 1, user: 1 });

export const UserKeyPair =
  models.UserKeyPair || model<IUserKeyPair>("UserKeyPair", UserKeyPairSchema);
export const ChatRoomKey =
  models.ChatRoomKey || model<IChatRoomKey>("ChatRoomKey", ChatRoomKeySchema);
