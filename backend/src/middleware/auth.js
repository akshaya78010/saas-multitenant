const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const pool = require("../config/database");

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid token.",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, jwtConfig.secret);

      // Verify user still exists and is active
      const userResult = await pool.query(
        "SELECT id, tenant_id, email, full_name, role, is_active FROM users WHERE id = $1",
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is inactive",
        });
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// Middleware to check user role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Middleware to ensure tenant isolation (except for super_admin)
const ensureTenantAccess = async (req, res, next) => {
  try {
    // Super admin can access any tenant
    if (req.user.role === "super_admin") {
      return next();
    }

    // For other users, ensure they can only access their own tenant
    const requestedTenantId = req.params.tenantId || req.body.tenantId;

    if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own tenant data.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization error",
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  ensureTenantAccess,
};
