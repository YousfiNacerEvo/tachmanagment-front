'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../hooks/useUser';
import { logout } from '../../lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, isAdmin, isGuest, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Helper function to get role display info
  const getRoleDisplay = () => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: 'text-blue-400', description: 'Full access to all features' };
      case 'member':
        return { label: 'Member', color: 'text-green-400', description: 'Can view assigned projects and tasks' };
      case 'guest':
        return { label: 'Guest', color: 'text-yellow-400', description: 'Limited access (same as member)' };
      default:
        return { label: role, color: 'text-gray-400', description: '' };
    }
  };

  const roleInfo = getRoleDisplay();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-foreground/10 rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">Welcome, {user.email}</h2>
        <div className="mb-4 text-sm text-gray-300">
          Role: <span className={`font-semibold capitalize ${roleInfo.color}`}>{roleInfo.label}</span>
          {isAdmin && <span className="ml-2 text-blue-400">(Full Access)</span>}
          {isGuest && <span className="ml-2 text-yellow-400">(Limited Access)</span>}
        </div>
        {roleInfo.description && (
          <div className="mb-6 text-xs text-gray-400">
            {roleInfo.description}
          </div>
        )}
        <button 
          onClick={handleLogout} 
          className="bg-foreground text-background font-semibold py-2 rounded hover:bg-foreground/80 transition-colors w-full"
        >
          Log out
        </button>
      </div>
    </div>
  );
} 