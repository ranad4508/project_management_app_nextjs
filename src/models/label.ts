import mongoose, { Schema, type Document } from "mongoose";

export interface ILabel extends Document {
  name: string;
  color: string;
  workspace: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId; // Optional: project-specific labels
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LabelSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, // Hex color validation
      default: "#3B82F6", // Default blue color
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
LabelSchema.index({ workspace: 1 });
LabelSchema.index({ project: 1 });
LabelSchema.index({ name: 1, workspace: 1 });
LabelSchema.index({ name: 1, project: 1 });

// Ensure unique label names within workspace/project scope
LabelSchema.index(
  { name: 1, workspace: 1, project: 1 },
  {
    unique: true,
    partialFilterExpression: { project: { $exists: true } },
  }
);

LabelSchema.index(
  { name: 1, workspace: 1 },
  {
    unique: true,
    partialFilterExpression: { project: { $exists: false } },
  }
);

export const Label =
  mongoose.models.Label || mongoose.model<ILabel>("Label", LabelSchema);
