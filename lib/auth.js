import { supabase } from './supabase';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, error };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const API_URL = "http://localhost:4000";//https://tachmanagment-back.onrender.com

export async function getUserRole(userId) {
  if (!userId) return null;
  const res = await fetch(`${API_URL}/api/users/${userId}`);
  if (!res.ok) return null;
  const user = await res.json();
  return user.role || null;
}

export async function isAdmin(userId) {
  const role = await getUserRole(userId);
  return role === 'admin';
}
