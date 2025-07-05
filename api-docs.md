# Worksphere API Documentation

This document lists all API endpoints available in the Worksphere project, including their HTTP methods, paths, brief descriptions, and authentication requirements.

---

## Authentication
- **POST /api/auth/login** — Log in a user. (**Public**)
- **POST /api/auth/register** — Register a new user. (**Public**)
- **POST /api/auth/forgot-password** — Request a password reset. (**Public**)
- **POST /api/auth/reset-password** — Reset password using a token. (**Public**)
- **POST /api/auth/verify-email** — Verify a user's email address. (**Public**)
- **GET /api/auth/session** — Get the current user's session info. (**Requires Authentication**)
- **POST /api/auth/mfa/enable** — Enable multi-factor authentication (MFA). (**Requires Authentication**)
- **POST /api/auth/mfa/disable** — Disable MFA. (**Requires Authentication**)
- **POST /api/auth/mfa/verify** — Verify MFA code during login. (**Public**)
- **GET,POST /api/auth/[...nextauth]** — NextAuth.js authentication routes (sign in, sign out, callback, etc.). (**Public/Requires Authentication depending on route**)

---

## User
- **POST /api/user/avatar** — Upload or update user avatar. (**Requires Authentication**)
- **GET,PUT /api/user/profile** — Get or update user profile. (**Requires Authentication**)
- **PUT /api/user/settings** — Update user account settings (theme, notifications, etc.). (**Requires Authentication**)
- **PUT /api/user/change-password** — Change user password. (**Requires Authentication**)

---

## Dashboard
- **GET /api/dashboard/projects** — Get recent projects for the dashboard. (**Requires Authentication**)
- **GET /api/dashboard/tasks** — Get recent tasks for the dashboard. (**Requires Authentication**)
- **GET /api/dashboard/stats** — Get dashboard statistics. (**Requires Authentication**)
- **GET /api/dashboard/activities** — Get dashboard activities. (**Requires Authentication**)

---

## Notifications
- **GET,POST /api/notifications** — Get or create notifications. (**Requires Authentication**)
- **PUT /api/notifications/mark-all-read** — Mark all notifications as read. (**Requires Authentication**)
- **GET /api/notifications/unread-count** — Get count of unread notifications. (**Requires Authentication**)
- **PUT,DELETE /api/notifications/[id]** — Mark a notification as read or delete it. (**Requires Authentication**)

---

## Projects
- **POST,GET /api/projects** — Create or get all projects for the user. (**Requires Authentication**)
- **GET /api/projects/user** — Get all projects for the user. (**Requires Authentication**)
- **GET /api/projects/workspaces/[workspaceId]** — Get all projects for a workspace. (**Requires Authentication**)
- **GET,PUT,DELETE /api/projects/[id]** — Get, update, or delete a project by id. (**Requires Authentication**)
- **GET /api/projects/[id]/activities** — Get activities for a project. (**Requires Authentication**)
- **PUT /api/projects/[id]/archive** — Archive a project. (**Requires Authentication**)
- **GET,POST,DELETE /api/projects/[id]/members** — Get, add, or remove project members. (**Requires Authentication**)
- **GET,PUT /api/projects/[id]/settings** — Get or update project settings. (**Requires Authentication**)
- **GET,POST /api/projects/[id]/tasks** — Get or create tasks in a project. (**Requires Authentication**)

---

## Tasks
- **POST,GET /api/tasks** — Create or get all accessible tasks. (**Requires Authentication**)
- **GET /api/tasks/my-tasks** — Get all tasks assigned to the user. (**Requires Authentication**)
- **GET /api/tasks/overdue** — Get all overdue tasks for the user. (**Requires Authentication**)
- **GET /api/tasks/stats** — Get task statistics for the user. (**Requires Authentication**)
- **GET,PUT,DELETE /api/tasks/[id]** — Get, update, or delete a task by id. (**Requires Authentication**)
- **GET /api/tasks/[id]/activities** — Get activities for a task. (**Requires Authentication**)
- **POST,GET /api/tasks/[id]/attachments** — Add or get attachments for a task. (**Requires Authentication**)
- **DELETE /api/tasks/[id]/attachments/[attachmentId]** — Delete an attachment from a task. (**Requires Authentication**)
- **GET,POST /api/tasks/[id]/comments** — Get or add comments to a task. (**Requires Authentication**)
- **PUT,DELETE /api/tasks/[id]/comments/[commentId]** — Update or delete a comment on a task. (**Requires Authentication**)

