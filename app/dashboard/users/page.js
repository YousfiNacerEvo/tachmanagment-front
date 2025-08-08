"use client";
import React, { useEffect, useState } from "react";
import { getUsers, createUser, deleteUser } from "../../../lib/api";
import AddUserForm from "../../../components/AddUserForm";
import { useUser } from "../../../hooks/useUser";
import { useRouter } from "next/navigation";
import { useAuth } from '../../../context/AuthContext';

export default function UsersPage() {
  const { isAdmin, loading, session } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard?error=Access%20denied");
    }
  }, [isAdmin, loading, router]);

  const fetchUsers = async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await getUsers(session);
      setUsers(data);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !loading) {
      fetchUsers();
    }
  }, [isAdmin, loading]);

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId, session);
      setSuccess("User deleted successfully");
      fetchUsers();
    } catch (err) {
      setError("Failed to delete user");
    }
  };

  if (loading) return null;
  if (!isAdmin) return null;

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "text-blue-400";
      case "member":
        return "text-green-400";
      case "guest":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">Users Management</h1>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500 text-white p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New User</h2>
          <AddUserForm onSuccess={fetchUsers} />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Existing Users</h2>
          {fetching ? (
            <div className="text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-gray-500">No users found.</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <div>
                    <div className="text-gray-900 font-medium">{user.email}</div>
                    <div className="text-gray-500 text-sm">
                      Role: <span className={`font-medium ${getRoleColor(user.role)}`}>{user.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 