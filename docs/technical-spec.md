# Technical Specification
## Multi-Tenant SaaS Platform

## 1. Project Structure

### Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # PostgreSQL connection pool
│   │   └── jwt.js          # JWT configuration
│   ├── controllers/
│   │   ├── authController.js      # Authentication logic
│   │   ├── tenantController.js    # Tenant management
│   │   ├── userController.js      # User management
│   │   ├── projectController.js   # Project management
│   │   └── taskController.js      # Task management
│   ├── middleware/
│   │   └── auth.js         # Authentication & authorization middleware
│   ├── routes/
│   │   ├── authRoutes.js   # Auth endpoints
│   │   ├── tenantRoutes.js # Tenant endpoints
│   │   ├── userRoutes.js   # User endpoints
│   │   ├── projectRoutes.js # Project endpoints
│   │   └── taskRoutes.js   # Task endpoints
│   ├── utils/
│   │   ├── runMigrations.js # Database migration runner
│   │   ├── runSeeds.js      # Seed data loader
│   │   └── auditLogger.js   # Audit logging utility
│   └── server.js           # Main application entry point
├── migrations/             # SQL migration files (optional, using database/migrations)
├── seeds/                  # Seed data files (optional, using database/seeds)
├── Dockerfile              # Backend container definition
└── package.json            # Dependencies and scripts
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Navbar.jsx      # Navigation component
│   ├── pages/
│   │   ├── Register.jsx    # Tenant registration page
│   │   ├── Login.jsx       # Login page
│   │   ├── Dashboard.jsx   # Dashboard page
│   │   ├── Projects.jsx    # Projects list page
│   │   ├── ProjectDetails.jsx # Project details page
│   │   └── Users.jsx       # Users list page
│   ├── services/
│   │   └── api.js          # API service layer
│   ├── context/
│   │   └── AuthContext.jsx  # Authentication context
│   ├── utils/
│   │   └── ProtectedRoute.jsx # Route protection component
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── Dockerfile              # Frontend container definition
└── package.json            # Dependencies and scripts
```

### Database Structure

```
database/
├── migrations/
│   ├── 001_create_tenants.sql
│   ├── 002_create_users.sql
│   ├── 003_create_projects.sql
│   ├── 004_create_tasks.sql
│   └── 005_create_audit_logs.sql
└── seeds/
    └── seed_data.sql       # Seed data (actual hashes generated in runSeeds.js)
```

### Root Structure

```
saas-multitennant/
├── backend/                # Backend application
├── frontend/               # Frontend application
├── database/              # Database migrations and seeds
├── docs/                  # Documentation
├── docker-compose.yml      # Docker orchestration
├── submission.json        # Test credentials
└── README.md              # Project documentation
```

## 2. Development Setup Guide

### Prerequisites

- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 15 or higher (if running locally)
- **Docker**: Version 20.10 or higher (for containerized setup)
- **Docker Compose**: Version 2.0 or higher
- **Git**: For version control

### Local Development Setup (Without Docker)

#### Step 1: Database Setup

1. Install PostgreSQL 15
2. Create database:
```sql
CREATE DATABASE saas_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE saas_db TO postgres;
```

#### Step 2: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saas_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Run migrations:
```bash
npm run migrate
```

5. Load seed data:
```bash
npm run seed
```

6. Start development server:
```bash
npm run dev
```

Backend will be available at `http://localhost:5000`

#### Step 3: Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional, defaults work):
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Docker Setup (Recommended)

#### Step 1: Ensure Docker is Running

```bash
docker --version
docker-compose --version
```

#### Step 2: Start All Services

From project root:
```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Run database migrations automatically
- Load seed data automatically
- Start backend API server
- Start frontend application

#### Step 3: Verify Services

Check service status:
```bash
docker-compose ps
```

All services should show "Up" status.

#### Step 4: Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

#### Step 5: View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

#### Step 6: Stop Services

```bash
docker-compose down
```

To remove volumes (clears database):
```bash
docker-compose down -v
```

## 3. Environment Variables

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `5432` | Yes |
| `DB_NAME` | Database name | `saas_db` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes (min 32 chars) |
| `JWT_EXPIRES_IN` | Token expiration | `24h` | No |
| `PORT` | Server port | `5000` | No |
| `NODE_ENV` | Environment | `development` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | Yes |

### Frontend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` | No |

