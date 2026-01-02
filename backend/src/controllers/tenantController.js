const pool = require('../config/database');
const { logAction } = require('../utils/auditLogger');

// API 5: Get Tenant Details
const getTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Super admin can access any tenant, others can only access their own
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const tenantResult = await pool.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    const tenant = tenantResult.rows[0];
    
    // Get stats
    const userCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    const projectCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1',
      [tenantId]
    );
    const taskCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1',
      [tenantId]
    );
    
    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        subscriptionPlan: tenant.subscription_plan,
        maxUsers: tenant.max_users,
        maxProjects: tenant.max_projects,
        createdAt: tenant.created_at,
        stats: {
          totalUsers: parseInt(userCountResult.rows[0].count),
          totalProjects: parseInt(projectCountResult.rows[0].count),
          totalTasks: parseInt(taskCountResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant details'
    });
  }
};

// API 6: Update Tenant
const updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, status, subscriptionPlan, maxUsers, maxProjects } = req.body;
    
    // Check authorization
    if (req.user.role === 'tenant_admin') {
      // Tenant admin can only update name
      if (status || subscriptionPlan || maxUsers || maxProjects) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Only super admin can update subscription settings.'
        });
      }
      // Ensure tenant admin belongs to this tenant
      if (req.user.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    // Verify tenant exists
    const tenantResult = await pool.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (status !== undefined && req.user.role === 'super_admin') {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (subscriptionPlan !== undefined && req.user.role === 'super_admin') {
      updates.push(`subscription_plan = $${paramCount++}`);
      values.push(subscriptionPlan);
    }
    if (maxUsers !== undefined && req.user.role === 'super_admin') {
      updates.push(`max_users = $${paramCount++}`);
      values.push(maxUsers);
    }
    if (maxProjects !== undefined && req.user.role === 'super_admin') {
      updates.push(`max_projects = $${paramCount++}`);
      values.push(maxProjects);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(tenantId);
    
    await pool.query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    await logAction(tenantId, req.user.id, 'UPDATE_TENANT', 'tenant', tenantId, req.ip);
    
    const updatedTenant = await pool.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        id: updatedTenant.rows[0].id,
        name: updatedTenant.rows[0].name,
        updatedAt: updatedTenant.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant'
    });
  }
};

// API 7: List All Tenants (Super Admin Only)
const listTenants = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const subscriptionPlan = req.query.subscriptionPlan;
    
    // Build query
    let query = 'SELECT * FROM tenants WHERE 1=1';
    const queryParams = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND status = $${paramCount++}`;
      queryParams.push(status);
    }
    if (subscriptionPlan) {
      query += ` AND subscription_plan = $${paramCount++}`;
      queryParams.push(subscriptionPlan);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await pool.query(countQuery, queryParams);
    const totalTenants = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);
    
    const tenantsResult = await pool.query(query, queryParams);
    
    // Get stats for each tenant
    const tenants = await Promise.all(
      tenantsResult.rows.map(async (tenant) => {
        const userCount = await pool.query(
          'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
          [tenant.id]
        );
        const projectCount = await pool.query(
          'SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1',
          [tenant.id]
        );
        
        return {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          status: tenant.status,
          subscriptionPlan: tenant.subscription_plan,
          totalUsers: parseInt(userCount.rows[0].count),
          totalProjects: parseInt(projectCount.rows[0].count),
          createdAt: tenant.created_at
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTenants / limit),
          totalTenants,
          limit
        }
      }
    });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list tenants'
    });
  }
};

module.exports = {
  getTenant,
  updateTenant,
  listTenants
};

