import mongoose, { type Document, Schema } from "mongoose";
import { UserRole } from "@/src/enums/user.enum";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  language?: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  tempMfaCode?: string;
  tempMfaCodeExpiry?: Date;
  preferences: {
    theme: "light" | "dark" | "system";
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Remove index: true since we're using schema.index() below
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    phone: {
      type: String,
    },
    location: {
      type: String,
    },
    timezone: {
      type: String,
    },
    language: {
      type: String,
      default: "English",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,
    resetPasswordToken: String,
    resetPasswordTokenExpiry: Date,
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: String,
    tempMfaCode: String,
    tempMfaCodeExpiry: Date,
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
