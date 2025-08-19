import React, { useState, useEffect, useRef } from 'react';
import { getUsers, getGroupsWithMembers, getGroupMembers } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ModernAssigneeSelector({
  assignedUsers = [],
  assignedGroups = [],
  onChangeUsers,
  onChangeGroups,
  disabled = false,
  label = 'Assign',
  showAvatars = true,
  allowGroups = true,
}) {
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    getUsers(session).then(setUsers);
    if (allowGroups) {
      // Charger seulement les informations de base des groupes, pas les membres
      getGroupsWithMembers(session).then(groups => {
        const basicGroups = groups.map(group => ({
          id: group.id,
          name: group.name,
          description: group.description
        }));
        setGroups(basicGroups);
      });
    } else {
      setGroups([]);
    }
  }, [session, allowGroups]);

  // Fermer le menu en cas de clic à l'extérieur
  useEffect(() => {
    if (!showMenu) return;
    const handlePointerDown = (e) => {
      try {
        if (!containerRef.current) return;
        if (!containerRef.current.contains(e.target)) {
          setShowMenu(false);
        }
      } catch (_) {}
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showMenu]);

  // Filtrage pour l'autocomplete
  const filteredUsers = users.filter(u =>
    !assignedUsers.includes(u.id) &&
    (u.email.toLowerCase().includes(search.toLowerCase()) || (u.name && u.name.toLowerCase().includes(search.toLowerCase())))
  );
  const filteredGroups = allowGroups
    ? groups.filter(g => !assignedGroups.includes(g.id) && g.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  // Vérifier les conflits entre utilisateurs et groupes
  const checkConflicts = async (newGroupId) => {
    if (!allowGroups) return false;
    try {
      const members = await getGroupMembers(newGroupId, session);
      const memberIds = members.map(member => member.user_id);
      const conflictingUsers = assignedUsers.filter(userId => memberIds.includes(userId));
      
      if (conflictingUsers.length > 0) {
        const conflictingUserEmails = users
          .filter(user => conflictingUsers.includes(user.id))
          .map(user => user.email || user.name)
          .join(', ');
        
        setError(`Cannot assign group "${groups.find(g => g.id === newGroupId)?.name}" because it contains users already assigned: ${conflictingUserEmails}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking group conflicts:', error);
      return false;
    }
  };

  // Vérifier les conflits pour les utilisateurs
  const checkUserConflicts = async (newUserId) => {
    if (!allowGroups) return false;
    try {
      const userGroups = await Promise.all(
        assignedGroups.map(async (groupId) => {
          const members = await getGroupMembers(groupId, session);
          return { groupId, members };
        })
      );
      
      const conflictingGroups = userGroups.filter(({ members }) => 
        members.some(member => member.user_id === newUserId)
      );
      
      if (conflictingGroups.length > 0) {
        const conflictingGroupNames = conflictingGroups
          .map(({ groupId }) => groups.find(g => g.id === groupId)?.name)
          .filter(Boolean)
          .join(', ');
        
        setError(`Cannot assign user "${users.find(u => u.id === newUserId)?.email || users.find(u => u.id === newUserId)?.name}" because they are already members of assigned groups: ${conflictingGroupNames}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking user conflicts:', error);
      return false;
    }
  };

  // Affichage des membres d'un groupe (popover)
  const handleExpandGroup = async (groupId) => {
    if (!allowGroups) return;
    if (groupMembers[groupId]) {
      setExpandedGroup(expandedGroup === groupId ? null : groupId);
      return;
    }
    const members = await getGroupMembers(groupId, session);
    setGroupMembers(prev => ({ ...prev, [groupId]: members }));
    setExpandedGroup(groupId);
  };

  return (
    <div className="mb-4" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}<span className="text-red-500">*</span></label>
      
      {/* Message d'erreur */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setError(null)}
                className="inline-flex text-red-400 hover:text-red-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-2">
        {/* Chips utilisateurs assignés */}
        {assignedUsers.map(userId => {
          const user = users.find(u => u.id === userId);
          if (!user) return null;
          return (
            <span key={userId} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs shadow border border-blue-200">
              {showAvatars && user.avatar_url && (
                <img src={user.avatar_url} alt={user.email} className="w-5 h-5 rounded-full" />
              )}
              {user.name || user.email}
              <button
                type="button"
                className="ml-1 text-blue-700 hover:text-red-500"
                onClick={() => onChangeUsers(assignedUsers.filter(id => id !== userId))}
                disabled={disabled}
                title="Remove"
              >×</button>
            </span>
          );
        })}
        {/* Chips groupes assignés */}
        {allowGroups && assignedGroups.map(groupId => {
          const group = groups.find(g => g.id === groupId);
          console.log('[ModernAssigneeSelector] Group data:', group);
          if (!group) return null;
          return (
            <span key={groupId} className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs shadow border border-green-200 relative">
              <span className="cursor-default">
                {group.name}
              </span>
              <button
                type="button"
                className="ml-1 text-green-700 hover:text-red-500"
                onClick={() => onChangeGroups(assignedGroups.filter(id => id !== groupId))}
                disabled={disabled}
                title="Remove"
              >×</button>
            </span>
          );
        })}
        {/* Bouton + pour ouvrir le menu d'ajout */}
        <button
          type="button"
          className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-600 hover:bg-blue-500 text-white text-lg font-bold shadow"
          onClick={() => setShowMenu(v => !v)}
          disabled={disabled}
          title="Add assignee"
        >+
        </button>
      </div>
      {/* Menu popover/autocomplete */}
      {showMenu && (
        <div className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#232329] border border-gray-600 rounded shadow-lg p-3 min-w-[250px] max-h-[60vh] overflow-y-auto">
          <input
            type="text"
            className="w-full px-2 py-1 rounded border border-gray-500 bg-[#18181b] text-white mb-2"
            placeholder={allowGroups ? "Search user or group..." : "Search user..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            <div className="font-bold text-xs text-gray-300 mb-1">Users</div>
            {filteredUsers.length === 0 && <div className="text-gray-500 text-xs mb-2">No users found</div>}
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-2 px-2 py-1 hover:bg-blue-700 rounded cursor-pointer text-white"
                onClick={async () => {
                  const hasConflict = await checkUserConflicts(user.id);
                  if (!hasConflict) {
                    onChangeUsers([...assignedUsers, user.id]);
                    setSearch('');
                    setShowMenu(false);
                    setError(null);
                  }
                }}
              >
                {showAvatars && user.avatar_url && (
                  <img src={user.avatar_url} alt={user.email} className="w-5 h-5 rounded-full" />
                )}
                <span>{user.name || user.email}</span>
              </div>
            ))}
            {allowGroups && (
              <>
                <div className="font-bold text-xs text-gray-300 mt-2 mb-1">Groups</div>
                {filteredGroups.length === 0 && <div className="text-gray-500 text-xs">No groups found</div>}
                {filteredGroups.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-green-700 rounded cursor-pointer text-white"
                    onClick={async () => {
                      const hasConflict = await checkConflicts(group.id);
                      if (!hasConflict) {
                        onChangeGroups([...assignedGroups, group.id]);
                        setSearch('');
                        setShowMenu(false);
                        setError(null);
                      }
                    }}
                  >
                    <span className="font-semibold">{group.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 