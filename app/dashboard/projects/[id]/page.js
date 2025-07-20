'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProjects, getTasksByProject, createTask, updateTask, deleteTask, getTasksByProjectAndUser } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import TaskKanban from '../../../../components/TaskKanban';

const PRIORITY_COLORS = {
  'basse': 'bg-green-400 text-green-900',
  'moyenne': 'bg-yellow-400 text-yellow-900',
  'haute': 'bg-red-400 text-red-900',
};

const STATUS_COLORS = {
  'à faire': 'bg-gray-400 text-gray-900',
  'en cours': 'bg-blue-400 text-blue-900',
  'terminé': 'bg-green-400 text-green-900',
};

function TaskItem({ task, onEdit, onDelete, onToggleComplete }) {
  return (
    <div className="bg-[#232329] border border-gray-700 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={task.status === 'terminé'}
            onChange={() => onToggleComplete(task)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <h3 className={`font-semibold ${task.status === 'terminé' ? 'line-through text-gray-400' : 'text-white'}`}>
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[task.status]}`}>
            {task.status}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-300">
        <span>Deadline: {task.deadline || 'No deadline'}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onEdit(task)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function TaskForm({ task, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    status: task?.status || 'à faire',
    deadline: task?.deadline || '',
    priority: task?.priority || 'moyenne',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-[#18181b] border border-gray-600 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        {task ? 'Edit Task' : 'Add New Task'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 bg-[#232329] border border-gray-600 rounded text-white"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="px-3 py-2 bg-[#232329] border border-gray-600 rounded text-white"
          >
            <option value="à faire">À faire</option>
            <option value="en cours">En cours</option>
            <option value="terminé">Terminé</option>
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="px-3 py-2 bg-[#232329] border border-gray-600 rounded text-white"
          >
            <option value="basse">Basse</option>
            <option value="moyenne">Moyenne</option>
            <option value="haute">Haute</option>
          </select>
        </div>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="w-full px-3 py-2 bg-[#232329] border border-gray-600 rounded text-white"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Saving...' : (task ? 'Update' : 'Add')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Ajout du composant TaskModal
function TaskModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#18181b] border border-gray-700 rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 text-2xl"
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectsData, tasksData] = await Promise.all([
          getProjects(),
          isAdmin ? getTasksByProject(projectId) : getTasksByProjectAndUser(projectId, user?.id)
        ]);
        
        const currentProject = projectsData.find(p => (p.id || p._id) === projectId);
        if (!currentProject) {
          setError('Project not found');
          return;
        }
        
        setProject(currentProject);
        setTasks(tasksData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, isAdmin, user]);

  const handleCreateTask = async (taskData) => {
    setFormLoading(true);
    try {
      console.log('Tentative de création de tâche avec :', { ...taskData, project_id: projectId });
      const newTask = await createTask({ ...taskData, project_id: projectId });
      setTasks(prev => [newTask, ...prev]);
      setShowTaskForm(false);
    } catch (err) {
      console.error('Erreur lors de la création de la tâche :', err);
      alert('Erreur lors de la création de la tâche : ' + (err.message || err));
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTask = async (taskData) => {
    setFormLoading(true);
    try {
      const updatedTask = await updateTask(editingTask.id, taskData);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task.status === 'terminé' ? 'en cours' : 'terminé';
    
    try {
      const updatedTask = await updateTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (loading) return <div className="text-white text-center py-10">Loading project...</div>;
  if (error) return <div className="text-red-400 text-center py-10">{error}</div>;
  if (!project) return <div className="text-red-400 text-center py-10">Project not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* DEBUG: afficher project et tasks */}
      {/* <pre className="bg-black text-green-400 p-2 mb-4 rounded text-xs overflow-x-auto">
        {JSON.stringify({ project, tasks }, null, 2)}
      </pre> */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          ← Back to Projects
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">{project.title}</h1>
        <p className="text-gray-300 mb-4">{project.description}</p>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>Status: {project.status}</span>
          <span>Start: {project.start}</span>
          <span>End: {project.end}</span>
        </div>
      </div>

      {/* SECTION TÂCHES MODERNE */}
      <section className="mb-10 bg-[#18181b] border border-gray-700 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#2563eb"/><path d="M12 7v10m5-5H7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            Project Tasks
          </h2>
          <button
            onClick={() => setShowTaskForm(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold shadow transition-all duration-150"
          >
            + Add Task
          </button>
        </div>

        {/* MODALE POUR LE FORMULAIRE DE TÂCHE */}
        <TaskModal open={showTaskForm} onClose={() => setShowTaskForm(false)}>
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowTaskForm(false)}
            loading={formLoading}
          />
        </TaskModal>

        {/* MODALE POUR L'ÉDITION DE TÂCHE */}
        <TaskModal open={!!editingTask} onClose={() => setEditingTask(null)}>
          {editingTask && (
            <TaskForm
              task={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
              loading={formLoading}
            />
          )}
        </TaskModal>

        {/* Kanban pour les tâches */}
        <TaskKanban
          tasks={tasks}
          onNewTask={() => setShowTaskForm(true)}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
          onStatusChange={async (task, newStatus) => {
            try {
              const updatedTask = await updateTask(task.id, { status: newStatus });
              setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
            } catch (err) {
              console.error('Erreur lors du changement de statut de la tâche', err);
            }
          }}
        />
      </section>
    </div>
  );
} 