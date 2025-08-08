'use client';
import React, { useEffect, useState } from 'react';
import { getUsers, getGroupsWithMembers, getGroupMembers } from '../lib/api';

export default function AssigneeSelector({
  assignedUsers = [],
  assignedGroups = [],
  onChangeUsers,
  onChangeGroups,
  disabled = false,
  showAvatars = false,
  label = 'Assign',
}) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsers(),
      getGroupsWithMembers(),
    ]).then(([usersData, groupsData]) => {
      setUsers(usersData);
      setGroups(groupsData);
    }).finally(() => setLoading(false));
  }, []);

  // Pour afficher les membres d'un groupe (tooltip ou expansion)
  const handleExpandGroup = async (groupId) => {
    if (groupMembers[groupId]) {
      setExpandedGroup(expandedGroup === groupId ? null : groupId);
      return;
    }
    const members = await getGroupMembers(groupId, session);
    setGroupMembers(prev => ({ ...prev, [groupId]: members }));
    setExpandedGroup(groupId);
  };

  // Utilisateurs/groupes disponibles (non assignés)
  const availableUsers = users.filter(u => !assignedUsers.includes(u.id));
  const availableGroups = groups.filter(g => !assignedGroups.includes(g.id));

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white mb-2">{label} Users & Groups</label>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Liste des utilisateurs disponibles */}
          <div className="flex flex-wrap gap-2 mb-2">
            {availableUsers.map(user => (
              <button
                key={user.id}
                type="button"
                disabled={disabled}
                onClick={() => onChangeUsers([...assignedUsers, user.id])}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-blue-600 text-white rounded text-xs"
                title={user.email}
              >
                {showAvatars && user.avatar_url && (
                  <img src={user.avatar_url} alt={user.email} className="w-5 h-5 rounded-full" />
                )}
                {user.email} <span className="text-green-400 font-bold">+</span>
              </button>
            ))}
            {availableGroups.map(group => (
              <button
                key={group.id}
                type="button"
                disabled={disabled}
                onClick={() => onChangeGroups([...assignedGroups, group.id])}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-green-600 text-white rounded text-xs"
                title={`${group.name} (${group.member_count?.[0]?.count ?? 0} members)`}
              >
                <span className="font-semibold">{group.name}</span>
                <span className="text-gray-400">({group.member_count?.[0]?.count ?? 0})</span>
                <span className="text-green-400 font-bold">+</span>
              </button>
            ))}
          </div>

          {/* Liste des assignés */}
          <div className="flex flex-wrap gap-2">
            {assignedUsers.map(userId => {
              const user = users.find(u => u.id === userId);
              if (!user) return null;
              return (
                <span key={userId} className="flex items-center gap-1 bg-blue-700 text-white px-2 py-1 rounded text-xs">
                  {showAvatars && user.avatar_url && (
                    <img src={user.avatar_url} alt={user.email} className="w-5 h-5 rounded-full" />
                  )}
                  {user.email}
                  <button
                    type="button"
                    className="ml-1 text-red-300 hover:text-red-500"
                    onClick={() => onChangeUsers(assignedUsers.filter(id => id !== userId))}
                    disabled={disabled}
                    title="Remove"
                  >×</button>
                </span>
              );
            })}
            {assignedGroups.map(groupId => {
              const group = groups.find(g => g.id === groupId);
              if (!group) return null;
              return (
                <span key={groupId} className="flex items-center gap-1 bg-green-700 text-white px-2 py-1 rounded text-xs relative">
                  <span
                    className="cursor-pointer underline decoration-dotted"
                    onClick={() => handleExpandGroup(groupId)}
                    title="Show members"
                  >
                    {group.name} ({group.member_count?.[0]?.count ?? 0})
                  </span>
                  <button
                    type="button"
                    className="ml-1 text-red-300 hover:text-red-500"
                    onClick={() => onChangeGroups(assignedGroups.filter(id => id !== groupId))}
                    disabled={disabled}
                    title="Remove"
                  >×</button>
                  {/* Tooltip/expansion pour membres du groupe */}
                  {expandedGroup === groupId && groupMembers[groupId] && (
                    <div className="absolute z-10 top-full left-0 mt-1 bg-[#232329] border border-gray-600 rounded shadow-lg p-2 text-xs text-white min-w-[150px]">
                      <div className="font-bold mb-1">Members:</div>
                      {groupMembers[groupId].length === 0 ? (
                        <div className="text-gray-400">No members</div>
                      ) : (
                        <ul>
                          {groupMembers[groupId].map(member => (
                            <li key={member.user_id}>{member.email}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
} 