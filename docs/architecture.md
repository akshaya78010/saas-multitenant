# Architecture Document
## Multi-Tenant SaaS Platform

## 1. System Architecture

### High-Level Architecture

The system follows a three-tier architecture:

```
┌─────────────────┐
│   Web Browser   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/HTTPS
         │
┌────────▼────────┐
│  React SPA      │
│  (Port 3000)    │
│  - Components   │
│  - Pages        │
│  - Services     │
└────────┬────────┘
         │ REST API
         │ JWT Auth
         │
┌────────▼────────┐
│  Express API    │
│  (Port 5000)    │
│  - Controllers  │
│  - Middleware   │
│  - Routes       │
└────────┬────────┘
         │ SQL Queries
         │
┌────────▼────────┐
│  PostgreSQL     │
│  (Port 5432)    │
│  - Tenants      │
│  - Users        │
│  - Projects     │
│  - Tasks        │
└─────────────────┘
```

### Authentication Flow

```
1. User submits login form
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend generates JWT token
   ↓
5. Frontend stores token in localStorage
   ↓
6. Frontend includes token in Authorization header for all requests
   ↓
7. Backend middleware validates token on each request
   ↓
8. Backend extracts userId, tenantId, role from token
   ↓
9. Backend processes request with tenant isolation
```

### Data Flow - Creating a Project

```
1. User clicks "Create Project"
   ↓
2. Frontend sends POST /api/projects with JWT token
   ↓
3. Auth middleware validates token, extracts tenantId
   ↓
4. Controller checks subscription limit
   ↓
5. Controller creates project with tenantId from JWT
   ↓
6. Controller logs action in audit_logs
   ↓
7. Response returned to frontend
   ↓
8. Frontend updates UI
```

## 2. Database Schema Design

### Entity Relationship Diagram

```
┌─────────────┐
│   tenants   │
├─────────────┤
│ id (PK)     │
│ name        │
│ subdomain   │◄─────┐
│ status      │      │
│ plan        │      │
│ max_users   │      │
│ max_projects│      │
└─────────────┘      │
                     │
┌─────────────┐      │
│    users    │      │
├─────────────┤      │
│ id (PK)     │      │
│ tenant_id   │──────┘
│ email       │      │
│ password    │      │
│ full_name   │      │
│ role        │      │
│ is_active   │      │
└──────┬──────┘      │
       │             │
       │             │
┌──────▼──────┐      │
│  projects   │      │
├─────────────┤      │
│ id (PK)     │      │
│ tenant_id   │──────┘
│ name        │      │
│ description │      │
│ status      │      │
│ created_by  │──────┐
└──────┬──────┘      │
       │             │
       │             │
┌──────▼──────┐      │
│    tasks    │      │
├─────────────┤      │
│ id (PK)     │      │
│ project_id  │──────┘
│ tenant_id   │──────┐
│ title       │      │
│ description │      │
│ status      │      │
│ priority    │      │
│ assigned_to│──────┘
│ due_date    │
└─────────────┘

┌─────────────┐
│ audit_logs  │
├─────────────┤
│ id (PK)     │
│ tenant_id   │
│ user_id     │
│ action      │
│ entity_type │
│ entity_id   │
│ ip_address  │
│ created_at  │
└─────────────┘
```

### Key Design Decisions

1. **Tenant Isolation**: Every table (except super_admin users) has `tenant_id` column
2. **Foreign Keys**: All foreign keys have CASCADE delete for data integrity
3. **Indexes**: All `tenant_id` columns are indexed for performance
4. **Unique Constraints**: `UNIQUE(tenant_id, email)` ensures email uniqueness per tenant
5. **Super Admin**: Users with `role = 'super_admin'` have `tenant_id = NULL`

## 3. API Architecture

### API Endpoint Organization

All APIs follow RESTful conventions and are organized by resource:

#### Authentication Endpoints (`/api/auth`)
- `POST /api/auth/register-tenant` - Register new tenant
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

#### Tenant Endpoints (`/api/tenants`)
- `GET /api/tenants` - List all tenants (super admin only)
- `GET /api/tenants/:tenantId` - Get tenant details
- `PUT /api/tenants/:tenantId` - Update tenant

#### User Endpoints (`/api/tenants/:tenantId/users` and `/api/users`)
- `POST /api/tenants/:tenantId/users` - Add user to tenant
- `GET /api/tenants/:tenantId/users` - List tenant users
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user

