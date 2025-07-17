'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { getProjects, createProject, updateProject, deleteProject, createTask } from '../../../lib/api';
import ProjectDrawer from '../../../components/ProjectDrawer';
import ProjectHeaderTabs from '../../../components/ProjectHeaderTabs';
import ProjectTable from '../../../components/ProjectTable';
import ProjectKanban from '../../../components/ProjectKanban';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-400 text-yellow-900' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-400 text-blue-900' },
  { value: 'done', label: 'Done', color: 'bg-green-400 text-green-900' },
];

function StatusBadge({ status }) {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  if (!option) return null;
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${option.color}`}>{option.label}</span>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'pending',
    start: '',
    end: '',
  });
  const [formTasks, setFormTasks] = useState([]); // <-- gestion des tâches à la création
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    getProjects()
      .then(data => {
        setProjects(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Failed to load projects');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.description.trim() || !form.start || !form.end) {
      setFormError('All fields are required.');
      return false;
    }
    if (form.end < form.start) {
      setFormError('End date cannot be before start date.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleCreate = async e => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      // Création du projet
      const createdProject = await createProject(form);
      // Création des tâches associées si besoin
      if (formTasks.length > 0) {
        await Promise.all(formTasks.map(async (task) => {
          try {
            // On retire la propriété 'progress' si elle existe
            const { progress, ...taskWithoutProgress } = task;
            await createTask({ ...taskWithoutProgress, project_id: createdProject.id || createdProject._id });
          } catch (err) {
            console.error('Erreur lors de la création d\'une tâche associée :', err);
            alert('Erreur lors de la création d\'une tâche associée : ' + (err.message || err));
          }
        }));
      }
      setForm({ title: '', description: '', status: 'pending', start: '', end: '' });
      setFormTasks([]);
      setDrawerOpen(false);
      setFormError(null);
      fetchProjects();
    } catch (err) {
      setFormError(err.message || 'Failed to create project');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditMode(true);
    setEditId(project.id || project._id);
    setForm({
      id: project.id || project._id, // Ajout de l'ID pour le drawer
      title: project.title,
      description: project.description,
      status: project.status,
      start: project.start,
      end: project.end,
    });
    setDrawerOpen(true);
    setFormError(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      await updateProject(editId, form);
      setDrawerOpen(false);
      setEditMode(false);
      setEditId(null);
      setForm({ title: '', description: '', status: 'pending', start: '', end: '' });
      setFormError(null);
      fetchProjects();
    } catch (err) {
      setFormError(err.message || 'Failed to update project');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    setFormLoading(true);
    try {
      await deleteProject(editId);
      setDrawerOpen(false);
      setEditMode(false);
      setEditId(null);
      setForm({ title: '', description: '', status: 'pending', start: '', end: '' });
      setFormError(null);
      fetchProjects();
    } catch (err) {
      setFormError(err.message || 'Failed to delete project');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (project, newStatus) => {
    try {
      // Mise à jour optimiste
      setProjects(prev => prev.map(p => 
        (p.id || p._id) === (project.id || project._id) 
          ? { ...p, status: newStatus }
          : p
      ));
      
      // Appel API
      await updateProject(project.id || project._id, { status: newStatus });
    } catch (err) {
      // En cas d'erreur, recharger les projets
      console.error('Failed to update project status:', err);
      fetchProjects();
    }
  };

  // Sort by start date (bonus)
  const sortedProjects = [...projects].sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Projects</h1>
        <button
          onClick={() => {
            setDrawerOpen(true);
            setEditMode(false);
            setEditId(null);
            setForm({ title: '', description: '', status: 'pending', start: '', end: '' });
            setFormTasks([]);
            setFormError(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded shadow transition-colors"
        >
          + Create Project
        </button>
      </div>
      <ProjectHeaderTabs viewMode={viewMode} setViewMode={setViewMode} />
      {loading ? (
        <div className="text-white text-center py-10">Loading projects...</div>
      ) : error ? (
        <div className="text-red-400 text-center py-10">{error}</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-400 text-center py-10">No projects found.</div>
      ) : viewMode === 'table' ? (
        <ProjectTable projects={sortedProjects} onEdit={handleEdit} />
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Projects Kanban</h2>
          </div>
          <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
            <ProjectKanban 
              projects={sortedProjects} 
              onNewProject={null}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      )}
      <ProjectDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditMode(false);
          setEditId(null);
          setForm({ title: '', description: '', status: 'pending', start: '', end: '' });
          setFormTasks([]);
          setFormError(null);
        }}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        form={form}
        onChange={handleChange}
        loading={formLoading}
        error={formError}
        editMode={editMode}
        formTasks={formTasks}
        setFormTasks={setFormTasks}
      />
    </div>
  );
} 