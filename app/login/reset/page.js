'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { updatePassword } from '../../../lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Exchange the OTP/code in the URL for a session if present
    const run = async () => {
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (_) {
        // ignore if no code present or already exchanged
      } finally {
        setReady(true);
      }
    };
    run();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await updatePassword(password);
    if (error) {
      setError(error.message || 'Failed to update password');
    } else {
      router.replace('/login');
    }
    setLoading(false);
  };

  if (!ready) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f9fb]">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
          <p className="text-gray-500 mt-1">Enter your new password below</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="input"
          />
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
          {error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
          <div className="text-sm text-center">
            <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}


