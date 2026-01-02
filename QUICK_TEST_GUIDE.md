# Quick Test Guide - Multi-Tenant SaaS Platform

## 🚀 Quick Start

### Step 1: Start the Application
```bash
cd "C:\Users\hp\OneDrive - Aditya Educational Institutions\Desktop\Gito\saas-multitennant"
docker-compose up -d
```

Wait 20-30 seconds for all services to start.

### Step 2: Verify Services
```bash
docker-compose ps
```
All three services (database, backend, frontend) should show "Up" status.

### Step 3: Open the Website
Open your browser and go to: **http://localhost:3000**

---

## 🔐 Test Credentials

### Option 1: Super Admin Login
**Use this to test super admin features:**
- **Tenant Subdomain:** `demo` (or any subdomain - doesn't matter for super admin)
- **Email:** `superadmin@system.com`
- **Password:** `Admin@123`
- **Role:** Super Admin (can see all tenants, manage subscriptions)

### Option 2: Demo Tenant Admin Login
**Use this to test tenant admin features:**
- **Tenant Subdomain:** `demo`
- **Email:** `admin@demo.com`
- **Password:** `Demo@123`
- **Role:** Tenant Admin (can manage users, projects, tasks)

### Option 3: Demo Regular User Login
**Use this to test regular user features:**
- **Tenant Subdomain:** `demo`
- **Email:** `user1@demo.com`
- **Password:** `User@123`
- **Role:** User (can view projects, manage assigned tasks)

### Option 4: Demo Regular User 2
- **Tenant Subdomain:** `demo`
- **Email:** `user2@demo.com`
- **Password:** `User@123`
- **Role:** User

---

## 📋 Step-by-Step Testing Process

### Test 1: Health Check ✅
1. Open: http://localhost:5000/api/health
2. **Expected Result:** Should show `{"status":"ok","database":"connected"}`

### Test 2: Frontend Access ✅
1. Open: http://localhost:3000
2. **Expected Result:** Should see login/registration page

### Test 3: Login as Tenant Admin 🔐
1. Go to: http://localhost:3000/login
2. Enter:
   - **Subdomain:** `demo`
   - **Email:** `admin@demo.com`
   - **Password:** `Demo@123`
3. Click "Login"
4. **Expected Result:** 
   - Redirected to Dashboard
   - See statistics cards (Projects, Tasks, etc.)
   - Navigation shows: Dashboard, Projects, Users

### Test 4: View Dashboard 📊
After logging in as tenant admin:
1. **Check Statistics:**
   - Total Projects: Should show a number
   - Total Tasks: Should show a number
   - Completed Tasks: Should show a number
   - Pending Tasks: Should show a number

2. **Check Recent Projects:**
   - Should see "Project Alpha" and "Project Beta"
   - Each project shows status, task count

3. **Check My Tasks:**
   - Should see tasks assigned to you (if any)

### Test 5: View Projects 📁
1. Click "Projects" in navigation
2. **Expected Result:**
   - See list of projects (Project Alpha, Project Beta)
   - Each project shows: Name, Description, Status, Task Count
   - "Create New Project" button visible

### Test 6: View Project Details 🔍
1. Click on "Project Alpha" or click "View" button
2. **Expected Result:**
   - See project information
   - See tasks list (should have 3 tasks)
   - "Add Task" button visible
   - Can filter tasks by status

### Test 7: Create a New Project ➕
1. Go to Projects page
2. Click "Create New Project"
3. Fill in:
   - **Name:** `Test Project`
   - **Description:** `This is a test project`
   - **Status:** `Active`
4. Click "Save"
5. **Expected Result:**
   - Project appears in projects list
   - Can click to view details

### Test 8: Create a Task ✅
1. Open a project (e.g., "Project Alpha")
2. Click "Add Task"
3. Fill in:
   - **Title:** `Test Task`
   - **Description:** `This is a test task`
   - **Priority:** `High`
   - **Due Date:** Select a future date
4. Click "Save"
5. **Expected Result:**
   - Task appears in tasks list
   - Can see task details

### Test 9: Update Task Status 🔄
1. In a project's task list, find a task
2. Change the status dropdown:
   - Todo → In Progress
   - In Progress → Completed
3. **Expected Result:**
   - Status updates immediately
   - Task moves to appropriate section

### Test 10: View Users 👥 (Tenant Admin Only)
1. Click "Users" in navigation
2. **Expected Result:**
   - See list of users (admin@demo.com, user1@demo.com, user2@demo.com)
   - Shows: Name, Email, Role, Status
   - "Add User" button visible
   - Shows user count vs limit (e.g., "Users: 3 / 25")

### Test 11: Create a New User ➕ (Tenant Admin Only)
1. Go to Users page
2. Click "Add User"
3. Fill in:
   - **Email:** `newuser@demo.com`
   - **Password:** `NewUser@123`
   - **Full Name:** `New User`
   - **Role:** `User`
4. Click "Save"
5. **Expected Result:**
   - User appears in users list
   - Can edit or delete user

### Test 12: Test Tenant Registration 🆕
1. Logout (click your name → Logout)
2. Go to: http://localhost:3000/register
3. Fill in:
   - **Organization Name:** `New Test Company`
   - **Subdomain:** `newtest` (must be unique)
   - **Admin Email:** `admin@newtest.com`
   - **Admin Full Name:** `New Admin`
   - **Password:** `NewPass@123`
   - **Confirm Password:** `NewPass@123`
4. Click "Register"
5. **Expected Result:**
   - Success message appears
   - Redirected to login page
   - Can login with new credentials

### Test 13: Test Super Admin Features 👑
1. Logout
2. Login as Super Admin:
   - **Subdomain:** `demo` (any subdomain works)
   - **Email:** `superadmin@system.com`
   - **Password:** `Admin@123`
3. **Expected Result:**
   - See "Tenants" option in navigation
   - Can view all tenants
   - Can update tenant subscription plans

### Test 14: Test Tenant Isolation 🔒
1. Login as `admin@demo.com` (Demo Company)
2. Note the projects you see
3. Logout
4. Register a new tenant (Test 12) or use existing one
5. Login with new tenant admin
6. **Expected Result:**
   - Should NOT see Demo Company's projects
   - Should only see projects for your tenant
   - Complete data isolation

### Test 15: Test Regular User Access 👤
1. Logout
2. Login as regular user:
   - **Subdomain:** `demo`
   - **Email:** `user1@demo.com`
   - **Password:** `User@123`
3. **Expected Result:**
   - Can see Dashboard
   - Can see Projects (read-only)
   - Can see assigned tasks
   - **Cannot** see "Users" page (not in navigation)
   - **Cannot** create projects (button hidden or disabled)

---

## 🐛 Troubleshooting

### If login fails:
1. Check backend logs: `docker-compose logs backend`
2. Verify database is running: `docker-compose ps database`
3. Check health endpoint: http://localhost:5000/api/health

### If CORS errors:
1. Restart backend: `docker-compose restart backend`
2. Hard refresh browser: Ctrl+F5

### If services won't start:
```bash
docker-compose down
docker-compose up -d --build
```

### Check logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## ✅ Quick Verification Checklist

- [ ] Health check returns OK
- [ ] Frontend loads at localhost:3000
- [ ] Can login with demo credentials
- [ ] Dashboard shows statistics
- [ ] Can view projects list
- [ ] Can view project details
- [ ] Can create new project
- [ ] Can create new task
- [ ] Can update task status
- [ ] Can view users (as admin)
- [ ] Can create new user (as admin)
- [ ] Can register new tenant
- [ ] Tenant isolation works (different tenants see different data)
- [ ] Super admin can see all tenants
- [ ] Regular users have limited access

---

## 🎯 Expected Behavior Summary

### Tenant Admin (`admin@demo.com`):
- ✅ Full access to all features
- ✅ Can manage users
- ✅ Can create/edit/delete projects
- ✅ Can create/edit/delete tasks
- ✅ Can see all projects in tenant

### Regular User (`user1@demo.com`):
- ✅ Can view projects
- ✅ Can view tasks
- ✅ Can update task status
- ✅ Can see assigned tasks
- ❌ Cannot manage users
- ❌ Cannot create projects (or limited)

### Super Admin (`superadmin@system.com`):
- ✅ Can see all tenants
- ✅ Can update tenant subscriptions
- ✅ Can manage tenant status
- ✅ System-wide access

---

**Happy Testing! 🚀**

