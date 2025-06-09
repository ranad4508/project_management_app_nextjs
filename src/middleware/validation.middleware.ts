import { z } from "zod"
import { ValidationError } from "@/src/errors/AppError"

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}

      error.errors.forEach((err) => {
        const path = err.path.join(".")
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })

      throw new ValidationError("Validation failed", errors)
    }
    throw error
  }
}

// Common validation schemas
export const schemas = {
  register: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase, uppercase, and number"),
  }),

  login: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    mfaCode: z.string().optional(),
  }),

  createWorkspace: z.object({
    name: z.string().min(2, "Workspace name must be at least 2 characters").max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
  }),

  updateWorkspace: z.object({
    name: z.string().min(2, "Workspace name must be at least 2 characters").max(100, "Name too long").optional(),
    description: z.string().max(500, "Description too long").optional(),
  }),

  inviteMember: z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["admin", "member", "guest"]),
    message: z.string().max(500, "Message too long").optional(),
  }),

  createProject: z.object({
    name: z.string().min(2, "Project name must be at least 2 characters").max(100, "Name too long"),
    description: z.string().max(1000, "Description too long").optional(),
    workspaceId: z.string().min(1, "Workspace ID is required"),
    members: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  }),

  createTask: z.object({
    title: z.string().min(2, "Task title must be at least 2 characters").max(200, "Title too long"),
    description: z.string().max(2000, "Description too long").optional(),
    projectId: z.string().min(1, "Project ID is required"),
    assignedTo: z.string().optional(),
    status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    type: z.enum(["task", "bug", "feature", "improvement"]).optional(),
    dueDate: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
    estimatedHours: z.number().min(0).max(1000).optional(),
  }),

  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
}
