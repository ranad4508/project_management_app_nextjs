export const emailConfig = {
  brevo: {
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: Number.parseInt(process.env.BREVO_SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER || "",
      pass: process.env.BREVO_SMTP_PASSWORD || "",
    },
  },
  from: process.env.EMAIL_FROM || "noreply@worksphere.com",
  templates: {
    verification: {
      subject: "Verify your WorkSphere account",
      template: "verification",
    },
    passwordReset: {
      subject: "Reset your WorkSphere password",
      template: "password-reset",
    },
    teamInvitation: {
      subject: "You've been invited to join a workspace",
      template: "team-invitation",
    },
    mfaCode: {
      subject: "Your WorkSphere verification code",
      template: "mfa-code",
    },
  },
}
