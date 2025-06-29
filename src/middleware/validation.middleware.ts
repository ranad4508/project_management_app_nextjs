import { z } from "zod";
import { ValidationError } from "@/src/errors/AppError";
import {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
  TaskType,
} from "@/src/enums/task.enum";

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      throw new ValidationError("Validation failed", errors);
    }
    throw error;
  }
}

// Common validation schemas
export const schemas = {
  register: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase, uppercase, and number"
      ),
  }),

  login: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    mfaCode: z.string().optional(),
  }),

  createWorkspace: z.object({
    name: z
      .string()
      .min(2, "Workspace name must be at least 2 characters")
      .max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
  }),

  updateWorkspace: z.object({
    name: z
      .string()
      .min(2, "Workspace name must be at least 2 characters")
      .max(100, "Name too long")
      .optional(),
    description: z.string().max(500, "Description too long").optional(),
  }),

  inviteMember: z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["admin", "member", "guest"]),
    message: z.string().max(500, "Message too long").optional(),
  }),

  createProject: z.object({
    name: z
      .string()
      .min(2, "Project name must be at least 2 characters")
      .max(100, "Name too long"),
    description: z.string().max(1000, "Description too long").optional(),
    workspaceId: z.string().min(1, "Workspace ID is required"),
    members: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  }),

  createTask: z.object({
    title: z
      .string()
      .min(2, "Task title must be at least 2 characters")
      .max(200, "Title too long"),
    description: z.string().max(2000, "Description too long").optional(),
    projectId: z.string().min(1, "Project ID is required"),
    assignedTo: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    statusType: z.nativeEnum(TaskStatusType).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    type: z.nativeEnum(TaskType).optional(),
    dueDate: z.string().datetime().optional(),
    startDate: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(), // Array of label IDs
    estimatedHours: z.number().min(0).max(1000).optional(),
    parentTask: z.string().optional(), // For subtasks
  }),

  updateTask: z.object({
    title: z
      .string()
      .min(2, "Task title must be at least 2 characters")
      .max(200, "Title too long")
      .optional(),
    description: z.string().max(2000, "Description too long").optional(),
    assignedTo: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    statusType: z.nativeEnum(TaskStatusType).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    type: z.nativeEnum(TaskType).optional(),
    dueDate: z.string().datetime().optional(),
    startDate: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    estimatedHours: z.number().min(0).max(1000).optional(),
    actualHours: z.number().min(0).max(1000).optional(),
    isCompleted: z.boolean().optional(),
    completionPercentage: z.number().min(0).max(100).optional(),
  }),

  createLabel: z.object({
    name: z.string().min(1, "Label name is required").max(50, "Name too long"),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color"),
    projectId: z.string().optional(),
    project: z.string().optional(), // Alternative field name
  }),

  updateLabel: z.object({
    name: z
      .string()
      .min(1, "Label name is required")
      .max(50, "Name too long")
      .optional(),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
      .optional(),
  }),

  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
};
