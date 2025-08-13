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
  const [session, setSession] = useState(null); // keep session high to avoid stale closure

  const getRoleStorageKey = (uid) => `tach:lastRole:${uid}`;

  // Récupérer le rôle via le backend (Bearer token) pour éviter problèmes RLS/clients
  const fetchUserRole = async (userId) => {
    if (!userId) return null;
    try {
      const r = await getUserRoleFromApi(userId);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(getRoleStorageKey(userId), r || '');
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
          // Seed role from user-scoped cache immediately to avoid flicker when backend is cold
          try {
            if (session?.user?.id && typeof window !== 'undefined') {
              const cached = window.localStorage.getItem(getRoleStorageKey(session.user.id));
              if (cached) setRole(cached);
            }
            // Clean legacy key if present
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('tach:lastRole');
            }
          } catch (_) {}
          // End loading once session is known; Sidebar/pages will hold on role === null
          setLoading(false);
          // Fetch role in background and update when ready
          if (session?.user?.id) {
            fetchUserRole(session.user.id)
              .then((userRole) => { if (mounted) setRole(userRole); })
              .catch(() => {});
          } else {
            // keep local role key in sync
            try { if (typeof window !== 'undefined') {
              // Remove all user-scoped role caches on explicit logout/no session
              Object.keys(window.localStorage)
                .filter(k => k.startsWith('tach:lastRole:'))
                .forEach(k => window.localStorage.removeItem(k));
              window.localStorage.removeItem('tach:lastRole');
            }} catch (_) {}
            if (mounted) setRole(null);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setError(err.message);
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
          // Ensure loading is not stuck
          setLoading(false);
          if (session?.user?.id) {
            // Instant seed from cache for this user
            try {
              if (typeof window !== 'undefined') {
                const cached = window.localStorage.getItem(getRoleStorageKey(session.user.id));
                if (cached) setRole(cached);
              }
            } catch (_) {}
            fetchUserRole(session.user.id)
              .then((userRole) => { if (mounted) setRole(userRole); })
              .catch(() => {});
          } else {
            setRole(null);
            try { if (typeof window !== 'undefined') {
              Object.keys(window.localStorage)
                .filter(k => k.startsWith('tach:lastRole:'))
                .forEach(k => window.localStorage.removeItem(k));
              window.localStorage.removeItem('tach:lastRole');
            }} catch (_) {}
          }
        }
      }
    );

    return () => {
      mounted = false;
      try { subscription?.unsubscribe(); } catch (_) {}
    };
  }, []);

  // Fallback: if loading persists unusually long, release it to avoid infinite spinners
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => { try { setLoading(false); } catch (_) {} }, 5000);
    return () => clearTimeout(id);
  }, [loading]);

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