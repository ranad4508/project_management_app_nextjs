import mongoose, { Schema, type Document } from "mongoose";

export interface IRoomInvitation extends Document {
  room: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  invitedUser: mongoose.Types.ObjectId;
  token: string;
  status: "pending" | "accepted" | "declined";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoomInvitationSchema = new Schema<IRoomInvitation>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
RoomInvitationSchema.index({ room: 1, invitedUser: 1 });
RoomInvitationSchema.index({ status: 1, expiresAt: 1 });

export const RoomInvitation =
  mongoose.models.RoomInvitation ||
  mongoose.model<IRoomInvitation>("RoomInvitation", RoomInvitationSchema);
