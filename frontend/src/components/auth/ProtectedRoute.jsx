import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentSchoolId, isSubdomainMode } from '../../utils/tenancy';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, needsSchoolSelection } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div
            style={{
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }}
          ></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if school selection is needed (not on school selector page)
  if (location.pathname !== '/select-school') {
    // If subdomain mode is off and no school is selected
    if (!isSubdomainMode() && !getCurrentSchoolId() && needsSchoolSelection) {
      return <Navigate to="/select-school" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
