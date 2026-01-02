import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI } from '../services/api';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadProject();
    loadTasks();
  }, [projectId, statusFilter]);

  const loadProject = async () => {
    try {
      const response = await projectAPI.listProjects();
      const foundProject = response.data.data.projects.find(p => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);
      } else {
        setError('Project not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    }
  };

  const loadTasks = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await taskAPI.listTasks(projectId, params);
      setTasks(response.data.data.tasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await taskAPI.updateTask(editingTask.id, taskFormData);
      } else {
        await taskAPI.createTask(projectId, taskFormData);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskFormData({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' });
      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateTaskStatus(taskId, newStatus);
      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignedTo: task.assignedTo?.id || '',
      dueDate: task.dueDate || '',
    });
    setShowTaskModal(true);
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (error && !project) {
    return <div className="container"><div className="error">{error}</div></div>;
  }

  return (
    <div className="container">
      <button className="btn btn-secondary" onClick={() => navigate('/projects')} style={{ marginBottom: '20px' }}>
        ← Back to Projects
      </button>

      {project && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h1>{project.name}</h1>
            <p style={{ color: '#666', marginBottom: '10px' }}>{project.description || 'No description'}</p>
            <div>
              <span className={`badge badge-${project.status === 'active' ? 'success' : 'warning'}`}>
                {project.status}
              </span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Tasks</h2>
              <button className="btn btn-primary" onClick={() => { setEditingTask(null); setTaskFormData({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' }); setShowTaskModal(true); }}>
                Add Task
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Filter by Status: </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '5px', marginLeft: '10px' }}>
                <option value="">All</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {tasks.length === 0 ? (
              <p>No tasks yet. Create your first task!</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>
                        <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                          style={{ padding: '4px', fontSize: '12px' }}
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td>{task.assignedTo ? task.assignedTo.fullName : 'Unassigned'}</td>
                      <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button className="btn btn-secondary" onClick={() => handleEditTask(task)} style={{ padding: '5px 10px', fontSize: '12px' }}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showTaskModal && (
        <div className="modal" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>
              <button className="close-btn" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={taskFormData.priority}
                  onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;

