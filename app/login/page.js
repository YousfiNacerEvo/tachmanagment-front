'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, loading, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

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
      router.replace('/dashboard');
    }
    setFormLoading(false);
  };

  if (loading || formLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-foreground/10 rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="px-4 py-2 rounded border border-foreground/20 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="px-4 py-2 rounded border border-foreground/20 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
          />
          <button
            type="submit"
            className="bg-foreground text-background font-semibold py-2 rounded hover:bg-foreground/80 transition-colors"
          >
            Sign In
          </button>
          {error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
        </form>
      </div>
    </div>
  );
} 