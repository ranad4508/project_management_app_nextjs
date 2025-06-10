"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useCreateWorkspaceMutation } from "@/src/store/api/workspaceApi";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap();

      toast.success("Workspace created successfully");
      router.push(`/dashboard/workspaces/${workspace._id}`);
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to create workspace");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/workspaces">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workspaces
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Workspace
          </h1>
          <p className="text-muted-foreground">
            Set up a new workspace for your team
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>
            Provide basic information about your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workspace name"
                required
              />
              <p className="text-sm text-muted-foreground">
                Choose a name that represents your team or project
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workspace is for..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Optional: Help team members understand the purpose of this
                workspace
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/workspaces">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workspace
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
