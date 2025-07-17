'use client';
import React, { useEffect, useState } from 'react';
import { getTasksByProject, createTask, updateTask, deleteTask } from '../lib/api';
import { toast } from 'react-hot-toast';

function TaskMiniForm({ onAdd, onCancel, initial }) {
  const [form, setForm] = useState(initial || {
    title: '',
    status: 'to do',
    deadline: '',
    priority: 'medium',
    // progress removed
  });
  return (
    <div className="flex flex-col gap-2 bg-[#18181b] border border-gray-700 rounded-lg p-3 mb-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-[#232329] border border-gray-600 text-white"
          required
        />
        <select
          value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}
          className="px-2 py-1 rounded bg-[#232329] border border-gray-600 text-white max-w-[120px] min-w-0"
        >
          <option value="to do">To do</option>
          <option value="in progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <select
          value={form.priority}
          onChange={e => setForm({ ...form, priority: e.target.value })}
          className="px-2 py-1 rounded bg-[#232329] border border-gray-600 text-white max-w-[110px] min-w-0"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          type="date"
          value={form.deadline}
          onChange={e => setForm({ ...form, deadline: e.target.value })}
          className="px-2 py-1 rounded bg-[#232329] border border-gray-600 text-white min-w-[110px] max-w-[140px]"
        />
      </div>
      <div className="flex gap-2 mt-1">
        <button type="button" onClick={() => onAdd(form)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">{initial ? 'Edit' : 'Add'}</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded">Cancel</button>
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
}) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Charger les tâches du projet lors de l'édition
  useEffect(() => {
    console.log('[ProjectDrawer] open:', open, 'editMode:', editMode, 'form:', form);
    if (editMode && open && form && (form.id || form._id)) {
      const projectId = form.id || form._id;
      console.log('[ProjectDrawer] Chargement des tâches pour le projet :', projectId);
      getTasksByProject(projectId)
        .then(tasks => {
          console.log('[ProjectDrawer] Tâches récupérées :', tasks);
          setFormTasks(tasks);
        })
        .catch((err) => {
          console.error('[ProjectDrawer] Erreur lors du chargement des tâches :', err);
          setFormTasks([]);
        });
    } else if (editMode && open) {
      console.warn('[ProjectDrawer] Pas d\'ID projet pour charger les tâches. form:', form);
      setFormTasks([]);
    }
  }, [editMode, open, form, setFormTasks]);

  // Fermer si on clique sur le fond
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);

  // Ajout ou édition d'une tâche en mode édition : envoie à l'API puis recharge la liste
  const handleAddTask = async (task) => {
    if (editMode && form && (form.id || form._id)) {
      try {
        const { progress, ...taskWithoutProgress } = task;
        if (task.id) {
          await updateTask(task.id, { ...taskWithoutProgress, project_id: form.id || form._id });
          toast.success('Task updated successfully!');
        } else {
          await createTask({ ...taskWithoutProgress, project_id: form.id || form._id });
          toast.success('Task created successfully!');
        }
        const tasks = await getTasksByProject(form.id || form._id);
        setFormTasks(tasks);
      } catch (err) {
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
        await deleteTask(task.id);
        const tasks = await getTasksByProject(form.id || form._id);
        setFormTasks(tasks);
        toast.success('Task deleted successfully!');
      } catch (err) {
        toast.error('Error while deleting the task: ' + (err.message || err));
      }
    } else {
      setFormTasks(tasks => tasks.filter((_, i) => i !== idx));
    }
  };

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
        className={`relative ml-auto h-full bg-white dark:bg-[#232329] shadow-xl w-full max-w-[450px] flex flex-col transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ minWidth: 320 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          aria-label="Close"
          disabled={loading}
        >
          ×
        </button>
        <div className="p-8 pt-12 flex-1 flex flex-col overflow-y-auto max-h-full">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            {editMode ? 'Edit Project' : 'Create Project'}
          </h2>
          <form onSubmit={editMode ? onUpdate : onSubmit} className="flex flex-col gap-4 flex-1">
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="Title"
              required
              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#18181b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={loading}
            />
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              placeholder="Description"
              required
              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#18181b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows={2}
              disabled={loading}
            />
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#18181b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={loading}
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
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#18181b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1"
                required
                disabled={loading}
              />
              <input
                type="date"
                name="end"
                value={form.end}
                onChange={onChange}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#18181b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1"
                required
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-500 text-center text-sm">{error}</div>}
            <div className="flex-1"></div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded shadow mt-2 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update' : 'Create')}
            </button>
            {editMode && (
              <button
                type="button"
                onClick={onDelete}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded shadow disabled:opacity-60"
                disabled={loading}
              >
                Delete Project
              </button>
            )}
            {/* TASKS SECTION */}
            <div className="bg-[#18181b] border border-gray-700 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">Project tasks</span>
                <button type="button" onClick={() => { setShowTaskForm(true); setEditingTaskIdx(null); }} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">+ Add task</button>
              </div>
              {showTaskForm && (
                <TaskMiniForm
                  onAdd={handleAddTask}
                  onCancel={() => { setShowTaskForm(false); setEditingTaskIdx(null); }}
                  initial={editingTaskIdx !== null ? formTasks[editingTaskIdx] : undefined}
                />
              )}
              {formTasks.length === 0 ? (
                <div className="text-gray-400 text-xs text-center py-2">
                  {editMode ? (
                    (form && (form.id || form._id))
                      ? 'Aucune tâche trouvée pour ce projet.'
                      : 'Impossible de charger les tâches : ID projet manquant.'
                  ) : 'No tasks added'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {formTasks.map((task, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-[#232329] border border-gray-700 rounded px-3 py-2">
                      <div>
                        <span className="text-white font-medium">{task.title}</span>
                        <span className={`ml-2 text-xs px-2 py-1 rounded font-semibold ${task.priority === 'high' ? 'bg-red-400 text-red-900' : task.priority === 'medium' ? 'bg-yellow-400 text-yellow-900' : 'bg-green-400 text-green-900'}`}>{task.priority}</span>
                        <span className="ml-2 text-xs text-gray-400">{task.status}</span>
                        <span className="ml-2 text-xs text-gray-400">{task.deadline}</span>
                        <span className="ml-2 text-xs text-gray-400">{task.progress}%</span>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { setEditingTaskIdx(idx); setShowTaskForm(true); }} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">Edit</button>
                        <button type="button" onClick={() => handleDeleteTask(task, idx)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* ...end tasks section... */}
          </form>
        </div>
      </aside>
    </div>
  );
} 