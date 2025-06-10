import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  ListTodo,
  MessageSquare,
  PlusCircle,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome back, {session.user.name || "User"}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +5 from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              -2 from yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +1 this month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Tasks</h2>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
          <div className="grid gap-4">
            <TaskCard
              title="Update dashboard design"
              status="In Progress"
              dueDate="Today"
              priority="High"
            />
            <TaskCard
              title="Implement authentication flow"
              status="In Review"
              dueDate="Tomorrow"
              priority="Medium"
            />
            <TaskCard
              title="Fix navigation responsiveness"
              status="Todo"
              dueDate="Next Week"
              priority="Low"
            />
            <TaskCard
              title="Create API documentation"
              status="Todo"
              dueDate="Next Week"
              priority="Medium"
            />
          </div>
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard/tasks">View All Tasks</Link>
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="messages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Messages</h2>
            <Button size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </div>
          <div className="grid gap-4">
            <MessageCard
              sender="Alex Johnson"
              preview="Hey, can you review the latest design changes?"
              time="10 min ago"
              unread
            />
            <MessageCard
              sender="Sarah Williams"
              preview="The client approved the proposal! We can start next week."
              time="1 hour ago"
            />
            <MessageCard
              sender="Team Alpha"
              preview="Weekly standup meeting is scheduled for tomorrow at 10 AM."
              time="Yesterday"
            />
          </div>
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard/messages">View All Messages</Link>
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <div className="space-y-4">
            <ActivityItem
              icon={<CheckCircle className="h-4 w-4" />}
              title="Task Completed"
              description="You completed 'Update user profile page'"
              time="10 minutes ago"
            />
            <ActivityItem
              icon={<Users className="h-4 w-4" />}
              title="New Team Member"
              description="Emily Chen joined Project X"
              time="2 hours ago"
            />
            <ActivityItem
              icon={<MessageSquare className="h-4 w-4" />}
              title="New Comment"
              description="Alex commented on 'API Integration Task'"
              time="Yesterday"
            />
            <ActivityItem
              icon={<Calendar className="h-4 w-4" />}
              title="Meeting Scheduled"
              description="Client presentation scheduled for Friday, 2 PM"
              time="2 days ago"
            />
          </div>
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard/activity">View All Activity</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks due in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeadlineItem
              title="Complete API documentation"
              date="Tomorrow"
              progress={75}
              variant="warning"
            />
            <DeadlineItem
              title="Finalize dashboard design"
              date="In 2 days"
              progress={40}
              variant="default"
            />
            <DeadlineItem
              title="User testing session"
              date="In 5 days"
              progress={10}
              variant="default"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Activity</CardTitle>
            <CardDescription>Recent actions from your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActivityItem
              avatar="/placeholder.svg?height=32&width=32"
              title="Sarah Williams"
              description="Created a new task: 'Implement search functionality'"
              time="Just now"
            />
            <ActivityItem
              avatar="/placeholder.svg?height=32&width=32"
              title="Alex Johnson"
              description="Completed 'Fix navigation bug'"
              time="1 hour ago"
            />
            <ActivityItem
              avatar="/placeholder.svg?height=32&width=32"
              title="Emily Chen"
              description="Commented on 'User authentication flow'"
              time="3 hours ago"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface TaskCardProps {
  title: string;
  status: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
}

function TaskCard({ title, status, dueDate, priority }: TaskCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400";
      case "Medium":
        return "text-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400";
      case "Low":
        return "text-green-500 bg-green-50 dark:bg-green-950 dark:text-green-400";
      default:
        return "text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "text-green-500 bg-green-50 dark:bg-green-950 dark:text-green-400";
      case "In Progress":
        return "text-blue-500 bg-blue-50 dark:bg-blue-950 dark:text-blue-400";
      case "In Review":
        return "text-purple-500 bg-purple-50 dark:bg-purple-950 dark:text-purple-400";
      default:
        return "text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center p-4">
          <div className="flex-1">
            <h3 className="font-medium">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Due: {dueDate}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                  status
                )}`}
              >
                {status}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(
                  priority
                )}`}
              >
                {priority}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface MessageCardProps {
  sender: string;
  preview: string;
  time: string;
  unread?: boolean;
}

function MessageCard({ sender, preview, time, unread }: MessageCardProps) {
  return (
    <Card className={unread ? "border-l-4 border-l-blue-500" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <h3 className={`font-medium ${unread ? "font-semibold" : ""}`}>
            {sender}
          </h3>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{preview}</p>
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  icon?: React.ReactNode;
  avatar?: string;
  title: string;
  description: string;
  time: string;
}

function ActivityItem({
  icon,
  avatar,
  title,
  description,
  time,
}: ActivityItemProps) {
  return (
    <div className="flex items-start gap-4">
      {avatar ? (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
          <img
            src={avatar || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : icon ? (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {icon}
        </div>
      ) : null}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

interface DeadlineItemProps {
  title: string;
  date: string;
  progress: number;
  variant?: "default" | "warning" | "danger";
}

function DeadlineItem({
  title,
  date,
  progress,
  variant = "default",
}: DeadlineItemProps) {
  const getVariantColor = (variant: string) => {
    switch (variant) {
      case "warning":
        return "bg-yellow-500";
      case "danger":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs text-gray-500">{date}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getVariantColor(variant)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
