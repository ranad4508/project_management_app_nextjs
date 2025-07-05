"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useGetUserProjectsQuery } from "@/src/store/api/projectApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, isLoading, error } = useGetUserProjectsQuery({
    page,
    limit,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load projects. Please try again later.",
      variant: "destructive",
    });
  }

  // Filter projects based on search query and current tab
  const filteredProjects =
    data?.projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        false;

      if (currentTab === "all") return matchesSearch;
      if (currentTab === "active")
        return matchesSearch && project.status === "active";
      if (currentTab === "completed")
        return matchesSearch && project.status === "completed";
      if (currentTab === "archived")
        return matchesSearch && project.status === "archived";

      return matchesSearch;
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track all your projects
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/projects/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>All Projects</DropdownMenuItem>
            <DropdownMenuItem>Recent Projects</DropdownMenuItem>
            <DropdownMenuItem>High Priority</DropdownMenuItem>
            <DropdownMenuItem>Overdue Projects</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Link
                  href={`/dashboard/projects/${project._id}`}
                  key={project._id}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {project.name}
                        </CardTitle>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4" />
                          {project.workspace?.members?.length || 0} members
                        </div>
                        {project.dueDate && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            Due:{" "}
                            {new Date(project.dueDate).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={getPriorityColor(project.priority)}
                          >
                            {project.priority} priority
                          </Badge>
                          <div className="flex items-center text-sm">
                            <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                            {Math.round(
                              project.stats?.completionPercentage || 0
                            )}
                            % complete
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <div className="text-xs text-muted-foreground">
                        <Clock className="inline mr-1 h-3 w-3" />
                        Updated{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first project to get started"}
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/projects/new")}
              >
                <Plus className="mr-2 h-4 w-4" /> Create Project
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Other tab contents have the same structure, just filtered differently */}
        <TabsContent value="active" className="mt-6">
          {/* Same structure as "all" tab but filtered for active projects */}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {/* Same structure as "all" tab but filtered for completed projects */}
        </TabsContent>
        <TabsContent value="archived" className="mt-6">
          {/* Same structure as "all" tab but filtered for archived projects */}
        </TabsContent>
      </Tabs>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center text-sm">
              Page {page} of {data.pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((prev) =>
                  Math.min(prev + 1, data.pagination.totalPages)
                )
              }
              disabled={page === data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
