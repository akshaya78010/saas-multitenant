const { v4: uuidv4 } = require("uuid");
const pool = require("../config/database");
const { logAction } = require("../utils/auditLogger");

// API 16: Create Task
const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      assignedTo,
      priority = "medium",
      dueDate,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority. Must be low, medium, or high",
      });
    }

    // Get project to verify it exists and get tenant_id
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

    // Verify user has access to this project's tenant
    if (
      req.user.role !== "super_admin" &&
      req.user.tenantId !== project.tenant_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Project does not belong to your tenant.",
      });
    }

    // If assignedTo is provided, verify user belongs to same tenant
    if (assignedTo) {
      const assignedUserResult = await pool.query(
        "SELECT tenant_id FROM users WHERE id = $1",
        [assignedTo]
      );

      if (assignedUserResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Assigned user not found",
        });
      }

      if (assignedUserResult.rows[0].tenant_id !== project.tenant_id) {
        return res.status(400).json({
          success: false,
          message: "Assigned user does not belong to the same tenant",
        });
      }
    }

    // Create task
    const taskId = uuidv4();
    await pool.query(
      "INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        taskId,
        projectId,
        project.tenant_id,
        title,
        description || null,
        "todo",
        priority,
        assignedTo || null,
        dueDate || null,
      ]
    );

    await logAction(
      project.tenant_id,
      req.user.id,
      "CREATE_TASK",
      "task",
      taskId,
      req.ip
    );

    const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: taskResult.rows[0].id,
        projectId: taskResult.rows[0].project_id,
        tenantId: taskResult.rows[0].tenant_id,
        title: taskResult.rows[0].title,
        description: taskResult.rows[0].description,
        status: taskResult.rows[0].status,
        priority: taskResult.rows[0].priority,
        assignedTo: taskResult.rows[0].assigned_to,
        dueDate: taskResult.rows[0].due_date,
        createdAt: taskResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
};

// API 17: List Project Tasks
const listTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const assignedTo = req.query.assignedTo;
    const priority = req.query.priority;
    const search = req.query.search;

    // Verify project exists and user has access
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

    if (
      req.user.role !== "super_admin" &&
      req.user.tenantId !== project.tenant_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Build query
    let query = `SELECT t.*, u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email 
                 FROM tasks t 
                 LEFT JOIN users u ON t.assigned_to = u.id 
                 WHERE t.project_id = $1`;
    const queryParams = [projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND t.status = $${paramCount++}`;
      queryParams.push(status);
    }

    if (assignedTo) {
      query += ` AND t.assigned_to = $${paramCount++}`;
      queryParams.push(assignedTo);
    }

    if (priority) {
      query += ` AND t.priority = $${paramCount++}`;
      queryParams.push(priority);
    }

    if (search) {
      query += ` AND t.title ILIKE $${paramCount++}`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countQuery = query
      .replace(
        "SELECT t.*, u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email",
        "SELECT COUNT(*) as count"
      )
      .replace("LEFT JOIN users u ON t.assigned_to = u.id", "");
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results (order by priority DESC, then dueDate ASC)
    query += ` ORDER BY 
               CASE t.priority 
                 WHEN 'high' THEN 1 
                 WHEN 'medium' THEN 2 
                 WHEN 'low' THEN 3 
               END,
               t.due_date ASC NULLS LAST
               LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limit, offset);

    const tasksResult = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: {
        tasks: tasksResult.rows.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to
            ? {
                id: task.assigned_user_id,
                fullName: task.assigned_user_name,
                email: task.assigned_user_email,
              }
            : null,
          dueDate: task.due_date,
          createdAt: task.created_at,
        })),
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error("List tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list tasks",
    });
  }
};

// API 18: Update Task Status
const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status || !["todo", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (todo, in_progress, or completed)",
      });
    }

    // Get task
    const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = taskResult.rows[0];

    // Verify user has access to this task's tenant
    if (
      req.user.role !== "super_admin" &&
      req.user.tenantId !== task.tenant_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Update status
    await pool.query(
      "UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [status, taskId]
    );

    const updatedTask = await pool.query(
      "SELECT id, status, updated_at FROM tasks WHERE id = $1",
      [taskId]
    );

    res.json({
      success: true,
      data: {
        id: updatedTask.rows[0].id,
        status: updatedTask.rows[0].status,
        updatedAt: updatedTask.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task status",
    });
  }
};

// API 19: Update Task
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } =
      req.body;

    // Get task
    const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = taskResult.rows[0];

    // Verify user has access to this task's tenant
    if (
      req.user.role !== "super_admin" &&
      req.user.tenantId !== task.tenant_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // If assignedTo is provided, verify user belongs to same tenant
    if (assignedTo !== undefined) {
      if (assignedTo !== null) {
        const assignedUserResult = await pool.query(
          "SELECT tenant_id FROM users WHERE id = $1",
          [assignedTo]
        );

        if (assignedUserResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Assigned user not found",
          });
        }

        if (assignedUserResult.rows[0].tenant_id !== task.tenant_id) {
          return res.status(400).json({
            success: false,
            message: "Assigned user does not belong to the same tenant",
          });
        }
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (status !== undefined) {
      if (!["todo", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      if (!["low", "medium", "high"].includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority",
        });
      }
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(assignedTo);
    }
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(dueDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(taskId);

    await pool.query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${paramCount}`,
      values
    );

    await logAction(
      task.tenant_id,
      req.user.id,
      "UPDATE_TASK",
      "task",
      taskId,
      req.ip
    );

    // Get updated task with assigned user info
    const updatedTaskResult = await pool.query(
      `SELECT t.*, u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email 
       FROM tasks t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       WHERE t.id = $1`,
      [taskId]
    );

    const updatedTask = updatedTaskResult.rows[0];

    res.json({
      success: true,
      message: "Task updated successfully",
      data: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        assignedTo: updatedTask.assigned_to
          ? {
              id: updatedTask.assigned_user_id,
              fullName: updatedTask.assigned_user_name,
              email: updatedTask.assigned_user_email,
            }
          : null,
        dueDate: updatedTask.due_date,
        updatedAt: updatedTask.updated_at,
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
};

module.exports = {
  createTask,
  listTasks,
  updateTaskStatus,
  updateTask,
};
