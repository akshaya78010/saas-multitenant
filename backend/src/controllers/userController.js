const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { logAction } = require('../utils/auditLogger');

// API 8: Add User to Tenant
const addUser = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { email, password, fullName, role = 'user' } = req.body;
    
    // Authorization check
    if (req.user.role !== 'tenant_admin' || req.user.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Only tenant admin can add users.'
      });
    }
    
    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    if (!['user', 'tenant_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "tenant_admin"'
      });
    }
    
    // Check subscription limit
    const tenantResult = await pool.query(
      'SELECT max_users FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    const currentUserCount = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    
    const maxUsers = tenantResult.rows[0].max_users;
    const currentCount = parseInt(currentUserCount.rows[0].count);
    
    if (currentCount >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: 'Subscription limit reached. Maximum users limit exceeded.'
      });
    }
    
    // Check if email already exists in this tenant
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email.toLowerCase(), tenantId]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists in this tenant'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = uuidv4();
    await pool.query(
      'INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, tenantId, email.toLowerCase(), passwordHash, fullName, role, true]
    );
    
    await logAction(tenantId, req.user.id, 'CREATE_USER', 'user', userId, req.ip);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: userId,
        email: email.toLowerCase(),
        fullName,
        role,
        tenantId,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

// API 9: List Tenant Users
const listUsers = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Authorization: User must belong to this tenant
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const role = req.query.role;
    
    // Build query
    let query = 'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE tenant_id = $1';
    const queryParams = [tenantId];
    let paramCount = 2;
    
    if (search) {
      query += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }
    
    if (role) {
      query += ` AND role = $${paramCount++}`;
      queryParams.push(role);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT id, email, full_name, role, is_active, created_at', 'SELECT COUNT(*) as count');
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);
    
    const usersResult = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: {
        users: usersResult.rows.map(user => ({
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at
        })),
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list users'
    });
  }
};

// API 10: Update User
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, role, isActive } = req.body;
    
    // Get user to verify
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Authorization check
    if (req.user.role === 'tenant_admin') {
      // Tenant admin can update users in their tenant
      if (req.user.tenantId !== user.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'user') {
      // Regular users can only update their own fullName
      if (req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      if (role !== undefined || isActive !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
    } else if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (role !== undefined && (req.user.role === 'tenant_admin' || req.user.role === 'super_admin')) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (isActive !== undefined && (req.user.role === 'tenant_admin' || req.user.role === 'super_admin')) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    await logAction(user.tenant_id, req.user.id, 'UPDATE_USER', 'user', userId, req.ip);
    
    const updatedUser = await pool.query(
      'SELECT id, email, full_name, role, is_active, updated_at FROM users WHERE id = $1',
      [userId]
    );
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.rows[0].id,
        fullName: updatedUser.rows[0].full_name,
        role: updatedUser.rows[0].role,
        updatedAt: updatedUser.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// API 11: Delete User
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user to verify
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Authorization check
    if (req.user.role !== 'tenant_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    if (req.user.role === 'tenant_admin' && req.user.tenantId !== user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Cannot delete self
    if (req.user.id === userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete yourself'
      });
    }
    
    // Set assigned_to to NULL for tasks assigned to this user
    await pool.query(
      'UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1',
      [userId]
    );
    
    // Delete user
    await pool.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
    
    await logAction(user.tenant_id, req.user.id, 'DELETE_USER', 'user', userId, req.ip);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

module.exports = {
  addUser,
  listUsers,
  updateUser,
  deleteUser
};

