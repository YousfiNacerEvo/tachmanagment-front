'use client';
import AddUserForm from '../../../components/AddUserForm';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function AddUserPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard?error=Access%20denied');
    }
  }, [isAdmin, loading, router]);

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Add User</h1>
      <AddUserForm />
    </div>
  );
} 