'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await requestPasswordReset(email);
    if (error) {
      setError(error.message || 'Failed to send reset email');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f9fb]">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
          <p className="text-gray-500 mt-1">Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-green-700">If an account exists for {email}, a reset link has been sent.</p>
            <Link href="/login" className="btn-secondary inline-block">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            {error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
            <div className="text-sm text-center">
              <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


