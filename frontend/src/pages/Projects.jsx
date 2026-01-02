import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  const loadProjects = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await projectAPI.listProjects(params);
      setProjects(response.data.data.projects);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await projectAPI.updateProject(editingProject.id, formData);
      } else {
        await projectAPI.createProject(formData);
      }
      setShowModal(false);
      setEditingProject(null);
      setFormData({ name: '', description: '', status: 'active' });
      loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({ name: project.name, description: project.description || '', status: project.status });
    setShowModal(true);
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectAPI.deleteProject(projectId);
      loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => { setEditingProject(null); setFormData({ name: '', description: '', status: 'active' }); setShowModal(true); }}>
          Create New Project
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label>Filter by Status: </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '5px', marginLeft: '10px' }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <p>No projects found. Create your first project!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map(project => (
            <div key={project.id} className="card">
              <h3>{project.name}</h3>
              <p style={{ color: '#666', marginBottom: '10px' }}>{project.description || 'No description'}</p>
              <div style={{ marginBottom: '10px' }}>
                <span className={`badge badge-${project.status === 'active' ? 'success' : 'warning'}`}>
                  {project.status}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Tasks: {project.taskCount} | Completed: {project.completedTaskCount}
              </p>
              <p style={{ fontSize: '12px', color: '#999' }}>
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <Link to={`/projects/${project.id}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                  View
                </Link>
                <button className="btn btn-secondary" onClick={() => handleEdit(project)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(project.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProject ? 'Edit Project' : 'Create Project'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;

