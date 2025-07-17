'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.replace('/login');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-foreground/10 rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">Welcome, {user.email}</h2>
        <button onClick={handleLogout} className="bg-foreground text-background font-semibold py-2 rounded hover:bg-foreground/80 transition-colors w-full">Log out</button>
      </div>
    </div>
  );
} 