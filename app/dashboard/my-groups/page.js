'use client'
import React, { useEffect, useState } from 'react';
import { useUser } from '../../../hooks/useUser';
import { getUserGroupsWithDetails } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function MyGroupsPage() {
  const { user, loading: userLoading } = useUser();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const {session} = useAuth();

  useEffect(() => {
    if (!user || userLoading) return;
    setLoading(true);
    getUserGroupsWithDetails(user.id)
      .then(data => {
        console.log('Groups data:', data);
        setGroups(data);
        setError(null);
      })
      .catch(err => setError('Failed to load groups'))
      .finally(() => setLoading(false));
  }, [user, userLoading]);

  if (userLoading || loading) return <div className="text-gray-400 p-8">Loading your groups...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-6">My Groups</h1>
      {groups.length === 0 ? (
        <div className="text-gray-400">You are not a member of any group.</div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.group_id} className="bg-[#232329] border border-gray-700 rounded-xl p-5 shadow">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-xl font-bold text-white flex-1">{group.name}</h2>
                <span className="text-xs text-gray-400">Group ID: {group.group_id}</span>
              </div>
              <div className="mb-3">
                <div className="text-sm text-gray-300 font-semibold mb-1">Teammates:</div>
                <div className="flex flex-wrap gap-2">
                  {group.members.map(member => {
                    console.log('Member data:', member);
                    return (
                      <span key={member.id} className="flex items-center gap-1 bg-gray-800 text-white px-2 py-1 rounded-full text-xs">
                        {member.email || 'Unknown User'}
                        <span className="text-gray-400 ml-1">({member.role || 'Member'})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-300 font-semibold mb-1">Group Tasks:</div>
                {group.tasks.length === 0 ? (
                  <div className="text-gray-500 text-xs">No tasks assigned to this group.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {group.tasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-xs shadow min-w-[120px] text-left"
                        title="View details"
                      >
                        <div className="font-semibold truncate">{task.title}</div>
                        <div className="text-gray-300 text-xs truncate">{task.status} | {task.priority}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal de détails de tâche */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#232329] rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-xl relative">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-400 text-xl"
              title="Close"
            >×</button>
            <h2 className="text-xl font-bold text-white mb-2">{selectedTask.title}</h2>
            <div className="text-gray-300 mb-2">{selectedTask.description}</div>
            <div className="flex gap-3 text-xs text-gray-400 mb-2">
              <span>Status: {selectedTask.status}</span>
              <span>Priority: {selectedTask.priority}</span>
              <span>Due: {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="text-xs text-gray-500">Task ID: {selectedTask.id}</div>
          </div>
        </div>
      )}
    </div>
  );
} 