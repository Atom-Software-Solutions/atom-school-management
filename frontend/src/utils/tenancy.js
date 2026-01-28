/**
 * Multi-Tenancy Utilities
 * Handles school/tenant identification from subdomain or localStorage
 */

/**
 * Extract school domain from subdomain
 * e.g., "atom-high.yourapp.com" => "atom-high"
 * e.g., "localhost:5173" => null (use school selector)
 */
export const getSchoolDomainFromUrl = () => {
  const hostname = window.location.hostname;
  
  // Development/localhost - no subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  
  // Check if it's a subdomain
  const parts = hostname.split('.');
  
  // If we have at least 3 parts (subdomain.domain.tld), extract subdomain
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // No subdomain found
  return null;
};

/**
 * Get current school ID from localStorage
 */
export const getCurrentSchoolId = () => {
  return localStorage.getItem('currentSchoolId');
};

/**
 * Set current school ID in localStorage
 */
export const setCurrentSchoolId = (schoolId) => {
  if (schoolId) {
    localStorage.setItem('currentSchoolId', schoolId);
  } else {
    localStorage.removeItem('currentSchoolId');
  }
};

/**
 * Get current school domain from localStorage
 */
export const getCurrentSchoolDomain = () => {
  return localStorage.getItem('currentSchoolDomain');
};

/**
 * Set current school domain in localStorage
 */
export const setCurrentSchoolDomain = (domain) => {
  if (domain) {
    localStorage.setItem('currentSchoolDomain', domain);
  } else {
    localStorage.removeItem('currentSchoolDomain');
  }
};

/**
 * Clear all school-related data
 */
export const clearSchoolData = () => {
  localStorage.removeItem('currentSchoolId');
  localStorage.removeItem('currentSchoolDomain');
};

/**
 * Get tenant identifier for API calls
 * Priority: URL subdomain > localStorage domain
 */
export const getTenantIdentifier = () => {
  const urlDomain = getSchoolDomainFromUrl();
  if (urlDomain) {
    return { type: 'domain', value: urlDomain };
  }
  
  const storedDomain = getCurrentSchoolDomain();
  if (storedDomain) {
    return { type: 'domain', value: storedDomain };
  }
  
  const storedId = getCurrentSchoolId();
  if (storedId) {
    return { type: 'id', value: storedId };
  }
  
  return null;
};

/**
 * Check if we're in multi-tenant mode (subdomain detected)
 */
export const isSubdomainMode = () => {
  return getSchoolDomainFromUrl() !== null;
};

/**
 * Build school-specific URL
 */
export const buildSchoolUrl = (domain, path = '') => {
  const protocol = window.location.protocol;
  const baseHost = window.location.hostname.split('.').slice(-2).join('.');
  return `${protocol}//${domain}.${baseHost}${path}`;
};