---

## Labels
- **GET,POST /api/workspaces/[id]/labels** — Get or create labels for a workspace. (**Requires Authentication**)
- **PUT,DELETE /api/labels/[labelId]** — Update or delete a label by id. (**Requires Authentication**)

---

## Chat
- **GET,POST /api/chat/rooms** — Get or create chat rooms. (**Requires Authentication**)
- **GET,POST /api/chat/rooms/messages** — Get or send messages in a chat room. (**Requires Authentication**)
- **GET,PUT,DELETE /api/chat/rooms/[roomId]** — Get, update, or delete a chat room by id. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/archive** — Archive a chat room. (**Requires Authentication**)
- **DELETE /api/chat/rooms/[roomId]/conversation** — Delete conversation history in a chat room. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/decline-invitation** — Decline a chat room invitation. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/encryption/regenerate** — Regenerate encryption keys for a chat room. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/regenerate-keys** — Regenerate encryption keys for a chat room. (**Requires Authentication**)
- **GET /api/chat/rooms/[roomId]/invitation** — Get invitation details for a chat room. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/accept-invitation** — Accept a chat room invitation. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/invite** — Invite a user to a chat room. (**Requires Authentication**)
- **GET,POST /api/chat/rooms/[roomId]/members** — Get or add members to a chat room. (**Requires Authentication**)
- **DELETE /api/chat/rooms/[roomId]/members/[memberId]** — Remove a member from a chat room. (**Requires Authentication**)
- **GET,POST /api/chat/rooms/[roomId]/messages** — Get or send messages in a chat room. (**Requires Authentication**)
- **POST /api/chat/rooms/[roomId]/read** — Mark messages as read in a chat room. (**Requires Authentication**)
- **POST /api/chat/invitations/[invitationId]/accept** — Accept a chat room invitation by invitationId. (**Requires Authentication**)
- **PUT,DELETE /api/chat/messages/[messageId]** — Edit or delete a chat message. (**Requires Authentication**)
- **POST /api/chat/messages/[messageId]/reactions** — Add a reaction to a chat message. (**Requires Authentication**)
- **DELETE /api/chat/messages/[messageId]/reactions/[reactionId]** — Remove a reaction from a chat message. (**Requires Authentication**)

---

## File Uploads
- **GET /api/uploads/[filename]** — Download or view a file by filename. (**Requires Authentication**)
- **GET /api/uploads/[filename]/download** — Download a file by filename (force download). (**Requires Authentication**)

---

## Workspaces
- **POST,GET /api/workspaces** — Create or get all workspaces for the user. (**Requires Authentication**)
- **GET,PUT,DELETE /api/workspaces/[id]** — Get, update, or delete a workspace by id. (**Requires Authentication**)
- **GET,POST /api/workspaces/[id]/chat** — Get or create chat rooms in a workspace. (**Requires Authentication**)
- **POST,GET /api/workspaces/[id]/members** — Invite or get members in a workspace. (**Requires Authentication**)
- **POST /api/workspaces/[id]/invite** — Invite a member to a workspace. (**Requires Authentication**)
- **GET /api/workspaces/[id]/projects** — Get all projects in a workspace. (**Requires Authentication**)
- **GET,PUT /api/workspaces/[id]/settings** — Get or update workspace settings. (**Requires Authentication**)
- **POST /api/workspaces/invitations/accept** — Accept a workspace invitation. (**Requires Authentication**)
- **GET /api/workspaces/invitations/check** — Check a workspace invitation by token. (**Public**)
- **GET /api/workspaces/user** — Get all workspaces for the authenticated user. (**Requires Authentication**)

---

## Miscellaneous
- **GET /api/test-my-tasks** — Get a sample of tasks assigned to the user (for testing). (**Requires Authentication**)

---

# Notes
- All endpoints marked **Requires Authentication** expect a valid session or token.
- Endpoints marked **Public** do not require authentication.
- Dynamic parameters (e.g., `[roomId]`, `[labelId]`, `[id]`, `[filename]`, etc.) should be replaced with actual values when making requests.
- For more details on request/response payloads, refer to the source code or controller logic.
