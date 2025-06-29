"use client";

import React, { useState, useMemo } from "react";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Building,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useGetTasksQuery } from "@/src/store/api/taskApi";
import { useGetUserProjectsQuery } from "@/src/store/api/projectApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import { ProjectStatus } from "@/src/enums/project.enum";
import { GanttChart } from "@/components/calendar/GanttChart";

const localizer = momentLocalizer(moment);

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "task" | "project" | "subtask";
    status: string;
    priority?: string;
    assignedTo?: any;
    project?: any;
    workspace?: any;
    createdBy?: any;
    parentTask?: string;
  };
};

type ViewType = "calendar" | "gantt";

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState<ViewType>("calendar");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Fetch tasks and projects - always call hooks in the same order
  const { data: tasksResponse, isLoading: tasksLoading } = useGetTasksQuery(
    {
      page: 1,
      limit: 1000, // Get all tasks for calendar view
    },
    {
      skip: !session?.user?.id, // Skip if no user session
    }
  );

  const { data: projectsResponse, isLoading: projectsLoading } =
    useGetUserProjectsQuery(
      {
        page: 1,
        limit: 1000, // Get all projects for calendar view
      },
      {
        skip: !session?.user?.id, // Skip if no user session
      }
    );

  const tasks = tasksResponse?.data?.tasks || [];
  const projects = projectsResponse?.projects || [];

  // Loading state for data fetching
  const isDataLoading = tasksLoading || projectsLoading;

  // Convert tasks and projects to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Add project events
    projects.forEach((project: any) => {
      // Add project start date event if available
      if (project.startDate) {
        calendarEvents.push({
          id: `project-start-${project._id}`,
          title: `🚀 ${project.name} (Start)`,
          start: new Date(project.startDate),
          end: new Date(project.startDate),
          resource: {
            type: "project",
            status: project.status,
            priority: project.priority,
            workspace: project.workspace,
            createdBy: project.createdBy,
          },
        });
      }

      // Add project due date event if available
      if (project.dueDate) {
        calendarEvents.push({
          id: `project-due-${project._id}`,
          title: `📋 ${project.name} (Due)`,
          start: new Date(project.dueDate),
          end: new Date(project.dueDate),
          resource: {
            type: "project",
            status: project.status,
            priority: project.priority,
            workspace: project.workspace,
            createdBy: project.createdBy,
          },
        });
      }

      // Add project completion event if available
      if (project.completedAt) {
        calendarEvents.push({
          id: `project-completed-${project._id}`,
          title: `✅ ${project.name} (Completed)`,
          start: new Date(project.completedAt),
          end: new Date(project.completedAt),
          resource: {
            type: "project",
            status: project.status,
            priority: project.priority,
            workspace: project.workspace,
            createdBy: project.createdBy,
          },
        });
      }
    });

    // Add task events
    tasks.forEach((task: any) => {
      // Add task start date event if available
      if (task.startDate) {
        calendarEvents.push({
          id: `task-start-${task._id}`,
          title: `🚀 ${task.title} (Start)`,
          start: new Date(task.startDate),
          end: new Date(task.startDate),
          resource: {
            type: "task",
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignedTo,
            project: task.project,
            createdBy: task.createdBy,
          },
        });
      }

      // Add task due date event if available
      if (task.dueDate) {
        calendarEvents.push({
          id: `task-due-${task._id}`,
          title: `📝 ${task.title} (Due)`,
          start: new Date(task.dueDate),
          end: new Date(task.dueDate),
          resource: {
            type: "task",
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignedTo,
            project: task.project,
            createdBy: task.createdBy,
          },
        });
      }

      // Add task completion date event if available and task is completed
      if (task.completedAt && task.status === "done") {
        calendarEvents.push({
          id: `task-completed-${task._id}`,
          title: `✅ ${task.title} (Completed)`,
          start: new Date(task.completedAt),
          end: new Date(task.completedAt),
          resource: {
            type: "task",
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignedTo,
            project: task.project,
            createdBy: task.createdBy,
          },
        });
      }

      // Add subtask events (only if they have valid titles and IDs)
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks
          .filter(
            (subtask: any) =>
              subtask &&
              subtask._id &&
              subtask.title &&
              subtask.title.trim() !== ""
          )
          .forEach((subtask: any) => {
            // Add subtask start date event if available
            if (subtask.startDate) {
              calendarEvents.push({
                id: `subtask-start-${subtask._id}`,
                title: `🔸 ${subtask.title} (Subtask Start)`,
                start: new Date(subtask.startDate),
                end: new Date(subtask.startDate),
                resource: {
                  type: "subtask",
                  status: subtask.status,
                  priority: subtask.priority,
                  project: task.project,
                  parentTask: task.title,
                },
              });
            }

            // Add subtask due date event if available
            if (subtask.dueDate) {
              calendarEvents.push({
                id: `subtask-due-${subtask._id}`,
                title: `📋 ${subtask.title} (Subtask Due)`,
                start: new Date(subtask.dueDate),
                end: new Date(subtask.dueDate),
                resource: {
                  type: "subtask",
                  status: subtask.status,
                  priority: subtask.priority,
                  project: task.project,
                  parentTask: task.title,
                },
              });
            }

            // Add subtask completion event if available and completed
            if (subtask.completedAt && subtask.status === "done") {
              calendarEvents.push({
                id: `subtask-completed-${subtask._id}`,
                title: `✅ ${subtask.title} (Subtask Completed)`,
                start: new Date(subtask.completedAt),
                end: new Date(subtask.completedAt),
                resource: {
                  type: "subtask",
                  status: subtask.status,
                  priority: subtask.priority,
                  project: task.project,
                  parentTask: task.title,
                },
              });
            }
          });
      }
    });

    return calendarEvents;
  }, [tasks, projects]);

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const typeMatch =
        filterType === "all" || event.resource.type === filterType;
      const statusMatch =
        filterStatus === "all" || event.resource.status === filterStatus;
      const priorityMatch =
        filterPriority === "all" || event.resource.priority === filterPriority;
      return typeMatch && statusMatch && priorityMatch;
    });
  }, [events, filterType, filterStatus, filterPriority]);

  // Event style function
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3174ad";
    let borderColor = "#3174ad";

    // Color by type and status
    switch (event.resource.type) {
      case "project":
        // Different shades of purple for different project events
        if (event.title.includes("Start")) {
          backgroundColor = "#7c3aed"; // Violet-600
          borderColor = "#7c3aed";
        } else if (event.title.includes("Due")) {
          backgroundColor = "#8b5cf6"; // Violet-500
          borderColor = "#8b5cf6";
        } else if (event.title.includes("Completed")) {
          backgroundColor = "#a855f7"; // Violet-400
          borderColor = "#a855f7";
        } else {
          backgroundColor = "#8b5cf6";
          borderColor = "#8b5cf6";
        }
        break;
      case "task":
        // Color by status with different shades for start/due/completed
        const isStart = event.title.includes("Start");
        const isDue = event.title.includes("Due");

        switch (event.resource.status) {
          case TaskStatus.TODO:
            backgroundColor = isStart
              ? "#4b5563"
              : isDue
              ? "#6b7280"
              : "#9ca3af";
            borderColor = backgroundColor;
            break;
          case TaskStatus.IN_PROGRESS:
            backgroundColor = isStart
              ? "#1d4ed8"
              : isDue
              ? "#3b82f6"
              : "#60a5fa";
            borderColor = backgroundColor;
            break;
          case TaskStatus.IN_REVIEW:
            backgroundColor = isStart
              ? "#d97706"
              : isDue
              ? "#f59e0b"
              : "#fbbf24";
            borderColor = backgroundColor;
            break;
          case TaskStatus.DONE:
            backgroundColor = isStart
              ? "#059669"
              : isDue
              ? "#10b981"
              : "#34d399";
            borderColor = backgroundColor;
            break;
          case TaskStatus.BLOCKED:
            backgroundColor = isStart
              ? "#dc2626"
              : isDue
              ? "#ef4444"
              : "#f87171";
            borderColor = backgroundColor;
            break;
        }
        break;
      case "subtask":
        // Different shades of cyan for subtasks
        if (event.title.includes("Start")) {
          backgroundColor = "#0891b2"; // Cyan-600
          borderColor = "#0891b2";
        } else if (event.title.includes("Due")) {
          backgroundColor = "#06b6d4"; // Cyan-500
          borderColor = "#06b6d4";
        } else if (event.title.includes("Completed")) {
          backgroundColor = "#22d3ee"; // Cyan-400
          borderColor = "#22d3ee";
        } else {
          backgroundColor = "#06b6d4";
          borderColor = "#06b6d4";
        }
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: "white",
        border: "none",
        borderRadius: "4px",
        fontSize: "12px",
      },
    };
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (view: View) => {
    setCalendarView(view);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    console.log("Selected slot:", start, end);
    // Here you could implement creating new events
  };

  // Handle loading and authentication after all hooks
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/login");
  }

  // Show loading state while fetching data
  if (isDataLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Loading calendar data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Timeline</h1>
          <p className="text-muted-foreground">
            View your projects, tasks, and deadlines in calendar and Gantt chart
            format
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "calendar" ? "default" : "outline"}
            onClick={() => setCurrentView("calendar")}
            className="flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </Button>
          <Button
            variant={currentView === "gantt" ? "default" : "outline"}
            onClick={() => setCurrentView("gantt")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Gantt Chart
          </Button>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="project">Projects</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="subtask">Subtasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                      <SelectItem value={TaskStatus.IN_PROGRESS}>
                        In Progress
                      </SelectItem>
                      <SelectItem value={TaskStatus.IN_REVIEW}>
                        In Review
                      </SelectItem>
                      <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                      <SelectItem value={TaskStatus.BLOCKED}>
                        Blocked
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={filterPriority}
                    onValueChange={setFilterPriority}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                      <SelectItem value={TaskPriority.MEDIUM}>
                        Medium
                      </SelectItem>
                      <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                      <SelectItem value={TaskPriority.URGENT}>
                        Urgent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {filteredEvents.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Events
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {
                      filteredEvents.filter(
                        (e) => e.resource.status === TaskStatus.DONE
                      ).length
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-600">
                    {
                      filteredEvents.filter(
                        (e) => e.resource.status === TaskStatus.IN_PROGRESS
                      ).length
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    In Progress
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">
                    {
                      filteredEvents.filter(
                        (e) =>
                          new Date(e.end) < new Date() &&
                          e.resource.status !== TaskStatus.DONE
                      ).length
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar/Gantt View */}
      {currentView === "calendar" ? (
        <Card>
          <CardContent className="p-6">
            {filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No events to display</p>
                  <p className="text-sm">
                    Create some projects and tasks to see them in the calendar
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ height: "600px" }}>
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  view={calendarView}
                  onView={handleViewChange}
                  date={currentDate}
                  onNavigate={handleNavigate}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  popup
                  showMultiDayTimes
                  step={60}
                  showAllEvents
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <GanttChart tasks={tasks} projects={projects} />
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
              <span className="text-xs">Project Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-xs">Project Due</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-xs">Task (In Progress)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-xs">Task (Done)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-xs">Task (Blocked)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-cyan-500 rounded"></div>
              <span className="text-xs">Subtasks</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <p>
              💡 <strong>Tip:</strong> Different shades indicate event types -
              darker for start dates, medium for due dates, lighter for
              completed events
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                <Badge variant="outline" className="mt-1">
                  {selectedEvent.resource.type.charAt(0).toUpperCase() +
                    selectedEvent.resource.type.slice(1)}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {moment(selectedEvent.start).format("MMM DD, YYYY HH:mm")}
                    {selectedEvent.start.getTime() !==
                      selectedEvent.end.getTime() &&
                      ` - ${moment(selectedEvent.end).format(
                        "MMM DD, YYYY HH:mm"
                      )}`}
                  </span>
                </div>

                {selectedEvent.resource.assignedTo && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedEvent.resource.assignedTo.name}
                    </span>
                  </div>
                )}

                {selectedEvent.resource.project && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedEvent.resource.project.name}
                    </span>
                  </div>
                )}

                {selectedEvent.resource.parentTask && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Parent Task: {selectedEvent.resource.parentTask}
                    </span>
                  </div>
                )}

                {selectedEvent.resource.workspace && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Workspace: {selectedEvent.resource.workspace.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="secondary">
                    {selectedEvent.resource.status
                      .replace("_", " ")
                      .toUpperCase()}
                  </Badge>
                </div>

                {selectedEvent.resource.priority && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className={
                        selectedEvent.resource.priority === "urgent"
                          ? "border-red-500 text-red-700"
                          : selectedEvent.resource.priority === "high"
                          ? "border-orange-500 text-orange-700"
                          : selectedEvent.resource.priority === "medium"
                          ? "border-yellow-500 text-yellow-700"
                          : "border-green-500 text-green-700"
                      }
                    >
                      {selectedEvent.resource.priority.toUpperCase()} Priority
                    </Badge>
                  </div>
                )}

                {selectedEvent.resource.createdBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Created by: {selectedEvent.resource.createdBy.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
