'use client';
import React, { useState, useEffect } from 'react';
import { updateTask, addTaskFiles } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FileManager from './FileManager';
import { supabase } from '../lib/supabase';

export default function TaskEditModal({ task, isOpen, onClose, onUpdate, isAdmin = false }) {
  const { session } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'to do',
    priority: 'medium',
    deadline: '',
    project_id: null,
    progress: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState({ user_ids: [], group_ids: [] });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'to do',
        priority: task.priority || 'medium',
        deadline: task.deadline ? task.deadline.split('T')[0] : '',
        project_id: task.project_id || null,
        progress: typeof task.progress === 'number' ? task.progress : 0
      });

      // Récupérer les assignations existantes
      if (task.id) {
        fetchExistingAssignments(task.id);
      }
    }
  }, [task]);

  // Fonction pour récupérer les assignations existantes
  const fetchExistingAssignments = async (taskId) => {
    try {
      // Récupérer les assignations utilisateurs
      const { data: userAssignments } = await supabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId);

      // Récupérer les assignations groupes
      const { data: groupAssignments } = await supabase
        .from('group_task_assignments')
        .select('group_id')
        .eq('task_id', taskId);

      const assignments = {
        user_ids: userAssignments?.map(a => a.user_id) || [],
        group_ids: groupAssignments?.map(a => a.group_id) || []
      };

      console.log(`[TaskEditModal] Assignations récupérées pour la tâche ${taskId}:`, assignments);
      setExistingAssignments(assignments);
    } catch (error) {
      console.error('Erreur lors de la récupération des assignations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let taskData;
      
      // Pour les utilisateurs non-admin, permettre seulement la mise à jour du status
      if (!isAdmin) {
        taskData = { status: form.status };
      } else {
        // Pour les admins, permettre la mise à jour de tous les champs
        taskData = { ...form };
        if (!taskData.deadline) {
          delete taskData.deadline;
        }
        if (!taskData.project_id) {
          taskData.project_id = null;
        }
      }

      // Utiliser les assignations existantes au lieu de tableaux vides
      const updatedTask = await updateTask(
        task.id, 
        taskData, 
        existingAssignments.user_ids, 
        existingAssignments.group_ids, 
        session
      );
      onUpdate(updatedTask);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        try { window.dispatchEvent(new CustomEvent('tach:dataUpdated')); } catch (_) {}
      }
      setNewPhotos([]);
    } catch (e) {
      setError(e.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-0 max-w-2xl w-full shadow-xl relative">
        <div className="max-h-[85vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-400 text-xl"
          title="Close"
        >
          ×
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Task</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-600 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              required
              disabled={!isAdmin}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="to do">To Do</option>
                <option value="in progress">In Progress</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                  !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={!isAdmin}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Quick photo upload (admin) - placed above Progress */}
          

          {/* Progress (selector only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
            <select
              value={form.progress || 0}
              onChange={(e) => setForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
              className={`w-28 bg-white border border-gray-300 rounded px-2 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
              className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-xl transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

          {/* Files (admin can manage full list) */}
          {isAdmin && task?.id && (
            <div className="mt-6">
              <FileManager ownerType="task" ownerId={task.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 