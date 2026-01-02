const express = require('express');
const router = express.Router();
const { addUser, listUsers, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes for tenant-specific user operations (mounted at /api/tenants)
router.post('/:tenantId/users', authorize('tenant_admin'), addUser);
router.get('/:tenantId/users', listUsers);

// Routes for user operations (mounted at /api/users)
router.put('/:userId', updateUser);
router.delete('/:userId', authorize('tenant_admin', 'super_admin'), deleteUser);

module.exports = router;

