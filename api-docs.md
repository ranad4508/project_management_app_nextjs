# Worksphere API Documentation

This document provides comprehensive API documentation for testing the Worksphere project in Postman, including request bodies, parameters, and response formats.

---

## Base URL

```
http://localhost:3000
```

## Authentication

All authenticated endpoints require a valid session cookie. Use the login endpoint first to establish a session.
Cookie: next-auth.session-token=your_jwt_token_here
Content-Type: application/json

### POST /api/auth/register

**Description:** Register a new user
**Authentication:** Public
**Content-Type:** application/json

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isVerified": false
  },
  "message": "User registered successfully. Please check your email for verification."
}
```

### POST /api/auth/login

**Description:** Log in a user
**Authentication:** Public
**Content-Type:** application/json

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "Password123",
  "mfaCode": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/verify-email

**Description:** Verify a user's email address
**Authentication:** Public
**Content-Type:** application/json

**Request Body:**

```json
{
  "token": "verification_token_from_email"
}
```

---

## User Management

### POST /api/user/avatar

**Description:** Upload or update user avatar
**Authentication:** Required
**Content-Type:** multipart/form-data

**Request Body (Form Data):**

- `avatar` (file): Image file (max 5MB, image formats only)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "avatarUrl": "/uploads/avatars/user_id-timestamp.jpg"
  },
  "message": "Avatar updated successfully"
}
```

### GET /api/user/profile

**Description:** Get user profile
**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "/uploads/avatars/user_id.jpg",
    "settings": {
      "theme": "light",
      "notifications": true
    }
  }
}
```

### PUT /api/user/profile

**Description:** Update user profile
**Authentication:** Required
**Content-Type:** application/json

**Request Body:**

```json
{
  "name": "John Smith",
  "bio": "Software Developer"
}
```

---

## Dashboard

### GET /api/dashboard/stats

**Description:** Get dashboard statistics
**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalTasks": 25,
    "completedTasks": 15,
    "inProgressTasks": 8,
    "overdueTasks": 2,
    "totalProjects": 5,
    "activeProjects": 4,
    "totalWorkspaces": 2
  }
}
```

### GET /api/dashboard/tasks

**Description:** Get recent tasks for dashboard
**Authentication:** Required

**Query Parameters:**

- `limit` (number, optional): Number of tasks to return (default: 10)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "task_id",
      "title": "Task Title",
      "status": "todo",
      "priority": "high",
      "dueDate": "2024-01-15T00:00:00.000Z",
      "project": {
        "_id": "project_id",
        "name": "Project Name"
      }
    }
  ]
}
```

### GET /api/dashboard/projects

**Description:** Get recent projects for dashboard
**Authentication:** Required

**Query Parameters:**

- `limit` (number, optional): Number of projects to return (default: 10)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "project_id",
      "name": "Project Name",
      "description": "Project description",
      "status": "active",
      "completionPercentage": 75
    }
  ]
}
```

### GET /api/dashboard/activities

**Description:** Get dashboard activities
**Authentication:** Required

**Query Parameters:**

- `limit` (number, optional): Number of activities to return

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "activity_id",
      "type": "task_created",
      "title": "Task Created",
      "message": "New task was created",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Workspaces

### POST /api/workspaces

**Description:** Create a new workspace
**Authentication:** Required
**Content-Type:** application/json

**Request Body:**

```json
{
  "name": "My Workspace",
  "description": "Workspace for my team"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "workspace_id",
    "name": "My Workspace",
    "description": "Workspace for my team",
    "owner": "user_id",
    "members": []
  },
  "message": "Workspace created successfully"
}
```

### GET /api/workspaces

**Description:** Get all workspaces for the user
**Authentication:** Required

**Query Parameters:**

