'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUserGroupsWithDetails } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Building, 
  Users, 
  CheckSquare, 
  Calendar,
  User,
  Target
} from 'lucide-react';

export default function MyGroupsPage() {
  const { user, loading: authLoading, session } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Fetch user's groups
  const fetchGroups = useCallback(async () => {
    if (!user?.id || !session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const groupsData = await getUserGroupsWithDetails(user.id, session);
      setGroups(groupsData || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load your groups');
    } finally {
      setLoading(false);
    }
  }, [user?.id, session]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchGroups}
            className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
          <p className="text-gray-600 mt-1">Groups you're a member of</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No groups yet</h3>
          <p className="mt-2 text-gray-500">You haven't been assigned to any groups yet.</p>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, index) => (
            <motion.div
              key={group.group_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">{group.description || 'No description'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{group.members?.length || 0} members</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  <span>{group.tasks?.length || 0} tasks</span>
                </div>

                {group.projects && group.projects.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Target className="h-4 w-4 mr-2" />
                    <span>{group.projects.length} projects</span>
                  </div>
                )}
              </div>

              {group.tasks && group.tasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Tasks</h4>
                  <div className="space-y-2">
                    {group.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{task.title}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                    {group.tasks.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{group.tasks.length - 3} more tasks
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
