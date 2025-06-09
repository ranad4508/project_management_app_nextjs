import { NextResponse } from "next/server"
import { AppError, ValidationError } from "./AppError"
import type { ApiResponse } from "@/src/types/api.types"

export function handleError(error: unknown): NextResponse<ApiResponse> {
  console.error("Error:", error)

  // Handle known application errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errors: error.errors,
      },
      { status: error.statusCode },
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: error.statusCode },
    )
  }

  // Handle Mongoose validation errors
  if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
    const validationError = error as any
    const errors: Record<string, string[]> = {}

    Object.keys(validationError.errors).forEach((key) => {
      errors[key] = [validationError.errors[key].message]
    })

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        errors,
      },
      { status: 400 },
    )
  }

  // Handle Mongoose duplicate key errors
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    const duplicateError = error as any
    const field = Object.keys(duplicateError.keyValue)[0]
    const value = duplicateError.keyValue[field]

    return NextResponse.json(
      {
        success: false,
        error: `${field} '${value}' already exists`,
      },
      { status: 409 },
    )
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
    },
    { status: 500 },
  )
}

export function asyncHandler(fn: Function) {
  return async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}
