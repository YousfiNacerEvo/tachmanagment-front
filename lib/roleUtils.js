/**
 * Utility functions for handling user roles
 */

// Valid roles in the system
export const VALID_ROLES = ['admin', 'member', 'guest'];

// Role display information
export const ROLE_DISPLAY_INFO = {
  admin: {
    label: 'Admin',
    color: 'text-blue-400',
    description: 'Full access to all features',
    badgeColor: 'bg-blue-600'
  },
  member: {
    label: 'Member',
    color: 'text-green-400',
    description: 'Can view assigned projects and tasks',
    badgeColor: 'bg-green-600'
  },
  guest: {
    label: 'Guest',
    color: 'text-yellow-400',
    description: 'Limited access (same as member)',
    badgeColor: 'bg-yellow-600'
  }
};

/**
 * Get role display information
 * @param {string} role - The role to get info for
 * @returns {Object} Role display information
 */
export function getRoleDisplayInfo(role) {
  return ROLE_DISPLAY_INFO[role] || {
    label: role,
    color: 'text-gray-400',
    description: '',
    badgeColor: 'bg-gray-600'
  };
}

/**
 * Check if a role is valid
 * @param {string} role - The role to validate
 * @returns {boolean} True if valid
 */
export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

/**
 * Check if a user has admin permissions
 * @param {string} role - The user's role
 * @returns {boolean} True if admin
 */
export function isAdmin(role) {
  return role === 'admin';
}

/**
 * Check if a user has member permissions (member or guest)
 * @param {string} role - The user's role
 * @returns {boolean} True if member or guest
 */
export function isMember(role) {
  return role === 'member' || role === 'guest';
}

/**
 * Check if a user is a guest
 * @param {string} role - The user's role
 * @returns {boolean} True if guest
 */
export function isGuest(role) {
  return role === 'guest';
} 