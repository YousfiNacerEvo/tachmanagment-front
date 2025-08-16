"use client";
import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getProjects,
  createTask,
  updateTask,
  deleteTask,
  getUsers,
  getAllUserTasks,
  getStandaloneTasksWithAssignees,
  getProjectTasksWithAssignees,
  getGroupsByTask
} from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import StandaloneTaskForm from "../../../components/StandaloneTaskForm";
import SearchAndFilter from "../../../components/SearchAndFilter";
import { useUser } from "../../../hooks/useUser";
import { toast } from 'react-hot-toast';
import { useAuth } from "../../../context/AuthContext";
const STATUS_LABELS = {
  "à faire": "To do",
  "en cours": "In progress",
  "terminé": "Done",
  "pending": "To do",
  "in_progress": "In progress",
  "done": "Done",
  "to do": "To Do",
  "in progress": "In Progress",
};

const PRIORITY_COLORS = {
  basse: "bg-green-400 text-green-900",
  moyenne: "bg-yellow-400 text-yellow-900",
  haute: "bg-red-400 text-red-900",
  low: "bg-green-400 text-green-900",
  medium: "bg-yellow-400 text-yellow-900",
  high: "bg-red-400 text-red-900",
};

function TasksContent() {
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { isAdmin, isMember, loading: authLoading, user } = useUser();
  const [standaloneTasks, setStandaloneTasks] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStandaloneForm, setShowStandaloneForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTaskData, setEditTaskData] = useState(null);
  const [users, setUsers] = useState([]);

  // États pour les filtres et la recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    project: ''
  });

  const fetchData = useCallback(async () => {
    if (!session) return; // Vérifier que session existe avant d'appeler l'API

    setLoading(true);
    setError(null);
    try {
      let standaloneData, projectData;

      if (isAdmin) {
        // Les admins voient toutes les tâches
        [standaloneData, projectData] = await Promise.all([
          getStandaloneTasksWithAssignees(session),
          getProjectTasksWithAssignees(session)
        ]);
      } else {
        // Les membres ne voient que leurs tâches assignées
        const userTasks = await getAllUserTasks(user.id, session);
        console.log('User tasks for member:', userTasks);

        // Séparer les tâches standalone des tâches de projet
        standaloneData = userTasks.filter(task => !task.project_id);
        projectData = userTasks.filter(task => task.project_id);
      }

      const [projectsData, usersData] = await Promise.all([
        getProjects(session),
        getUsers(session)
      ]);

      console.log('Fetched standalone tasks:', standaloneData);
      console.log('Fetched project tasks:', projectData);
      console.log('Fetched users:', usersData);

      setStandaloneTasks(standaloneData);
      setProjectTasks(projectData);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, session]);

  useEffect(() => {
    if (authLoading || !session) return; // Vérifier que session existe
    if (isAdmin || (isMember && user && user.id)) {
      fetchData();
    }
  }, [fetchData, authLoading, isAdmin, isMember, user, session]);

  // Open edit modal if taskId is provided in URL (from calendar)
  useEffect(() => {
    const tid = searchParams?.get('taskId');
    if (!tid) return;
    // try to find task in already loaded data after fetch
    const all = [...standaloneTasks, ...projectTasks];
    const found = all.find(t => String(t.id) === String(tid));
    if (found) {
      handleEditTask(found);
    }
  }, [searchParams, standaloneTasks, projectTasks]);

  // Fonction pour filtrer et rechercher les tâches - DOIT être avant les useMemo
  const filterTasks = (tasks) => {
    return tasks.filter(task => {
      // Filtre par recherche (titre et description)
      const searchMatch = !searchTerm ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtre par statut (gère les différentes variantes)
      const normalizeStatus = (status) => {
        if (status === 'in_progress') return 'in progress';
        return status;
      };

      const taskStatus = normalizeStatus(task.status);
      const filterStatus = normalizeStatus(filters.status);
      const statusMatch = !filters.status || taskStatus === filterStatus;

      // Filtre par priorité
      const priorityMatch = !filters.priority || task.priority === filters.priority;

      // Filtre par projet (pour les tâches de projet)
      const projectMatch = !filters.project || task.project_id === filters.project;

      return searchMatch && statusMatch && priorityMatch && projectMatch;
    });
  };

  // Tâches filtrées - DOIT être avant le return conditionnel
  const filteredStandaloneTasks = useMemo(() => {
    const filtered = filterTasks(standaloneTasks);
    return filtered.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      return 0;
    });
  }, [standaloneTasks, searchTerm, filters]);

  const filteredProjectTasks = useMemo(() => {
    const filtered = filterTasks(projectTasks);
    return filtered.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      return 0;
    });
  }, [projectTasks, searchTerm, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Maintenant on peut faire le return conditionnel APRÈS tous les hooks
  if (!session) {
    return <div className="flex items-center justify-center min-h-screen">Chargement de la session...</div>;
  }

  const handleCreateStandaloneTask = async (taskData) => {
    setFormLoading(true);
    try {
      // Handle group assignments first
      const { group_ids, user_ids, id, ...taskWithoutAssignments } = taskData; // Exclure l'ID lors de la création

      // Create the task with assignments
      const taskToSend = { ...taskWithoutAssignments };
      if (!taskToSend.deadline) {
        delete taskToSend.deadline;
      }
      const newTask = await createTask(taskToSend, user_ids, group_ids, session);//user_ids || [], group_ids || []
      console.log('DEBcG: Objet newTask après création:', newTask);
      console.log('DEBUG: newTask.id après création:', newTask.id, 'type:', typeof newTask.id);

      // Vérifier que la tâche a été créée avec un ID
      if (!newTask || !newTask.id) {
        throw new Error('Failed to create task: No ID returned');
      }

      // Upload any selected files during creation
      if (Array.isArray(taskData.files) && taskData.files.length > 0) {
        const uploaded = [];
        for (const file of taskData.files) {
          const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
          const path = `tasks/${newTask.id}/${filename}`;
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
        // Persist to DB through our API
        const { addTaskFiles } = await import("../../../lib/api");
        await addTaskFiles(newTask.id, uploaded, session);
      }

      console.log('Task created successfully:', newTask);

      // Ajouter la nouvelle tâche à l'état local
      const taskWithAssignments = {
        ...newTask,
        assignees: user_ids || [],
        groups: group_ids || []
      };

      setStandaloneTasks(prev => [taskWithAssignments, ...prev]);
      setShowStandaloneForm(false);
      toast.success('Standalone task created successfully!');
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error(err.message || 'Failed to create task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTask = async (taskData) => {
    setFormLoading(true);
    try {
      const { group_ids, user_ids, ...taskWithoutAssignments } = taskData;

      // Update the task with assignments
      const updatedTask = await updateTask(taskData.id, taskWithoutAssignments, user_ids || [], group_ids || [], session);

      console.log('Task updated successfully:', updatedTask);

      // Rafraîchir les données à jour depuis l'API pour éviter tout décalage
      if (isAdmin) {
        const [standaloneData, projectData] = await Promise.all([
          getStandaloneTasksWithAssignees(session),
          getProjectTasksWithAssignees(session)
        ]);
        setStandaloneTasks(standaloneData);
        setProjectTasks(projectData);
      } else if (user && user.id) {
        const userTasks = await getAllUserTasks(user.id, session);
        setStandaloneTasks(userTasks.filter(t => !t.project_id));
        setProjectTasks(userTasks.filter(t => t.project_id));
      }

      setShowStandaloneForm(false);
      setEditingTask(null);
      toast.success('Task updated successfully!');
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error(err.message || 'Failed to update task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm('Are you sure you want to delete this task? Its files will be deleted.')) return;

    try {
      await deleteTask(task.id, session);

      // Supprimer de la bonne liste
      if (task.project_id) {
        setProjectTasks(prev => prev.filter(t => t.id !== task.id));
      } else {
        setStandaloneTasks(prev => prev.filter(t => t.id !== task.id));
      }

      toast.success('Task deleted successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  function getProjectName(projectId) {
    const project = projects.find(
      (p) => p.id === projectId || p._id === projectId
    );
    return project ? project.title : "-";
  }

  function TaskTable({ tasks, title, emptyMessage, showProject = false, users = [] }) {
    const [taskGroups, setTaskGroups] = useState({});
    const [loadingGroups, setLoadingGroups] = useState({});

    // Load groups and users for tasks
    const loadTaskGroupsAndUsers = async (taskId) => {
      if (taskGroups[taskId] || loadingGroups[taskId]) return;

      setLoadingGroups(prev => ({ ...prev, [taskId]: true }));
      try {
        const groups = await getGroupsByTask(taskId, session);
        setTaskGroups(prev => ({ ...prev, [taskId]: groups }));
      } catch (err) {
        console.error('Failed to load task groups:', err);
      } finally {
        setLoadingGroups(prev => ({ ...prev, [taskId]: false }));
      }
    };
    function formatDate(dateString) {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {title} ({tasks.length})
        </h2>
        {tasks.length === 0 ? (
          <div className="text-gray-500 text-center py-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm text-gray-900">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3">Title</th>
                  {showProject && <th className="px-4 py-3">Project</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assignees</th>
                  <th className="px-4 py-3">Groups</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{task.title}</div>
                    </td>
                    {showProject && (
                      <td className="px-4 py-3">{getProjectName(task.project_id)}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.deadline ? (
                        <span>{formatDate(task.deadline)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${PRIORITY_COLORS[task.priority] || "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(() => {
                        // N'afficher que les utilisateurs explicitement assignés
                        const directAssignees = task.user_ids || [];
                        console.log(`Task ${task.id} - direct user_ids:`, directAssignees, 'users:', users);

                        return directAssignees && directAssignees.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {directAssignees.map(userId => {
                              const user = users.find(u => u.id === userId);
                              console.log(`Looking for user ${userId}, found:`, user);
                              return user ? (
                                <span key={userId} className="text-xs bg-blue-600 text-white px-1 rounded">
                                  {user.email}
                                </span>
                              ) : (
                                <span key={userId} className="text-xs bg-red-600 text-white px-1 rounded">
                                  User {userId} not found
                                </span>
                              );
                            })}
                          </div>
                        ) : '-';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <button
                        onClick={() => loadTaskGroupsAndUsers(task.id)}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        {loadingGroups[task.id] ? 'Loading...' :
                          taskGroups[task.id] ? `${taskGroups[task.id].length} groups` : 'View groups'}
                      </button>
                      {taskGroups[task.id] && taskGroups[task.id].length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {taskGroups[task.id].map(group => (
                            <span key={group.group_id} className="text-xs bg-purple-600 text-white px-1 rounded">
                              {group.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                          disabled={editLoading}
                        >
                          {editLoading ? 'Loading...' : 'Edit'}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Nouvelle fonction pour précharger les assignés avant d'ouvrir le modal
  const handleEditTask = async (task) => {
    setEditLoading(true);
    try {
      // Utiliser les assignations de la tâche si disponibles, sinon charger depuis l'API
      let user_ids = task.assignees || task.user_ids || [];
      let group_ids = task.groups || task.group_ids || [];

      // Si les groupes ne sont pas disponibles dans la tâche, les charger depuis l'API
      if (!group_ids || group_ids.length === 0) {
        const groups = await getGroupsByTask(task.id, session);
        group_ids = groups.map(g => g.group_id);
      }

      console.log('Task data for editing:', { task, user_ids, group_ids });

      setEditTaskData({
        ...task,
        user_ids,
        group_ids
      });
      setEditingTask({
        ...task,
        user_ids,
        group_ids
      });
    } catch (err) {
      console.error('Error loading task assignees:', err);
      toast.error('Failed to load task assignees');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">
          {isAdmin ? 'All Tasks' : 'My Assigned Tasks'}
        </h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowStandaloneForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition-colors"
            >
              + Create Standalone Task
            </button>
          )}
          <button
            onClick={async () => {
              console.log('=== DEBUG: Testing assignments ===');
              console.log('Standalone tasks:', standaloneTasks);
              console.log('Project tasks:', projectTasks);
              console.log('Users:', users);

              // Test direct de l'API
              try {
                const testData = await getStandaloneTasksWithAssignees(session);
                console.log('Direct API test result:', testData);
              } catch (err) {
                console.error('Direct API test error:', err);
              }
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded transition-colors"
          >
            Debug Assignments
          </button>
        </div>
      </div>

      {/* Composant de recherche et filtres */}
      <SearchAndFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
        showStatusFilter={true}
        showPriorityFilter={true}
        showProjectFilter={true}
        showProgressFilter={false}
        isTaskContext={true}
        projects={projects}
      />

      {loading ? (
        <div className="text-gray-300 text-center py-10">Loading tasks...</div>
      ) : error ? (
        <div className="text-red-400 text-center py-10">{error}</div>
      ) : (
        <>
          {/* Tâches indépendantes */}
          <TaskTable
            tasks={filteredStandaloneTasks}
            title={isAdmin ? "Standalone Tasks" : "My Standalone Tasks"}
            emptyMessage={isAdmin ? "No standalone tasks found." : "No standalone tasks assigned to you."}
            showProject={false}
            users={users}
          />

          {/* Tâches de projet */}
          <TaskTable
            tasks={filteredProjectTasks}
            title={isAdmin ? "Project Tasks" : "My Project Tasks"}
            emptyMessage={isAdmin ? "No project tasks found." : "No project tasks assigned to you."}
            showProject={true}
            users={users}
          />
        </>
      )}

      {/* Modal pour créer une tâche indépendante */}
      {showStandaloneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#232329] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <StandaloneTaskForm
              onSubmit={handleCreateStandaloneTask}
              onCancel={() => setShowStandaloneForm(false)}
              loading={formLoading}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}

      {/* Modal pour éditer une tâche */}
      {editTaskData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#232329] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <StandaloneTaskForm
              task={editTaskData}
              onSubmit={handleUpdateTask}
              onCancel={() => { setEditTaskData(null); setEditingTask(null); }}
              loading={formLoading}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading tasks...</div>}>
      <TasksContent />
    </Suspense>
  );
}