"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import {
  useGetWorkspaceLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
} from "@/src/store/api/labelApi";
import { toast } from "sonner";

interface LabelManagerProps {
  workspaceId: string;
  projectId?: string;
  selectedLabels?: string[];
  onLabelsChange?: (labels: string[]) => void;
  mode?: "select" | "manage";
}

const colorOptions = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export function LabelManager({
  workspaceId,
  projectId,
  selectedLabels = [],
  onLabelsChange,
  mode = "select",
}: LabelManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<any>(null);
  const [newLabel, setNewLabel] = useState({
    name: "",
    color: colorOptions[0],
  });

  const {
    data: labelsResponse,
    isLoading,
    refetch,
    error,
  } = useGetWorkspaceLabelsQuery({
    workspaceId,
    page: 1,
    limit: 100,
    ...(projectId && { project: projectId }),
  });

  const [createLabel] = useCreateLabelMutation();
  const [updateLabel] = useUpdateLabelMutation();
  const [deleteLabel] = useDeleteLabelMutation();

  const labels = labelsResponse?.data?.labels || [];

  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) {
      toast.error("Label name is required");
      return;
    }

    try {
      await createLabel({
        workspaceId,
        name: newLabel.name.trim(),
        color: newLabel.color,
        ...(projectId && { project: projectId }),
      }).unwrap();

      setNewLabel({ name: "", color: colorOptions[0] });
      setIsCreateOpen(false);
      toast.success("Label created successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to create label");
      console.error("Create label error:", error);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel?.name?.trim()) {
      toast.error("Label name is required");
      return;
    }

    try {
      await updateLabel({
        labelId: editingLabel._id,
        name: editingLabel.name.trim(),
        color: editingLabel.color,
      }).unwrap();

      setEditingLabel(null);
      toast.success("Label updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update label");
      console.error("Update label error:", error);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      await deleteLabel({ labelId }).unwrap();
      toast.success("Label deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete label");
    }
  };

  const handleLabelToggle = (labelId: string) => {
    if (!onLabelsChange) return;

    const newSelectedLabels = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId];

    onLabelsChange(newSelectedLabels);
  };

  if (mode === "select") {
    return (
      <div className="space-y-2">
        <Label>Labels</Label>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <Badge
              key={label._id}
              variant={
                selectedLabels.includes(label._id) ? "default" : "outline"
              }
              className="cursor-pointer"
              style={{
                backgroundColor: selectedLabels.includes(label._id)
                  ? label.color
                  : "transparent",
                borderColor: label.color,
                color: selectedLabels.includes(label._id)
                  ? "white"
                  : label.color,
              }}
              onClick={() => handleLabelToggle(label._id)}
            >
              <Tag className="w-3 h-3 mr-1" />
              {label.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Labels</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Label
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Label</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newLabel.name}
                  onChange={(e) =>
                    setNewLabel({ ...newLabel, name: e.target.value })
                  }
                  placeholder="Label name"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newLabel.color === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewLabel({ ...newLabel, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateLabel} disabled={!newLabel.name}>
                  Create Label
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {labels.map((label) => (
          <div
            key={label._id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <div>
                <div className="font-medium">{label.name}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingLabel(label)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteLabel(label._id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Label Dialog */}
      <Dialog open={!!editingLabel} onOpenChange={() => setEditingLabel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          {editingLabel && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingLabel.name}
                  onChange={(e) =>
                    setEditingLabel({ ...editingLabel, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingLabel.color === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setEditingLabel({ ...editingLabel, color })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingLabel(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateLabel}>Update Label</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
