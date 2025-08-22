"use client";

import React, { useMemo, useRef, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
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
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import { ProjectStatus } from "@/src/enums/project.enum";
import { Download, FileText, Route, Clock } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

interface GanttChartProps {
  tasks: any[];
  projects: any[];
}

export function GanttChart({ tasks, projects }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [isChecked, setIsChecked] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Enhanced task processing with dependency management and critical path calculation
  const ganttTasks: Task[] = useMemo(() => {
    const ganttData: Task[] = [];
    const processedTaskIds = new Set<string>();
    const taskDependencies = new Map<string, string[]>(); // taskId -> [dependentTaskIds]
    const criticalPathTasks = new Set<string>();

    // Calculate critical path
    const calculateCriticalPath = (tasks: any[]) => {
      const taskMap = new Map();
      const inDegree = new Map();
      const duration = new Map();

      // Initialize task data
      tasks.forEach((task) => {
        if (task && task._id) {
          taskMap.set(task._id, task);
          inDegree.set(task._id, 0);

          // Calculate duration in days
          const start = task.startDate ? new Date(task.startDate) : new Date();
          const end = task.dueDate
            ? new Date(task.dueDate)
            : new Date(start.getTime() + 24 * 60 * 60 * 1000);
          const durationDays = Math.max(
            1,
            Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
          );
          duration.set(task._id, durationDays);
        }
      });

      // Build dependency graph based on task order and relationships
      tasks.forEach((task, index) => {
        if (task && task._id && index > 0) {
          const prevTask = tasks[index - 1];
          if (prevTask && prevTask._id) {
            if (!taskDependencies.has(task._id)) {
              taskDependencies.set(task._id, []);
            }
            taskDependencies.get(task._id)!.push(prevTask._id);
            inDegree.set(task._id, (inDegree.get(task._id) || 0) + 1);
          }
        }
      });

      // Find critical path using longest path algorithm
      const longestPath = new Map();
      const queue = [];

      // Initialize with tasks that have no dependencies
      for (const [taskId, degree] of inDegree) {
        if (degree === 0) {
          queue.push(taskId);
          longestPath.set(taskId, duration.get(taskId) || 0);
        }
      }

      // Process tasks in topological order
      while (queue.length > 0) {
        const currentTask = queue.shift()!;

        // Update dependent tasks
        tasks.forEach((task) => {
          if (task && task._id && taskDependencies.has(task._id)) {
            const deps = taskDependencies.get(task._id)!;
            if (deps.includes(currentTask)) {
              const newPath =
                (longestPath.get(currentTask) || 0) +
                (duration.get(task._id) || 0);
              longestPath.set(
                task._id,
                Math.max(longestPath.get(task._id) || 0, newPath)
              );

              inDegree.set(task._id, inDegree.get(task._id)! - 1);
              if (inDegree.get(task._id) === 0) {
                queue.push(task._id);
              }
            }
          }
        });
      }

      // Find the maximum path length
      let maxPath = 0;
      let endTask = null;
      for (const [taskId, pathLength] of longestPath) {
        if (pathLength > maxPath) {
          maxPath = pathLength;
          endTask = taskId;
        }
      }

      // Backtrack to find critical path
      if (endTask) {
        const criticalTasks = new Set([endTask]);
        let current = endTask;

        while (current) {
          let found = false;
          for (const [taskId, deps] of taskDependencies) {
            if (deps.includes(current)) {
              const expectedPath =
                (longestPath.get(current) || 0) - (duration.get(taskId) || 0);
              if (
                Math.abs((longestPath.get(taskId) || 0) - expectedPath) < 0.1
              ) {
                criticalTasks.add(taskId);
                current = taskId;
                found = true;
                break;
              }
            }
          }
          if (!found) break;
        }

        return criticalTasks;
      }

      return new Set();
    };

    // Calculate critical path for all tasks
    const allTasks = projects.flatMap((project) =>
      tasks.filter((task) => task.project && task.project._id === project._id)
    );
    const criticalPath = calculateCriticalPath(allTasks);

    // Add projects as parent tasks
    projects
      .filter(
        (project: any) =>
          project && project._id && project.name && project.name.trim() !== ""
      )
      .forEach((project: any) => {
        const startDate = project.startDate
          ? new Date(project.startDate)
          : project.createdAt
          ? new Date(project.createdAt)
          : new Date();
        let endDate = project.dueDate
          ? new Date(project.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (endDate <= startDate) {
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        const projectTasks = tasks.filter(
          (task: any) => task.project && task.project._id === project._id
        );

        let totalEffort = 0;
        let completedEffort = 0;

        projectTasks.forEach((task: any) => {
          const effort = task.estimatedHours || 0;
          totalEffort += effort;

          if (task.status === TaskStatus.DONE) {
            completedEffort += effort;
          }
        });

        const progress =
          totalEffort > 0 ? (completedEffort / totalEffort) * 100 : 0;

        ganttData.push({
          start: startDate,
          end: endDate,
          name: project.name,
          id: `project-${project._id}`,
          type: "project",
          progress: Math.round(progress),
          isDisabled: false,
          styles: {
            progressColor: getProjectColor(project.status || "active"),
            progressSelectedColor: getProjectColor(project.status || "active"),
            backgroundColor: getProjectColor(project.status || "active", 0.3),
            backgroundSelectedColor: getProjectColor(
              project.status || "active",
              0.5
            ),
          },
        });

        // Enhanced task processing with dependencies and critical path highlighting
        projectTasks
          .filter(
            (task: any) =>
              task &&
              task._id &&
              task.title &&
              task.title.trim() !== "" &&
              !processedTaskIds.has(task._id)
          )
          .forEach((task: any, index: number) => {
            processedTaskIds.add(task._id);
            const taskStartDate = task.startDate
              ? new Date(task.startDate)
              : task.createdAt
              ? new Date(task.createdAt)
              : startDate;
            let taskEndDate = task.dueDate ? new Date(task.dueDate) : endDate;

            if (taskEndDate <= taskStartDate) {
              taskEndDate = new Date(
                taskStartDate.getTime() + 24 * 60 * 60 * 1000
              );
            }

            const taskProgress =
              task.status === TaskStatus.DONE
                ? 100
                : task.status === TaskStatus.IN_PROGRESS
                ? 50
                : task.status === TaskStatus.IN_REVIEW
                ? 75
                : task.status === TaskStatus.BLOCKED
                ? 25
                : 0;

            // Check if task is on critical path
            const isOnCriticalPath = criticalPath.has(task._id);

            // Set dependencies for sequential tasks
            const dependencies =
              index > 0 ? [`task-${projectTasks[index - 1]._id}`] : undefined;

            ganttData.push({
              start: taskStartDate,
              end: taskEndDate,
              name: task.title,
              id: `task-${task._id}`,
              type: "task",
              progress: taskProgress,
              project: `project-${project._id}`,
              dependencies: dependencies,
              isDisabled: false,
              styles: {
                progressColor:
                  isOnCriticalPath && showCriticalPath
                    ? "#f97316" // Orange for critical path
                    : getTaskColor(task.status || "todo"),
                progressSelectedColor:
                  isOnCriticalPath && showCriticalPath
                    ? "#ea580c"
                    : getTaskColor(task.status || "todo"),
                backgroundColor:
                  isOnCriticalPath && showCriticalPath
                    ? "rgba(249, 115, 22, 0.3)"
                    : getTaskColor(task.status || "todo", 0.3),
                backgroundSelectedColor:
                  isOnCriticalPath && showCriticalPath
                    ? "rgba(249, 115, 22, 0.5)"
                    : getTaskColor(task.status || "todo", 0.5),
              },
            });

            // Add subtasks with enhanced styling
            if (task.subtasks && task.subtasks.length > 0) {
              task.subtasks
                .filter(
                  (subtask: any) =>
                    subtask &&
                    subtask._id &&
                    subtask.title &&
                    subtask.title.trim() !== "" &&
                    !processedTaskIds.has(subtask._id)
                )
                .forEach((subtask: any, subIndex: number) => {
                  processedTaskIds.add(subtask._id);
                  const subtaskStartDate = subtask.startDate
                    ? new Date(subtask.startDate)
                    : subtask.createdAt
                    ? new Date(subtask.createdAt)
                    : taskStartDate;
                  let subtaskEndDate = subtask.dueDate
                    ? new Date(subtask.dueDate)
                    : taskEndDate;

                  if (subtaskEndDate <= subtaskStartDate) {
                    subtaskEndDate = new Date(
                      subtaskStartDate.getTime() + 24 * 60 * 60 * 1000
                    );
                  }

                  const subtaskProgress =
                    subtask.status === TaskStatus.DONE
                      ? 100
                      : subtask.status === TaskStatus.IN_PROGRESS
                      ? 50
                      : subtask.status === TaskStatus.IN_REVIEW
                      ? 75
                      : subtask.status === TaskStatus.BLOCKED
                      ? 25
                      : 0;

                  ganttData.push({
                    start: subtaskStartDate,
                    end: subtaskEndDate,
                    name: subtask.title,
                    id: `subtask-${subtask._id}`,
                    type: "task",
                    progress: subtaskProgress,
                    project: `task-${task._id}`,
                    dependencies:
                      subIndex > 0
                        ? [`subtask-${task.subtasks[subIndex - 1]._id}`]
                        : [`task-${task._id}`],
                    isDisabled: false,
                    styles: {
                      progressColor: getTaskColor(subtask.status || "todo"),
                      progressSelectedColor: getTaskColor(
                        subtask.status || "todo"
                      ),
                      backgroundColor: getTaskColor(
                        subtask.status || "todo",
                        0.2
                      ),
                      backgroundSelectedColor: getTaskColor(
                        subtask.status || "todo",
                        0.4
                      ),
                    },
                  });
                });
            }
          });
      });

    return ganttData;
  }, [tasks, projects, showCriticalPath]);

  // Color functions
  function getProjectColor(status: string, opacity: number = 1) {
    const colors = {
      [ProjectStatus.ACTIVE]: `rgba(59, 130, 246, ${opacity})`,
      [ProjectStatus.ON_HOLD]: `rgba(245, 158, 11, ${opacity})`,
      [ProjectStatus.COMPLETED]: `rgba(16, 185, 129, ${opacity})`,
      [ProjectStatus.ARCHIVED]: `rgba(239, 68, 68, ${opacity})`,
    };
    return (
      colors[status as keyof typeof colors] || `rgba(107, 114, 128, ${opacity})`
    );
  }

  function getTaskColor(status: string, opacity: number = 1) {
    const colors = {
      [TaskStatus.TODO]: `rgba(107, 114, 128, ${opacity})`,
      [TaskStatus.IN_PROGRESS]: `rgba(59, 130, 246, ${opacity})`,
      [TaskStatus.IN_REVIEW]: `rgba(245, 158, 11, ${opacity})`,
      [TaskStatus.DONE]: `rgba(16, 185, 129, ${opacity})`,
      [TaskStatus.BLOCKED]: `rgba(239, 68, 68, ${opacity})`,
    };
    return (
      colors[status as keyof typeof colors] || `rgba(107, 114, 128, ${opacity})`
    );
  }

  const handleTaskChange = (task: Task) => {
    console.log("Task changed:", task);
    // Here you could implement task update functionality
  };

  const handleTaskDelete = (task: Task) => {
    console.log("Task deleted:", task);
    // Here you could implement task deletion functionality
  };

  const handleProgressChange = async (task: Task) => {
    console.log("Progress changed:", task);
    // Here you could implement progress update functionality
  };

  const handleDblClick = (task: Task) => {
    console.log("Task double clicked:", task);
    // Here you could open task details or edit modal
  };

  const handleSelect = (task: Task, isSelected: boolean) => {
    console.log("Task selected:", task, isSelected);
  };

  // PDF Export Function
  const exportToPDF = async () => {
    if (!ganttRef.current) return;

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

      // Clone the gantt chart content
      const ganttClone = ganttRef.current.cloneNode(true) as HTMLElement;

      // Add title and metadata
      const titleDiv = document.createElement("div");
      titleDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; font-family: Arial, sans-serif;">
          <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 24px;">Project Timeline - Gantt Chart</h1>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
          <hr style="margin: 20px 0; border: none; border-top: 2px solid #e5e7eb;">
        </div>
      `;

      // Add summary statistics
      const statsDiv = document.createElement("div");
      const totalProjects = projects.length;
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (task) => task.status === TaskStatus.DONE
      ).length;

      // Calculate effort-based completion rate
      const totalEffort = tasks.reduce(
        (sum, task) => sum + (task.estimatedHours || 0),
        0
      );
      const completedEffort = tasks
        .filter((task) => task.status === TaskStatus.DONE)
        .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

      const completionRate =
        totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0;

      statsDiv.innerHTML = `
        <div style="display: flex; justify-content: space-around; margin-bottom: 30px; font-family: Arial, sans-serif;">
          <div style="text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalProjects}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Projects</div>
          </div>
          <div style="text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${totalTasks}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Tasks</div>
          </div>
          <div style="text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${completedTasks}</div>
            <div style="font-size: 12px; color: #6b7280;">Completed Tasks</div>
          </div>
          <div style="text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${completionRate}%</div>
            <div style="font-size: 12px; color: #6b7280;">Completion Rate</div>
          </div>
        </div>
      `;

      tempContainer.appendChild(titleDiv);
      tempContainer.appendChild(statsDiv);
      tempContainer.appendChild(ganttClone);
      document.body.appendChild(tempContainer);

      // Generate canvas from the temporary container with better quality
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

      // Create PDF with improved pagination
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const topMargin = 15; // 15mm top margin
      const bottomMargin = 20; // 20mm bottom margin
      const sideMargin = 15; // 15mm side margins

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
              Math.round((sourceY / imgHeight) * canvas.height), // source x, y
              canvas.width,
              Math.round((sourceHeight / imgHeight) * canvas.height), // source width, height
              0,
              0, // destination x, y
              pageCanvas.width,
              pageCanvas.height // destination width, height
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
          pdf.text("Project Timeline - Gantt Chart", sideMargin, 8);
          pdf.text(
            `Total Projects: ${projects.length} | Total Tasks: ${tasks.length}`,
            pdfWidth - 80,
            8
          );
        } else {
          pdf.text("Project Timeline - Gantt Chart (continued)", sideMargin, 8);
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

      // Save the PDF with a descriptive filename
      const fileName = `gantt-chart-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      pdf.save(fileName);

      // Show success toast
      toast.success("Gantt chart exported successfully!", {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Project Timeline - Gantt Chart
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* Added critical path toggle */}
            <Button
              variant={showCriticalPath ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCriticalPath(!showCriticalPath)}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Critical Path
            </Button>
            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={isExporting || ganttTasks.length === 0}
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
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ViewMode.Day}>Day</SelectItem>
                <SelectItem value={ViewMode.Week}>Week</SelectItem>
                <SelectItem value={ViewMode.Month}>Month</SelectItem>
                <SelectItem value={ViewMode.Year}>Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Added legend for critical path and task status */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-orange-500 rounded"></div>
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-blue-500 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-gray-500 rounded"></div>
            <span>Pending</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ganttTasks.length > 0 ? (
          <div ref={ganttRef} style={{ height: "600px", overflow: "auto" }}>
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDateChange={handleTaskChange}
              onDelete={handleTaskDelete}
              onProgressChange={handleProgressChange}
              onDoubleClick={handleDblClick}
              onSelect={handleSelect}
              listCellWidth={isChecked ? "200px" : ""}
              columnWidth={
                viewMode === ViewMode.Month
                  ? 80
                  : viewMode === ViewMode.Week
                  ? 300
                  : viewMode === ViewMode.Day
                  ? 80
                  : 120
              }
              ganttHeight={600}
              barBackgroundColor="#f8fafc"
              barBackgroundSelectedColor="#e2e8f0"
              arrowColor="#64748b"
              arrowIndent={20}
              fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
              fontSize="13px"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No valid data available</p>
              <p className="text-sm">
                Create projects and tasks with proper titles and dates to see
                them in the Gantt chart
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Status badge component for the legend
export function StatusBadge({
  status,
  type,
}: {
  status: string;
  type: "project" | "task";
}) {
  const getStatusConfig = (status: string, type: "project" | "task") => {
    if (type === "project") {
      switch (status) {
        case ProjectStatus.ACTIVE:
          return { label: "Active", color: "bg-blue-100 text-blue-800" };
        case ProjectStatus.ON_HOLD:
          return { label: "On Hold", color: "bg-yellow-100 text-yellow-800" };
        case ProjectStatus.COMPLETED:
          return { label: "Completed", color: "bg-green-100 text-green-800" };
        case ProjectStatus.ARCHIVED:
          return { label: "Archived", color: "bg-red-100 text-red-800" };
        default:
          return { label: status, color: "bg-gray-100 text-gray-800" };
      }
    } else {
      switch (status) {
        case TaskStatus.TODO:
          return { label: "To Do", color: "bg-gray-100 text-gray-800" };
        case TaskStatus.IN_PROGRESS:
          return { label: "In Progress", color: "bg-blue-100 text-blue-800" };
        case TaskStatus.IN_REVIEW:
          return { label: "In Review", color: "bg-yellow-100 text-yellow-800" };
        case TaskStatus.DONE:
          return { label: "Done", color: "bg-green-100 text-green-800" };
        case TaskStatus.BLOCKED:
          return { label: "Blocked", color: "bg-red-100 text-red-800" };
        default:
          return { label: status, color: "bg-gray-100 text-gray-800" };
      }
    }
  };

  const config = getStatusConfig(status, type);

  return (
    <Badge variant="secondary" className={config.color}>
      {config.label}
    </Badge>
  );
}
