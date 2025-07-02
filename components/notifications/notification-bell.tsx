"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  type Notification,
} from "@/src/store/api/notificationApi";
import {
  NotificationType,
  NotificationStatus,
} from "@/src/enums/notification.enum";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { useSocket } from "@/contexts/socket-context";

const getNotificationIcon = (type: NotificationType) => {
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

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_UPDATED:
      return "bg-blue-100 text-blue-800";
    case NotificationType.TASK_COMPLETED:
      return "bg-green-100 text-green-800";
    case NotificationType.PROJECT_CREATED:
    case NotificationType.PROJECT_UPDATED:
      return "bg-purple-100 text-purple-800";
    case NotificationType.WORKSPACE_CREATED:
    case NotificationType.WORKSPACE_UPDATED:
      return "bg-orange-100 text-orange-800";
    case NotificationType.COMMENT_ADDED:
      return "bg-cyan-100 text-cyan-800";
    case NotificationType.MENTION:
      return "bg-yellow-100 text-yellow-800";
    case NotificationType.DUE_DATE_REMINDER:
      return "bg-red-100 text-red-800";
    case NotificationType.INVITATION:
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  // API hooks
  const { unreadCount } = useUnreadNotificationCount();
  const { isConnected } = useSocket();
  const { data: notificationsData, isLoading } = useGetNotificationsQuery({
    page: 1,
    limit: 10,
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsData?.data?.notifications || [];

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId).unwrap();
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId).unwrap();
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {/* Connection status indicator */}
          <div
            className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">We'll notify you when something happens</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDeleteNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                // Navigate to notifications page
                window.location.href = "/dashboard/notifications";
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const isUnread = notification.status === NotificationStatus.UNREAD;

  return (
    <div
      className={`p-4 hover:bg-muted/50 transition-colors ${
        isUnread ? "bg-blue-50/50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getNotificationColor(
              notification.type
            )}`}
          >
            {getNotificationIcon(notification.type)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm ${isUnread ? "font-medium" : ""}`}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isUnread && (
                  <DropdownMenuItem
                    onClick={() => onMarkAsRead(notification._id)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(notification._id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isUnread && (
            <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-2 top-4" />
          )}
        </div>
      </div>
    </div>
  );
}
