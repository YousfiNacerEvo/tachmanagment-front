import { useAuth } from '../context/AuthContext';

/**
 * Hook personnalisé pour accéder aux données utilisateur
 * @returns {Object} { user, role, isAdmin, isMember, isGuest, loading, error, refreshRole }
 */
export function useUser() {
  const { user, role, isAdmin, isMember, isGuest, loading, error, refreshRole } = useAuth();
  
  return {
    user,
    role,
    isAdmin,
    isMember,
    isGuest,
    loading,
    error,
    refreshRole
  };
} 