# API Documentation
## Multi-Tenant SaaS Platform

Base URL: `http://localhost:5000/api` (or your backend URL)

All APIs return JSON responses with consistent format:
- Success: `{success: true, message?: string, data?: object}`
- Error: `{success: false, message: string}`

## Authentication

Most endpoints require authentication via JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints

### 1.1 Register Tenant

**Endpoint:** `POST /api/auth/register-tenant`

**Authentication:** None (public)

**Request Body:**
```json
{
  "tenantName": "Test Company Alpha",
  "subdomain": "testalpha",
  "adminEmail": "admin@testalpha.com",
  "adminPassword": "TestPass@123",
  "adminFullName": "Alpha Admin"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Tenant registered successfully",
  "data": {
    "tenantId": "uuid",
    "subdomain": "testalpha",
    "adminUser": {
      "id": "uuid",
      "email": "admin@testalpha.com",
      "fullName": "Alpha Admin",
      "role": "tenant_admin"
    }
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `409`: Subdomain or email already exists

---

### 1.2 User Login

**Endpoint:** `POST /api/auth/login`

**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "admin@demo.com",
  "password": "Demo@123",
  "tenantSubdomain": "demo"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@demo.com",
      "fullName": "Demo Admin",
      "role": "tenant_admin",
      "tenantId": "uuid"
    },
    "token": "jwt-token-string",
    "expiresIn": 86400
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `404`: Tenant not found
- `403`: Account suspended/inactive

---

### 1.3 Get Current User

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@demo.com",
    "fullName": "Demo Admin",
    "role": "tenant_admin",
    "isActive": true,
    "tenant": {
      "id": "uuid",
      "name": "Demo Company",
      "subdomain": "demo",
      "subscriptionPlan": "pro",
      "maxUsers": 25,
      "maxProjects": 15
    }
  }
}
```

**Error Responses:**
- `401`: Token invalid/expired/missing
- `404`: User not found

---

### 1.4 Logout

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. Tenant Management Endpoints

### 2.1 Get Tenant Details

**Endpoint:** `GET /api/tenants/:tenantId`

**Authentication:** Required

**Authorization:** User must belong to tenant OR be super_admin

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Demo Company",
    "subdomain": "demo",
    "status": "active",
    "subscriptionPlan": "pro",
    "maxUsers": 25,
    "maxProjects": 15,
    "createdAt": "2024-01-01T00:00:00Z",
    "stats": {
      "totalUsers": 5,
      "totalProjects": 3,
      "totalTasks": 15
    }
  }
}
```

**Error Responses:**
- `403`: Unauthorized access
- `404`: Tenant not found

---

### 2.2 Update Tenant

**Endpoint:** `PUT /api/tenants/:tenantId`

**Authentication:** Required

**Authorization:** tenant_admin OR super_admin

**Request Body (tenant_admin can only update name):**
```json
{
  "name": "Updated Company Name"
}
```

**Request Body (super_admin can update all fields):**
```json
{
  "name": "Updated Company Name",
  "status": "active",
  "subscriptionPlan": "enterprise",
  "maxUsers": 100,
  "maxProjects": 50
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Company Name",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Insufficient permissions
- `404`: Tenant not found

---

### 2.3 List All Tenants

**Endpoint:** `GET /api/tenants`

**Authentication:** Required

**Authorization:** super_admin ONLY

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10, max: 100)
- `status` (enum, optional): Filter by status
- `subscriptionPlan` (enum, optional): Filter by plan

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "uuid",
        "name": "Demo Company",
        "subdomain": "demo",
        "status": "active",
        "subscriptionPlan": "pro",
        "totalUsers": 5,
        "totalProjects": 3,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalTenants": 47,
      "limit": 10
    }
  }
}
```

**Error Responses:**
- `403`: Not super_admin

---

## 3. User Management Endpoints

### 3.1 Add User to Tenant

**Endpoint:** `POST /api/tenants/:tenantId/users`

**Authentication:** Required

**Authorization:** tenant_admin only

**Request Body:**
```json
{
  "email": "newuser@demo.com",
  "password": "NewUser@123",
  "fullName": "New User",
  "role": "user"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "email": "newuser@demo.com",
    "fullName": "New User",
    "role": "user",
    "tenantId": "uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Subscription limit reached OR not authorized
- `409`: Email already exists in this tenant

---

### 3.2 List Tenant Users

**Endpoint:** `GET /api/tenants/:tenantId/users`

**Authentication:** Required

**Authorization:** User must belong to tenant

**Query Parameters:**
- `search` (string, optional): Search by name or email
- `role` (enum, optional): Filter by role
- `page` (integer, default: 1)
- `limit` (integer, default: 50, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "admin@demo.com",
        "fullName": "Demo Admin",
        "role": "tenant_admin",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    }
  }
}
```

---

### 3.3 Update User

**Endpoint:** `PUT /api/users/:userId`

**Authentication:** Required

**Authorization:** tenant_admin OR self (limited fields)

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "role": "tenant_admin",
  "isActive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "fullName": "Updated Name",
    "role": "user",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 3.4 Delete User

**Endpoint:** `DELETE /api/users/:userId`

**Authentication:** Required

**Authorization:** tenant_admin only

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `403`: Cannot delete self OR not authorized
- `404`: User not found

---

## 4. Project Management Endpoints

### 4.1 Create Project

**Endpoint:** `POST /api/projects`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Website Redesign Project",
  "description": "Complete redesign of company website",
  "status": "active"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Website Redesign Project",
    "description": "Complete redesign of company website",
    "status": "active",
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Project limit reached

---

### 4.2 List Projects

**Endpoint:** `GET /api/projects`

**Authentication:** Required

**Query Parameters:**
- `status` (enum, optional): Filter by status
- `search` (string, optional): Search by name
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Website Redesign",
        "description": "Project description",
        "status": "active",
        "createdBy": {
          "id": "uuid",
          "fullName": "Admin User"
        },
        "taskCount": 5,
        "completedTaskCount": 2,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 3,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 20
    }
  }
}
```

