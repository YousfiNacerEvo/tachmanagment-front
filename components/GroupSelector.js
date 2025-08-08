'use client';
import React, { useState, useEffect } from 'react';
import { getGroupsWithMembers } from '../lib/api';

export default function GroupSelector({ 
  selectedGroups = [], 
  onGroupsChange, 
  multiple = true,
  placeholder = "Select groups...",
  className = ""
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      setError(null);
      try {
        const groupsData = await getGroupsWithMembers();
        setGroups(groupsData);
      } catch (err) {
        setError('Failed to load groups');
        console.error('Error loading groups:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const handleGroupChange = (e) => {
    if (multiple) {
      const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
      onGroupsChange(options);
    } else {
      onGroupsChange([e.target.value]);
    }
  };

  if (loading) {
    return (
      <div className={`px-3 py-2 rounded border border-gray-600 bg-[#232329] text-gray-400 ${className}`}>
        Loading groups...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-3 py-2 rounded border border-red-600 bg-[#232329] text-red-400 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">
        Assign Groups
      </label>
      <select
        multiple={multiple}
        value={selectedGroups}
        onChange={handleGroupChange}
        className={`w-full px-3 py-2 rounded border border-gray-600 bg-[#232329] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${multiple ? 'min-h-[100px]' : ''} ${className}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {groups.map(group => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.member_count?.[0]?.count ?? 0} members)
          </option>
        ))}
      </select>
      {multiple && (
        <p className="text-xs text-gray-400">
          Hold Ctrl/Cmd to select multiple groups
        </p>
      )}
      {selectedGroups.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-1">Selected groups:</p>
          <div className="flex flex-wrap gap-1">
            {selectedGroups.map(groupId => {
              const group = groups.find(g => g.id === parseInt(groupId));
              return group ? (
                <span
                  key={groupId}
                  className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded"
                >
                  {group.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
} 