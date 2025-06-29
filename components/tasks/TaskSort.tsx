"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SortAsc, SortDesc, ArrowUpDown } from "lucide-react";
import type { TaskSort as ITaskSort } from "./types";

interface TaskSortProps {
  sort: ITaskSort;
  onSortChange: (sort: ITaskSort) => void;
}

const sortOptions = [
  { field: "title" as const, label: "Title" },
  { field: "status" as const, label: "Status" },
  { field: "priority" as const, label: "Priority" },
  { field: "dueDate" as const, label: "Due Date" },
  { field: "createdAt" as const, label: "Created Date" },
  { field: "updatedAt" as const, label: "Updated Date" },
];

export function TaskSort({ sort, onSortChange }: TaskSortProps) {
  const currentOption = sortOptions.find(
    (option) => option.field === sort.field
  );

  const handleSortChange = (field: ITaskSort["field"]) => {
    if (field === sort.field) {
      // Toggle direction if same field
      onSortChange({
        field,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // Set new field with default direction
      onSortChange({
        field,
        direction: "desc",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>Sort by {currentOption?.label}</span>
          {sort.direction === "asc" ? (
            <SortAsc className="w-4 h-4" />
          ) : (
            <SortDesc className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.field}
            onClick={() => handleSortChange(option.field)}
            className="flex items-center justify-between"
          >
            <span>{option.label}</span>
            {sort.field === option.field &&
              (sort.direction === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              ))}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() =>
            onSortChange({ field: "createdAt", direction: "desc" })
          }
          className="text-gray-600"
        >
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
