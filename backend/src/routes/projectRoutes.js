const express = require('express');
const router = express.Router();
const { createProject, listProjects, updateProject, deleteProject } = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.post('/', createProject);
router.get('/', listProjects);
router.put('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

module.exports = router;

