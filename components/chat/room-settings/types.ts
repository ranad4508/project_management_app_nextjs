import { ChatRoom, RoomMember } from "@/src/types/chat.types";
import { MemberRole } from "@/src/enums/user.enum";

export interface RoomSettingsProps {
  room: ChatRoom;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onRoomUpdate?: (roomId: string, data: any) => void;
  onMemberRemove?: (roomId: string, memberId: string) => void;
  onMemberRoleChange?: (
    roomId: string,
    memberId: string,
    role: MemberRole
  ) => void;
}

export interface TabProps {
  room: ChatRoom;
  currentUser: any;
  onRoomUpdate?: (roomId: string, data: any) => void;
  onMemberRemove?: (roomId: string, memberId: string) => void;
  onMemberRoleChange?: (
    roomId: string,
    memberId: string,
    role: MemberRole
  ) => void;
}

export interface MemberCardProps {
  member: RoomMember;
  currentUser: any;
  room: ChatRoom;
  onRemove?: (memberId: string, memberName: string) => void;
  onRoleChange?: (
    memberId: string,
    newRole: MemberRole,
    memberName: string
  ) => void;
}

export interface RoleSelectorProps {
  currentRole: MemberRole;
  onRoleChange: (newRole: MemberRole) => void;
  disabled?: boolean;
  canChangeRole?: boolean;
}
