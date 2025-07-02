"use client";

import { useState } from "react";
import { Activity, Clock, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useGetDashboardActivitiesQuery } from "@/src/store/api/notificationApi";
import { NotificationType } from "@/src/enums/notification.enum";

const getActivityIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_UPDATED:
    case NotificationType.TASK_COMPLETED:
      return "📋";
    case NotificationType.PROJECT_CREATED:
    case NotificationType.PROJECT_UPDATED:
      return "📁";
    case NotificationType.WORKSPACE_CREATED:
    case NotificationType.WORKSPACE_UPDATED:
      return "🏢";
    case NotificationType.COMMENT_ADDED:
      return "💬";
    case NotificationType.MENTION:
      return "👤";
    case NotificationType.DUE_DATE_REMINDER:
      return "⏰";
    case NotificationType.INVITATION:
      return "📧";
    default:
      return "🔔";
  }
};

const getActivityColor = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_UPDATED:
      return "text-blue-600";
    case NotificationType.TASK_COMPLETED:
      return "text-green-600";
    case NotificationType.PROJECT_CREATED:
    case NotificationType.PROJECT_UPDATED:
      return "text-purple-600";
    case NotificationType.WORKSPACE_CREATED:
    case NotificationType.WORKSPACE_UPDATED:
      return "text-orange-600";
    case NotificationType.COMMENT_ADDED:
      return "text-cyan-600";
    case NotificationType.MENTION:
      return "text-yellow-600";
    case NotificationType.DUE_DATE_REMINDER:
      return "text-red-600";
    case NotificationType.INVITATION:
      return "text-indigo-600";
    default:
      return "text-gray-600";
  }
};

interface DashboardActivitiesProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function DashboardActivities({
  limit = 5,
  showHeader = true,
  className = "",
}: DashboardActivitiesProps) {
  const { data: activitiesData, isLoading } = useGetDashboardActivitiesQuery({
    limit,
  });

  const activities = activitiesData?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground">
              Activity will appear here as you work
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/dashboard/notifications")}
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm ${getActivityColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {activity.relatedTo && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.relatedTo.model}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactDashboardActivities({
  limit = 3,
  className = "",
}: {
  limit?: number;
  className?: string;
}) {
  const { data: activitiesData, isLoading } = useGetDashboardActivitiesQuery({
    limit,
  });

  const activities = activitiesData?.data || [];

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {activities.map((activity) => (
        <div key={activity._id} className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div
              className={`w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs ${getActivityColor(
                activity.type
              )}`}
            >
              {getActivityIcon(activity.type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground line-clamp-2">
              {activity.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
