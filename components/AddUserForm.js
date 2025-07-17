import React, { useState } from 'react';
import { z } from 'zod';
import { createUser } from '../lib/api';

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password too short' }),
  role: z.enum(['admin', 'member']),
});

export default function AddUserForm() {
  const [form, setForm] = useState({ email: '', password: '', role: 'member' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      await createUser(form);
      setSuccess('User added successfully!');
      setForm({ email: '', password: '', role: 'member' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#232329] rounded-lg p-6 shadow flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-white mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-1">Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-1">Role</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
        >
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </div>
      {error && <div className="text-red-400 text-sm text-center">{error}</div>}
      {success && <div className="text-green-400 text-sm text-center">{success}</div>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded shadow disabled:opacity-60"
      >
        {loading ? 'Adding...' : 'Add user'}
      </button>
    </form>
  );
} 