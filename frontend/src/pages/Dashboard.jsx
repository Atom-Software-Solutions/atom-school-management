import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>✓</div>
          <h1>Welcome to Your Dashboard!</h1>
          <p>You have successfully logged in</p>
        </div>

        <div className="auth-form">
          <div
            style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px',
              textAlign: 'left',
            }}
          >
            <h3 style={{ marginBottom: '15px' }}>User Information</h3>
            {user?.email && (
              <p style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#667eea' }}>Email:</strong> {user.email}
              </p>
            )}
            {user?.firstName && user?.lastName && (
              <p style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#667eea' }}>Name:</strong>{' '}
                {user.firstName} {user.lastName}
              </p>
            )}
            <p style={{ marginBottom: '0' }}>
              <strong style={{ color: '#667eea' }}>Status:</strong> Authenticated
            </p>
          </div>

          <p style={{ marginBottom: '30px', textAlign: 'center' }}>
            This is a placeholder dashboard. Start building your school management
            features here!
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleLogout}
              className="btn"
              style={{
                background: '#e0e0e0',
                color: '#333',
                flex: 1,
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