---

### 4.3 Update Project

**Endpoint:** `PUT /api/projects/:projectId`

**Authentication:** Required

**Authorization:** tenant_admin OR project creator

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "archived"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Project Name",
    "description": "Updated description",
    "status": "archived",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Not authorized
- `404`: Project not found

---

### 4.4 Delete Project

**Endpoint:** `DELETE /api/projects/:projectId`

**Authentication:** Required

**Authorization:** tenant_admin OR project creator

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses:**
- `403`: Not authorized
- `404`: Project not found

---

## 5. Task Management Endpoints

### 5.1 Create Task

**Endpoint:** `POST /api/projects/:projectId/tasks`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Design homepage mockup",
  "description": "Create high-fidelity design",
  "assignedTo": "user-uuid-here",
  "priority": "high",
  "dueDate": "2024-07-15"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "tenantId": "uuid",
    "title": "Design homepage mockup",
    "description": "Create high-fidelity design",
    "status": "todo",
    "priority": "high",
    "assignedTo": "uuid",
    "dueDate": "2024-07-15",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Project doesn't belong to user's tenant
- `400`: assignedTo user doesn't belong to same tenant

---

### 5.2 List Project Tasks

**Endpoint:** `GET /api/projects/:projectId/tasks`

**Authentication:** Required

**Query Parameters:**
- `status` (enum, optional): Filter by status
- `assignedTo` (uuid, optional): Filter by assigned user
- `priority` (enum, optional): Filter by priority
- `search` (string, optional): Search by title
- `page` (integer, default: 1)
- `limit` (integer, default: 50, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Design homepage",
        "description": "Create design mockup",
        "status": "in_progress",
        "priority": "high",
        "assignedTo": {
          "id": "uuid",
          "fullName": "John Doe",
          "email": "john@demo.com"
        },
        "dueDate": "2024-07-01",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    }
  }
}
```

---

### 5.3 Update Task Status

**Endpoint:** `PATCH /api/tasks/:taskId/status`

**Authentication:** Required

**Request Body:**
```json
{
  "status": "completed"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 5.4 Update Task

**Endpoint:** `PUT /api/tasks/:taskId`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "user-uuid-here",
  "dueDate": "2024-08-01"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": "uuid",
    "title": "Updated task title",
    "description": "Updated description",
    "status": "in_progress",
    "priority": "high",
    "assignedTo": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@demo.com"
    },
    "dueDate": "2024-08-01",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `403`: Task doesn't belong to user's tenant
- `400`: assignedTo user doesn't belong to same tenant
- `404`: Task not found

---

## Error Codes Summary

| Status Code | Description |
|-------------|-------------|
| 200 | Success (GET, PUT, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions, limit reached) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (duplicate email, subdomain) |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently not implemented. Can be added using express-rate-limit middleware.

## Pagination

List endpoints support pagination with `page` and `limit` query parameters. Response includes pagination metadata.

## Filtering & Search

Many list endpoints support:
- **Filtering**: By status, role, priority, etc.
- **Search**: Case-insensitive search by name, email, title, etc.

---

**Last Updated:** 2024-01-01

