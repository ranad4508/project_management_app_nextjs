"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Search, User, Filter, ChevronDown } from "lucide-react";
import { useGetWorkspaceLabelsQuery } from "@/src/store/api/labelApi";
import { useGetWorkspaceMembersQuery } from "@/src/store/api/workspaceApi";
import { TaskStatus, TaskPriority } from "@/src/enums/task.enum";
import type { TaskFilters as ITaskFilters } from "./types";

interface TaskFiltersProps {
  filters: ITaskFilters;
  onFiltersChange: (filters: ITaskFilters) => void;
  workspaceId: string;
  projectId: string;
}

const statusOptions = [
  { value: TaskStatus.BACKLOG, label: "Backlog" },
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.DONE, label: "Done" },
  { value: TaskStatus.CANCELLED, label: "Cancelled" },
  { value: TaskStatus.BLOCKED, label: "Blocked" },
];

const priorityOptions = [
  { value: TaskPriority.NO_PRIORITY, label: "No Priority" },
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" },
  { value: TaskPriority.URGENT, label: "Urgent" },
  { value: TaskPriority.CRITICAL, label: "Critical" },
];

export function TaskFilters({
  filters,
  onFiltersChange,
  workspaceId,
  projectId,
}: TaskFiltersProps) {
  const { data: labelsResponse } = useGetWorkspaceLabelsQuery({
    workspaceId,
    project: projectId,
    page: 1,
    limit: 100,
  });

  const { data: membersData } = useGetWorkspaceMembersQuery(workspaceId);

  const labels = labelsResponse?.data?.labels || [];

  const members = membersData?.members || [];

  const updateFilter = (key: keyof ITaskFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof ITaskFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) =>
      filters[key as keyof ITaskFilters] !== undefined &&
      filters[key as keyof ITaskFilters] !== ""
  ).length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Filter Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-600"
              >
                Clear All ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Search: {filters.search}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto ml-1"
                    onClick={() => clearFilter("search")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status:{" "}
                  {statusOptions.find((s) => s.value === filters.status)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto ml-1"
                    onClick={() => clearFilter("status")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.priority && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Priority:{" "}
                  {
                    priorityOptions.find((p) => p.value === filters.priority)
                      ?.label
                  }
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto ml-1"
                    onClick={() => clearFilter("priority")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.assignedTo && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Assigned:{" "}
                  {members.find((m) => m.user._id === filters.assignedTo)?.user
                    .name || "Unknown"}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto ml-1"
                    onClick={() => clearFilter("assignedTo")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.createdBy && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Created by:{" "}
                  {members.find((m) => m.user._id === filters.createdBy)?.user
                    .name || "Unknown"}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto ml-1"
                    onClick={() => clearFilter("createdBy")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.labels && filters.labels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.labels.map((labelId) => {
                    const label = labels.find((l) => l._id === labelId);
                    if (!label) return null;

                    return (
                      <Badge
                        key={labelId}
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={{
                          backgroundColor: `${label.color}20`,
                          borderColor: label.color,
                          color: label.color,
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto ml-1"
                          onClick={() => {
                            const newLabels = filters.labels?.filter(
                              (id) => id !== labelId
                            );
                            updateFilter(
                              "labels",
                              newLabels?.length ? newLabels : undefined
                            );
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Filter Controls */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={filters.search || ""}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Status Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Status</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => updateFilter("status", undefined)}
                    >
                      All statuses
                    </DropdownMenuItem>
                    {statusOptions.map((status) => (
                      <DropdownMenuItem
                        key={status.value}
                        onClick={() => updateFilter("status", status.value)}
                      >
                        {status.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Priority Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Priority</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => updateFilter("priority", undefined)}
                    >
                      All priorities
                    </DropdownMenuItem>
                    {priorityOptions.map((priority) => (
                      <DropdownMenuItem
                        key={priority.value}
                        onClick={() => updateFilter("priority", priority.value)}
                      >
                        {priority.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Assignee Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Assignee</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => updateFilter("assignedTo", undefined)}
                    >
                      All assignees
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateFilter("assignedTo", "")}
                    >
                      Unassigned
                    </DropdownMenuItem>
                    {members.map((member) => (
                      <DropdownMenuItem
                        key={member.user._id}
                        onClick={() =>
                          updateFilter("assignedTo", member.user._id)
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {member.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.user.name}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Created By Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Created By</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => updateFilter("createdBy", undefined)}
                    >
                      All creators
                    </DropdownMenuItem>
                    {members.map((member) => (
                      <DropdownMenuItem
                        key={member.user._id}
                        onClick={() =>
                          updateFilter("createdBy", member.user._id)
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {member.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.user.name}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Labels Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Labels</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => updateFilter("labels", undefined)}
                    >
                      All labels
                    </DropdownMenuItem>
                    {labels.map((label) => (
                      <DropdownMenuItem
                        key={label._id}
                        onClick={() => {
                          const currentLabels = filters.labels || [];
                          const isSelected = currentLabels.includes(label._id);
                          if (isSelected) {
                            // Remove label
                            const newLabels = currentLabels.filter(
                              (id) => id !== label._id
                            );
                            updateFilter(
                              "labels",
                              newLabels.length > 0 ? newLabels : undefined
                            );
                          } else {
                            // Add label
                            updateFilter("labels", [
                              ...currentLabels,
                              label._id,
                            ]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span>{label.name}</span>
                          {filters.labels?.includes(label._id) && (
                            <span className="ml-auto text-xs">✓</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Clear All Filters */}
                <DropdownMenuItem onClick={clearAllFilters}>
                  Clear all filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
