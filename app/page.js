'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function HomeRedirect() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role === 'member' || role === 'guest') {
      router.replace('/dashboard/my-work');
      return;
    }
    if (role === 'admin') {
      router.replace('/dashboard/projects');
      return;
    }
    // Wait until role resolved; don't use legacy non-namespaced key
  }, [user, role, loading, router]);

  // Hard fallback: if still here after 5s, push to a safe default to avoid infinite loading
  useEffect(() => {
    const id = setTimeout(() => {
      router.replace('/dashboard/projects');
    }, 5000);
    return () => clearTimeout(id);
  }, [router]);

  return <div>Loading...</div>;
}
