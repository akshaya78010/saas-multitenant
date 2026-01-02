# Multi-Tenant SaaS Platform - Project & Task Management System

A production-ready, multi-tenant SaaS application where multiple organizations can independently register, manage their teams, create projects, and track tasks. The system ensures complete data isolation between tenants, implements role-based access control (RBAC), and enforces subscription plan limits.

## Features

- **Multi-Tenancy Architecture**: Complete data isolation between tenants using shared database with tenant_id column approach
- **Role-Based Access Control**: Three user roles (Super Admin, Tenant Admin, User) with granular permissions
- **Tenant Registration**: Self-service tenant registration with unique subdomain support
- **User Management**: Tenant admins can add, update, and manage users within their organization
- **Project Management**: Create, update, and manage projects with status tracking
- **Task Management**: Create tasks within projects, assign to users, track status and priority
- **Subscription Management**: Three plans (free, pro, enterprise) with enforced limits on users and projects
- **Audit Logging**: Comprehensive audit trail for all important actions
- **JWT Authentication**: Secure stateless authentication with 24-hour token expiry
- **RESTful API**: 19 well-documented API endpoints with consistent response format
- **Responsive Frontend**: Modern React-based UI with role-based feature visibility
- **Dockerized**: Fully containerized application with one-command deployment

## Technology Stack

### Frontend
- React 18.2.0
- React Router 6.20.0
- Axios 1.6.2
- Vite 5.0.8

### Backend
- Node.js 18
- Express 4.18.2
- PostgreSQL 15
- JWT (jsonwebtoken 9.0.2)
- bcrypt 5.1.1

### DevOps
- Docker & Docker Compose
- PostgreSQL (Database)

## Architecture Overview

The application follows a three-tier architecture:

1. **Frontend Layer**: React SPA served via Vite
2. **Backend Layer**: Express.js REST API
3. **Database Layer**: PostgreSQL with proper indexing and foreign key constraints

Data isolation is achieved through a shared database with tenant_id column approach, where every data record (except super_admin users) is associated with a tenant.

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## Installation & Setup

### Prerequisites

- Docker and Docker Compose installed
- Git

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd saas-multitennant
```

2. Start all services with Docker Compose:
```bash
docker-compose up -d
```

This single command will:
- Start PostgreSQL database on port 5432
- Start backend API on port 5000
- Start frontend application on port 3000
- Run database migrations automatically
- Load seed data automatically

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

### Test Credentials

The application comes with pre-seeded test data. See [submission.json](submission.json) for all test credentials.

**Super Admin:**
- Email: `superadmin@system.com`
- Password: `Admin@123`

**Demo Tenant:**
- Subdomain: `demo`
- Admin Email: `admin@demo.com`
- Admin Password: `Demo@123`

**Demo Users:**
- Email: `user1@demo.com` / Password: `User@123`
- Email: `user2@demo.com` / Password: `User@123`

## Project Structure

```
saas-multitennant/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and JWT configuration
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Authentication and authorization
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utilities (migrations, seeds, audit)
│   │   └── server.js        # Main server file
│   ├── migrations/          # Database migrations
│   ├── seeds/              # Seed data
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── context/        # React context (Auth)
│   │   └── utils/          # Utilities
│   └── Dockerfile
├── database/
│   ├── migrations/         # SQL migration files
│   └── seeds/             # SQL seed files
├── docs/                   # Documentation
├── docker-compose.yml      # Docker orchestration
└── submission.json         # Test credentials
```

## API Documentation

The application provides 19 RESTful API endpoints organized into modules:

- **Authentication** (4 endpoints): Register tenant, login, get current user, logout
- **Tenant Management** (3 endpoints): Get tenant, update tenant, list tenants
- **User Management** (4 endpoints): Add user, list users, update user, delete user
- **Project Management** (4 endpoints): Create project, list projects, update project, delete project
- **Task Management** (4 endpoints): Create task, list tasks, update task status, update task

All APIs return a consistent response format:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

See [docs/API.md](docs/API.md) for complete API documentation with request/response examples.

## Environment Variables

All environment variables are configured in `docker-compose.yml`. For local development, you can create a `.env` file in the backend directory:

```env
DB_HOST=database
DB_PORT=5432
DB_NAME=saas_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://frontend:3000
```

## Development

### Running Locally (without Docker)

1. **Database Setup:**
   - Install PostgreSQL 15
   - Create database: `CREATE DATABASE saas_db;`

2. **Backend:**
   ```bash
   cd backend
   npm install
   npm run migrate
   npm run seed
   npm run dev
   ```

3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Running Tests

Currently, the application focuses on functional completeness. Unit and integration tests can be added following the existing code structure.

## Documentation

- [Research Document](docs/research.md) - Multi-tenancy analysis, technology stack justification, security considerations
- [Product Requirements Document](docs/PRD.md) - User personas, functional requirements, non-functional requirements
- [Architecture Document](docs/architecture.md) - System architecture, database ERD, API endpoint list
- [Technical Specification](docs/technical-spec.md) - Project structure, setup guide
- [API Documentation](docs/API.md) - Complete API endpoint documentation

## Security Features

- Password hashing using bcrypt with salt rounds 10
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Complete data isolation between tenants
- Input validation on all API endpoints
- SQL injection prevention through parameterized queries
- CORS configuration for frontend-backend communication
- Audit logging for security compliance

## Subscription Plans

| Plan | Max Users | Max Projects |
|------|-----------|--------------|
| Free | 5 | 3 |
| Pro | 25 | 15 |
| Enterprise | 100 | 50 |

New tenants start with the 'free' plan by default. Limits are enforced at the API level.

## Demo Video

[YouTube Demo Video Link](https://youtube.com/watch?v=example) - *Replace with actual YouTube link*

## Contributing

This is a project submission. For questions or issues, please refer to the documentation or contact the development team.

## License

This project is developed as part of an academic/professional assignment.

## Support

For setup issues or questions:
1. Check the documentation in the `docs/` directory
2. Verify Docker is running: `docker-compose ps`
3. Check logs: `docker-compose logs backend` or `docker-compose logs frontend`
4. Verify health check: `curl http://localhost:5000/api/health`

---

**Built with ❤️ for multi-tenant SaaS applications**

