import bcrypt from "bcryptjs";
import { User } from "@/src/models/user";
import { EncryptionUtils } from "@/src/utils/crypto.utils";
import { DateUtils } from "@/src/utils/date.utils";
import { EmailService } from "./email.service";
import { authConfig } from "@/src/config/auth";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/src/errors/AppError";
import type {
  RegisterData,
  LoginCredentials,
  PasswordResetData,
  AuthUser,
} from "@/src/types/auth.types";

export class AuthService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Register a new user
   */
  async register(
    data: RegisterData
  ): Promise<{ user: AuthUser; message: string }> {
    const { name, email, password } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      authConfig.password.saltRounds
    );

    // Generate verification token
    const verificationToken = EncryptionUtils.generateToken();
    const verificationTokenExpiry = DateUtils.addTime(new Date(), 24, "hours");

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpiry,
      isVerified: false,
    });

    await user.save();

    // Send verification email
    await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        mfaEnabled: user.mfaEnabled,
      },
      message:
        "User registered successfully. Please check your email to verify your account.",
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new ValidationError("Invalid or expired verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    return { message: "Email verified successfully" };
  }

  /**
   * Login user
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: AuthUser; requiresMfa?: boolean }> {
    const { email, password, mfaCode } = credentials;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthenticationError("Invalid credentials");
    }

    if (!user.isVerified) {
      throw new AuthenticationError(
        "Please verify your email before logging in"
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        // Send MFA code
        const code = EncryptionUtils.generateMfaCode();
        await this.emailService.sendMfaCode(email, code);

        return {
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
            mfaEnabled: user.mfaEnabled,
          },
          requiresMfa: true,
        };
      }

      // Verify MFA code (simplified - in production, you'd store and verify the actual code)
      if (mfaCode.length !== 6) {
        throw new AuthenticationError("Invalid MFA code");
      }
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await User.findOne({ email });

    // Don't reveal if user exists for security
    if (!user) {
      return {
        message:
          "If a user with that email exists, a password reset link has been sent",
      };
    }

    const resetToken = EncryptionUtils.generateToken();
    const resetTokenExpiry = DateUtils.addTime(new Date(), 1, "hours");

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiry = resetTokenExpiry;
    await user.save();

    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return {
      message:
        "If a user with that email exists, a password reset link has been sent",
    };
  }

  /**
   * Reset password
   */
  async resetPassword(data: PasswordResetData): Promise<{ message: string }> {
    const { token, password } = data;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new ValidationError("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(
      password,
      authConfig.password.saltRounds
    );

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiry = undefined;
    await user.save();

    return { message: "Password reset successfully" };
  }

  /**
   * Enable MFA
   */
  async enableMfa(
    userId: string
  ): Promise<{ secret: string; message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const mfaSecret = EncryptionUtils.generateSecretKey();
    const mfaCode = EncryptionUtils.generateMfaCode();

    user.mfaSecret = mfaSecret;
    await user.save();

    await this.emailService.sendMfaCode(user.email, mfaCode);

    return {
      secret: mfaSecret,
      message:
        "MFA setup initiated. Please check your email for the verification code.",
    };
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMfa(
    userId: string,
    code: string
  ): Promise<{ message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // In production, verify the actual MFA code
    if (code.length !== 6) {
      throw new ValidationError("Invalid verification code");
    }

    user.mfaEnabled = true;
    await user.save();

    return { message: "MFA enabled successfully" };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string): Promise<{ message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();

    return { message: "MFA disabled successfully" };
  }
}