- `limit` (number, optional): Number of workspaces to return (default: 50)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "workspace_id",
      "name": "My Workspace",
      "description": "Workspace description",
      "owner": "user_id",
      "memberCount": 5
    }
  ]
}
```

### GET /api/workspaces/{id}

**Description:** Get workspace by ID
**Authentication:** Required

**Path Parameters:**

- `id` (string): Workspace ID

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "workspace_id",
    "name": "My Workspace",
    "description": "Workspace description",
    "owner": {
      "_id": "user_id",
      "name": "John Doe"
    },
    "members": [
      {
        "user": {
          "_id": "user_id",
          "name": "Jane Smith"
        },
        "role": "member",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### PUT /api/workspaces/{id}

**Description:** Update workspace
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `id` (string): Workspace ID

**Request Body:**

```json
{
  "name": "Updated Workspace Name",
  "description": "Updated description"
}
```

### POST /api/workspaces/{id}/members

**Description:** Invite member to workspace
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `id` (string): Workspace ID

**Request Body:**

```json
{
  "email": "newmember@example.com",
  "role": "member",
  "message": "Welcome to our workspace!"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Invitation sent successfully"
}
```

### GET /api/workspaces/{id}/members

**Description:** Get workspace members
**Authentication:** Required

**Path Parameters:**

- `id` (string): Workspace ID

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "member_id",
      "user": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Projects

### POST /api/projects

**Description:** Create a new project
**Authentication:** Required
**Content-Type:** application/json

**Request Body:**

```json
{
  "name": "My Project",
  "description": "Project description",
  "workspaceId": "workspace_id",
  "members": ["user_id_1", "user_id_2"],
  "dueDate": "2024-12-31T23:59:59.000Z",
  "priority": "high"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "project_id",
    "name": "My Project",
    "description": "Project description",
    "workspace": "workspace_id",
    "owner": "user_id",
    "members": ["user_id_1", "user_id_2"],
    "status": "active",
    "priority": "high",
    "dueDate": "2024-12-31T23:59:59.000Z"
  },
  "message": "Project created successfully"
}
```

### GET /api/projects

**Description:** Get all projects for the user
**Authentication:** Required

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `sortBy` (string, optional): Sort field (default: "updatedAt")
- `sortOrder` (string, optional): "asc" or "desc" (default: "desc")

**Response (200):**

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "_id": "project_id",
        "name": "My Project",
        "description": "Project description",
        "status": "active",
        "completionPercentage": 75,
        "workspace": {
          "_id": "workspace_id",
          "name": "Workspace Name"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### GET /api/projects/{id}

**Description:** Get project by ID
**Authentication:** Required

**Path Parameters:**

- `id` (string): Project ID

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "project_id",
    "name": "My Project",
    "description": "Project description",
    "workspace": {
      "_id": "workspace_id",
      "name": "Workspace Name"
    },
    "owner": {
      "_id": "user_id",
      "name": "John Doe"
    },
    "members": [
      {
        "_id": "user_id",
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    ],
    "status": "active",
    "priority": "high",
    "completionPercentage": 75,
    "taskStats": {
      "total": 10,
      "completed": 7,
      "inProgress": 2,
      "todo": 1
    }
  }
}
```

### PUT /api/projects/{id}

**Description:** Update project
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `id` (string): Project ID

**Request Body:**

```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "active",
  "priority": "medium",
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

### DELETE /api/projects/{id}

**Description:** Delete project
**Authentication:** Required

**Path Parameters:**

- `id` (string): Project ID

**Response (200):**

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### GET /api/projects/workspaces/{workspaceId}

**Description:** Get all projects for a workspace
**Authentication:** Required

**Path Parameters:**

- `workspaceId` (string): Workspace ID

**Query Parameters:**

- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `status` (string, optional): Filter by status
- `search` (string, optional): Search term

**Response (200):**

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "_id": "project_id",
        "name": "Project Name",
        "status": "active",
        "completionPercentage": 60
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5
    }
  }
}
```

---

## Tasks

### POST /api/tasks

**Description:** Create a new task
**Authentication:** Required
**Content-Type:** application/json

**Request Body:**

```json
{
  "title": "Task Title",
  "description": "Task description",
  "projectId": "project_id",
  "assignedTo": "user_id",
  "status": "todo",
  "statusType": "unstarted",
  "priority": "high",
  "type": "task",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "startDate": "2024-01-01T00:00:00.000Z",
  "tags": ["frontend", "urgent"],
  "labels": ["label_id_1", "label_id_2"],
  "estimatedHours": 8,
  "parentTask": "parent_task_id"
}
```

**Valid Enum Values:**

