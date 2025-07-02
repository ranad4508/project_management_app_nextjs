"use client";

import { useState } from "react";
import { Bell, Check, Trash2, Filter, Search, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  type Notification,
} from "@/src/store/api/notificationApi";
import { NotificationType, NotificationStatus } from "@/src/enums/notification.enum";

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

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [page, setPage] = useState(1);

  // API hooks
  const { data: unreadCountData } = useGetUnreadCountQuery();
  const { data: notificationsData, isLoading } = useGetNotificationsQuery({
    page,
    limit: 20,
    status: activeTab === "unread" ? NotificationStatus.UNREAD : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const unreadCount = unreadCountData?.data?.count || 0;
  const notifications = notificationsData?.data?.notifications || [];
  const pagination = notificationsData?.data?.pagination;

  // Filter notifications by search query
  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications([...selectedNotifications, notificationId]);
    } else {
      setSelectedNotifications(
        selectedNotifications.filter((id) => id !== notificationId)
      );
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map((n) => n._id));
    } else {
      setSelectedNotifications([]);
    }
  };

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
      setSelectedNotifications([]);
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId).unwrap();
      toast.success("Notification deleted");
      setSelectedNotifications(
        selectedNotifications.filter((id) => id !== notificationId)
      );
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      await Promise.all(
        selectedNotifications.map((id) => markAsRead(id).unwrap())
      );
      toast.success("Selected notifications marked as read");
      setSelectedNotifications([]);
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedNotifications.map((id) => deleteNotification(id).unwrap())
      );
      toast.success("Selected notifications deleted");
      setSelectedNotifications([]);
    } catch (error) {
      toast.error("Failed to delete notifications");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your workspace activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {unreadCount} unread
          </Badge>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as NotificationType | "all")}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value={NotificationType.TASK_ASSIGNED}>Task assigned</SelectItem>
                <SelectItem value={NotificationType.TASK_UPDATED}>Task updated</SelectItem>
                <SelectItem value={NotificationType.TASK_COMPLETED}>Task completed</SelectItem>
                <SelectItem value={NotificationType.PROJECT_UPDATED}>Project updated</SelectItem>
                <SelectItem value={NotificationType.COMMENT_ADDED}>Comments</SelectItem>
                <SelectItem value={NotificationType.MENTION}>Mentions</SelectItem>
                <SelectItem value={NotificationType.DUE_DATE_REMINDER}>Due dates</SelectItem>
                <SelectItem value={NotificationType.INVITATION}>Invitations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedNotifications.length} notification(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkMarkAsRead}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || typeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "We'll notify you when something happens"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        selectedNotifications.length === filteredNotifications.length &&
                        filteredNotifications.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Select all notifications
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications List */}
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification._id}
                    notification={notification}
                    isSelected={selectedNotifications.includes(notification._id)}
                    onSelect={(checked) =>
                      handleSelectNotification(notification._id, checked)
                    }
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={!pagination.hasNext}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationCard({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onDelete,
}: NotificationCardProps) {
  const isUnread = notification.status === NotificationStatus.UNREAD;

  return (
    <Card className={`transition-all ${isUnread ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
          />

          <div className="flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getNotificationColor(
                notification.type
              )}`}
            >
              {getNotificationIcon(notification.type)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {isUnread && (
                    <Badge variant="secondary" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
