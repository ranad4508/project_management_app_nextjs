import nodemailer from "nodemailer";
import { emailConfig } from "@/src/config/email";
import { appConfig } from "@/src/config/app";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(emailConfig.brevo);
  }

  /**
   * Send email
   */
  public async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${appConfig.name}" <${emailConfig.from}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("Email sending failed:", error);
      throw new Error("Failed to send email");
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${appConfig.url}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">Welcome to ${appConfig.name}!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for registering with ${appConfig.name}. To complete your registration and start using our platform, 
            please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #6d28d9; color: white; padding: 14px 28px; text-decoration: none; 
                      border-radius: 6px; font-weight: 600; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If the button doesn't work, you can copy and paste this link into your browser:
            <br>
            <a href="${verificationUrl}" style="color: #6d28d9; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
          <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
          <p>If you didn't create an account with ${appConfig.name}, you can safely ignore this email.</p>
          <p style="margin-bottom: 0;">
            Best regards,<br>
            The ${appConfig.name} Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(
      email,
      emailConfig.templates.verification.subject,
      html
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${appConfig.url}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">${appConfig.name}</h1>
        </div>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #dc2626; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #7f1d1d; margin-bottom: 0;">
            We received a request to reset your password. If you didn't make this request, please ignore this email.
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #4b5563; line-height: 1.6;">
            To reset your password, click the button below. This link will expire in 1 hour for security reasons.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; 
                      border-radius: 6px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If the button doesn't work, you can copy and paste this link into your browser:
            <br>
            <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
          <p><strong>Security tip:</strong> Never share your password with anyone. ${appConfig.name} will never ask for your password via email.</p>
          <p style="margin-bottom: 0;">
            Best regards,<br>
            The ${appConfig.name} Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(
      email,
      emailConfig.templates.passwordReset.subject,
      html
    );
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitationEmail(
    email: string,
    inviterName: string,
    workspaceName: string,
    token: string
  ): Promise<void> {
    const inviteUrl = `${appConfig.url}/accept-invite?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">${appConfig.name}</h1>
        </div>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #0c4a6e; margin-top: 0;">You've Been Invited!</h2>
          <p style="color: #075985; margin-bottom: 0;">
            <strong>${inviterName}</strong> has invited you to join the <strong>"${workspaceName}"</strong> workspace.
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <p style="color: #4b5563; line-height: 1.6;">
            Join your team on ${appConfig.name} to collaborate on projects, manage tasks, and stay organized together.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; 
                      border-radius: 6px; font-weight: 600; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If the button doesn't work, you can copy and paste this link into your browser:
            <br>
            <a href="${inviteUrl}" style="color: #0ea5e9; word-break: break-all;">${inviteUrl}</a>
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
          <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
          <p>If you don't want to join this workspace, you can safely ignore this email.</p>
          <p style="margin-bottom: 0;">
            Best regards,<br>
            The ${appConfig.name} Team
          </p>
        </div>
      </div>
    `;

    const subject = `${inviterName} invited you to join ${workspaceName} on ${appConfig.name}`;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send MFA code email
   */
  async sendMfaCode(email: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">${appConfig.name}</h1>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin-top: 0;">Security Verification</h2>
          <p style="color: #78350f; margin-bottom: 0;">
            A verification code is required to complete your login.
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Enter this verification code to complete your login:
          </p>
          
          <div style="background-color: white; border: 2px solid #e5e7eb; border-radius: 8px; 
                      padding: 20px; margin: 20px 0; display: inline-block;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: monospace;">
              ${code}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This code will expire in 10 minutes.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
          <p><strong>Security Notice:</strong> If you didn't request this code, please secure your account immediately by changing your password.</p>
          <p style="margin-bottom: 0;">
            Best regards,<br>
            The ${appConfig.name} Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, emailConfig.templates.mfaCode.subject, html);
  }
}
