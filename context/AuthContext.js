"use client"
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserRole as getUserRoleFromApi } from '../lib/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Récupérer le rôle via le backend (Bearer token) pour éviter problèmes RLS/clients
  const fetchUserRole = async (userId) => {
    if (!userId) return null;
    try {
      const r = await getUserRoleFromApi(userId);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('tach:lastRole', r || '');
        }
      } catch (_) {}
      return r || null;
    } catch (err) {
      console.error('Error fetching user role (API):', err);
      return null;
    }
  };

  // Initialisation et écoute des changements d'authentification
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Récupérer la session actuelle
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setUser(session?.user || null);
          setSession(session || null); // <-- Ajout
          
          // Si on a un utilisateur, récupérer son rôle immédiatement
          if (session?.user?.id) {
            const userRole = await fetchUserRole(session.user.id);
            if (mounted) {
              setRole(userRole);
            }
          } else {
            // keep local role key in sync
            try { if (typeof window !== 'undefined') window.localStorage.removeItem('tach:lastRole'); } catch (_) {}
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user || null);
          setSession(session || null); // <-- Ajout
          
          if (session?.user?.id) {
            // Récupérer le rôle immédiatement lors du changement d'auth
            const userRole = await fetchUserRole(session.user.id);
            if (mounted) {
              setRole(userRole);
            }
          } else {
            setRole(null);
            try { if (typeof window !== 'undefined') window.localStorage.removeItem('tach:lastRole'); } catch (_) {}
          }
        }
      }
    );

    return () => {
      mounted = false;
      try { subscription?.unsubscribe(); } catch (_) {}
    };
  }, []);

  const [session, setSession] = useState(null); // <-- Ajout

  const value = {
    user,
    setUser,
    session, // <-- Ajout
    role,
    isAdmin: role === 'admin',
    isMember: role === 'member' || role === 'guest', // Guests have same permissions as members
    isGuest: role === 'guest',
    loading,
    error,
    setError,
    // Fonction pour rafraîchir le rôle si nécessaire
    refreshRole: async () => {
      if (user?.id) {
        const userRole = await fetchUserRole(user.id);
        setRole(userRole);
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 