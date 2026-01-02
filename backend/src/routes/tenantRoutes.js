const express = require('express');
const router = express.Router();
const { getTenant, updateTenant, listTenants } = require('../controllers/tenantController');
const { authenticate, authorize, ensureTenantAccess } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', authorize('super_admin'), listTenants);
router.get('/:tenantId', ensureTenantAccess, getTenant);
router.put('/:tenantId', ensureTenantAccess, updateTenant);

module.exports = router;