## 4. Database Migrations

### Running Migrations

Migrations run automatically when backend starts in Docker. For manual execution:

```bash
# Using npm script
npm run migrate

# Or directly
node src/utils/runMigrations.js
```

### Migration Files

Migrations are located in `database/migrations/` and run in numerical order:
1. `001_create_tenants.sql` - Creates tenants table
2. `002_create_users.sql` - Creates users table
3. `003_create_projects.sql` - Creates projects table
4. `004_create_tasks.sql` - Creates tasks table
5. `005_create_audit_logs.sql` - Creates audit_logs table

## 5. Seed Data

### Running Seeds

Seed data loads automatically when backend starts in Docker. For manual execution:

```bash
# Using npm script
npm run seed

# Or directly
node src/utils/runSeeds.js
```

### Seed Data Includes

- 1 Super Admin user (superadmin@system.com / Admin@123)
- 1 Demo Tenant (subdomain: demo)
- 1 Tenant Admin (admin@demo.com / Demo@123)
- 2 Regular Users (user1@demo.com, user2@demo.com / User@123)
- 2 Projects (Project Alpha, Project Beta)
- 5 Tasks distributed across projects

See `submission.json` for complete test credentials.

## 6. Testing

### Manual Testing

1. **Health Check**:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

2. **Login Test**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "Demo@123",
    "tenantSubdomain": "demo"
  }'
```

3. **Get Current User** (requires token from login):
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### API Testing Tools

- **Postman**: Import API collection for testing
- **cURL**: Command-line testing (examples above)
- **Browser DevTools**: Test frontend API calls

## 7. Troubleshooting

### Common Issues

#### Database Connection Error

**Problem**: Backend cannot connect to database

**Solutions**:
1. Verify database is running: `docker-compose ps database`
2. Check database logs: `docker-compose logs database`
3. Verify environment variables in `docker-compose.yml`
4. Ensure database service is healthy before backend starts

#### Migration Errors

**Problem**: Migrations fail to run

**Solutions**:
1. Check database connection
2. Verify migration files are present in `database/migrations/`
3. Check migration logs in backend logs
4. Manually run migrations: `npm run migrate`

#### CORS Errors

**Problem**: Frontend cannot call backend API

**Solutions**:
1. Verify `FRONTEND_URL` environment variable matches frontend URL
2. In Docker: Use service name `http://frontend:3000`
3. Locally: Use `http://localhost:3000`
4. Check CORS configuration in `backend/src/server.js`

#### Port Already in Use

**Problem**: Port 3000, 5000, or 5432 already in use

**Solutions**:
1. Stop conflicting services
2. Change ports in `docker-compose.yml`
3. Update frontend `VITE_API_URL` if backend port changes

## 8. Production Deployment Considerations

### Security

1. **Environment Variables**: Use secrets management (AWS Secrets Manager, HashiCorp Vault)
2. **HTTPS**: Enable HTTPS with SSL certificates
3. **JWT Secret**: Use strong, randomly generated secret (min 32 characters)
4. **Database Password**: Use strong, unique password
5. **CORS**: Restrict CORS to production frontend URL only

### Performance

1. **Database Indexes**: Ensure all indexes are created
2. **Connection Pooling**: Tune PostgreSQL connection pool size
3. **Caching**: Add Redis for frequently accessed data
4. **CDN**: Serve static assets via CDN

### Monitoring

1. **Health Checks**: Monitor `/api/health` endpoint
2. **Logging**: Centralized logging (ELK stack, CloudWatch)
3. **Metrics**: Application metrics (Prometheus, DataDog)
4. **Alerts**: Set up alerts for errors and performance issues

### Scaling

1. **Horizontal Scaling**: Add more backend instances behind load balancer
2. **Database Replicas**: Use read replicas for read-heavy workloads
3. **Caching Layer**: Add Redis for session and data caching

