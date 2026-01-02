const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function runSeeds() {
  const client = await pool.connect();
  try {
    console.log('Starting database seeding...');
    
    // Generate password hashes
    const superAdminHash = await bcrypt.hash('Admin@123', 10);
    const demoAdminHash = await bcrypt.hash('Demo@123', 10);
    const userHash = await bcrypt.hash('User@123', 10);
    
    await client.query('BEGIN');
    
    // Insert Super Admin
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) 
       VALUES ($1, NULL, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      ['00000000-0000-0000-0000-000000000001', 'superadmin@system.com', superAdminHash, 'Super Admin', 'super_admin', true]
    );
    
    // Insert Demo Tenant
    await client.query(
      `INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (subdomain) DO NOTHING`,
      ['10000000-0000-0000-0000-000000000001', 'Demo Company', 'demo', 'active', 'pro', 25, 15]
    );
    
    // Insert Demo Tenant Admin
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      ['20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin@demo.com', demoAdminHash, 'Demo Admin', 'tenant_admin', true]
    );
    
    // Insert Demo Users
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT DO NOTHING`,
      [
        '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'user1@demo.com', userHash, 'User One', 'user', true,
        '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'user2@demo.com', userHash, 'User Two', 'user', true
      ]
    );
    
    // Insert Demo Projects
    await client.query(
      `INSERT INTO projects (id, tenant_id, name, description, status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)
       ON CONFLICT DO NOTHING`,
      [
        '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Project Alpha', 'First demo project', 'active', '20000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Project Beta', 'Second demo project', 'active', '20000000-0000-0000-0000-000000000001'
      ]
    );
    
    // Insert Demo Tasks
    await client.query(
      `INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9), ($10, $11, $12, $13, $14, $15, $16, $17, $18), ($19, $20, $21, $22, $23, $24, $25, $26, $27), ($28, $29, $30, $31, $32, $33, $34, $35, $36), ($37, $38, $39, $40, $41, $42, $43, $44, $45)
       ON CONFLICT DO NOTHING`,
      [
        '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Design homepage', 'Create homepage design mockup', 'todo', 'high', '30000000-0000-0000-0000-000000000001', '2024-12-31',
        '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Implement API', 'Build REST API endpoints', 'in_progress', 'medium', '30000000-0000-0000-0000-000000000002', '2024-12-25',
        '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Write tests', 'Create unit and integration tests', 'todo', 'low', null, null,
        '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Setup database', 'Configure database schema', 'completed', 'high', '30000000-0000-0000-0000-000000000001', '2024-12-20',
        '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Deploy application', 'Deploy to production server', 'in_progress', 'medium', '30000000-0000-0000-0000-000000000002', '2024-12-30'
      ]
    );
    
    await client.query('COMMIT');
    
    console.log('✓ Seed data loaded successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds()
    .then(() => {
      console.log('Seeding finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = runSeeds;

