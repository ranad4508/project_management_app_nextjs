"use client";

import React, { useState, useMemo, useRef } from "react";
import "@/styles/analytics.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FolderOpen,
  CheckSquare,
  Clock,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useGetTasksQuery } from "@/src/store/api/taskApi";
import { useGetUserProjectsQuery } from "@/src/store/api/projectApi";
import { useGetWorkspacesQuery } from "@/src/store/api/workspaceApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import { ProjectStatus } from "@/src/enums/project.enum";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

// Color schemes for charts
const COLORS = {
  primary: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"],
  status: {
    [TaskStatus.TODO]: "#6b7280",
    [TaskStatus.IN_PROGRESS]: "#3b82f6",
    [TaskStatus.IN_REVIEW]: "#f59e0b",
    [TaskStatus.DONE]: "#10b981",
    [TaskStatus.BLOCKED]: "#ef4444",
  },
  priority: {
    [TaskPriority.LOW]: "#10b981",
    [TaskPriority.MEDIUM]: "#f59e0b",
    [TaskPriority.HIGH]: "#ef4444",
    [TaskPriority.URGENT]: "#dc2626",
  },
  project: {
    [ProjectStatus.ACTIVE]: "#3b82f6",
    [ProjectStatus.ON_HOLD]: "#f59e0b",
    [ProjectStatus.COMPLETED]: "#10b981",
    [ProjectStatus.ARCHIVED]: "#6b7280",
  },
};

