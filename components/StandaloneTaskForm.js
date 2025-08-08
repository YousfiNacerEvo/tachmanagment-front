'use client';
import React, { useState, useEffect } from 'react';
import { getUsers } from '../lib/api';
import { toast } from 'react-hot-toast';
import GroupSelector from './GroupSelector';
import AssigneeSelector from './AssigneeSelector';
import ModernAssigneeSelector from './ModernAssigneeSelector';
import { getGroupMembers, getGroupsByTask, getGroupsByProject } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function StandaloneTaskForm({ task = null, onSubmit, onCancel, loading = false, isAdmin = false }) {
  const { session } = useAuth(); 
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'to do',
    priority: 'medium',
    deadline: '',
    user_ids: [],
    group_ids: [], // Add group assignment
  });
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [projectAssignees, setProjectAssignees] = useState({ users: [], groups: [] });

  useEffect(() => {
    // Charger les utilisateurs
    getUsers(session)
      .then(setUsers)
      .catch(err => {
        console.error('Error loading users:', err);
        setError('Failed to load users');
      });

    // Si on édite une tâche existante, remplir le formulaire et charger les assignés
    if (task) {
      setForm({
        id: task.id, // Ajouter l'ID de la tâche seulement pour l'édition
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'to do',
        priority: task.priority || 'medium',
        deadline: task.deadline || '',
        // Ne pas injecter les membres de groupes: garder uniquement les utilisateurs explicitement assignés
        user_ids: task.user_ids || [],
        group_ids: task.group_ids || task.groups || [], // Load assigned groups
      });
      // Charger les assignés du projet parent si project_id existe
      if (task.project_id) {
        Promise.all([
          getGroupsByProject(task.project_id,session),
          // Ajoute ici un appel à getUsersByProject si tu as cette API
        ]).then(([groups]) => {
          setProjectAssignees({ users: [], groups });
        });
      }
    } else {
      // Réinitialiser le formulaire pour une nouvelle tâche
      setForm({
        title: '',
        description: '',
        status: 'to do',
        priority: 'medium',
        deadline: '',
        user_ids: [],
        group_ids: [],
      });
      setProjectAssignees({ users: [], groups: [] });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleUserChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setForm(prev => ({
      ...prev,
      user_ids: options
    }));
    setError(null);
  };

  const handleGroupChange = (groupIds) => {
    setForm(prev => ({
      ...prev,
      group_ids: groupIds
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Pour les utilisateurs non-admin qui éditent une tâche existante, 
    // permettre seulement la mise à jour du status
    if (!isAdmin && task) {
      const updatedForm = { 
        id: form.id,
        status: form.status 
      };
      
      try {
        await onSubmit(updatedForm);
      } catch (err) {
        setError(err.message || 'Failed to update task status');
      }
      return;
    }
    
    // Pour les admins ou la création de nouvelles tâches
    // Validation
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!form.description.trim()) {
      setError('Description is required for standalone tasks');
      return;
    }

    // Check if at least one user or group is assigned
    if (form.user_ids.length === 0 && form.group_ids.length === 0) {
      setError('Please assign at least one user or group');
      return;
    }

    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || 'Failed to save task');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {task ? 'Edit Task' : 'Create New Task'}
      </h2>
      
      {error && (
        <div className="bg-red-100 text-red-600 border border-red-300 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className={`w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="Enter task title"
            required
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className={`w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="Enter task description"
            required
            disabled={!isAdmin}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="to do">To Do</option>
              <option value="in progress">In Progress</option>
              <option value="done">Done</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
            />
          </div>
        </div>

        {/* Assignés du projet (lecture seule) */}
        {task && projectAssignees.groups.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">Assigned Groups (from Project)</label>
            <div className="flex flex-wrap gap-2">
              {projectAssignees.groups.map(group => (
                <span key={group.id} className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs border border-green-200">
                  {group.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assignation moderne */}
        <ModernAssigneeSelector
          assignedUsers={form.user_ids}
          assignedGroups={form.group_ids}
          onChangeUsers={user_ids => setForm(prev => ({ ...prev, user_ids }))}
          onChangeGroups={group_ids => setForm(prev => ({ ...prev, group_ids }))}
          disabled={loading || !isAdmin}
          label="Assign to"
        />

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 