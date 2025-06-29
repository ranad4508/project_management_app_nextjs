"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Circle,
  Flag,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Paperclip
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useGetTaskActivitiesQuery } from "@/src/store/api/taskApi";

interface TaskActivitiesProps {
  taskId: string;
}

const getActivityIcon = (action: string) => {
  if (action.includes('created')) return Plus;
  if (action.includes('updated') || action.includes('changed')) return Edit;
  if (action.includes('deleted')) return Trash2;
  if (action.includes('completed')) return CheckCircle;
  if (action.includes('reopened')) return Circle;
  if (action.includes('assigned')) return User;
  if (action.includes('priority')) return Flag;
  if (action.includes('due date')) return Calendar;
  if (action.includes('label')) return Tag;
  if (action.includes('comment')) return MessageSquare;
  if (action.includes('attachment')) return Paperclip;
  return Activity;
};

const getActivityColor = (action: string) => {
  if (action.includes('created')) return 'text-green-600';
  if (action.includes('completed')) return 'text-green-600';
  if (action.includes('deleted')) return 'text-red-600';
  if (action.includes('updated') || action.includes('changed')) return 'text-blue-600';
  if (action.includes('assigned')) return 'text-purple-600';
  if (action.includes('priority')) return 'text-orange-600';
  return 'text-gray-600';
};

export function TaskActivities({ taskId }: TaskActivitiesProps) {
  const {
    data: activitiesResponse,
    isLoading,
  } = useGetTaskActivitiesQuery(taskId);

  const activities = activitiesResponse?.data || [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatActivityText = (activity: any) => {
    let text = activity.action;
    
    if (activity.field && activity.oldValue && activity.newValue) {
      text += ` ${activity.field} from "${activity.oldValue}" to "${activity.newValue}"`;
    } else if (activity.field && activity.newValue) {
      text += ` ${activity.field} to "${activity.newValue}"`;
    }
    
    return text;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <Activity className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">No activity yet</h3>
              <p className="text-gray-600 text-sm mt-1">
                Task activities will appear here as changes are made.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const ActivityIcon = getActivityIcon(activity.action);
        const iconColor = getActivityColor(activity.action);
        const isRecent = index < 3;
        
        return (
          <Card key={activity._id} className={isRecent ? "border-blue-200" : ""}>
            <CardContent className="p-4">
              <div className="flex space-x-3">
                <div className={`p-2 rounded-full bg-gray-100 ${iconColor}`}>
                  <ActivityIcon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={activity.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900 text-sm">
                          {activity.user.name}
                        </span>
                        {isRecent && (
                          <Badge variant="secondary" className="text-xs">
                            Recent
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700">
                        {formatActivityText(activity)}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                        <span>•</span>
                        <span>
                          {format(new Date(activity.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {activities.length > 10 && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">
              Showing recent activities. Older activities are archived.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
