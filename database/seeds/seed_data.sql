-- Seed data for multi-tenant SaaS application
-- Note: Passwords are hashed using bcrypt with salt rounds 10
-- Super Admin password: Admin@123
-- Demo tenant admin password: Demo@123
-- Demo users password: User@123

-- Insert Super Admin (tenant_id is NULL)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'superadmin@system.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOeZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'Super Admin', 'super_admin', true)
ON CONFLICT DO NOTHING;

-- Insert Demo Tenant
INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects) VALUES
('10000000-0000-0000-0000-000000000001', 'Demo Company', 'demo', 'active', 'pro', 25, 15)
ON CONFLICT (subdomain) DO NOTHING;

-- Insert Demo Tenant Admin
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin@demo.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOeZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'Demo Admin', 'tenant_admin', true)
ON CONFLICT DO NOTHING;

-- Insert Demo Users
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'user1@demo.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOeZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'User One', 'user', true),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'user2@demo.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOeZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'User Two', 'user', true)
ON CONFLICT DO NOTHING;

-- Insert Demo Projects
INSERT INTO projects (id, tenant_id, name, description, status, created_by) VALUES
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Project Alpha', 'First demo project', 'active', '20000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Project Beta', 'Second demo project', 'active', '20000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Insert Demo Tasks
INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date) VALUES
('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Design homepage', 'Create homepage design mockup', 'todo', 'high', '30000000-0000-0000-0000-000000000001', '2024-12-31'),
('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Implement API', 'Build REST API endpoints', 'in_progress', 'medium', '30000000-0000-0000-0000-000000000002', '2024-12-25'),
('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Write tests', 'Create unit and integration tests', 'todo', 'low', NULL, NULL),
('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Setup database', 'Configure database schema', 'completed', 'high', '30000000-0000-0000-0000-000000000001', '2024-12-20'),
('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Deploy application', 'Deploy to production server', 'in_progress', 'medium', '30000000-0000-0000-0000-000000000002', '2024-12-30')
ON CONFLICT DO NOTHING;

