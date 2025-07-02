"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUserWorkspaces } from "@/hooks/use-dashboard-data";
import {
  BarChart3,
  Bell,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  LucideProjector,
  MessageSquare,
  Settings2,
  User2,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut } from "next-auth/react";

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(true);
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);

  // Fetch workspaces from API using SWR
  const {
    workspaces: allWorkspaces,
    isLoading: workspacesLoading,
    error: workspacesError,
  } = useUserWorkspaces();

  const displayedWorkspaces = showAllWorkspaces
    ? allWorkspaces
    : allWorkspaces.slice(0, 5);
  const hasMoreWorkspaces = allWorkspaces.length > 5;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col border-r bg-white dark:bg-gray-950 dark:border-gray-800 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center border-b px-3 dark:border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-white font-bold">
              W
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-lg">WorkSphere</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed ? "rotate-180" : ""
              )}
            />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-3 py-2">
            <nav className="space-y-1">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                isActive={pathname === "/dashboard"}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/dashboard/workspaces"
                icon={<Users className="h-4 w-4" />}
                label="Workspaces"
                isActive={pathname.startsWith("/dashboard/workspaces")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/dashboard/projects"
                icon={<LucideProjector className="h-4 w-4" />}
                label="Projects"
                isActive={pathname.startsWith("/dashboard/projects")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/dashboard/my-tasks"
                icon={<CheckSquare className="h-4 w-4" />}
                label="My Tasks"
                isActive={pathname === "/dashboard/my-tasks"}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/dashboard/notifications"
                icon={<Bell className="h-4 w-4" />}
                label="Notifications"
                isActive={pathname === "/dashboard/notifications"}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/dashboard/calendar"
                icon={<Calendar className="h-4 w-4" />}
                label="Calendar"
                isActive={pathname === "/dashboard/calendar"}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/dashboard/analytics"
                icon={<BarChart3 className="h-4 w-4" />}
                label="Analytics"
                isActive={pathname === "/dashboard/analytics"}
                isCollapsed={isCollapsed}
              />
            </nav>

            <div className="mt-6">
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2",
                  isCollapsed ? "px-2" : "px-3"
                )}
              >
                {!isCollapsed && (
                  <span className="text-xs font-semibold text-gray-500">
                    WORKSPACES
                  </span>
                )}
                {!isCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setWorkspacesOpen(!workspacesOpen)}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        workspacesOpen ? "" : "-rotate-90"
                      )}
                    />
                  </Button>
                )}
              </div>
              {workspacesOpen && (
                <div className="mt-1 space-y-1">
                  {workspacesLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Loading workspaces...
                    </div>
                  ) : workspacesError ? (
                    <div className="px-3 py-2 text-sm text-red-500">
                      Failed to load workspaces
                    </div>
                  ) : displayedWorkspaces.length > 0 ? (
                    <>
                      {displayedWorkspaces.map((workspace: any) => (
                        <NavItem
                          key={workspace._id}
                          href={`/dashboard/workspaces/${workspace._id}`}
                          icon={<Building2 className="h-4 w-4" />}
                          label={workspace.name}
                          isActive={
                            pathname ===
                            `/dashboard/workspaces/${workspace._id}`
                          }
                          isCollapsed={isCollapsed}
                        />
                      ))}

                      {/* See More / See Less Button */}
                      {!isCollapsed && hasMoreWorkspaces && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                          onClick={() =>
                            setShowAllWorkspaces(!showAllWorkspaces)
                          }
                        >
                          {showAllWorkspaces ? (
                            <>Show Less</>
                          ) : (
                            <>See More ({allWorkspaces.length - 5} more)</>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No workspaces found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account Section */}
            <div className="mt-6">
              <div className={cn("px-3 py-2", isCollapsed ? "px-2" : "px-3")}>
                {!isCollapsed && (
                  <span className="text-xs font-semibold text-gray-500">
                    ACCOUNT
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                <NavItem
                  href="/dashboard/profile"
                  icon={<User2 className="h-4 w-4" />}
                  label="Profile"
                  isActive={pathname === "/dashboard/profile"}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href="/dashboard/settings"
                  icon={<Settings2 className="h-4 w-4" />}
                  label="Settings"
                  isActive={pathname === "/dashboard/settings"}
                  isCollapsed={isCollapsed}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="border-t p-3 dark:border-gray-800">
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            className={cn(
              "w-full justify-start text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            )}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
            {!isCollapsed && "Log out"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavItem({ href, icon, label, isActive, isCollapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
        isActive
          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
          : "text-gray-500 dark:text-gray-400",
        isCollapsed && "justify-center px-2"
      )}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}
