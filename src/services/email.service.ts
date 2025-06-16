import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number.parseInt(process.env.BREVO_SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });
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
        from: `"WorkSphere" <${process.env.EMAIL_FROM}>`,
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
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">Welcome to WorkSphere!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for registering with WorkSphere. To complete your registration and start using our platform, 
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
          <p>If you didn't create an account with WorkSphere, you can safely ignore this email.</p>
          <p style="margin-bottom: 0;">
            Best regards,<br>
            The WorkSphere Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, "Verify your email address", html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">WorkSphere</h1>
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
          <p><strong>Security tip:</strong> Never share your password with anyone. WorkSphere will never ask for your password via email.</p>
          <p style="margin-bottom: 0;">
            Best regards,<br>
            The WorkSphere Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, "Reset your password", html);
  }

  /**
   * Send workspace invitation email with chat access information
   */
  async sendWorkspaceInvitationWithChatEmail(
    email: string,
    inviterName: string,
    workspaceName: string,
    token: string,
    customMessage?: string
  ) {
    const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Workspace Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            .security-badge { background: #e8f5e8; color: #2d5a2d; padding: 8px 16px; border-radius: 20px; font-size: 12px; display: inline-block; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 You're Invited to Join ${workspaceName}</h1>
              <p>${inviterName} has invited you to collaborate</p>
            </div>
            
            <div class="content">
              ${
                customMessage
                  ? `<div class="feature"><strong>Personal Message:</strong><br>"${customMessage}"</div>`
                  : ""
              }
              
              <p>You've been invited to join <strong>${workspaceName}</strong> - a secure workspace with end-to-end encrypted chat and collaboration tools.</p>
              
              <div class="feature">
                <h3>🔒 Secure Chat & Messaging</h3>
                <p>Communicate with your team using our end-to-end encrypted chat system. Your messages are protected with military-grade encryption.</p>
                <div class="security-badge">🛡️ E2E Encrypted</div>
              </div>
              
              <div class="feature">
                <h3>📋 Project Management</h3>
                <p>Organize tasks, track progress, and collaborate on projects with powerful management tools.</p>
              </div>
              
              <div class="feature">
                <h3>👥 Team Collaboration</h3>
                <p>Work together seamlessly with file sharing, real-time updates, and team coordination features.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="button">Accept Invitation & Join Workspace</a>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Click the button above to accept your invitation</li>
                <li>Create your account or sign in if you already have one</li>
                <li>Get automatically added to the secure general chat room</li>
                <li>Start collaborating with your team immediately</li>
              </ul>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>⏰ This invitation expires in 7 days</strong><br>
                Make sure to accept it before it expires!
              </div>
              
              <p>If you have any questions, feel free to reach out to ${inviterName} or our support team.</p>
            </div>
            
            <div class="footer">
              <p>This invitation was sent by ${inviterName} from ${workspaceName}</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(
      email,
      `🚀 You're invited to join ${workspaceName} - Secure Workspace & Chat`,
      htmlContent
    );
  }

  /**
   * Send team invitation email (legacy method for compatibility)
   */
  async sendTeamInvitationEmail(
    email: string,
    inviterName: string,
    workspaceName: string,
    token: string
  ) {
    return this.sendWorkspaceInvitationWithChatEmail(
      email,
      inviterName,
      workspaceName,
      token
    );
  }

  /**
   * Send MFA code email
   */
  async sendMfaCode(email: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d28d9; margin: 0;">WorkSphere</h1>
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
            The WorkSphere Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, "Your verification code", html);
  }

  /**
   * Send room invitation email
   */
  async sendRoomInvitationEmail(
    email: string,
    inviterName: string,
    recipientName: string,
    roomName: string,
    workspaceName: string,
    roomId: string,
    workspaceId?: string
  ): Promise<void> {
    console.log("📧 Sending room invitation email:", {
      email,
      inviterName,
      recipientName,
      roomName,
      workspaceName,
      roomId,
      workspaceId,
    });

    const roomUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/dashboard/workspaces/${workspaceId || workspaceName}/chat?room=${roomId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Private Room Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .security-badge { background: #e8f5e8; color: #2d5a2d; padding: 8px 16px; border-radius: 20px; font-size: 12px; display: inline-block; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Private Room Invitation</h1>
              <p>${inviterName} has invited you to join a private chat room</p>
            </div>
            
            <div class="content">
              <p>Hello ${recipientName},</p>
              
              <p>You've been invited to join the private chat room <strong>"${roomName}"</strong> in the <strong>${workspaceName}</strong> workspace.</p>
              
              <div style="background: #f0f4ff; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Room Details:</h3>
                <p><strong>Room Name:</strong> ${roomName}</p>
                <p><strong>Workspace:</strong> ${workspaceName}</p>
                <p><strong>Invited By:</strong> ${inviterName}</p>
                <div class="security-badge">🛡️ End-to-End Encrypted</div>
              </div>
              
              <p>This room is end-to-end encrypted for maximum security. Your messages can only be read by members of this room.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${roomUrl}" class="button">Join Private Room</a>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Click the button above to join the private room</li>
                <li>Sign in to your account if you're not already logged in</li>
                <li>Start collaborating securely with your team</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>This invitation was sent by ${inviterName} from ${workspaceName}</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(
      email,
      `🔒 You've been invited to join "${roomName}" private room`,
      html
    );
  }
}
