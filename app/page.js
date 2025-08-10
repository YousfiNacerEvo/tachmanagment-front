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
    // Fallback when role is not yet resolved
    try {
      const persisted = typeof window !== 'undefined' ? window.localStorage.getItem('tach:lastRole') : null;
      if (persisted === 'member' || persisted === 'guest') {
        router.replace('/dashboard/my-work');
      } else if (persisted === 'admin') {
        router.replace('/dashboard/projects');
      } else {
        router.replace('/dashboard/projects');
      }
    } catch (_) {
      router.replace('/dashboard/projects');
    }
  }, [user, role, loading, router]);

  return <div>Loading...</div>;
}
