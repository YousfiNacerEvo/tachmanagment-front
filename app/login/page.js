'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../lib/auth';
import Image from 'next/image';
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, loading, error, setError, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // If already logged in, prefer redirecting to next if provided
  useEffect(() => {
    if (!user) return;

    const nextUrl = searchParams?.get('next');
    if (nextUrl) {
      try {
        const decoded = decodeURIComponent(nextUrl);
        if (decoded.startsWith('/')) {
          router.replace(decoded);
          return;
        }
      } catch (_) {}
    }
    // Fallback to role-based destinations
    if (role === 'admin') {
      router.replace('/dashboard/projects');
      return;
    }
    if (role === 'member' || role === 'guest') {
      router.replace('/dashboard/my-work');
      return;
    }
    // Else wait until role is resolved
  }, [user, role, router, searchParams]);

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
      setUser(loggedInUser);
      // Immediate redirect to next if present (without waiting for role)
      try {
        const nextUrl = searchParams?.get('next');
        if (nextUrl) {
          const decoded = decodeURIComponent(nextUrl);
          if (decoded.startsWith('/')) {
            router.replace(decoded);
            setFormLoading(false);
            return;
          }
        }
      } catch (_) {}
      // Otherwise, role-based redirect will occur via useEffect once role resolves
    }
    setFormLoading(false);
  };

  if (formLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f9fb]">
      <Image src="/asbuLogo.png" alt="Logo" width={350} height={350} className='mb-10'/>
      <div className="card w-full max-w-md p-8">
      
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-cy="login-form">
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input"
            data-cy="login-email"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="input"
            data-cy="login-password"
          />
          <div className="flex items-center justify-between text-sm">
            <div />
            <Link href="/login/forgot" className="text-blue-600 hover:underline" data-cy="forgot-password-link">Forgot password?</Link>
          </div>
          <button type="submit" className="btn-primary w-full" data-cy="login-submit">Sign in</button>
          {error && <div className="text-red-500 text-center text-sm mt-2" data-cy="login-error">{error}</div>}
        </form>
      </div>
    </div>
  );
}