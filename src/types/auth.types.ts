import type { UserRole } from "@/src/enums/user.enum"

export interface LoginCredentials {
  email: string
  password: string
  mfaCode?: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  isVerified: boolean
  mfaEnabled: boolean
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export interface PasswordResetData {
  token: string
  password: string
}

export interface MfaSetupData {
  secret: string
  qrCode: string
}
