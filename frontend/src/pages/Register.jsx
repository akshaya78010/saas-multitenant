import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminFullName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.registerTenant({
        tenantName: formData.tenantName,
        subdomain: formData.subdomain,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFullName: formData.adminFullName,
      });

      setSuccess('Tenant registered successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', marginTop: '50px' }}>
      <div className="card">
        <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Register Tenant</h1>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Organization Name</label>
            <input
              type="text"
              name="tenantName"
              value={formData.tenantName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Subdomain</label>
            <input
              type="text"
              name="subdomain"
              value={formData.subdomain}
              onChange={(e) => {
                // Convert to lowercase and remove invalid characters
                const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                setFormData({ ...formData, subdomain: value });
                setError('');
              }}
              required
              minLength={3}
              maxLength={63}
              title="Alphanumeric characters and hyphens only (3-63 characters, cannot start or end with hyphen)"
            />
            <small style={{ color: '#666' }}>
              Your subdomain: {formData.subdomain || 'yoursubdomain'}.yourapp.com
            </small>
          </div>

          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Admin Full Name</label>
            <input
              type="text"
              name="adminFullName"
              value={formData.adminFullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

