import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[^a-zA-Z0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData({
      ...formData,
      [name]: newValue,
    });

    // Update password strength
    if (name === 'password') {
      setPasswordStrength(value ? checkPasswordStrength(value) : '');
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    setAlert({ show: false, message: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setAlert({ show: false, message: '', type: '' });

    const userData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
    };

    try {
      await register(userData);

      setAlert({
        show: true,
        message: 'Registration successful! Redirecting to login...',
        type: 'success',
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
      });
      setPasswordStrength('');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'Registration failed. Please try again.';

      if (error.status === 400) {
        errorMessage = error.message || 'Invalid registration data';
      } else if (
        error.status === 409 ||
        error.message?.toLowerCase().includes('already exists')
      ) {
        errorMessage = 'An account with this email already exists';
      } else if (error.status === 0) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: 'error',
      });
      setLoading(false);
    }
  };

  const getPasswordStrengthText = () => {
    const texts = {
      weak: 'Weak password',
      medium: 'Medium password',
      strong: 'Strong password',
    };
    return texts[passwordStrength] || '';
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Sign up to get started with our platform</p>
        </div>

        <div className="auth-form">
          {alert.show && (
            <div className={`alert alert-${alert.type}`}>{alert.message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className={`form-control ${errors.firstName ? 'error' : ''}`}
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <div className="error-message">{errors.firstName}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className={`form-control ${errors.lastName ? 'error' : ''}`}
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <div className="error-message">{errors.lastName}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-control ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
              {errors.email && (
                <div className="error-message">{errors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {passwordStrength && (
                <div className={`password-strength ${passwordStrength}`}>
                  <div className="password-strength-bar"></div>
                </div>
              )}
              {passwordStrength && (
                <div className="password-strength-text">
                  {getPasswordStrengthText()}
                </div>
              )}
              {errors.password && (
                <div className="error-message">{errors.password}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className={`form-control ${
                  errors.confirmPassword ? 'error' : ''
                }`}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <div className="error-message">{errors.confirmPassword}</div>
              )}
            </div>

            <div className="terms-group">
              <label>
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                />
                <span>
                  I agree to the <Link to="#">Terms and Conditions</Link>
                </span>
              </label>
              {errors.agreeTerms && (
                <div className="error-message">{errors.agreeTerms}</div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  Creating account...
                  <span className="spinner"></span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
