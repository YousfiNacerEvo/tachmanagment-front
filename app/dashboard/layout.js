'use client';
import React from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      try {
        const href = typeof window !== 'undefined'
          ? (window.location.pathname + window.location.search + window.location.hash)
          : '/dashboard';
        const nextParam = encodeURIComponent(href || '/dashboard');
        router.replace(`/login?next=${nextParam}`);
      } catch (_) {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] text-[#171717]">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#171717]">
      <Sidebar />
      <main className="ml-0 lg:ml-72 flex-1 p-7 overflow-y-auto h-screen">{children}</main>
    </div>
  );
}