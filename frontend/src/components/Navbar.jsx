import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{ 
      background: '#fff', 
      padding: '15px 20px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold', fontSize: '20px' }}>
            SaaS Platform
          </Link>
          {user && (
            <>
              <Link to="/dashboard" style={{ textDecoration: 'none', color: '#333' }}>Dashboard</Link>
              <Link to="/projects" style={{ textDecoration: 'none', color: '#333' }}>Projects</Link>
              {(user.role === 'tenant_admin' || user.role === 'super_admin') && (
                <Link to="/users" style={{ textDecoration: 'none', color: '#333' }}>Users</Link>
              )}
              {user.role === 'super_admin' && (
                <Link to="/tenants" style={{ textDecoration: 'none', color: '#333' }}>Tenants</Link>
              )}
            </>
          )}
        </div>
        
        {user && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span>{user.fullName}</span>
              <span className="badge badge-info">{user.role}</span>
              <span>▼</span>
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                marginTop: '5px',
                minWidth: '150px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <button 
                  onClick={handleLogout}
                  style={{ 
                    width: '100%', 
                    textAlign: 'left', 
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

