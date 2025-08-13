'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, loading, error, setError, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Wait for role to resolve (or be seeded from cache) to avoid wrong redirect
    if (role === 'admin') {
      router.replace('/dashboard/projects');
      return;
    }
    if (role === 'member' || role === 'guest') {
      router.replace('/dashboard/my-work');
      return;
    }
  }, [user, role, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    const { user: loggedInUser, error } = await login(email, password);
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('Incorrect email or password.');
      } else {
        setError(error.message);
      }
    } else {
      // Optimistically seed role from user-specific cache to enable immediate redirect
      try {
        if (typeof window !== 'undefined' && loggedInUser?.id) {
          const cached = window.localStorage.getItem(`tach:lastRole:${loggedInUser.id}`);
          if (cached === 'admin') {
            router.replace('/dashboard/projects');
          } else if (cached === 'member' || cached === 'guest') {
            router.replace('/dashboard/my-work');
          }
        }
      } catch (_) {}
      // Let the effect above finalize once AuthContext fetches role
      setUser(loggedInUser);
    }
    setFormLoading(false);
  };

  if (formLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f9fb]">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="input"
          />
          <div className="flex items-center justify-between text-sm">
            <div />
            <Link href="/login/forgot" className="text-blue-600 hover:underline">Forgot password?</Link>
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
          {error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
        </form>
      </div>
    </div>
  );
}