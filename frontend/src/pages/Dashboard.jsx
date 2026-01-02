import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectAPI, taskAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get projects
      const projectsRes = await projectAPI.listProjects({ limit: 5 });
      setRecentProjects(projectsRes.data.data.projects);
      setStats(prev => ({ ...prev, totalProjects: projectsRes.data.data.total }));

      // Get all tasks for stats
      const allTasks = [];
      for (const project of projectsRes.data.data.projects) {
        try {
          const tasksRes = await taskAPI.listTasks(project.id);
          allTasks.push(...tasksRes.data.data.tasks);
        } catch (err) {
          console.error('Error loading tasks:', err);
        }
      }

      const completed = allTasks.filter(t => t.status === 'completed').length;
      setStats(prev => ({
        ...prev,
        totalTasks: allTasks.length,
        completedTasks: completed,
        pendingTasks: allTasks.length - completed,
      }));

      // Get my tasks
      if (user && user.id) {
        const myTasksList = allTasks.filter(t => t.assignedTo?.id === user.id);
        setMyTasks(myTasksList.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Dashboard</h1>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div className="card">
          <h3 style={{ marginBottom: '10px' }}>Total Projects</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
            {stats.totalProjects}
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '10px' }}>Total Tasks</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
            {stats.totalTasks}
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '10px' }}>Completed Tasks</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>
            {stats.completedTasks}
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '10px' }}>Pending Tasks</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
            {stats.pendingTasks}
          </p>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Recent Projects</h2>
          <Link to="/projects" className="btn btn-primary">View All</Link>
        </div>
        {recentProjects.length === 0 ? (
          <p>No projects yet. <Link to="/projects">Create your first project</Link></p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Tasks</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map(project => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>
                    <span className={`badge badge-${project.status === 'active' ? 'success' : 'warning'}`}>
                      {project.status}
                    </span>
                  </td>
                  <td>{project.taskCount}</td>
                  <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/projects/${project.id}`} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '12px' }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>My Tasks</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map(task => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>
                    {recentProjects.find(p => p.id === task.projectId)?.name || 'N/A'}
                  </td>
                  <td>
                    <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${task.status === 'completed' ? 'success' : 'warning'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

