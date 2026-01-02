const express = require('express');
const router = express.Router();
const { createTask, listTasks, updateTaskStatus, updateTask } = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes for project-specific task operations (mounted at /api/projects)
router.post('/:projectId/tasks', createTask);
router.get('/:projectId/tasks', listTasks);

// Routes for task operations (mounted at /api/tasks)
router.patch('/:taskId/status', updateTaskStatus);
router.put('/:taskId', updateTask);

module.exports = router;

