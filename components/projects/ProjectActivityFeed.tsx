"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  User,
  Tag,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  task?: {
    _id: string;
    title: string;
  };
  createdAt: string;
}

interface ProjectActivityFeedProps {
  projectId: string;
  activities?: ActivityItem[];
  isLoading?: boolean;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case "created":
      return <Plus className="w-4 h-4 text-green-500" />;
    case "updated":
      return <Edit className="w-4 h-4 text-blue-500" />;
    case "deleted":
      return <Trash2 className="w-4 h-4 text-red-500" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "assigned":
      return <User className="w-4 h-4 text-purple-500" />;
    case "labeled":
      return <Tag className="w-4 h-4 text-orange-500" />;
    case "attached":
      return <Paperclip className="w-4 h-4 text-gray-500" />;
    case "commented":
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    default:
      return <Activity className="w-4 h-4 text-gray-500" />;
  }
};

const getActivityMessage = (activity: ActivityItem) => {
  const { action, field, oldValue, newValue, task } = activity;
  const taskTitle = task?.title || "Unknown Task";

  // Debug logging
  console.log("Activity:", activity);
  console.log("Task:", task);
  console.log("Task title:", taskTitle);

  switch (action) {
    case "created":
      return `created task "${taskTitle}"`;
    case "updated":
      if (field === "status") {
        return `changed status of "${taskTitle}" from ${oldValue} to ${newValue}`;
      }
      if (field === "priority") {
        return `changed priority of "${taskTitle}" from ${oldValue} to ${newValue}`;
      }
      if (field === "assignedTo") {
        return `assigned "${taskTitle}" to ${newValue}`;
      }
      if (field === "dueDate") {
        return `updated due date of "${taskTitle}"`;
      }
      return `updated "${taskTitle}"`;
    case "completed":
      return `completed task "${taskTitle}"`;
    case "deleted":
      return `deleted task "${taskTitle}"`;
    case "commented":
      return `commented on "${taskTitle}"`;
    case "attached":
      return `added attachment to "${taskTitle}"`;
    case "labeled":
      return `added label to "${taskTitle}"`;
    default:
      return `performed ${action} on "${taskTitle}"`;
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ProjectActivityFeed({
  projectId,
  activities = [],
  isLoading = false,
}: ProjectActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">
              Activity will appear here as team members work on tasks
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="flex items-start gap-3 pb-4 border-b last:border-b-0"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={activity.user.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(activity.user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {getActivityIcon(activity.action)}
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      {getActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                {/* Show additional context for certain actions */}
                {activity.action === "updated" &&
                  activity.field === "status" && (
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <Badge variant="outline" className="text-xs">
                        {activity.oldValue}
                      </Badge>
                      <span className="text-xs text-gray-400">→</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.newValue}
                      </Badge>
                    </div>
                  )}

                {activity.action === "updated" &&
                  activity.field === "priority" && (
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <Badge variant="outline" className="text-xs">
                        {activity.oldValue}
                      </Badge>
                      <span className="text-xs text-gray-400">→</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.newValue}
                      </Badge>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>

        {activities.length > 10 && (
          <div className="text-center pt-4">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View all activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