type DateRange = "7d" | "30d" | "90d" | "1y" | "all";
type ChartType = "overview" | "tasks" | "projects" | "workspaces";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [chartType, setChartType] = useState<ChartType>("overview");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const analyticsRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data: tasksResponse, isLoading: tasksLoading } = useGetTasksQuery(
    {
      page: 1,
      limit: 1000,
    },
    {
      skip: !session?.user?.id,
    }
  );

  const { data: projectsResponse, isLoading: projectsLoading } =
    useGetUserProjectsQuery(
      {
        page: 1,
        limit: 1000,
      },
      {
        skip: !session?.user?.id,
      }
    );

  const { data: workspacesResponse, isLoading: workspacesLoading } =
    useGetWorkspacesQuery(
      {
        page: 1,
        limit: 100,
      },
      {
        skip: !session?.user?.id,
      }
    );

  const tasks = tasksResponse?.data?.tasks || [];
  const projects = projectsResponse?.projects || [];
  const workspaces = workspacesResponse?.workspaces || [];

  const isDataLoading = tasksLoading || projectsLoading || workspacesLoading;

  // Filter data based on date range
  const getDateFilter = (range: DateRange) => {
    const now = new Date();
    switch (range) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case "1y":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  };

  const dateFilter = getDateFilter(dateRange);

  // Apply all filters to tasks
  const filteredTasks = tasks.filter((task: any) => {
    // Date filter
    const dateMatch = new Date(task.createdAt) >= dateFilter;

    // Workspace filter
    const workspaceMatch =
      selectedWorkspace === "all" ||
      task.project?.workspace?._id === selectedWorkspace ||
      task.project?.workspace === selectedWorkspace;

    // Status filter
    const statusMatch =
      selectedStatus === "all" || task.status === selectedStatus;

    return dateMatch && workspaceMatch && statusMatch;
  });

  // Apply filters to projects
  const filteredProjects = projects.filter((project: any) => {
    // Date filter
    const dateMatch = new Date(project.createdAt) >= dateFilter;

    // Workspace filter
    const workspaceMatch =
      selectedWorkspace === "all" ||
      project.workspace?._id === selectedWorkspace ||
      project.workspace === selectedWorkspace;

    return dateMatch && workspaceMatch;
  });

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(
      (task: any) => task.status === TaskStatus.DONE
    ).length;
    const inProgressTasks = filteredTasks.filter(
      (task: any) => task.status === TaskStatus.IN_PROGRESS
    ).length;
    const overdueTasks = filteredTasks.filter(
      (task: any) =>
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== TaskStatus.DONE
    ).length;

    const totalProjects = filteredProjects.length;
    const activeProjects = filteredProjects.filter(
      (project: any) => project.status === ProjectStatus.ACTIVE
    ).length;
    const completedProjects = filteredProjects.filter(
      (project: any) => project.status === ProjectStatus.COMPLETED
    ).length;

    // Calculate effort-based completion rate
    const totalEffort = filteredTasks.reduce(
      (sum: number, task: any) => sum + (task.estimatedHours || 0),
      0
    );
    const completedEffort = filteredTasks
      .filter((task: any) => task.status === TaskStatus.DONE)
      .reduce((sum: number, task: any) => sum + (task.estimatedHours || 0), 0);

    // Use only effort-based completion rate
    const completionRate =
      totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;
    const projectCompletionRate =
      totalProjects > 0
        ? Math.round((completedProjects / totalProjects) * 100)
        : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      completedProjects,
      totalWorkspaces: workspaces.length,
      completionRate,
      projectCompletionRate,
    };
  }, [filteredTasks, filteredProjects, workspaces]);

  // Prepare chart data
  const taskStatusData = useMemo(() => {
    const statusCounts = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 0,
      [TaskStatus.BLOCKED]: 0,
    };

    filteredTasks.forEach((task: any) => {
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status as keyof typeof statusCounts]++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace("_", " ").toUpperCase(),
      value: count,
      color: COLORS.status[status as keyof typeof COLORS.status],
    }));
  }, [filteredTasks]);

  const taskPriorityData = useMemo(() => {
    const priorityCounts = {
      [TaskPriority.LOW]: 0,
      [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0,
      [TaskPriority.URGENT]: 0,
    };

    filteredTasks.forEach((task: any) => {
      if (task.priority && priorityCounts.hasOwnProperty(task.priority)) {
        priorityCounts[task.priority as keyof typeof priorityCounts]++;
      }
    });

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase(),
      value: count,
      color: COLORS.priority[priority as keyof typeof COLORS.priority],
    }));
  }, [filteredTasks]);

  const projectStatusData = useMemo(() => {
    const statusCounts = {
      [ProjectStatus.ACTIVE]: 0,
      [ProjectStatus.ON_HOLD]: 0,
      [ProjectStatus.COMPLETED]: 0,
      [ProjectStatus.ARCHIVED]: 0,
    };

    filteredProjects.forEach((project: any) => {
      if (statusCounts.hasOwnProperty(project.status)) {
        statusCounts[project.status as keyof typeof statusCounts]++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name:
        status.replace("_", " ").charAt(0).toUpperCase() +
        status.replace("_", " ").slice(1).toLowerCase(),
      value: count,
      color: COLORS.project[status as keyof typeof COLORS.project],
    }));
  }, [filteredProjects]);

  // Timeline data for task completion over time
  const timelineData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split("T")[0],
        displayDate: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        completed: 0,
        created: 0,
      };
    });

    filteredTasks.forEach((task: any) => {
      // Count completed tasks
      if (task.completedAt) {
        const completedDate = new Date(task.completedAt)
          .toISOString()
          .split("T")[0];
        const dayData = last30Days.find((d) => d.date === completedDate);
        if (dayData) dayData.completed++;
      }

      // Count created tasks
      if (task.createdAt) {
        const createdDate = new Date(task.createdAt)
          .toISOString()
          .split("T")[0];
        const dayData = last30Days.find((d) => d.date === createdDate);
        if (dayData) dayData.created++;
      }
    });

    return last30Days;
  }, [filteredTasks]);

  // Productivity heatmap data (tasks completed per day of week and hour)
  const heatmapData = useMemo(() => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const heatmap = daysOfWeek.map((day) => ({
      day,
      hours: hours.map((hour) => ({
        hour,
        value: 0,
      })),
    }));

    filteredTasks
      .filter((task: any) => task.completedAt)
      .forEach((task: any) => {
        const date = new Date(task.completedAt);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        if (heatmap[dayOfWeek] && heatmap[dayOfWeek].hours[hour]) {
          heatmap[dayOfWeek].hours[hour].value++;
        }
      });

    return heatmap;
  }, [filteredTasks]);

  // Workspace productivity data (using filtered data)
  const workspaceProductivity = useMemo(() => {
    const workspaceStats = workspaces.map((workspace: any) => {
      // Get projects that belong to this workspace
      const workspaceProjects = filteredProjects.filter(
        (project: any) =>
          project.workspace?._id === workspace._id ||
          project.workspace === workspace._id
      );

      // Get tasks from projects in this workspace (using filtered tasks)
      const workspaceTasks = filteredTasks.filter((task: any) => {
        return workspaceProjects.some(
          (project: any) =>
            task.project?._id === project._id || task.project === project._id
        );
      });

      const completedTasks = workspaceTasks.filter(
        (task: any) => task.status === TaskStatus.DONE
      ).length;

      // Calculate effort-based completion for workspace
      const totalEffort = workspaceTasks.reduce(
        (sum: number, task: any) => sum + (task.estimatedHours || 0),
        0
      );
      const completedEffort = workspaceTasks
        .filter((task: any) => task.status === TaskStatus.DONE)
        .reduce(
          (sum: number, task: any) => sum + (task.estimatedHours || 0),
          0
        );

      const completionRate =
        totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;

      return {
        name: workspace.name,
        totalTasks: workspaceTasks.length,
        completedTasks,
        completionRate,
        members: workspace.members?.length || 0, // Use actual workspace members count
        projects: workspaceProjects.length,
      };
    });

    return workspaceStats.sort((a, b) => b.completionRate - a.completionRate);
  }, [workspaces, filteredTasks, filteredProjects]);

  // PDF Export Function
  const exportToPDF = async () => {
    if (!analyticsRef.current) return;

    setIsExporting(true);

    try {
      // Create a temporary container for better PDF formatting
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "1200px";
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.padding = "20px";
      tempContainer.style.fontFamily = "Arial, sans-serif";
      tempContainer.style.fontSize = "12px";
      tempContainer.style.lineHeight = "1.4";

      // Create a clean container with only charts and metrics
      const analyticsContent = document.createElement("div");
      analyticsContent.style.fontFamily = "Arial, sans-serif";
      analyticsContent.style.fontSize = "14px";
      analyticsContent.style.lineHeight = "1.6";

      // Get specific sections to include in PDF (avoid duplicates)
      const metricsSection =
        analyticsRef.current?.querySelector("#analytics-metrics");

      // Get all section containers with space-y-6 class that have h2 headers
      const allSections = analyticsRef.current?.querySelectorAll(".space-y-6");

      // Add metrics section first (only once)
      if (metricsSection) {
        const metricsClone = metricsSection.cloneNode(true) as HTMLElement;
        metricsClone.querySelectorAll("button").forEach((btn) => btn.remove());
        analyticsContent.appendChild(metricsClone);
      }

      // Add each analysis section (avoid duplicates)
      const addedSections = new Set<string>();

      allSections?.forEach((section) => {
        const h2Element = section.querySelector("h2");
        if (h2Element) {
          const sectionTitle = h2Element.textContent?.toLowerCase() || "";

          // Only include specific analysis sections and avoid duplicates
          if (
            (sectionTitle.includes("task analysis") ||
              sectionTitle.includes("project analysis") ||
              sectionTitle.includes("timeline") ||
              sectionTitle.includes("workspace productivity") ||
              sectionTitle.includes("performance insights") ||
              sectionTitle.includes("key insights")) &&
            !addedSections.has(sectionTitle)
          ) {
            const sectionClone = section.cloneNode(true) as HTMLElement;
            // Remove any interactive elements
            sectionClone
              .querySelectorAll("button, select, input")
              .forEach((el) => el.remove());
            analyticsContent.appendChild(sectionClone);
            addedSections.add(sectionTitle);
          }
        }
      });

      // Add title and metadata
      const titleDiv = document.createElement("div");
      titleDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; font-family: Arial, sans-serif;">
          <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 28px;">Analytics Dashboard Report</h1>
          <p style="color: #6b7280; margin: 0; font-size: 16px;">Generated on ${new Date().toLocaleDateString()}</p>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Date Range: ${
            dateRange === "7d"
              ? "Last 7 days"
              : dateRange === "30d"
              ? "Last 30 days"
              : dateRange === "90d"
              ? "Last 90 days"
              : dateRange === "1y"
              ? "Last year"
              : "All time"
          }</p>
          <hr style="margin: 20px 0; border: none; border-top: 2px solid #e5e7eb;">
        </div>
      `;

      // Add executive summary
      const summaryDiv = document.createElement("div");
      summaryDiv.innerHTML = `
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; font-family: Arial, sans-serif;">
          <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 20px;">Executive Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div>
              <p style="margin: 5px 0;"><strong>Total Tasks:</strong> ${metrics.totalTasks}</p>
              <p style="margin: 5px 0;"><strong>Completed Tasks:</strong> ${metrics.completedTasks}</p>
              <p style="margin: 5px 0;"><strong>Task Completion Rate:</strong> ${metrics.completionRate}%</p>
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>Total Projects:</strong> ${metrics.totalProjects}</p>
              <p style="margin: 5px 0;"><strong>Active Projects:</strong> ${metrics.activeProjects}</p>
              <p style="margin: 5px 0;"><strong>Project Completion Rate:</strong> ${metrics.projectCompletionRate}%</p>
            </div>
          </div>
        </div>
      `;

      tempContainer.appendChild(titleDiv);
      tempContainer.appendChild(summaryDiv);
      tempContainer.appendChild(analyticsContent);
      document.body.appendChild(tempContainer);

      // Generate canvas from the temporary container
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 1200,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        windowHeight: tempContainer.scrollHeight,
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const topMargin = 15;
      const bottomMargin = 20;
      const sideMargin = 15;

      const imgWidth = pdfWidth - sideMargin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const availableHeight = pdfHeight - topMargin - bottomMargin;

      // Calculate total pages needed
      const totalPages = Math.max(1, Math.ceil(imgHeight / availableHeight));
      let currentY = 0;

      // Generate each page with different content
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        // Calculate the portion of the image to show on this page
        const sourceY = currentY;
        const sourceHeight = Math.min(availableHeight, imgHeight - currentY);

        // If the content fits on one page, use the original approach
        if (totalPages === 1) {
          const fullImgData = canvas.toDataURL("image/png");
          pdf.addImage(
            fullImgData,
            "PNG",
            sideMargin,
            topMargin,
            imgWidth,
            Math.min(imgHeight, availableHeight)
          );
        } else {
          // Create a canvas for this page's content
          const pageCanvas = document.createElement("canvas");
          const pageCtx = pageCanvas.getContext("2d");

          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.round(
            (sourceHeight / imgHeight) * canvas.height
          );

          if (pageCtx) {
            // Draw only the portion of the original canvas for this page
            pageCtx.drawImage(
              canvas,
              0,
              Math.round((sourceY / imgHeight) * canvas.height),
              canvas.width,
              Math.round((sourceHeight / imgHeight) * canvas.height),
              0,
              0,
              pageCanvas.width,
              pageCanvas.height
            );
          }

          // Convert page canvas to image and add to PDF
          const pageImgData = pageCanvas.toDataURL("image/png");
          pdf.addImage(
            pageImgData,
            "PNG",
            sideMargin,
            topMargin,
            imgWidth,
            sourceHeight
          );
        }

        // Add header
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        if (pageNumber === 1) {
          pdf.text("Analytics Dashboard Report", sideMargin, 8);
          pdf.text(
            `Generated on ${new Date().toLocaleDateString()}`,
            pdfWidth - 60,
            8
          );
        } else {
          pdf.text("Analytics Dashboard Report (continued)", sideMargin, 8);
        }

        // Add page number and footer
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Page ${pageNumber}`, pdfWidth - 30, pdfHeight - 10);
        pdf.text(`of ${totalPages}`, pdfWidth - 15, pdfHeight - 10);
        pdf.text(
          `Generated on ${new Date().toLocaleDateString()}`,
          sideMargin,
          pdfHeight - 10
        );

        // Add separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.line(
          sideMargin,
          pdfHeight - 15,
          pdfWidth - sideMargin,
          pdfHeight - 15
        );

        currentY += availableHeight;

        // Break if we've covered all content
        if (currentY >= imgHeight) {
          break;
        }
      }

      // Save the PDF
      const fileName = `analytics-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      pdf.save(fileName);

      // Show success toast
      toast.success("Analytics report exported successfully!", {
        duration: 3000,
        position: "top-right",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF. Please try again.", {
        duration: 4000,
        position: "top-right",
      });
    } finally {
      setIsExporting(false);
    }
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

  if (isDataLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Loading analytics data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" ref={analyticsRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your projects, tasks, and team
            performance
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="filter-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <Select
                value={dateRange}
                onValueChange={(value: DateRange) => setDateRange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Chart Focus</label>
              <Select
                value={chartType}
                onValueChange={(value: ChartType) => setChartType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="tasks">Tasks Analysis</SelectItem>
                  <SelectItem value="projects">Projects Analysis</SelectItem>
                  <SelectItem value="workspaces">
                    Workspaces Analysis
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Workspace</label>
              <Select
                value={selectedWorkspace}
                onValueChange={setSelectedWorkspace}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {workspaces.map((workspace: any) => (
                    <SelectItem key={workspace._id} value={workspace._id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Task Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>
                    In Progress
                  </SelectItem>
                  <SelectItem value={TaskStatus.IN_REVIEW}>
                    In Review
                  </SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                  <SelectItem value={TaskStatus.BLOCKED}>Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Status Indicator */}
      {(selectedWorkspace !== "all" ||
        selectedStatus !== "all" ||
        dateRange !== "all") && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Active Filters:</span>
              {dateRange !== "all" && (
                <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                  {dateRange === "7d"
                    ? "Last 7 days"
                    : dateRange === "30d"
                    ? "Last 30 days"
                    : dateRange === "90d"
                    ? "Last 90 days"
                    : dateRange === "1y"
                    ? "Last year"
                    : "All time"}
                </span>
              )}
              {selectedWorkspace !== "all" && (
                <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                  Workspace:{" "}
                  {workspaces.find((w: any) => w._id === selectedWorkspace)
                    ?.name || "Unknown"}
                </span>
              )}
              {selectedStatus !== "all" && (
                <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                  Status: {selectedStatus.replace("_", " ").toUpperCase()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div
        id="analytics-metrics"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="analytics-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tasks
                </p>
                <p className="text-2xl font-bold">{metrics.totalTasks}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.completedTasks} completed
                </p>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <div className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {metrics.completionRate}%
                </div>
                <span className="text-xs text-muted-foreground">
                  completion rate
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Projects
                </p>
                <p className="text-2xl font-bold">{metrics.activeProjects}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalProjects} total
                </p>
              </div>
              <FolderOpen className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <div className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {metrics.projectCompletionRate}%
                </div>
                <span className="text-xs text-muted-foreground">
                  project completion
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  In Progress
                </p>
                <p className="text-2xl font-bold">{metrics.inProgressTasks}</p>
                <p className="text-xs text-muted-foreground">
                  tasks being worked on
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <div className="text-sm text-blue-600">
                  {metrics.totalTasks > 0
                    ? Math.round(
                        (metrics.inProgressTasks / metrics.totalTasks) * 100
                      )
                    : 0}
                  %
                </div>
                <span className="text-xs text-muted-foreground">
                  of total tasks
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue Tasks
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.overdueTasks}
                </p>
                <p className="text-xs text-muted-foreground">need attention</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                {metrics.overdueTasks > 0 ? (
                  <div className="text-sm text-red-600 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    Action needed
                  </div>
                ) : (
                  <div className="text-sm text-green-600">All on track</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Analysis Charts - Row 1 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Task Analysis</h2>
        <div
          id="analytics-charts-tasks"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Task Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={() => ""}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) =>
                      `${value}: ${entry?.payload?.value || 0}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Task Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskPriorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {taskPriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Analysis Charts - Row 2 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Project Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Project Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={() => ""}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) =>
                      `${value}: ${entry?.payload?.value || 0}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Workspace Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Workspace Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Workspaces</span>
                  <span className="text-2xl font-bold">
                    {metrics.totalWorkspaces}
                  </span>
                </div>
                <div className="space-y-2">
                  {workspaceProductivity.slice(0, 5).map((workspace: any) => (
                    <div
                      key={workspace.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {workspace.name}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {workspace.projects} projects • {workspace.members}{" "}
                          members
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">
                          {workspace.completionRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {workspace.completedTasks}/{workspace.totalTasks}{" "}
                          tasks
                        </div>
                      </div>
                    </div>
                  ))}
                  {workspaceProductivity.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{workspaceProductivity.length - 5} more workspaces
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline and Activity Analysis - Row 3 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Timeline & Activity Analysis</h2>
        <div className="grid grid-cols-1 gap-6">
          {/* Task Timeline */}
          <Card className="analytics-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Task Activity Timeline (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Tasks Created"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Tasks Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Productivity Heatmap */}
          <Card className="analytics-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Productivity Heatmap (Task Completion by Day & Time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="heatmap-grid text-xs">
                  <div></div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="text-center text-muted-foreground">
                      {i}
                    </div>
                  ))}
                </div>
                {heatmapData.map((dayData, dayIndex) => (
                  <div key={dayData.day} className="heatmap-row">
                    <div className="text-xs font-medium text-muted-foreground">
                      {dayData.day}
                    </div>
                    {dayData.hours.map((hourData, hourIndex) => {
                      const intensity = Math.min(hourData.value / 5, 1); // Normalize to 0-1
                      return (
                        <div
                          key={`${dayIndex}-${hourIndex}`}
                          className="heatmap-cell"
                          style={{
                            backgroundColor:
                              intensity > 0
                                ? `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`
                                : "#f3f4f6",
                          }}
                          title={`${dayData.day} ${hourData.hour}:00 - ${hourData.value} tasks completed`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="heatmap-legend">
                  <span>Less</span>
                  <div className="heatmap-legend-scale">
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                      <div
                        key={i}
                        className="heatmap-legend-cell"
                        style={{
                          backgroundColor:
                            intensity > 0
                              ? `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`
                              : "#f3f4f6",
                        }}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workspace Productivity Analysis - Row 4 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          Workspace Productivity Analysis
        </h2>
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Workspace Productivity Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Completion Rate Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">
                  Completion Rate by Workspace
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={workspaceProductivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Completion Rate"]}
                    />
                    <Bar
                      dataKey="completionRate"
                      fill="#10b981"
                      name="Completion Rate %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tasks and Projects Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">
                  Tasks, Projects & Workspace Members
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={workspaceProductivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        let label = "";
                        switch (String(name)) {
                          case "totalTasks":
                            label = "Total Tasks";
                            break;
                          case "projects":
                            label = "Projects";
                            break;
                          case "members":
                            label = "Members";
                            break;
                          default:
                            label =
                              String(name).charAt(0).toUpperCase() +
                              String(name).slice(1);
                        }
                        return [value, label];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="totalTasks"
                      fill="#3b82f6"
                      name="Total Tasks"
                    />
                    <Bar dataKey="projects" fill="#f59e0b" name="Projects" />
                    <Bar dataKey="members" fill="#8b5cf6" name="Members" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div>
                <h4 className="text-sm font-medium mb-3">Workspace Summary</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Workspace</th>
                        <th className="text-right p-2">Completion Rate</th>
                        <th className="text-right p-2">Tasks</th>
                        <th className="text-right p-2">Projects</th>
                        <th className="text-right p-2">Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspaceProductivity.map((workspace, index) => (
                        <tr
                          key={workspace.name}
                          className={index % 2 === 0 ? "bg-gray-50" : ""}
                        >
                          <td className="p-2 font-medium">{workspace.name}</td>
                          <td className="p-2 text-right">
                            <span className="text-green-600 font-semibold">
                              {workspace.completionRate}%
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {workspace.completedTasks}/{workspace.totalTasks}
                          </td>
                          <td className="p-2 text-right">
                            {workspace.projects}
                          </td>
                          <td className="p-2 text-right">
                            {workspace.members}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights - Row 5 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Performance Insights</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Metrics Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {metrics.completionRate}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Task Completion Rate
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${metrics.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {metrics.projectCompletionRate}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Project Completion Rate
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${metrics.projectCompletionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {metrics.totalTasks > 0
                    ? Math.round(
                        (metrics.inProgressTasks / metrics.totalTasks) * 100
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">
                  Tasks In Progress
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{
                        width: `${
                          metrics.totalTasks > 0
                            ? Math.round(
                                (metrics.inProgressTasks / metrics.totalTasks) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights & Recommendations - Row 6 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          Key Insights & Recommendations
        </h2>
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Summary & Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">
                  Performance Highlights
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm">Task Completion Rate</span>
                    <span className="font-bold text-green-600">
                      {metrics.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm">Active Projects</span>
                    <span className="font-bold text-blue-600">
                      {metrics.activeProjects}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm">Total Workspaces</span>
                    <span className="font-bold text-purple-600">
                      {metrics.totalWorkspaces}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Action Items</h4>
                <div className="space-y-2">
                  {metrics.overdueTasks > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <p className="text-sm text-red-800">
                        <strong>{metrics.overdueTasks}</strong> tasks are
                        overdue and need immediate attention
                      </p>
                    </div>
                  )}
                  {metrics.inProgressTasks > metrics.completedTasks && (
                    <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <p className="text-sm text-yellow-800">
                        More tasks are in progress than completed. Consider
                        reviewing workload distribution.
                      </p>
                    </div>
                  )}
                  {metrics.completionRate >= 80 && (
                    <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <p className="text-sm text-green-800">
                        Excellent completion rate! Team is performing well.
                      </p>
                    </div>
                  )}
                  {workspaceProductivity.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm text-blue-800">
                        Top performing workspace:{" "}
                        <strong>{workspaceProductivity[0]?.name}</strong> with{" "}
                        {workspaceProductivity[0]?.completionRate}% completion
                        rate
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
