'use client';
import React, { useState, useEffect } from 'react';
import { getUsers, addTaskFiles } from '../lib/api';
import { toast } from 'react-hot-toast';
import ModernAssigneeSelector from './ModernAssigneeSelector';
import { getGroupsByProject } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FileManager from './FileManager';
import { supabase } from '../lib/supabase';

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
    files: [],
    progress: 0,
  });
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [projectAssignees, setProjectAssignees] = useState({ users: [], groups: [] });
  const [uploading, setUploading] = useState(false);
  const [fileReloadTick, setFileReloadTick] = useState(0);

  // Fonction pour formater la date pour le champ HTML date
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    } catch (e) {
      return '';
    }
  };

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
      console.log('🔍 Editing task:', task);
      console.log('📅 Task deadline:', task.deadline);
      console.log('📊 Task progress:', task.progress);
      console.log('📅 Formatted deadline:', formatDateForInput(task.deadline));
      
      setForm({
        id: task.id, // Ajouter l'ID de la tâche seulement pour l'édition
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'to do',
        priority: task.priority || 'medium',
        deadline: formatDateForInput(task.deadline),
        // Ne pas injecter les membres de groupes: garder uniquement les utilisateurs explicitement assignés
        user_ids: task.user_ids || [],
        group_ids: task.group_ids || task.groups || [], // Load assigned groups
        files: [],
        progress: task.progress !== undefined && task.progress !== null ? Number(task.progress) : 0,
      });
      
      console.log('✅ Form set with values:', {
        deadline: task.deadline || '',
        progress: task.progress !== undefined && task.progress !== null ? Number(task.progress) : 0
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
        files: [],
        progress: 0,
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
    setFieldErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleUserChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setForm(prev => ({
      ...prev,
      user_ids: options
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
        // Fermer le formulaire après mise à jour réussie
        onCancel();
      } catch (err) {
        setError(err.message || 'Failed to update task status');
      }
      return;
    }
    
    // Pour les admins ou la création de nouvelles tâches
    // Validation
    const errors = {};
    if (!form.title.trim()) {
      errors.title = 'Title is required';
    }
    if (!form.description.trim()) {
      errors.description = 'Description is required for standalone tasks';
    }
    // Check if at least one user or group is assigned
    if ((form.user_ids || []).length === 0 && (form.group_ids || []).length === 0) {
      errors.assignees = 'Please assign at least one user or group';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fill the required fields.');
      return;
    }
    setFieldErrors({});

    try {
      await onSubmit(form);
      // Fermer le formulaire après création/mise à jour réussie
      onCancel();
    } catch (err) {
      setError(err.message || 'Failed to save task');
    }
  };

  // Quick photo upload for edit mode (admin)
  const handlePhotoFiles = async (fileList) => {
    if (!task?.id || !fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of fileList) {
        if (!file.type || !file.type.startsWith('image/')) continue;
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
        const path = `tasks/${task.id}/${filename}`;
        const { error: upErr } = await supabase.storage
          .from('filesmanagment')
          .upload(path, file, { contentType: file.type || 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from('filesmanagment')
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        uploaded.push({
          name: file.name,
          path,
          url: signed?.signedUrl || '',
          size: file.size,
          type: file.type || 'image/jpeg',
          uploaded_at: new Date().toISOString(),
        });
      }
      if (uploaded.length > 0) {
        await addTaskFiles(task.id, uploaded, session);
        setFileReloadTick(t => t + 1); // force FileManager remount/reload
        try { window.dispatchEvent(new CustomEvent('tach:dataUpdated')); } catch (_) {}
        toast.success('Photos uploaded');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
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
            className={`w-full px-3 py-2 rounded border ${fieldErrors.title ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="Enter task title"
            required
            disabled={!isAdmin}
          />
          {fieldErrors.title && (
            <div className="mt-1 text-xs text-red-600">{fieldErrors.title}</div>
          )}
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
            className={`w-full px-3 py-2 rounded border ${fieldErrors.description ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="Enter task description"
            required
            disabled={!isAdmin}
          />
          {fieldErrors.description && (
            <div className="mt-1 text-xs text-red-600">{fieldErrors.description}</div>
          )}
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
          onChangeUsers={user_ids => { setFieldErrors(prev => ({ ...prev, assignees: null })); setForm(prev => ({ ...prev, user_ids })); }}
          onChangeGroups={group_ids => { setFieldErrors(prev => ({ ...prev, assignees: null })); setForm(prev => ({ ...prev, group_ids })); }}
          disabled={loading || !isAdmin}
          label="Assign to"
        />
        {fieldErrors.assignees && (
          <div className="mt-1 text-xs text-red-600">{fieldErrors.assignees}</div>
        )}

        {/* Files (optional during creation) */}
        {!task && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Files (optional)
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setForm(prev => ({ ...prev, files: Array.from(e.target.files || []) }))}
              className="block w-full text-sm text-gray-900"
              disabled={loading}
            />
            {form.files && form.files.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">{form.files.length} file(s) selected</div>
            )}
          </div>
        )}

        {/* Progress control (selector only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
          <select
            value={form.progress || 0}
            onChange={(e) => setForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
            className={`w-28 px-2 py-2 rounded border border-gray-300 bg-white text-gray-900 ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            disabled={loading || !isAdmin}
          >
            <option value={0}>0%</option>
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
          </select>
          <div className="w-full h-2 bg-gray-200 rounded mt-2">
            <div className="h-2 bg-blue-600 rounded" style={{ width: `${form.progress || 0}%` }} />
          </div>
        </div>

        {/* Edit mode: admin photo upload + file manager (placed above action buttons) */}
        {task && isAdmin && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add photos</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handlePhotoFiles(files);
                  e.target.value = '';
                }}
                className="block text-sm"
                disabled={uploading}
              />
              {uploading && <span className="text-xs text-gray-500">Uploading...</span>}
            </div>
            <div className="mt-4">
              <FileManager key={`fm-${task.id}-${fileReloadTick}`} ownerType="task" ownerId={task.id} />
            </div>
          </div>
        )}

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