- `status`: "backlog", "todo", "in_progress", "in_review", "done", "cancelled", "blocked"
- `statusType`: "unstarted", "started", "completed", "cancelled"
- `priority`: "no_priority", "low", "medium", "high", "urgent", "critical"
- `type`: "task", "bug", "feature", "improvement", "issue"

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "task_id",
    "title": "Task Title",
    "description": "Task description",
    "project": "project_id",
    "assignedTo": "user_id",
    "status": "todo",
    "priority": "high",
    "type": "task",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "estimatedHours": 8
  },
  "message": "Task created successfully"
}
```

### GET /api/tasks

**Description:** Get all accessible tasks
**Authentication:** Required

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `projectId` (string, optional): Filter by project
- `assignedTo` (string, optional): Filter by assignee
- `status` (string, optional): Filter by status
- `priority` (string, optional): Filter by priority
- `search` (string, optional): Search term

**Response (200):**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "task_id",
        "title": "Task Title",
        "status": "todo",
        "priority": "high",
        "assignedTo": {
          "_id": "user_id",
          "name": "John Doe"
        },
        "project": {
          "_id": "project_id",
          "name": "Project Name"
        },
        "dueDate": "2024-12-31T23:59:59.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### GET /api/tasks/my-tasks

**Description:** Get tasks assigned to the current user
**Authentication:** Required

**Query Parameters:**

- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `status` (string, optional): Filter by status
- `priority` (string, optional): Filter by priority
- `search` (string, optional): Search term

### GET /api/tasks/{id}

**Description:** Get task by ID
**Authentication:** Required

**Path Parameters:**

- `id` (string): Task ID

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "task_id",
    "title": "Task Title",
    "description": "Task description",
    "project": {
      "_id": "project_id",
      "name": "Project Name",
      "workspace": "workspace_id"
    },
    "assignedTo": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "status": "todo",
    "priority": "high",
    "type": "task",
    "labels": [
      {
        "_id": "label_id",
        "name": "Frontend",
        "color": "#ff0000"
      }
    ],
    "dueDate": "2024-12-31T23:59:59.000Z",
    "estimatedHours": 8,
    "actualHours": 0,
    "completionPercentage": 0,
    "subtasks": [],
    "attachments": [],
    "comments": []
  }
}
```

### PUT /api/tasks/{id}

**Description:** Update task
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `id` (string): Task ID

**Request Body:**

```json
{
  "title": "Updated Task Title",
  "description": "Updated description",
  "assignedTo": "user_id",
  "status": "in_progress",
  "priority": "medium",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "estimatedHours": 10,
  "actualHours": 5,
  "isCompleted": false,
  "completionPercentage": 50
}
```

### DELETE /api/tasks/{id}

**Description:** Delete task
**Authentication:** Required

**Path Parameters:**

- `id` (string): Task ID

---

## Task Comments & Attachments

### POST /api/tasks/{id}/comments

**Description:** Add comment to task
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `id` (string): Task ID

**Request Body:**

```json
{
  "content": "This is a comment on the task"
}
```

### GET /api/tasks/{id}/comments

**Description:** Get task comments
**Authentication:** Required

**Path Parameters:**

- `id` (string): Task ID

### POST /api/tasks/{id}/attachments

**Description:** Add attachment to task
**Authentication:** Required
**Content-Type:** multipart/form-data

**Path Parameters:**

- `id` (string): Task ID

**Request Body (Form Data):**

- `file` (file): File to attach

### GET /api/tasks/{id}/attachments

**Description:** Get task attachments
**Authentication:** Required

**Path Parameters:**

- `id` (string): Task ID

### DELETE /api/tasks/{id}/attachments/{attachmentId}

**Description:** Delete task attachment
**Authentication:** Required

**Path Parameters:**

- `id` (string): Task ID
- `attachmentId` (string): Attachment ID

---

## Labels

### GET /api/workspaces/{id}/labels

**Description:** Get workspace labels
**Authentication:** Required

**Path Parameters:**

- `id` (string): Workspace ID

**Query Parameters:**

- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `projectId` (string, optional): Filter by project

**Response (200):**

```json
{
  "success": true,
  "data": {
    "labels": [
      {
        "_id": "label_id",
        "name": "Frontend",
        "color": "#ff0000",
        "project": "project_id"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5
    }
  }
}
```

### POST /api/workspaces/{id}/labels

**Description:** Create workspace label
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `id` (string): Workspace ID

**Request Body:**

```json
{
  "name": "Frontend",
  "color": "#ff0000",
  "projectId": "project_id"
}
```

---

## Chat

### GET /api/chat/rooms

**Description:** Get user's chat rooms
**Authentication:** Required

**Query Parameters:**

