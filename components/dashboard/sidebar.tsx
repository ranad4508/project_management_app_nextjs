"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlusCircle,
  Settings2,
  User2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { signOut } from "next-auth/react";

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(true);

  // Mock data for workspaces - replace with real data from API
  const workspaces = [
    { id: "1", name: "Personal Workspace" },
    { id: "2", name: "Team Alpha" },
    { id: "3", name: "Project X" },
  ];

  return (
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
              href="/dashboard/tasks"
              icon={<CheckSquare className="h-4 w-4" />}
              label="My Tasks"
              isActive={pathname === "/dashboard/tasks"}
              isCollapsed={isCollapsed}
            />
            <NavItem
              href="/dashboard/calendar"
              icon={<Calendar className="h-4 w-4" />}
              label="Calendar"
              isActive={pathname === "/dashboard/calendar"}
              isCollapsed={isCollapsed}
            />
            {/* <NavItem
              href="/dashboard/messages"
              icon={<MessageSquare className="h-4 w-4" />}
              label="Messages"
              isActive={pathname === "/dashboard/messages"}
              isCollapsed={isCollapsed}
            /> */}
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
              {isCollapsed && (
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            {workspacesOpen && (
              <div className="mt-1 space-y-1">
                {workspaces.map((workspace) => (
                  <NavItem
                    key={workspace.id}
                    href={`/dashboard/workspaces/${workspace.id}`}
                    icon={<Users className="h-4 w-4" />}
                    label={workspace.name}
                    isActive={
                      pathname === `/dashboard/workspaces/${workspace.id}`
                    }
                    isCollapsed={isCollapsed}
                  />
                ))}
                {!isCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Workspace
                  </Button>
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
