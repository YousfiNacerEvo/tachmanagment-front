'use client';
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { getProjects, createProject, updateProject, deleteProject, createTask, getProjectsByUser, assignGroupToProject, unassignGroupFromProject, getGroupsByProject, getGroupMembers, addProjectFiles, notifyProjectCreated, addTaskFiles, updateOverdueProjects } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import ProjectDrawer from '../../../components/ProjectDrawer';
import ProjectHeaderTabs from '../../../components/ProjectHeaderTabs';
import ProjectTable from '../../../components/ProjectTable';
import ProjectKanban from '../../../components/ProjectKanban';
import SearchAndFilter from '../../../components/SearchAndFilter';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-400 text-yellow-900' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-400 text-blue-900' },
  { value: 'done', label: 'Done', color: 'bg-green-400 text-green-900' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-400 text-red-900' },
];

function StatusBadge({ status }) {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  if (!option) return null;
  return (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${option.color}`}>
          {project.displayStatus === 'overdue' ? 'Overdue' : option.label}
        </span>
  );
}

// Fonction pour vérifier si un projet est en retard
function checkProjectOverdue(project) {
  if (!project.end || project.status === 'done') return false;
  const endDate = new Date(project.end);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  return endDate < today;
}

// Fonction pour obtenir le statut réel d'un projet (incluant overdue)
function getProjectRealStatus(project) {
  if (project.status === 'done') return 'done';
  if (checkProjectOverdue(project)) return 'overdue';
  return project.status;
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    user_ids: [],
    group_ids: [],
  });
  const [formTasks, setFormTasks] = useState([]); // <-- gestion des tâches à la création
  const [formFiles, setFormFiles] = useState([]); // Files selected during creation (File objects)
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const { isAdmin, isMember, loading: authLoading, user, session } = useAuth();

  // États pour les filtres et la recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    progress: ''
  });

  const [timeoutError, setTimeoutError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    const fetch = isAdmin
      ? () => getProjects(session)
      : () => getProjectsByUser(user?.id, session);
    fetch()
      .then(data => {
        console.log('[fetchProjects] data:', data);
        // Appliquer le statut overdue automatiquement
        const projectsWithOverdue = data.map(project => ({
          ...project,
          displayStatus: getProjectRealStatus(project)
        }));
        setProjects(projectsWithOverdue);
        
        // Compter les projets en retard
        const overdueProjects = projectsWithOverdue.filter(project => project.displayStatus === 'overdue');
        setOverdueCount(overdueProjects.length);
        
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Failed to load projects');
        console.error('[fetchProjects] error:', err);
      })
      .finally(() => setLoading(false));
  }, [isAdmin, user, session]);

  useEffect(() => {
    // Redirect only when we are sure user is NOT admin
    if (!authLoading && isMember) {
      router.replace('/dashboard/my-work');
      return;
    }
    // Fonction de nettoyage pour éviter les effets de bord
    let isMounted = true;

    const loadProjects = async () => {
      if (!isMounted) return;
      if (authLoading) return;
      if (isAdmin || (isMember && user && user.id)) {
        setIsRefreshing(true);
        try {
          await fetchProjects();
        } finally {
          if (isMounted) {
            setIsRefreshing(false);
          }
        }
      }
    };

    // Charger les projets au montage
    loadProjects();

    // Recharger les projets lors du retour sur la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        console.log('Onglet redevenu visible, rechargement des projets...');
        // Ne pas recharger si une création est en cours
        if (!formLoading) {
          console.log('✅ Rechargement autorisé - pas de création en cours');
          // Délai pour éviter les conflits avec les requêtes en cours
          setTimeout(() => {
            if (isMounted && !formLoading) {
              loadProjects();
            }
          }, 1000);
        } else {
          console.log('⚠️ Rechargement ignoré car création en cours (formLoading: true)');
        }
      }
    };

    // Ajouter l'écouteur d'événement
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProjects, authLoading, isAdmin, isMember, user, formLoading]);

  // Ouvrir automatiquement le drawer pour un projet donné via ?projectId= ... (depuis le calendrier)
  useEffect(() => {
    const projectId = searchParams?.get('projectId');
    if (!projectId || projects.length === 0) return;
    const proj = projects.find(p => (p.id || p._id) === projectId);
    if (proj) {
      handleEdit(proj);
    }
  }, [searchParams, projects]);

  // Supprimer le useEffect de timeout React - on utilise le timeout réseau (AbortController)

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => setLoading(false), 10000); // 10s max
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const handleChange = e => {
    if (e.target.name === 'user_ids') {
      console.log('[handleChange] Nouvelle valeur user_ids:', e.target.value);
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('Title and description are required.');
      return false;
    }
    if (form.end && form.start && form.end < form.start) {
      setFormError('End date cannot be before start date.');
      return false;
    }
    // Nouvelle logique : il faut au moins un utilisateur OU un groupe avec au moins un membre
    if ((!form.user_ids || form.user_ids.length === 0)) {
      if (!form.group_ids || form.group_ids.length === 0) {
        setFormError('At least one user or group must be assigned to the project.');
        return false;
      }
      // Vérifier que les groupes ont au moins un membre
      const allMembers = await Promise.all(
        form.group_ids.map(async groupId => {
          const members = await getGroupMembers(groupId, session);
          return members;
        })
      );
      const hasMember = allMembers.flat().length > 0;
      if (!hasMember) {
        setFormError('Assigned groups must contain at least one user.');
        return false;
      }
    }
    setFormError(null);
    return true;
  };

  const handleCreate = async e => {
    // e may be an event or a custom object with filesPayload
    if (typeof e?.preventDefault === 'function') e.preventDefault();
    const creationFiles = Array.isArray(e?.filesPayload) ? e.filesPayload : formFiles;
   
    
    // Empêcher de relancer si on a déjà eu un timeout
    if (timeoutError) {
      console.log('❌ BLOCAGE: timeoutError présent, empêcher relance');
      toast.error('Veuillez fermer et rouvrir le drawer pour réessayer.');
      return;
    }
    
    let validation = await validateForm();
    console.log('validation result:', validation);
    if (!validation) {
      console.log('❌ Validation échouée, arrêt');
      setFormLoading(false);
      return;
    }
    console.log('✅ Validation OK, lancement création');
    setFormLoading(true);
    setTimeoutError(null);
    try {
      console.log('🔄 Début création projet...');
      // 1. Vérifier conflits groupes/utilisateurs AVANT de créer le projet
      if (form.group_ids && form.group_ids.length > 0 && form.user_ids && form.user_ids.length > 0) {
        console.log('🔍 Vérification conflits groupes/utilisateurs...');
        // Récupérer les membres des groupes à assigner
        const membersToCheck = await Promise.all(
          form.group_ids.map(async groupId => {
            const members = await getGroupMembers(groupId, session);
            return members.map(member => member.user_id);
          })
        );
        // Vérifier si un membre est déjà assigné directement
        const duplicateUsers = membersToCheck.flat().filter(userId => form.user_ids.includes(userId));
        if (duplicateUsers.length > 0) {
          throw new Error(`Cannot assign group because it contains users already directly assigned to this project: ${duplicateUsers.join(', ')}`);
        }
      }

      // 2. Créer le projet SEULEMENT si tout est OK
      console.log('📤 Envoi createProject avec form:', form);
      const createdProject = await createProject(form, session);
      console.log('✅ Projet créé:', createdProject);

      // 3.a Upload files selected during creation
      if (creationFiles && creationFiles.length > 0) {
        const projectId = createdProject.id || createdProject._id;
        const uploaded = [];
        for (const file of creationFiles) {
          const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
          const path = `projects/${projectId}/${filename}`;
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
        // Persist in DB
        await addProjectFiles(projectId, uploaded, session);
      }

      // 3. Assignation des groupes
      if (form.group_ids && form.group_ids.length > 0) {
        console.log('🔗 Assignation des groupes...');
        try {
          await Promise.all(
            form.group_ids.map(groupId => assignGroupToProject(groupId, createdProject.id || createdProject._id, session))
          );
        } catch (groupAssignError) {
          // Si erreur lors de l'assignation des groupes, supprimer le projet créé (rollback)
          await deleteProject(createdProject.id || createdProject._id, session);
          throw new Error('Failed to assign groups to project: ' + (groupAssignError.message || groupAssignError));
        }
      }

      // 4. Création des tâches associées si besoin
      if (formTasks.length > 0) {
        console.log('📝 Création des tâches associées...');
        await Promise.all(formTasks.map(async (task) => {
          try {
            // Ne pas envoyer les File objets dans le body JSON
            const { files: taskFiles = [], ...taskWithoutFiles } = task || {};
            const taskWithoutProgress = { ...taskWithoutFiles };
            const createdTask = await createTask(
              { ...taskWithoutProgress, project_id: createdProject.id || createdProject._id },
              task.user_ids || [],
              task.group_ids || task.groups || [],
              session
            );

            // Upload des fichiers sélectionnés pour cette tâche, puis persistance via l'API
            if (createdTask?.id && Array.isArray(taskFiles) && taskFiles.length > 0) {
              const uploaded = [];
              for (const file of taskFiles) {
                if (!file || typeof file !== 'object' || typeof file.name !== 'string') continue;
                const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
                const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
                const path = `tasks/${createdTask.id}/${filename}`;
                const { error: upErr } = await supabase.storage
                  .from('filesmanagment')
                  .upload(path, file, { contentType: file.type || 'application/octet-stream' });
                if (upErr) throw upErr;
                const { data: signed } = await supabase.storage
                  .from('filesmanagment')
                  .createSignedUrl(path, 60 * 60 * 24 * 7);
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
                await addTaskFiles(createdTask.id, uploaded, session);
              } catch (e) {
                console.error('[handleCreate][tasks] addTaskFiles failed:', e);
              }
            }
          } catch (err) {
            console.error('Erreur lors de la création d\'une tâche associée :', err);
            toast.error('Error while creating an associated task: ' + (err.message || err));
          }
        }));
      }
      
      // 5. Only now, send notifications
      try {
        await notifyProjectCreated(createdProject.id || createdProject._id, { user_ids: form.user_ids, name: createdProject.title }, session);
      } catch (e) {
        console.warn('Notify project failed:', e);
      }

      console.log('🎉 SUCCÈS: Projet créé avec succès');
      // Ajouter le nouveau projet à l'état local
      const projectWithAssignments = {
        ...createdProject,
        assignees: form.user_ids || [],
        groups: form.group_ids || []
      };
      setProjects(prev => [projectWithAssignments, ...prev]);
      
      setForm({ title: '', description: '', status: 'pending', start: '', end: '', user_ids: [], group_ids: [] });
      setFormTasks([]);
      setFormFiles([]);
      setDrawerOpen(false);
      setFormError(null);
      setTimeoutError(null);
      toast.success('Project created successfully!');
    } catch (err) {
      console.log('❌ ERREUR dans handleCreate:', err);
      // Log détaillé de l'erreur
      if (err && err.response) {
        console.error('Erreur backend:', err.response);
      } else {
        console.error('Erreur lors de la création du projet:', err);
      }
      
      // Gérer le timeout réseau vs erreur normale
      if (err.message && err.message.includes('serveur ne répond pas')) {
        console.log('⏰ Timeout réseau détecté');
        setTimeoutError(err.message);
      } else {
        setFormError(err.message || 'Failed to create project');
      }
      toast.error('Failed to create project: ' + (err.message || 'Unknown error'));
    } finally {
      console.log('🏁 finally: setFormLoading(false)');
      setFormLoading(false);
    }
  };

  const handleEdit = async (project) => {
    setEditMode(true);
    setEditId(project.id || project._id);
    
    try {
      // Récupérer les groupes assignés au projet
      const projectGroups = await getGroupsByProject(project.id || project._id,session);
      const groupIds = projectGroups.map(group => group.group_id);
      
      // Récupérer seulement les utilisateurs directement assignés (pas les membres des groupes)
      const directAssignees = project.assignees || project.user_ids || [];
      
      // Filtrer pour exclure les membres des groupes
      let filteredAssignees = directAssignees;
      if (groupIds.length > 0) {
        // Récupérer les membres de tous les groupes assignés
        const allGroupMembers = [];
        for (const groupId of groupIds) {
          try {
            const members = await getGroupMembers(groupId, session);
            const memberIds = members.map(member => member.user_id);
            allGroupMembers.push(...memberIds);
          } catch (error) {
            console.error(`Error getting members for group ${groupId}:`, error);
          }
        }
        // Exclure les membres des groupes des assignees directs
        filteredAssignees = directAssignees.filter(userId => !allGroupMembers.includes(userId));
      }
      
      setForm({
        id: project.id || project._id, // Ajout de l'ID pour le drawer
        title: project.title,
        description: project.description,
        status: project.status,
        start: project.start,
        end: project.end,
        user_ids: filteredAssignees,
        group_ids: groupIds,
      });
    } catch (error) {
      console.error('Error loading project groups:', error);
      // En cas d'erreur, utiliser les données de base sans groupes
      setForm({
        id: project.id || project._id,
        title: project.title,
        description: project.description,
        status: project.status,
        start: project.start,
        end: project.end,
        user_ids: project.assignees || project.user_ids || [],
        group_ids: [],
      });
    }
    
    setDrawerOpen(true);
    setFormError(null);
  };

  const handleUpdate = async (e) => {
    if (typeof e?.preventDefault === 'function') e.preventDefault();
    let validation = await validateForm();
    if (!validation) {
      setFormLoading(false);
      return;
    }
    setFormLoading(true);
    try {
      const { user_ids, group_ids, ...projectData } = form;
      
      // Mettre à jour le projet
      const updatedProject = await updateProject(editId, projectData, user_ids, session);
      
      // Gérer les assignations de groupes
      if (group_ids && group_ids.length >= 0) {
        // Récupérer les groupes actuellement assignés
        console.log('[handleUpdate] editId:', editId, 'type:', typeof editId);
        const currentGroups = await getGroupsByProject(editId,session);
        const currentGroupIds = currentGroups.map(g => g.group_id);
        console.log('[handleUpdate] currentGroupIds:', currentGroupIds);
        console.log('[handleUpdate] form.group_ids:', form.group_ids);
        
        // Convertir tous les IDs en strings pour la comparaison
        const currentGroupIdsStr = currentGroupIds.map(id => id.toString());
        const formGroupIdsStr = form.group_ids.map(id => id.toString());
        
        // Retirer les groupes non sélectionnés
        const groupsToRemove = currentGroupIdsStr.filter(id => !formGroupIdsStr.includes(id));
        console.log('[handleUpdate] groupsToRemove:', groupsToRemove);
        await Promise.all(
          groupsToRemove.map(async groupId => {
            const res = await unassignGroupFromProject(parseInt(groupId), editId, session);
            console.log('[handleUpdate] unassignGroupFromProject:', { groupId, res });
          })
        );
        
        // Ajouter les nouveaux groupes
        const groupsToAdd = formGroupIdsStr.filter(id => !currentGroupIdsStr.includes(id));
        console.log('[handleUpdate] groupsToAdd:', groupsToAdd);
        await Promise.all(
          groupsToAdd.map(async groupId => {
            const res = await assignGroupToProject(parseInt(groupId), editId, session);
            console.log('[handleUpdate] assignGroupToProject:', { groupId, res });
          })
        );
      }

      // Gérer les fichiers si fournis
      if (e.filesPayload && Array.isArray(e.filesPayload) && e.filesPayload.length > 0) {
        console.log('[handleUpdate] Uploading files:', e.filesPayload.length);
        try {
          const uploaded = [];
          for (const file of e.filesPayload) {
            const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
            const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
            const path = `projects/${editId}/${filename}`;
            const { error: upErr } = await supabase.storage
              .from('filesmanagment')
              .upload(path, file, { contentType: file.type || 'application/octet-stream' });
            if (upErr) throw upErr;
            const { data: signed } = await supabase.storage
              .from('filesmanagment')
              .createSignedUrl(path, 60 * 60 * 24 * 7);
            uploaded.push({
              name: file.name,
              path,
              url: signed?.signedUrl || '',
              size: file.size,
              type: file.type || 'application/octet-stream',
              uploaded_at: new Date().toISOString(),
            });
          }
          if (uploaded.length > 0) {
            await addProjectFiles(editId, uploaded, session);
            console.log('[handleUpdate] Files uploaded successfully:', uploaded.length);
          }
        } catch (fileError) {
          console.error('[handleUpdate] File upload error:', fileError);
          // Ne pas faire échouer la mise à jour du projet à cause des fichiers
        }
      }
      
      // Mettre à jour directement l'état local
      setProjects(prev => prev.map(project => 
        (project.id || project._id) === editId
          ? { 
              ...project, 
              ...projectData,
              assignees: user_ids || [],
              groups: group_ids || []
            }
          : project
      ));
      
      setDrawerOpen(false);
      setEditMode(false);
      setEditId(null);
      setForm({ title: '', description: '', status: 'pending', start: '', end: '', user_ids: [], group_ids: [] });
      setFormError(null);
      toast.success('Project updated successfully!');
    } catch (err) {
      setFormError(err.message || 'Failed to update project');
      toast.error('Failed to update project: ' + (err.message || 'Unknown error'));
      console.error('[handleUpdate] error:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) {
      setFormLoading(false);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this project? All its tasks and files will be deleted.')) {
      return;
    }
    setFormLoading(true);
    try {
      await deleteProject(editId, session);
      
      // Supprimer le projet de l'état local
      setProjects(prev => prev.filter(project => (project.id || project._id) !== editId));
      
      setDrawerOpen(false);
      setEditMode(false);
      setEditId(null);
      setForm({ title: '', description: '', status: 'pending', start: '', end: '', user_ids: [] });
      setFormError(null);
    } catch (err) {
      setFormError(err.message || 'Failed to delete project');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (project, newStatus) => {
    try {
      const { user_ids} = form;
      // Mise à jour optimiste
      setProjects(prev => prev.map(p => 
        (p.id || p._id) === (project.id || project._id) 
          ? { ...p, status: newStatus }
          : p
      ));
      
      // Appel API
      await updateProject(project.id || project._id, { status: newStatus },user_ids, session);
    } catch (err) {
      // En cas d'erreur, recharger les projets
      console.error('Failed to update project status:', err);
      fetchProjects();
    }
  };

  const handleUpdateOverdueProjects = async () => {
    try {
      setIsRefreshing(true);
      await updateOverdueProjects(session);
      fetchProjects(); // Recharger les projets après la mise à jour
      toast.success('Overdue projects updated successfully!');
    } catch (err) {
      console.error('Failed to update overdue projects:', err);
      toast.error('Failed to update overdue projects: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fonction pour filtrer et rechercher les projets
  const filterProjects = (projects) => {
    console.log('[filterProjects] input:', projects);
    return projects.filter(project => {
      // Filtre par recherche (titre et description)
      const searchMatch = !searchTerm || 
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtre par statut (gère les différentes variantes)
      const normalizeStatus = (status) => {
        if (status === 'in_progress') return 'in progress';
        return status;
      };
      
      const projectStatus = normalizeStatus(project.status);
      const filterStatus = normalizeStatus(filters.status);
      const statusMatch = !filters.status || projectStatus === filterStatus;

      // Filtre par progression
      const progressMatch = !filters.progress || project.progress === parseInt(filters.progress);

      return searchMatch && statusMatch && progressMatch;
    });
  };

  // Projets filtrés et triés
  const filteredAndSortedProjects = useMemo(() => {
    const filtered = filterProjects(projects);
    return filtered.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  }, [projects, searchTerm, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-black">Projects</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setDrawerOpen(true);
              setEditMode(false);
              setEditId(null);
              setForm({ title: '', description: '', status: 'pending', start: '', end: '', user_ids: [], group_ids: [] });
              setFormTasks([]);
              setFormError(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded shadow transition-colors"
            disabled={formLoading}
          >
            {formLoading ? 'Creating...' : '+ Create Project'}
          </button>
        )}
      </div>

      {/* Indicateur des projets en retard */}
      
      {/* Composant de recherche et filtres */}
      <SearchAndFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
        showStatusFilter={true}
        showPriorityFilter={false}
        showProjectFilter={false}
        showProgressFilter={true}
        isTaskContext={false}
      />

      <ProjectHeaderTabs viewMode={viewMode} setViewMode={setViewMode} />
      
      {/* Affichage principal */}
      {loading || isRefreshing ? (
        <div className="text-gray-400 text-center py-10">
          {isRefreshing ? 'Actualisation des projets...' : 'Loading projects...'}
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-400 text-center py-4">No projects found.</div>
      ) : filteredAndSortedProjects.length === 0 ? (
        <div className="text-gray-400 text-center py-10">
          {searchTerm || filters.status || filters.progress 
            ? 'No projects match your filters.' 
            : 'No projects found.'}
        </div>
      ) : viewMode === 'table' ? (
        <ProjectTable projects={filteredAndSortedProjects} onEdit={handleEdit} />
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-400">Projects Kanban</h2>
            <span className="ml-2 text-gray-400">({filteredAndSortedProjects.length} projects)</span>
          </div>
          <div style={{ height: 'calc(100vh - 160px)', display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
            <ProjectKanban 
              projects={filteredAndSortedProjects} 
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
          setForm({ title: '', description: '', status: 'pending', start: '', end: '', user_ids: [], group_ids: [] });
          setFormTasks([]);
          setFormError(null);
          setTimeoutError(null);
          setFormLoading(false);
        }}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        form={form}
        onChange={handleChange}
        loading={formLoading}
        error={timeoutError || formError}
        editMode={editMode}
        formTasks={formTasks}
        setFormTasks={setFormTasks}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-center py-10">Loading projects...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}