import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { setCurrentSchoolId, setCurrentSchoolDomain } from '../../utils/tenancy';
import '../../styles/auth.css';

const SchoolSelector = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserSchools();
  }, []);

  const fetchUserSchools = async () => {
    try {
      // Fetch schools the user has access to
      const response = await apiClient.get('/auth/profile');
      
      // Assuming the profile includes schools array
      // Adjust based on your actual API response structure
      const userSchools = response.data.schools || [];
      
      if (userSchools.length === 0) {
        setError('No schools found. Please contact your administrator.');
      } else if (userSchools.length === 1) {
        // Auto-select if only one school
        handleSchoolSelect(userSchools[0]);
        return;
      }
      
      setSchools(userSchools);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setError('Failed to load schools. Please try again.');
      setLoading(false);
    }
  };

  const handleSchoolSelect = (school) => {
    // Store selected school
    setCurrentSchoolId(school.id);
    setCurrentSchoolDomain(school.domain);
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Loading Schools...</h1>
            <p>Please wait</p>
          </div>
          <div className="auth-form" style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '20px auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <h1>Select School</h1>
          <p>Choose which school to access</p>
        </div>

        <div className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          {schools.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSchoolSelect(school)}
                  style={{
                    padding: '20px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#f8f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                    {school.name}
                  </div>
                  {school.domain && (
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {school.domain}
                    </div>
                  )}
                  {school.address && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {school.address}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolSelector;
