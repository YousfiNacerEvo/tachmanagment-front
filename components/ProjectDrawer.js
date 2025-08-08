'use client';
import React, { useEffect, useState } from 'react';
import { getTasksByProject, getTasksByProjectWithAssignees, createTask, updateTask, deleteTask, updateProject } from '../lib/api';
import { getUsers } from '../lib/api';
import { toast } from 'react-hot-toast';
import ModernAssigneeSelector from './ModernAssigneeSelector';
import { getAllGroups } from '../lib/api';
import { useAuth } from '../context/AuthContext';



function TaskMiniForm({ onAdd, onCancel, initial, users = [], isAdmin = false }) {
  
  const [form, setForm] = useState(initial || {
    title: '',
    description: '',
    status: 'to do',
    priority: 'medium',
    deadline: '',
    user_ids: [],
    group_ids: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd(form);
  };

  return (
    <div className="bg-[#232329] border border-gray-700 rounded-lg p-4 mb-4">
      <h4 className="text-white font-semibold mb-3">
        {initial ? 'Edit Task' : 'Add New Task'}
      </h4>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="flex-1 px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white placeholder-gray-400"
            required
          />
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
            className="px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white"
          >
            <option value="to do">To do</option>
            <option value="in progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value })}
            className="px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <input
            type="date"
            value={form.deadline}
            onChange={e => setForm({ ...form, deadline: e.target.value })}
            className="px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white"
          />
        </div>
        
        {/* Assignation moderne - seulement pour les admins */}
        {isAdmin && (
          <ModernAssigneeSelector
            assignedUsers={form.user_ids || []}
            assignedGroups={form.group_ids || []}
            onChangeUsers={user_ids => setForm({ ...form, user_ids })}
            onChangeGroups={group_ids => setForm({ ...form, group_ids })}
            disabled={false}
            label="Assign to"
          />
        )}
        
        <textarea
          placeholder="Task description (optional)"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded bg-[#18181b] border border-gray-600 text-white placeholder-gray-400 resize-none"
        />
        
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => {
              if (!form.title.trim()) return;
              onAdd(form);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
          >
            {initial ? 'Update Task' : 'Add Task'}
          </button>
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

  // Ajout ou édition d'une tâche en mode édition : envoie à l'API puis recharge la liste
  const handleAddTask = async (task) => {
    console.log('handleAddTask called with task:', task);
    if (editMode && form && (form.id || form._id)) {
      try {
        // Extraire user_ids et group_ids de l'objet task
        const { user_ids, group_ids, ...taskData } = task;
        console.log('Extracted user_ids:', user_ids, 'group_ids:', group_ids);
        console.log('Task data to send:', taskData);
        
        if (task.id) {
          console.log('Updating existing task:', task.id);
          await updateTask(task.id, { ...taskData, project_id: form.id || form._id }, user_ids, group_ids, session);
          toast.success('Task updated successfully!');
          
          // Mettre à jour directement l'état local
          setFormTasks(prev => prev.map(t => 
            t.id === task.id 
              ? { 
                  ...t, 
                  ...taskData,
                  user_ids: user_ids || [],
                  group_ids: group_ids || [],
                  // Compatibilité avec anciens alias
                  assignees: user_ids || [],
                  groups: group_ids || []
                }
              : t
          ));
        } else {
          console.log('Creating new task with project_id:', form.id || form._id);
          const newTask = await createTask({ ...taskData, project_id: form.id || form._id },user_ids, group_ids, session);//user_ids, group_ids,
          toast.success('Task created successfully!');
          
          // Ajouter la nouvelle tâche à l'état local
          const taskWithAssignments = {
            ...newTask,
            user_ids: user_ids || [],
            group_ids: group_ids || [],
            assignees: user_ids || [],
            groups: group_ids || []
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
        ${expanded ? 'left-[16rem] w-auto' : 'left-auto w-[600px]'}
        flex flex-col`}
        style={{ minWidth: 400 }}
      >
        {/* Boutons overlay toujours visibles */}
        {open && (
          <div
            className="fixed z-50"
            style={{ top: 32, right: expanded ? 64 : 32 }}
          >
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(e => !e)}
                className="bg-gray-200 rounded-full p-2 text-gray-700 hover:text-blue-600 text-2xl"
                aria-label={expanded ? 'Reduce' : 'Expand'}
                disabled={loading}
              >
                {expanded ? '🗕' : '🗖'}
              </button>
              <button
                onClick={onClose}
                className="bg-gray-200 rounded-full p-2 text-gray-700 hover:text-blue-600 text-2xl"
                aria-label="Close"
                disabled={loading}
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="p-8 pt-12 flex-1 flex flex-col overflow-y-auto max-h-full relative">
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
              onSubmit={editMode ? onUpdate : onSubmit}
              className={`gap-8 w-full ${expanded ? 'grid grid-cols-2' : 'flex flex-col max-w-[800px] mx-auto'}`}
            >
              {/* Colonne 1 */}
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white col-span-2">
                  {editMode ? 'Edit Project' : 'Create Project'}
                </h2>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="Title"
                  required
                  className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={loading}
                />
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  placeholder="Description"
                  required
                  className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2}
                  disabled={loading}
                />
                {/* Progression du projet */}
                <label className="block text-sm font-medium text-white mb-1">Project Progress</label>
                <div className="flex items-center gap-4 mb-2">
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
              {/* Colonne 2 */}
              <div className="flex flex-col gap-4">
                {/* Assignation moderne utilisateurs & groupes */}
                <ModernAssigneeSelector
                  assignedUsers={form.user_ids || []}
                  assignedGroups={form.group_ids || []}
                  onChangeUsers={user_ids => onChange({ target: { name: 'user_ids', value: user_ids } })}
                  onChangeGroups={group_ids => onChange({ target: { name: 'group_ids', value: group_ids } })}
                  disabled={loading}
                  label="Assign to"
                />
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className="w-full px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="start"
                    value={form.start}
                    onChange={onChange}
                    className="w-1/2 px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
                  />
                  <input
                    type="date"
                    name="end"
                    value={form.end}
                    onChange={onChange}
                    className="w-1/2 px-3 py-2 rounded border border-gray-600 bg-[#18181b] text-white"
                  />
                </div>
              </div>
              {/* Boutons en bas, sur toute la largeur */}
              <div className={`col-span-2 flex gap-4 mt-6 ${expanded ? 'justify-end' : ''}`}>
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
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-xs text-gray-400">Users:</span>
                                {(task.user_ids || []).map(userId => (
                                  <span key={userId} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                    {users.find(u => u.id === userId)?.email || `User not found`}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Affichage des groupes */}
                            {(task.groups || task.group_ids || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-xs text-gray-400">Groups:</span>
                                {(task.groups || task.group_ids || []).map(groupId => {
                                  const group = groups.find(g => g.id === groupId || g.id === parseInt(groupId));
                                  return (
                                    <span key={groupId} className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                      {group ? group.name : `Group ${groupId}`}
                                    </span>
                                  );
                                })}
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
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
            </div>
          )}
        </div>
      </aside>
    </div>
  );
} 