export const authConfig = {
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || "",
    expiresIn: "30d",
  },
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  tokens: {
    verification: {
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    },
    passwordReset: {
      expiresIn: 60 * 60 * 1000, // 1 hour
    },
    invitation: {
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    mfa: {
      expiresIn: 10 * 60 * 1000, // 10 minutes
    },
  },
  password: {
    minLength: 8,
    saltRounds: 12,
  },
}
