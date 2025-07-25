"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MemberRole } from "@/src/enums/user.enum";

import { RoleSelectorProps } from "../types";

const roleLabels: Record<MemberRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  member: "Member",
  guest: "Guest",
};

const roleColors: Record<MemberRole, string> = {
  admin: "bg-red-100 text-red-800",
  moderator: "bg-blue-100 text-blue-800",
  member: "bg-green-100 text-green-800",
  guest: "bg-gray-100 text-gray-800",
};

export default function RoleSelector({
  currentRole,
  onRoleChange,
  disabled = false,
  canChangeRole = true,
}: RoleSelectorProps) {
  if (!canChangeRole || disabled) {
    return (
      <Badge className={roleColors[currentRole]}>
        {roleLabels[currentRole]}
      </Badge>
    );
  }

  return (
    <Select
      value={currentRole}
      onValueChange={(value: MemberRole) => onRoleChange(value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-24">
        <SelectValue>
          <Badge className={roleColors[currentRole]}>
            {roleLabels[currentRole]}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">
          <Badge className={roleColors.member}>{roleLabels.member}</Badge>
        </SelectItem>
        <SelectItem value="admin">
          <Badge className={roleColors.admin}>{roleLabels.admin}</Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
