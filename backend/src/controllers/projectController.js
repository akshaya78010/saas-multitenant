const { v4: uuidv4 } = require("uuid");
const pool = require("../config/database");
const { logAction } = require("../utils/auditLogger");

// API 12: Create Project
const createProject = async (req, res) => {
  try {
    const { name, description, status = "active" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (!["active", "archived", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be active, archived, or completed",
      });
    }

    // Get tenantId from JWT (not from request body for security)
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        message: "Super admin cannot create projects",
      });
    }

    // Check subscription limit
    const tenantResult = await pool.query(
      "SELECT max_projects FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    const currentProjectCount = await pool.query(
      "SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1",
      [tenantId]
    );

    const maxProjects = tenantResult.rows[0].max_projects;
    const currentCount = parseInt(currentProjectCount.rows[0].count);

    if (currentCount >= maxProjects) {
      return res.status(403).json({
        success: false,
        message: "Subscription limit reached. Maximum projects limit exceeded.",
      });
    }

    // Create project
    const projectId = uuidv4();
    await pool.query(
      "INSERT INTO projects (id, tenant_id, name, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
      [projectId, tenantId, name, description || null, status, req.user.id]
    );

    await logAction(
      tenantId,
      req.user.id,
      "CREATE_PROJECT",
      "project",
      projectId,
      req.ip
    );

    const projectResult = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [projectId]
    );

    res.status(201).json({
      success: true,
      data: {
        id: projectResult.rows[0].id,
        tenantId: projectResult.rows[0].tenant_id,
        name: projectResult.rows[0].name,
        description: projectResult.rows[0].description,
        status: projectResult.rows[0].status,
        createdBy: projectResult.rows[0].created_by,
        createdAt: projectResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};

// API 13: List Projects
const listProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    // Build query based on user role
    let query;
    const queryParams = [];
    let paramCount = 1;

    if (req.user.role === "super_admin") {
      // Super admin can see all projects
      query = `SELECT p.*, u.full_name as creator_name 
               FROM projects p 
               LEFT JOIN users u ON p.created_by = u.id 
               WHERE 1=1`;
    } else {
      // Regular users see only their tenant's projects
      query = `SELECT p.*, u.full_name as creator_name 
               FROM projects p 
               LEFT JOIN users u ON p.created_by = u.id 
               WHERE p.tenant_id = $${paramCount++}`;
      queryParams.push(req.user.tenantId);
    }

    if (status) {
      query += ` AND p.status = $${paramCount++}`;
      queryParams.push(status);
    }

    if (search) {
      query += ` AND p.name ILIKE $${paramCount++}`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countQuery = query
      .replace(
        "SELECT p.*, u.full_name as creator_name",
        "SELECT COUNT(*) as count"
      )
      .replace("LEFT JOIN users u ON p.created_by = u.id", "");
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);

    const projectsResult = await pool.query(query, queryParams);

    // Get task counts for each project
    const projects = await Promise.all(
      projectsResult.rows.map(async (project) => {
        const taskCountResult = await pool.query(
          "SELECT COUNT(*) as count FROM tasks WHERE project_id = $1",
          [project.id]
        );
        const completedTaskCountResult = await pool.query(
          "SELECT COUNT(*) as count FROM tasks WHERE project_id = $1 AND status = $2",
          [project.id, "completed"]
        );

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdBy: {
            id: project.created_by,
            fullName: project.creator_name,
          },
          taskCount: parseInt(taskCountResult.rows[0].count),
          completedTaskCount: parseInt(completedTaskCountResult.rows[0].count),
          createdAt: project.created_at,
        };
      })
    );

    res.json({
      success: true,
      data: {
        projects,
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list projects",
    });
  }
};

// API 14: Update Project
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body;

    // Get project
    const projectResult = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    // Authorization: tenant_admin or project creator
    if (req.user.role === "super_admin") {
      // Super admin can update any project
    } else if (req.user.role === "tenant_admin") {
      if (req.user.tenantId !== project.tenant_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else {
      // Regular user can only update if they created it
      if (
        req.user.tenantId !== project.tenant_id ||
        req.user.id !== project.created_by
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Only project creator or tenant admin can update.",
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (status !== undefined) {
      if (!["active", "archived", "completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(projectId);

    await pool.query(
      `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramCount}`,
      values
    );

    await logAction(
      project.tenant_id,
      req.user.id,
      "UPDATE_PROJECT",
      "project",
      projectId,
      req.ip
    );

    const updatedProject = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [projectId]
    );

    res.json({
      success: true,
      message: "Project updated successfully",
      data: {
        id: updatedProject.rows[0].id,
        name: updatedProject.rows[0].name,
        description: updatedProject.rows[0].description,
        status: updatedProject.rows[0].status,
        updatedAt: updatedProject.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
};

// API 15: Delete Project
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project
    const projectResult = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    // Authorization: tenant_admin or project creator
    if (req.user.role === "super_admin") {
      // Super admin can delete any project
    } else if (req.user.role === "tenant_admin") {
      if (req.user.tenantId !== project.tenant_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else {
      // Regular user can only delete if they created it
      if (
        req.user.tenantId !== project.tenant_id ||
        req.user.id !== project.created_by
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Only project creator or tenant admin can delete.",
        });
      }
    }

    // Delete project (tasks will be cascade deleted)
    await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);

    await logAction(
      project.tenant_id,
      req.user.id,
      "DELETE_PROJECT",
      "project",
      projectId,
      req.ip
    );

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};

module.exports = {
  createProject,
  listProjects,
  updateProject,
  deleteProject,
};
