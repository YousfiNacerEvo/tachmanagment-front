'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getAllGroups, 
  createGroup, 
  updateGroup, 
  deleteGroup,
  getGroupMembers,
  addMembersToGroup,
  removeMembersFromGroup,
  getUsers,
  getGroupsWithMembers
} from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import ModernAssigneeSelector from '../../../components/ModernAssigneeSelector';

export default function GroupsPage() {
  const { isAdmin, loading: authLoading, user, session } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMembersForm, setShowMembersForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [existingMemberIds, setExistingMemberIds] = useState([]);
  
  // Form data
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: ''
  });
  const [membersForm, setMembersForm] = useState({
    user_ids: []
  });

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard?error=Access%20denied');
    }
  }, [isAdmin, authLoading, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isAdmin || !session) return;
    
    setLoading(true);
    setError(null);
    try {
      const [groupsData, usersData] = await Promise.all([
        getGroupsWithMembers(session),
        getUsers(session)
      ]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, session]);

  useEffect(() => {
    if (isAdmin && !authLoading) {
      fetchData();
    }
  }, [fetchData, isAdmin, authLoading]);

  // Form handlers
  const handleGroupFormChange = (e) => {
    const { name, value } = e.target;
    setGroupForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMembersFormChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setMembersForm(prev => ({
      ...prev,
      user_ids: options
    }));
  };

  const resetGroupForm = () => {
    setGroupForm({ name: '', description: '' });
    setSelectedGroup(null);
  };

  const resetMembersForm = () => {
    setMembersForm({ user_ids: [] });
    // Suppression de setSelectedGroup(null) pour ne pas perdre le groupe sélectionné
  };

  // CRUD operations
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setFormLoading(true);
    try {
      const newGroup = await createGroup({
        ...groupForm,
        created_by: user.id
      }, session);
      setGroups(prev => [newGroup, ...prev]);
      setShowCreateForm(false);
      resetGroupForm();
      toast.success('Group created successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setFormLoading(true);
    try {
      const updatedGroup = await updateGroup(selectedGroup.id, groupForm, session);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updatedGroup : g));
      setShowEditForm(false);
      resetGroupForm();
      toast.success('Group updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update group');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await deleteGroup(groupId, session);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast.success('Group deleted successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to delete group');
    }
  };

  const handleAddMembers = async (e) => {
    e.preventDefault();
    if (membersForm.user_ids.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setFormLoading(true);
    try {
      const toAdd = membersForm.user_ids.filter(id => !existingMemberIds.includes(id));
      if (toAdd.length > 0) {
        await addMembersToGroup(selectedGroup.id, toAdd, session);
        toast.success('Members added successfully!');
      } else {
        toast.success('No new members to add.');
      }
      setShowMembersForm(false);
      resetMembersForm();
      fetchData(); // Refresh to get updated member counts
    } catch (err) {
      toast.error(err.message || 'Failed to add members');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveMembers = async (groupId, userIds) => {
    if (!window.confirm('Are you sure you want to remove these members?')) return;

    try {
      await removeMembersFromGroup(groupId, userIds, session);
      toast.success('Members removed successfully!');
      fetchData(); // Refresh to get updated member counts
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to remove members');
      return false;
    }
  };

  // Open forms
  const openCreateForm = () => {
    resetGroupForm();
    setShowCreateForm(true);
    setShowEditForm(false);
    setShowMembersForm(false);
  };

  const openEditForm = (group) => {
    setSelectedGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || ''
    });
    setShowEditForm(true);
    setShowCreateForm(false);
    setShowMembersForm(false);
  };

  const openMembersForm = async (group) => {
    setSelectedGroup(group);
    setShowCreateForm(false);
    setShowEditForm(false);
    try {
      const members = await getGroupMembers(group.id, session);
      const ids = (members || []).map(m => m.user_id);
      setExistingMemberIds(ids);
      setMembersForm({ user_ids: ids });
    } catch (err) {
      console.error('Failed to preload group members:', err);
      setExistingMemberIds([]);
      setMembersForm({ user_ids: [] });
    } finally {
      setShowMembersForm(true);
    }
  };

  if (authLoading) return null;
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Groups Management</h1>
        <button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
        >
          Create Group
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-600 border border-red-300 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Group</h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
              <input
                type="text"
                name="name"
                value={groupForm.name}
                onChange={handleGroupFormChange}
                className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={groupForm.description}
                onChange={handleGroupFormChange}
                rows={3}
                className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter group description"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Group Form */}
      {showEditForm && selectedGroup && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Group</h2>
          <form onSubmit={handleEditGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
              <input
                type="text"
                name="name"
                value={groupForm.name}
                onChange={handleGroupFormChange}
                className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={groupForm.description}
                onChange={handleGroupFormChange}
                rows={3}
                className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter group description"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Members Form */}
      {showMembersForm && selectedGroup && (
        <div className="bg-[#18181b] border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-extrabold text-white mb-4">FORMULAIRE AJOUT MEMBRES</h2>
          <form onSubmit={handleAddMembers} className="space-y-4">
            <div>
              <ModernAssigneeSelector
                assignedUsers={membersForm.user_ids}
                assignedGroups={[]}
                onChangeUsers={(user_ids) => setMembersForm(prev => ({ ...prev, user_ids }))}
                onChangeGroups={() => {}}
                disabled={formLoading}
                label={`Select Users for ${selectedGroup.name}`}
                showAvatars={false}
                allowGroups={false}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Adding...' : 'Add Members'}
              </button>
              <button
                type="button"
                onClick={() => setShowMembersForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Groups</h2>
        {loading ? (
          <div className="text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-gray-500">No groups found. Create your first group!</div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onEdit={() => openEditForm(group)}
                onDelete={() => handleDeleteGroup(group.id)}
                onManageMembers={() => openMembersForm(group)}
                onRemoveMembers={handleRemoveMembers}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Group Card Component
function GroupCard({ group, onEdit, onDelete, onManageMembers, onRemoveMembers }) {
  console.log('GroupCard group:', group);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const {session} = useAuth();
  const loadMembers = async () => {
    if (showMembers && members.length === 0) {
      setLoadingMembers(true);
      try {
        const membersData = await getGroupMembers(group.id, session);
        setMembers(membersData);
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  useEffect(() => {
    loadMembers();
  }, [showMembers]);

  const toggleMembers = () => {
    setShowMembers(!showMembers);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
          {group.description && (
            <p className="text-gray-500 text-sm mt-1">{group.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>Created: {new Date(group.created_at).toLocaleDateString()}</span>
            <span>Members: {group.member_count?.[0]?.count ?? 0}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onManageMembers}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-xl text-sm"
          >
            Add Members
          </button>
          <button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-xl text-sm"
          >
            Delete
          </button>
        </div>
      </div>
      {/* Members Section */}
      <div className="mt-3">
        <button
          onClick={toggleMembers}
          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
        >
          <span>{showMembers ? '▼' : '▶'}</span> {showMembers ? 'Hide Members' : 'Show Members'}
        </button>
        {showMembers && (
          <div className="mt-2 pl-4">
            {loadingMembers ? (
              <div className="text-gray-500 text-sm">Loading members...</div>
            ) : members && members.length > 0 ? (
              <ul className="list-disc text-gray-700 text-sm">
                {members.map(member => (
                  <li key={member.user_id || member.id} className="flex items-center gap-2">
                    <span className="flex-1">{member.email}</span>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700 text-xs"
                      onClick={async () => {
                        const ok = await onRemoveMembers(group.id, [member.user_id || member.id]);
                        if (ok) {
                          // Mise à jour locale instantanée pour feedback
                          setMembers(prev => prev.filter(m => (m.user_id || m.id) !== (member.user_id || member.id)));
                        }
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-400 text-sm">No members</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 