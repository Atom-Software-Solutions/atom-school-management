import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { clearSchoolData, getCurrentSchoolId, isSubdomainMode } from '../utils/tenancy';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsSchoolSelection, setNeedsSchoolSelection] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          authService.logout();
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    
    // Fetch user profile after login
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      setIsAuthenticated(true);
      
      // Check if school selection is needed
      // If not in subdomain mode and no school selected, and user has multiple schools
      if (!isSubdomainMode() && !getCurrentSchoolId() && profile.schools?.length > 1) {
        setNeedsSchoolSelection(true);
      }
    } catch (error) {
      // If profile fetch fails, still set as authenticated if login was successful
      setIsAuthenticated(true);
      setUser({ email });
    }
    
    return response;
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const logout = () => {
    authService.logout();
    clearSchoolData();
    setUser(null);
    setIsAuthenticated(false);
    setNeedsSchoolSelection(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    needsSchoolSelection,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
