import { supabase } from './supabase';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, error };
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (_) {}
  // hard-fallback to clear local storage keys used by supabase auth if needed
  try {
    if (typeof window !== 'undefined') {
      // Remove legacy and user-scoped role caches
      Object.keys(window.localStorage)
        .filter(k => k.startsWith('tach:lastRole:') || k === 'tach:lastRole')
        .forEach(k => window.localStorage.removeItem(k));
      // Supabase v2 may use these keys; clearing reduces stale session issues in non-private tabs
      Object.keys(window.localStorage)
        .filter(k => k.toLowerCase().includes('supabase'))
        .forEach(k => window.localStorage.removeItem(k));
    }
  } catch (_) {}
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const API_URL =  'https://tachmanagment-back.onrender.com';//http://localhost:4000//https://tachmanagment-back.onrender.com

export async function getUserRole(userId) {
  console.log('userId', userId);
  if (!userId) return null;
  // Use current session token to ask backend for the role
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  const res = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user.role || null;
}

export async function isAdmin(userId) {
  const role = await getUserRole(userId);
  return role === 'admin';
}

// Password reset: send email
export async function requestPasswordReset(email) {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login/reset` : undefined;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { data, error };
}

// Password reset: update password after redirect
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}