- `workspaceId` (string, optional): Filter by workspace
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "room_id",
      "name": "General",
      "description": "General discussion",
      "type": "general",
      "workspace": "workspace_id",
      "isEncrypted": true,
      "memberCount": 5,
      "lastMessage": {
        "content": "Hello everyone!",
        "sender": {
          "name": "John Doe"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

### POST /api/chat/rooms

**Description:** Create a new chat room
**Authentication:** Required
**Content-Type:** application/json

**Request Body:**

```json
{
  "name": "Project Discussion",
  "description": "Discussion about the project",
  "type": "private",
  "workspaceId": "workspace_id",
  "isEncrypted": true,
  "inviteUsers": ["user_id_1", "user_id_2"]
}
```

**Valid Room Types:**

- `general`: General workspace room
- `private`: Private room
- `direct`: Direct message room

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "room_id",
    "name": "Project Discussion",
    "type": "private",
    "workspace": "workspace_id",
    "isEncrypted": true,
    "members": []
  },
  "message": "Room created successfully"
}
```

### GET /api/chat/rooms/{roomId}

**Description:** Get room details
**Authentication:** Required

**Path Parameters:**

- `roomId` (string): Room ID

### PUT /api/chat/rooms/{roomId}

**Description:** Update room
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `roomId` (string): Room ID

**Request Body:**

```json
{
  "name": "Updated Room Name",
  "description": "Updated description",
  "isEncrypted": true
}
```

### DELETE /api/chat/rooms/{roomId}

**Description:** Delete room
**Authentication:** Required

**Path Parameters:**

- `roomId` (string): Room ID

### GET /api/chat/rooms/{roomId}/messages

**Description:** Get room messages
**Authentication:** Required

**Path Parameters:**

- `roomId` (string): Room ID

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "message_id",
        "content": "Hello everyone!",
        "type": "text",
        "sender": {
          "_id": "user_id",
          "name": "John Doe",
          "avatar": "/uploads/avatars/user.jpg"
        },
        "room": "room_id",
        "isEncrypted": true,
        "reactions": [],
        "attachments": [],
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### POST /api/chat/rooms/{roomId}/messages

**Description:** Send message to room
**Authentication:** Required
**Content-Type:** application/json (for text) or multipart/form-data (for files)

**Path Parameters:**

- `roomId` (string): Room ID

**Request Body (Text Message):**

```json
{
  "content": "Hello everyone!",
  "type": "text",
  "replyTo": "message_id",
  "isEncrypted": true
}
```

**Request Body (File Message - Form Data):**

- `roomId` (string): Room ID
- `content` (string): Message content
- `type` (string): Message type ("file")
- `attachments` (file[]): Files to attach
- `isEncrypted` (boolean): Whether message is encrypted

**Valid Message Types:**

- `text`: Text message
- `file`: File attachment
- `image`: Image attachment
- `system`: System message

---

## Chat Room Members

### GET /api/chat/rooms/{roomId}/members

**Description:** Get room members
**Authentication:** Required

**Path Parameters:**

- `roomId` (string): Room ID

### POST /api/chat/rooms/{roomId}/members

**Description:** Invite member to room by email
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `roomId` (string): Room ID

**Request Body:**

```json
{
  "email": "user@example.com",
  "role": "member"
}
```

### DELETE /api/chat/rooms/{roomId}/members/{memberId}

**Description:** Remove member from room
**Authentication:** Required

**Path Parameters:**

- `roomId` (string): Room ID
- `memberId` (string): Member ID

### PUT /api/chat/rooms/{roomId}/members/{memberId}

**Description:** Change member role
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `roomId` (string): Room ID
- `memberId` (string): Member ID

**Request Body:**

```json
{
  "role": "admin"
}
```

---

## Message Management

### PUT /api/chat/messages/{messageId}

**Description:** Edit message
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `messageId` (string): Message ID

**Request Body:**

```json
{
  "content": "Updated message content"
}
```

### DELETE /api/chat/messages/{messageId}

**Description:** Delete message
**Authentication:** Required

**Path Parameters:**

- `messageId` (string): Message ID

### POST /api/chat/messages/{messageId}/reactions

**Description:** Add reaction to message
**Authentication:** Required
**Content-Type:** application/json

**Path Parameters:**

- `messageId` (string): Message ID

**Request Body:**

```json
{
  "emoji": "👍"
}
```

### DELETE /api/chat/messages/{messageId}/reactions/{reactionId}

**Description:** Remove reaction from message
**Authentication:** Required

**Path Parameters:**

- `messageId` (string): Message ID
- `reactionId` (string): Reaction ID

---

## File Downloads

### GET /api/uploads/{filename}

**Description:** Download or view file
**Authentication:** Required

**Path Parameters:**

- `filename` (string): File name

**Query Parameters:**

- `download` (boolean, optional): Force download (default: false)
- `name` (string, optional): Original filename for download

---
