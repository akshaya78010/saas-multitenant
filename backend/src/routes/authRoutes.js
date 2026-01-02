const express = require('express');
const router = express.Router();
const { registerTenant, login, getCurrentUser, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register-tenant', registerTenant);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

module.exports = router;

