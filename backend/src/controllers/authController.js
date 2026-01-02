const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/database");
const jwtConfig = require("../config/jwt");
const { logAction } = require("../utils/auditLogger");

// Helper function to get plan limits
function getPlanLimits(plan) {
  const limits = {
    free: { maxUsers: 5, maxProjects: 3 },
    pro: { maxUsers: 25, maxProjects: 15 },
    enterprise: { maxUsers: 100, maxProjects: 50 },
  };
  return limits[plan] || limits.free;
}

// API 1: Tenant Registration
const registerTenant = async (req, res) => {
  const client = await pool.connect();
  try {
    const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } =
      req.body;

    // Validation
    if (
      !tenantName ||
      !subdomain ||
      !adminEmail ||
      !adminPassword ||
      !adminFullName
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate subdomain format
    if (
      !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) ||
      subdomain.length < 3 ||
      subdomain.length > 63
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subdomain format. Must be 3-63 alphanumeric characters with optional hyphens.",
      });
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    await client.query("BEGIN");

    // Check if subdomain exists
    const subdomainCheck = await client.query(
      "SELECT id FROM tenants WHERE subdomain = $1",
      [subdomain.toLowerCase()]
    );

    if (subdomainCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Subdomain already exists",
      });
    }

    // Check if email exists in any tenant
    const emailCheck = await client.query(
      "SELECT id FROM users WHERE email = $1 AND tenant_id IS NOT NULL",
      [adminEmail.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Create tenant
    const tenantId = uuidv4();
    const limits = getPlanLimits("free");

    await client.query(
      "INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        tenantId,
        tenantName,
        subdomain.toLowerCase(),
        "active",
        "free",
        limits.maxUsers,
        limits.maxProjects,
      ]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminId = uuidv4();
    await client.query(
      "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        adminId,
        tenantId,
        adminEmail.toLowerCase(),
        passwordHash,
        adminFullName,
        "tenant_admin",
        true,
      ]
    );

    await client.query("COMMIT");

    // Log action
    await logAction(
      tenantId,
      adminId,
      "CREATE_TENANT",
      "tenant",
      tenantId,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Tenant registered successfully",
      data: {
        tenantId,
        subdomain: subdomain.toLowerCase(),
        adminUser: {
          id: adminId,
          email: adminEmail.toLowerCase(),
          fullName: adminFullName,
          role: "tenant_admin",
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  } finally {
    client.release();
  }
};

// API 2: User Login
const login = async (req, res) => {
  try {
    const { email, password, tenantSubdomain, tenantId } = req.body;

    if (!email || !password || (!tenantSubdomain && !tenantId)) {
      return res.status(400).json({
        success: false,
        message:
          "Email, password, and tenant subdomain or tenant ID are required",
      });
    }

    // Find tenant
    let tenant;
    if (tenantSubdomain) {
      const tenantResult = await pool.query(
        "SELECT * FROM tenants WHERE subdomain = $1",
        [tenantSubdomain.toLowerCase()]
      );
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }
      tenant = tenantResult.rows[0];
    } else {
      const tenantResult = await pool.query(
        "SELECT * FROM tenants WHERE id = $1",
        [tenantId]
      );
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }
      tenant = tenantResult.rows[0];
    }

    // Check tenant status
    if (tenant.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tenant account is suspended",
      });
    }

    // Find user
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND tenant_id = $2",
      [email.toLowerCase(), tenant.id]
    );

    // Also check for super admin (tenant_id is NULL)
    if (userResult.rows.length === 0) {
      const superAdminResult = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND tenant_id IS NULL AND role = $2",
        [email.toLowerCase(), "super_admin"]
      );
      if (superAdminResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }
      const superAdmin = superAdminResult.rows[0];
      const validPassword = await bcrypt.compare(
        password,
        superAdmin.password_hash
      );
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }
      if (!superAdmin.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is inactive",
        });
      }

      // Generate JWT for super admin
      const token = jwt.sign(
        { userId: superAdmin.id, tenantId: null, role: superAdmin.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      await logAction(
        null,
        superAdmin.id,
        "LOGIN",
        "user",
        superAdmin.id,
        req.ip
      );

      return res.json({
        success: true,
        data: {
          user: {
            id: superAdmin.id,
            email: superAdmin.email,
            fullName: superAdmin.full_name,
            role: superAdmin.role,
            tenantId: null,
          },
          token,
          expiresIn: 86400,
        },
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    await logAction(user.tenant_id, user.id, "LOGIN", "user", user.id, req.ip);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id,
        },
        token,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// API 3: Get Current User
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    let userResult;
    if (req.user.role === "super_admin") {
      userResult = await pool.query(
        "SELECT id, email, full_name, role, is_active, tenant_id FROM users WHERE id = $1",
        [userId]
      );
    } else {
      userResult = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.tenant_id,
         t.id as tenant_id, t.name as tenant_name, t.subdomain, t.subscription_plan, t.max_users, t.max_projects
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = $1`,
        [userId]
      );
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    if (req.user.role === "super_admin") {
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          isActive: user.is_active,
          tenant: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        tenant: {
          id: user.tenant_id,
          name: user.tenant_name,
          subdomain: user.subdomain,
          subscriptionPlan: user.subscription_plan,
          maxUsers: user.max_users,
          maxProjects: user.max_projects,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user information",
    });
  }
};

// API 4: Logout
const logout = async (req, res) => {
  try {
    await logAction(
      req.user.tenantId,
      req.user.id,
      "LOGOUT",
      "user",
      req.user.id,
      req.ip
    );

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = {
  registerTenant,
  login,
  getCurrentUser,
  logout,
};
