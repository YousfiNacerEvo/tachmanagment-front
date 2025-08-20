'use client';
import React, { useEffect, useState, useRef } from 'react';
import { getTasksByProject, getTasksByProjectWithAssignees, createTask, updateTask, deleteTask, updateProject, addTaskFiles, getTaskFiles, deleteTaskFile } from '../lib/api';
import { getUsers } from '../lib/api';
import { toast } from 'react-hot-toast';
import ModernAssigneeSelector from './ModernAssigneeSelector';
import { getAllGroups } from '../lib/api';
import FileManager from './FileManager';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';



function TaskMiniForm({ onAdd, onCancel, initial, users = [], isAdmin = false }) {
  const { session } = useAuth();
  
  const [form, setForm] = useState(initial || {
    title: '',
    description: '',
    status: 'to do',
    priority: 'medium',
    deadline: '',
    progress: 0,
    user_ids: [],
    group_ids: [],
    files: [],
  });
  const [taskError, setTaskError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [persistedFiles, setPersistedFiles] = useState([]);
  const [persistedBusy, setPersistedBusy] = useState(false);

  // Load existing files for the task when editing
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!initial?.id || !session) {
        setPersistedFiles([]);
        return;
      }
      setPersistedBusy(true);
      try {
        const files = await getTaskFiles(initial.id, session);
        if (mounted) setPersistedFiles(Array.isArray(files) ? files : []);
      } catch (_) {
        if (mounted) setPersistedFiles([]);
      } finally {
        if (mounted) setPersistedBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [initial?.id, session]);

  const handleRemovePersisted = async (path) => {
    if (!initial?.id || !path) return;
    try {
      await deleteTaskFile(initial.id, path, session);
      setPersistedFiles(prev => prev.filter(f => f?.path !== path));
    } catch (e) {
      // keep silent in UI; parent toasts elsewhere
      console.error('[TaskMiniForm] Failed to delete file', e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validation: Title, Deadline, and Assignation are required
    const errors = {};
    if (!form.title.trim()) {
      errors.title = 'Title is required.';
    }
    if (!form.deadline) {
      errors.deadline = 'Deadline is required.';
    }
    if ((form.user_ids || []).length === 0 && (form.group_ids || []).length === 0) {
      errors.assignees = 'Please assign at least one user or group.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTaskError('Please fill the required fields.');
      return;
    }
    setTaskError(null);
    setFieldErrors({});
    onAdd(form);
  };

  return (
    <div className="bg-[#232329] border border-gray-700 rounded-lg p-4 mb-4">
      <h4 className="text-white font-semibold mb-3">
        {initial ? 'Edit Task' : 'Add New Task'}
      </h4>
      <div className="space-y-3">
        {taskError && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-3 py-2 rounded text-sm">
            {taskError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={e => { setTaskError(null); setFieldErrors(prev => ({ ...prev, title: null })); setForm({ ...form, title: e.target.value }); }}
              className={`w-full px-3 py-2 rounded bg-[#18181b] border ${fieldErrors.title ? 'border-red-500' : 'border-gray-600'} text-white placeholder-gray-400`}
              required
            />
            {fieldErrors.title && (
              <div className="mt-1 text-xs text-red-400">{fieldErrors.title}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white"
            >
              <option value="to do">To do</option>
              <option value="in progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Deadline <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => { setFieldErrors(prev => ({ ...prev, deadline: null })); setForm({ ...form, deadline: e.target.value }); }}
              className={`w-full px-3 py-2 rounded bg-[#18181b] border ${fieldErrors.deadline ? 'border-red-500' : 'border-gray-600'} text-white`}
              required
            />
            {fieldErrors.deadline && (
              <div className="mt-1 text-xs text-red-400">{fieldErrors.deadline}</div>
            )}
          </div>
        </div>

        {/* Task progress (lightweight UI) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Task Progress</label>
          <div className="space-y-2">
            <select
              value={form.progress || 0}
              onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
              className="w-32 px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white"
            >
              <option value={0}>0%</option>
              <option value={25}>25%</option>
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
            </select>
            {/* Visual progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${form.progress || 0}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-xs text-gray-400 min-w-[3rem] text-right">
                {form.progress || 0}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Assignation moderne - seulement pour les admins */}
        {isAdmin && (
          <ModernAssigneeSelector
            assignedUsers={form.user_ids || []}
            assignedGroups={form.group_ids || []}
            onChangeUsers={user_ids => { setTaskError(null); setFieldErrors(prev => ({ ...prev, assignees: null })); setForm({ ...form, user_ids }); }}
            onChangeGroups={group_ids => { setTaskError(null); setFieldErrors(prev => ({ ...prev, assignees: null })); setForm({ ...form, group_ids }); }}
            disabled={false}
            label={<span>Assign to <span className="text-red-500">*</span></span>}
          />
        )}
        {fieldErrors.assignees && (
          <div className="mt-1 text-xs text-red-400">{fieldErrors.assignees}</div>
        )}
        
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
          <textarea
            placeholder="Task description (optional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white placeholder-gray-400 resize-none"
          />
        </div>

        {/* Optional files during creation/update inside drawer */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Files (optional)</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => e.currentTarget.nextElementSibling?.click()}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
            >
              Select files
            </button>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  setForm(prev => ({ ...prev, files: [...(prev.files || []), ...files] }));
                  e.target.value = '';
                }
              }}
            />
            {Array.isArray(form.files) && form.files.length > 0 && (
              <span className="text-xs text-gray-400">{form.files.length} file(s) selected</span>
            )}
          </div>
          {/* Persisted files list for existing task */}
          {initial?.id && (
            <div className="mt-2">
              <div className="text-xs text-gray-400 mb-1">Existing files</div>
              {persistedBusy ? (
                <div className="text-xs text-gray-500">Loading...</div>
              ) : (
                (persistedFiles && persistedFiles.length > 0) ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {persistedFiles.map((f, i) => (
                      <li key={`${f?.path || 'file'}-${i}`} className="bg-[#2a2a31] border border-gray-700 rounded p-2 text-white text-xs flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="truncate" title={f?.name || f?.path || 'file'}>{f?.name || f?.path || 'file'}</div>
                          <div className="text-[10px] text-gray-400">{typeof f?.size === 'number' ? (f.size/1024).toFixed(1) + ' KB' : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {f?.url && (
                            <a href={f.url} target="_blank" rel="noreferrer" className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-[10px]">Open</a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePersisted(f?.path)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-[10px]"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[11px] text-gray-500">No files yet</div>
                )
              )}
            </div>
          )}
          {Array.isArray(form.files) && form.files.length > 0 && (
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {form.files.map((f, i) => (
                <li key={`${f?.name || 'file'}-${i}`} className="bg-[#2a2a31] border border-gray-700 rounded p-2 text-white text-xs flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="truncate" title={f?.name || 'file'}>{f?.name || 'file'}</div>
                    <div className="text-[10px] text-gray-400">{typeof f?.size === 'number' ? (f.size/1024).toFixed(1) + ' KB' : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, files: prev.files.filter((_, idx) => idx !== i) }))}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-[10px]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
          >
            {initial ? 'Update Task' : 'Add Task'}
          </button>
          {Array.isArray(form.files) && form.files.length > 0 && (
            <span className="text-xs text-gray-400 self-center">{form.files.length} file(s) selected</span>
          )}
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDrawer({
  open,
  onClose,
  onSubmit,
  form,
  onChange,
  loading,
  error,
  editMode = false,
  onUpdate,
  onDelete,
  formTasks = [],
  setFormTasks = () => {},
  isAdmin = false,
}) {
  // Animation/chargement
  const [isOpening, setIsOpening] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const { session } = useAuth();
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Charger les tâches du projet lors de l'édition
  useEffect(() => {
    console.log('[ProjectDrawer] open:', open, 'editMode:', editMode, 'form:', form);
    if (open) {
      // petite animation d'ouverture
      setIsOpening(true);
      const t = setTimeout(() => setIsOpening(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (editMode && open && form && (form.id || form._id)) {
      const projectId = form.id || form._id;
      console.log('[ProjectDrawer] Chargement des tâches pour le projet :', projectId);
      setTasksLoading(true);
      getTasksByProjectWithAssignees(projectId,session)
        .then(tasks => {
          console.log('[ProjectDrawer] Tâches récupérées avec assignations :', tasks);
          setFormTasks(tasks);
        })
        .catch((err) => {
          console.error('[ProjectDrawer] Erreur lors du chargement des tâches :', err);
          setFormTasks([]);
        })
        .finally(() => setTasksLoading(false));
    } else if (editMode && open) {
      console.warn('[ProjectDrawer] Pas d\'ID projet pour charger les tâches. form:', form);
      setFormTasks([]);
      setTasksLoading(false);
    }
  }, [editMode, open, form, setFormTasks]);

  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (isAdmin && open) {
      getUsers(session).then(setUsers).catch(() => setUsers([]));
    }
  }, [isAdmin, open,session]);

  const [groups, setGroups] = useState([]);
  useEffect(() => {
    if (open) {
      getAllGroups(session).then(setGroups).catch(() => setGroups([]));
    }
  }, [open, session]);

  // Fermer si on clique sur le fond
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [filesTaskOpenId, setFilesTaskOpenId] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const createFilesInputRef = useRef(null);
  const openCreateFilePicker = () => createFilesInputRef.current?.click();

  // Ajout ou édition d'une tâche en mode édition : envoie à l'API puis recharge la liste
  const handleAddTask = async (task) => {
    
    if (editMode && form && (form.id || form._id)) {
      try {
        // Extraire user_ids et group_ids de l'objet task
        const { user_ids = [], group_ids = [], files = [], ...taskData } = task;
      
        
        if (task.id) {
          console.log('Updating existing task:', task.id);
          const safeUserIds = Array.isArray(user_ids) ? user_ids : [];
          const safeGroupIds = Array.isArray(group_ids) ? group_ids : [];
          await updateTask(task.id, { ...taskData, project_id: form.id || form._id }, safeUserIds, safeGroupIds, session);
          toast.success('Task updated successfully!');

          // Upload any selected files for existing task
          if (Array.isArray(files) && files.length > 0) {
            const uploaded = [];
            for (const file of files) {
              if (!file || typeof file !== 'object' || typeof file.name !== 'string') continue;
              const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
              const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
              const path = `tasks/${task.id}/${filename}`;
              console.log('[upload][existing-task] uploading to', path, 'type:', file.type, 'size:', file.size);
              const { error: upErr } = await supabase.storage.from('filesmanagment').upload(path, file, { contentType: file.type || 'application/octet-stream' });
              if (upErr) throw upErr;
              const { data: signed } = await supabase.storage.from('filesmanagment').createSignedUrl(path, 60 * 60 * 24 * 7);
              uploaded.push({
                name: file.name,
                path,
                url: signed?.signedUrl || '',
                size: file.size,
                type: file.type || 'application/octet-stream',
                uploaded_at: new Date().toISOString(),
              });
            }
            try {
              console.log('[api][addTaskFiles] sending:', uploaded);
              const updatedFiles = await addTaskFiles(task.id, uploaded, session);
              console.log('[api][addTaskFiles] returned:', updatedFiles);
              // Update local state immediately with returned files
              setFormTasks(prev => prev.map(t => t.id === task.id ? { ...t, files: updatedFiles } : t));
              // Also refresh from server for full consistency (assignments/progress)
              const refreshed = await getTasksByProjectWithAssignees(form.id || form._id, session);
              setFormTasks(refreshed);
            } catch (e) {
              console.error('[addTaskFiles after update] failed:', e);
              try { toast.error(`Failed to save task files: ${e?.message || e}`); } catch (_) {}
            }
          }
          
          // Mettre à jour directement l'état local
          setFormTasks(prev => prev.map(t => 
            t.id === task.id 
              ? { 
                  ...t, 
                  ...taskData,
                  user_ids: safeUserIds,
                  group_ids: safeGroupIds,
                  // Compatibilité avec anciens alias
                  assignees: safeUserIds,
                  groups: safeGroupIds
                }
              : t
          ));
        } else {
          console.log('Creating new task with project_id:', form.id || form._id);
          const safeUserIds = Array.isArray(user_ids) ? user_ids : [];
          const safeGroupIds = Array.isArray(group_ids) ? group_ids : [];
          const newTask = await createTask({ ...taskData, project_id: form.id || form._id }, safeUserIds, safeGroupIds, session);
          toast.success('Task created successfully!');

          // Upload files selected at creation time
          if (Array.isArray(files) && files.length > 0 && newTask?.id) {
            const uploaded = [];
            for (const file of files) {
              if (!file || typeof file !== 'object' || typeof file.name !== 'string') continue;
              const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
              const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
              const path = `tasks/${newTask.id}/${filename}`;
              console.log('[upload][new-task] uploading to', path, 'type:', file.type, 'size:', file.size);
              const { error: upErr } = await supabase.storage.from('filesmanagment').upload(path, file, { contentType: file.type || 'application/octet-stream' });
              if (upErr) throw upErr;
              const { data: signed } = await supabase.storage.from('filesmanagment').createSignedUrl(path, 60 * 60 * 24 * 7);
              uploaded.push({
                name: file.name,
                path,
                url: signed?.signedUrl || '',
                size: file.size,
                type: file.type || 'application/octet-stream',
                uploaded_at: new Date().toISOString(),
              });
            }
            try {
              console.log('[api][addTaskFiles-create] sending:', uploaded);
              const updatedFiles = await addTaskFiles(newTask.id, uploaded, session);
              console.log('[api][addTaskFiles-create] returned:', updatedFiles);
              // Update local state for the new task as well
              setFormTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, files: updatedFiles } : t));
              // Refresh list from server
              const refreshed = await getTasksByProjectWithAssignees(form.id || form._id, session);
              setFormTasks(refreshed);
            } catch (e) {
              console.error('[addTaskFiles after create] failed:', e);
              try { toast.error(`Failed to save task files: ${e?.message || e}`); } catch (_) {}
            }
          }
          
          // Ajouter la nouvelle tâche à l'état local
          const taskWithAssignments = {
            ...newTask,
            user_ids: safeUserIds,
            group_ids: safeGroupIds,
            assignees: safeUserIds,
            groups: safeGroupIds
          };
          setFormTasks(prev => [taskWithAssignments, ...prev]);
        }
      } catch (err) {
        console.error('Error in handleAddTask:', err);
        toast.error('Error while creating or updating the task: ' + (err.message || err));
      }
      setShowTaskForm(false);
      setEditingTaskIdx(null);
    } else {
      if (editingTaskIdx !== null) {
        setFormTasks(tasks => tasks.map((t, i) => i === editingTaskIdx ? task : t));
      } else {
        setFormTasks(tasks => [...tasks, task]);
      }
      setShowTaskForm(false);
      setEditingTaskIdx(null);
    }
  };

  // Suppression d'une tâche en mode édition : envoie à l'API puis recharge la liste
  const handleDeleteTask = async (task, idx) => {
    if (editMode && form && (form.id || form._id) && task.id) {
      try {
        if (!window.confirm('Are you sure you want to delete this task? Its files will be deleted.')) return;
        await deleteTask(task.id,session);
        
        // Supprimer directement de l'état local
        setFormTasks(prev => prev.filter(t => t.id !== task.id));
        
        toast.success('Task deleted successfully!');
      } catch (err) {
        toast.error('Error while deleting the task: ' + (err.message || err));
      }
    } else {
      setFormTasks(tasks => tasks.filter((_, i) => i !== idx));
    }
  };

  const drawerBusy = loading || tasksLoading || isOpening;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${open ? '' : 'pointer-events-none'}`}
      style={{ transition: 'background 0.2s' }}
      onClick={handleBackdrop}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}></div>
      {/* Drawer */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 h-full bg-white shadow-2xl will-change-transform transition-transform transition-opacity duration-300 ${open ? 'ease-out' : 'ease-in'}
        ${open ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${expanded ? 'left-[16rem] w-auto' : 'left-auto w-[900px]'}
        flex flex-col`}
        style={{ minWidth: 500 }}
      >
        {/* Boutons overlay toujours visibles */}
        {open && (
          <div
            className="fixed z-50   top-0 w-[100%]  px-4"
            style={{ top: 0 }}
          >
            <div className="flex justify-between gap-2">
              <button
                onClick={() => setExpanded(e => !e)}
                className=" rounded-full p-2 text-gray-700 hover:text-blue-600 w-10 h-10 flex items-center justify-center"
                aria-label={expanded ? 'Reduce' : 'Expand'}
                disabled={loading}
              >
                {expanded ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className=" rounded-full p-2 text-gray-700 hover:text-blue-600 w-10 h-10 flex items-center justify-center"
                aria-label="Close"
                disabled={loading}
              >
                <span className="text-red-500 text-2xl">X</span>
              </button>
            </div>
          </div>
        )}
        <div className="p-6 pt-14 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-full relative">
          {drawerBusy && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 rounded-lg">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-10 w-10 text-blue-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span className="text-white font-semibold">Loading...</span>
              </div>
            </div>
          )}
          {isAdmin ? (
            <form
              onSubmit={async (e) => {
                if (editMode) {
                  e.preventDefault();
                  // Gérer les fichiers lors de la mise à jour aussi
                  try {
                    await onUpdate({ filesPayload: newFiles });
                  } finally {
                    setNewFiles([]);
                  }
                  return;
                }
                e.preventDefault();
                // include files in creation (do not pass SyntheticEvent)
                try {
                  await onSubmit({ filesPayload: newFiles });
                } finally {
                  setNewFiles([]);
                }
              }}
              className={`contents`}
            >
              {/* Colonne gauche */}
              <div className="flex flex-col gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                <h2 className="text-2xl font-bold mb-1 text-gray-400 col-span-2">
                  {editMode ? 'Edit Project' : 'Create Project'}
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    placeholder="Title"
                    required
                    className="w-full px-4 py-2 rounded border border-gray-600 bg-[#18181b] text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    placeholder="Description"
                    required
                    className="w-full px-4 py-2 rounded border border-gray-600 bg-[#18181b] text-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    rows={4}
                    disabled={loading}
                  />
                </div>
                {/* Progression du projet */}
                <label className="block text-sm font-medium text-gray-400 mb-1">Project Progress</label>
                <div className="flex items-center gap-4">
                  <select
                    value={form.progress || 0}
                    onChange={async (e) => {
                      const newProgress = Number(e.target.value);
                      if (editMode && (form.id || form._id)) {
                        await updateProject(form.id || form._id, { ...form, progress: newProgress }, form.user_ids, session);
                        onChange({ target: { name: 'progress', value: newProgress } });
                      } else {
                        onChange({ target: { name: 'progress', value: newProgress } });
                      }
                    }}
                    className="w-32 px-3 py-2 rounded border border-gray-300 bg-white text-gray-900"
                    disabled={loading}
                  >
                    <option value={0}>0%</option>
                    <option value={25}>25%</option>
                    <option value={50}>50%</option>
                    <option value={75}>75%</option>
                    <option value={100}>100%</option>
                  </select>
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs text-gray-300">Completion: {form.progress || 0}%</span>
                    <div className="w-full h-2 bg-gray-200 rounded mt-1">
                      <div className="h-2 rounded bg-blue-500 transition-all" style={{ width: `${form.progress || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Colonne droite */}
              <div className="flex flex-col gap-4">
                {/* Assignation moderne utilisateurs & groupes */}
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Start Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="start"
                      value={form.start}
                      onChange={onChange}
                      className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">End Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="end"
                      value={form.end}
                      onChange={onChange}
                      className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
                    />
                  </div>
                </div>
                <ModernAssigneeSelector
                  assignedUsers={form.user_ids || []}
                  assignedGroups={form.group_ids || []}
                  onChangeUsers={user_ids => onChange({ target: { name: 'user_ids', value: user_ids } })}
                  onChangeGroups={group_ids => onChange({ target: { name: 'group_ids', value: group_ids } })}
                  disabled={loading}
                  label={"Assign to"}
                />
                {/* Project files handling */}
                {editMode && (form?.id || form?._id) ? (
                  <div>
                    <FileManager ownerType="project" ownerId={form.id || form._id} title="Files" />
                  </div>
                ) : (
                  <div className="bg-[#18181b] border border-gray-700 rounded-lg p-3">
                    <label className="block text-sm font-medium text-white mb-2">Project files (uploaded after creation)</label>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={openCreateFilePicker}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                        disabled={loading}
                      >
                        Select files
                      </button>
                      <input
                        ref={createFilesInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setNewFiles(prev => [...prev, ...files]);
                            e.target.value = '';
                          }
                        }}
                      />
                      {newFiles.length > 0 && (
                        <span className="text-xs text-gray-400">{newFiles.length} file(s) selected</span>
                      )}
                    </div>
                    {newFiles.length > 0 && (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {newFiles.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="bg-[#2a2a31] border border-gray-700 rounded p-2 text-white text-xs flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="truncate" title={f.name}>{f.name}</div>
                              <div className="text-[10px] text-gray-400">{(f.size/1024).toFixed(1)} KB</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-[10px]"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {/* Boutons en bas, sur toute la largeur */}
              <div className={`col-span-2 flex gap-4 mt-2 ${expanded ? 'justify-end' : ''}`}>
                {error && (
                  <div className="col-span-2 bg-red-500 text-white px-4 py-3 rounded-lg mb-4 animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || (error && error.includes('serveur ne répond pas'))}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded shadow disabled:opacity-60"
                  
                  
                >
                  {editMode ? 'Update' : 'Create'}
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded shadow disabled:opacity-60"
                  >
                    Delete Project
                  </button>
                )}
              </div>
              {/* Section Project Tasks */}
              <div className="col-span-2 bg-[#18181b] border border-gray-700 rounded-lg p-4 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Project Tasks</h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                      disabled={loading}
                    >
                      + Add Task
                    </button>
                  )}
                </div>
                
                {/* Formulaire d'ajout de tâche */}
                {showTaskForm && (
                  <TaskMiniForm
                    onAdd={handleAddTask}
                    onCancel={() => {
                      setShowTaskForm(false);
                      setEditingTaskIdx(null);
                    }}
                    initial={
                      editingTaskIdx !== null && formTasks[editingTaskIdx]
                        ? {
                            ...formTasks[editingTaskIdx],
                            user_ids: formTasks[editingTaskIdx].user_ids || [],
                            group_ids: formTasks[editingTaskIdx].group_ids || formTasks[editingTaskIdx].groups || [],
                            // Do not preload persisted files as "selected" files
                            files: []
                          }
                        : null
                    }
                    users={users}
                    isAdmin={isAdmin}
                  />
                )}
                
                {formTasks.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">No tasks for this project.</div>
                ) : (
                  <ul className="space-y-2">
                    {formTasks.map((task, idx) => (
                      <li key={idx} className="bg-[#232329] border border-gray-700 rounded-lg p-4 text-white">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          {/* Informations de la tâche */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white mb-2">{task.title}</div>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                Status: {task.status}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                Priority: {task.priority}
                              </span>
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                              </span>
                            </div>
                            {/* Affichage des assignés - uniquement les utilisateurs assignés directement */}
                            {(task.user_ids || []).length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-400 block mb-1">Users:</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1 border border-gray-700 rounded p-1 bg-[#1b1b22]">
                                  {(task.user_ids || []).map(userId => (
                                    <span key={userId} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                      {users.find(u => u.id === userId)?.email || `User not found`}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Affichage des groupes */}
                            {(task.groups || task.group_ids || []).length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-400 block mb-1">Groups:</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1 border border-gray-700 rounded p-1 bg-[#1b1b22]">
                                  {(task.groups || task.group_ids || []).map(groupId => {
                                    const group = groups.find(g => g.id === groupId || g.id === parseInt(groupId));
                                    return (
                                      <span key={groupId} className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                        {group ? group.name : `Group ${groupId}`}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Contrôles de progression et actions */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {/* Progression de la tâche */}
                            <div className="flex items-center gap-3">
                              <select
                                value={task.progress || 0}
                                onChange={async (e) => {
                                  const newProgress = Number(e.target.value);
                                  if (task.id) {
                                    // Conserver les assignations existantes lors de la mise à jour de la progression
                                    await updateTask(
                                      task.id,
                                      { ...task, progress: newProgress },
                                      task.user_ids || [],
                                      task.group_ids || [],
                                      session
                                    );
                                    // Rafraîchir la liste des tâches après update
                                    const tasks = await getTasksByProjectWithAssignees(form.id || form._id, session);
                                    setFormTasks(tasks);
                                  } else {
                                    // Pour les tâches non encore sauvegardées
                                    setFormTasks(tasks => tasks.map((t, i) => i === idx ? { ...t, progress: newProgress } : t));
                                  }
                                }}
                                className="px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white text-sm"
                                disabled={loading}
                              >
                                <option value={0}>0%</option>
                                <option value={25}>25%</option>
                                <option value={50}>50%</option>
                                <option value={75}>75%</option>
                                <option value={100}>100%</option>
                              </select>
                              <div className="flex flex-col min-w-[100px]">
                                <span className="text-sm text-gray-300 mb-1">Progress: {task.progress || 0}%</span>
                                <div className="w-full h-3 bg-gray-700 rounded-full">
                                  <div 
                                    className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300" 
                                    style={{ width: `${task.progress || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Boutons d'action - seulement pour les admins */}
                            {isAdmin && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTaskIdx(idx);
                                    setShowTaskForm(true);
                                  }}
                                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
                                  disabled={loading}
                                  title="Edit task"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                               
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task, idx)}
                                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
                                  disabled={loading}
                                  title="Delete task"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          {task.id && filesTaskOpenId === task.id && (
                            <div className="mt-3">
                              <FileManager ownerType="task" ownerId={task.id} />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Section des fichiers du projet pour les admins */}
              

              {/* Files Section */}
              
            </form>
          ) : (
            <div className="max-w-[800px] mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                {editMode ? 'Edit Project' : 'Create Project'}
              </h2>
              
              {/* Section des tâches pour les non-admin */}
              <div className="bg-[#18181b] border border-gray-700 rounded-lg p-4 mt-8">
                <h3 className="text-lg font-bold text-white mb-4">Your tasks in this project</h3>
                {formTasks.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">You have no tasks assigned in this project.</div>
                ) : (
                  <ul className="space-y-3">
                    {formTasks.map((task, idx) => (
                      <li key={idx} className="bg-[#232329] border border-gray-700 rounded-lg p-4 text-white">
                        <div className="flex flex-col gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-white mb-2">{task.title}</div>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                Status: {task.status}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                Priority: {task.priority}
                              </span>
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                              </span>
                            </div>
                            {task.description && (
                              <div className="text-sm text-gray-300 mt-2 p-2 bg-[#18181b] rounded border border-gray-600">
                                {task.description}
                              </div>
                            )}
                          </div>
                          
                          {/* Barre de progression pour les non-admin */}
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col flex-1">
                              <span className="text-sm text-gray-300 mb-1">Progress: {task.progress || 0}%</span>
                              <div className="w-full h-3 bg-gray-700 rounded-full">
                                <div 
                                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300" 
                                  style={{ width: `${task.progress || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Files Section (visible to all roles) */}
              {editMode && (form?.id || form?._id) && (
                <div className="mt-8">
                  <FileManager ownerType="project" ownerId={form.id || form._id} />
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
} 