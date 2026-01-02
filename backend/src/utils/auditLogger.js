const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function logAction(tenantId, userId, action, entityType, entityId, ipAddress = null) {
  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, tenantId, userId, action, entityType, entityId, ipAddress]
    );
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error('Audit logging error:', error);
  }
}

module.exports = { logAction };