#### Project Endpoints (`/api/projects`)
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `PUT /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project

#### Task Endpoints (`/api/projects/:projectId/tasks` and `/api/tasks`)
- `POST /api/projects/:projectId/tasks` - Create task
- `GET /api/projects/:projectId/tasks` - List project tasks
- `PATCH /api/tasks/:taskId/status` - Update task status
- `PUT /api/tasks/:taskId` - Update task

### Authentication Requirements

| Endpoint | Authentication | Authorization |
|----------|---------------|--------------|
| POST /api/auth/register-tenant | None | Public |
| POST /api/auth/login | None | Public |
| GET /api/auth/me | Required | Any authenticated user |
| POST /api/auth/logout | Required | Any authenticated user |
| GET /api/tenants | Required | Super admin only |
| GET /api/tenants/:tenantId | Required | Own tenant or super admin |
| PUT /api/tenants/:tenantId | Required | Tenant admin or super admin |
| POST /api/tenants/:tenantId/users | Required | Tenant admin only |
| GET /api/tenants/:tenantId/users | Required | Own tenant or super admin |
| PUT /api/users/:userId | Required | Self (limited) or tenant admin |
| DELETE /api/users/:userId | Required | Tenant admin or super admin |
| POST /api/projects | Required | Any authenticated user |
| GET /api/projects | Required | Own tenant or super admin |
| PUT /api/projects/:projectId | Required | Creator or tenant admin |
| DELETE /api/projects/:projectId | Required | Creator or tenant admin |
| POST /api/projects/:projectId/tasks | Required | Own tenant or super admin |
| GET /api/projects/:projectId/tasks | Required | Own tenant or super admin |
| PATCH /api/tasks/:taskId/status | Required | Own tenant or super admin |
| PUT /api/tasks/:taskId | Required | Own tenant or super admin |

### Response Format

All APIs return consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

- `200 OK` - Successful GET, PUT, PATCH, DELETE
- `201 Created` - Successful POST (resource created)
- `400 Bad Request` - Validation errors, invalid input
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions, subscription limit reached
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `500 Internal Server Error` - Server error

## 4. Security Architecture

### Multi-Layer Security

1. **Transport Layer**: HTTPS in production (not implemented in demo)
2. **Authentication Layer**: JWT tokens with expiration
3. **Authorization Layer**: Role-based access control (RBAC)
4. **Data Layer**: Tenant isolation via middleware
5. **Application Layer**: Input validation, SQL injection prevention
6. **Audit Layer**: Comprehensive logging

### Tenant Isolation Implementation

```
Request → Auth Middleware → Extract tenantId from JWT
    ↓
Authorization Middleware → Check role permissions
    ↓
Controller → Add tenantId filter to queries
    ↓
Database → Return only tenant's data
```

### Security Flow - Data Access

1. User makes API request with JWT token
2. Auth middleware validates token and extracts `tenantId`
3. Authorization middleware checks user role
4. Controller automatically filters queries by `tenantId`
5. Database returns only data belonging to user's tenant
6. Response sent to frontend

## 5. Deployment Architecture

### Docker Container Architecture

```
┌─────────────────────────────────────┐
│      Docker Compose Network         │
│                                     │
│  ┌──────────┐    ┌──────────┐     │
│  │ Frontend │───▶│ Backend  │     │
│  │ :3000    │    │ :5000    │     │
│  └──────────┘    └────┬─────┘     │
│                       │            │
│                  ┌────▼─────┐     │
│                  │ Database │     │
│                  │ :5432    │     │
│                  └──────────┘     │
└─────────────────────────────────────┘
```

### Service Communication

- Frontend → Backend: HTTP requests to `http://backend:5000`
- Backend → Database: PostgreSQL connection to `database:5432`
- All services use Docker service names for internal communication
- External access via localhost ports (3000, 5000, 5432)

## 6. Scalability Considerations

### Current Architecture Supports

- **Horizontal Scaling**: Backend can be scaled by adding more instances
- **Database Scaling**: Can migrate to read replicas for read-heavy workloads
- **Caching**: Can add Redis for session/token caching (future)
- **Load Balancing**: Can add load balancer in front of backend (future)

### Performance Optimizations

1. **Database Indexes**: All `tenant_id` columns indexed
2. **Connection Pooling**: PostgreSQL connection pool in backend
3. **Pagination**: All list endpoints support pagination
4. **Query Optimization**: Efficient JOINs, proper WHERE clauses

## 7. Future Architecture Enhancements

1. **Microservices**: Split into auth service, tenant service, project service
2. **Message Queue**: Add RabbitMQ/Kafka for async operations
3. **Caching Layer**: Add Redis for frequently accessed data
4. **CDN**: Serve static assets via CDN
5. **API Gateway**: Add API gateway for rate limiting, routing
6. **Monitoring**: Add Prometheus, Grafana for metrics
7. **Logging**: Centralized logging with ELK stack

