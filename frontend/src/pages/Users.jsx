import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, tenantAPI } from '../services/api';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    isActive: true,
  });

  useEffect(() => {
    if (user && user.tenantId) {
      loadTenant();
      loadUsers();
    }
  }, [user]);

  const loadTenant = async () => {
    try {
      const response = await tenantAPI.getTenant(user.tenantId);
      setTenant(response.data.data);
    } catch (err) {
      console.error('Error loading tenant:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userAPI.listUsers(user.tenantId);
      setUsers(response.data.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
        });
      } else {
        await userAPI.addUser(user.tenantId, formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', fullName: '', role: 'user', isActive: true });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      password: '',
      fullName: userToEdit.fullName,
      role: userToEdit.role,
      isActive: userToEdit.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userAPI.deleteUser(userId);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (user?.role !== 'tenant_admin' && user?.role !== 'super_admin') {
    return <div className="container"><div className="error">Access denied. Only tenant admins can manage users.</div></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Users</h1>
        {tenant && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Users: {users.length} / {tenant.maxUsers}
            </p>
          </div>
        )}
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ email: '', password: '', fullName: '', role: 'user', isActive: true }); setShowModal(true); }}>
          Add User
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {users.length === 0 ? (
        <div className="card">
          <p>No users found. Add your first user!</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(userItem => (
                <tr key={userItem.id}>
                  <td>{userItem.fullName}</td>
                  <td>{userItem.email}</td>
                  <td>
                    <span className={`badge badge-${userItem.role === 'tenant_admin' ? 'info' : 'secondary'}`}>
                      {userItem.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${userItem.isActive ? 'success' : 'danger'}`}>
                      {userItem.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => handleEdit(userItem)} style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(userItem.id)} style={{ padding: '5px 10px', fontSize: '12px' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {!editingUser && (
                <>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      minLength={8}
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
              </div>
              {editingUser && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    {' '}Active
                  </label>
                </div>
              )}
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

export default Users;

