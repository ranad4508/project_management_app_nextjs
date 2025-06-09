import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/src/services/auth.service"
import { validateSchema, schemas } from "@/src/middleware/validation.middleware"
import { asyncHandler } from "@/src/errors/errorHandler"
import type { ApiResponse } from "@/src/types/api.types"

export class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService()
  }

  register = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const body = await req.json()
    const validatedData = validateSchema(schemas.register, body)

    const result = await this.authService.register(validatedData)

    return NextResponse.json(
      {
        success: true,
        data: result.user,
        message: result.message,
      },
      { status: 201 },
    )
  })

  verifyEmail = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification token is required",
        },
        { status: 400 },
      )
    }

    const result = await this.authService.verifyEmail(token)

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  })

  login = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const body = await req.json()
    const validatedData = validateSchema(schemas.login, body)

    const result = await this.authService.login(validatedData)

    return NextResponse.json({
      success: true,
      data: result,
    })
  })

  requestPasswordReset = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 },
      )
    }

    const result = await this.authService.requestPasswordReset(email)

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  })

  resetPassword = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Token and password are required",
        },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long",
        },
        { status: 400 },
      )
    }

    const result = await this.authService.resetPassword({ token, password })

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  })

  enableMfa = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    // This would typically get user ID from session/JWT
    const userId = req.headers.get("x-user-id") // Placeholder

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 },
      )
    }

    const result = await this.authService.enableMfa(userId)

    return NextResponse.json({
      success: true,
      data: { secret: result.secret },
      message: result.message,
    })
  })

  verifyMfa = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const { code } = await req.json()
    const userId = req.headers.get("x-user-id") // Placeholder

    if (!userId || !code) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID and verification code are required",
        },
        { status: 400 },
      )
    }

    const result = await this.authService.verifyAndEnableMfa(userId, code)

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  })

  disableMfa = asyncHandler(async (req: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const userId = req.headers.get("x-user-id") // Placeholder

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 },
      )
    }

    const result = await this.authService.disableMfa(userId)

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  })
}
