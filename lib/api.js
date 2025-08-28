const API_URL = "https://tachmanagment-back.onrender.com";//https://tachmanagment-back.onrender.com //http://localhost:4000

// Lightweight cross-page update signal
function notifyDataUpdated() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tach:dataUpdated', String(Date.now()));
      // Also notify listeners in the same tab
      try {
        window.dispatchEvent(new Event('tach:dataUpdated'));
      } catch (_) {}
    }
  } catch (_) {}
}

// Helper function to get auth headers
export async function getAuthHeaders(session) {
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

export async function getProjects(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

// Reports API
export async function getProjectsReport({ start, end }, session) {
  const headers = await getAuthHeaders(session);
  const url = `${API_URL}/api/reports/projects?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch projects report');
  return res.json();
}

export async function getTasksReport({ start, end }, session) {
  const headers = await getAuthHeaders(session);
  const url = `${API_URL}/api/reports/tasks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch tasks report');
  return res.json();
}

// Fonction pour récupérer les projets d'un utilisateur spécifique
export async function getProjectsByUser(userId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/user/${userId}`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch user projects');
  return res.json();
}

// Fonction pour récupérer les détails d'un projet avec ses tâches
export async function getProjectDetails(projectId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/${projectId}/details`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch project details');
  return res.json();
}

export async function createProject(projectData, session) {
  console.log('🚀 createProject appelé avec:', projectData);
  if (!session?.access_token) {
    console.log('❌ Session expirée ou invalide');
    throw new Error('Session expirée, veuillez vous reconnecter.');
  }
  const headers = await getAuthHeaders(session);
  console.log('📋 Headers récupérés');
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log('⏰ TIMEOUT ABORTCONTROLLER - Abort de la requête');
    controller.abort();
  }, 15000); // Increase to reduce false aborts during file-related operations

  try {
    console.log('📤 Envoi fetch vers:', `${API_URL}/api/projects`);
    console.log('🌐 URL complète:', `${API_URL}/api/projects`);
    console.log('📋 Headers:', headers);
    console.log('📦 Body:', JSON.stringify(projectData));
    console.log('🔄 Début du fetch...');
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectData),
      signal: controller.signal,
    });
    console.log('📥 Réponse reçue:', res.status, res.ok);
    clearTimeout(timeout);
    if (!res.ok) throw new Error('Failed to create project');
    const data = await res.json();
    console.log('✅ Données reçues:', data);
    notifyDataUpdated();
    return data;
  } catch (err) {
    console.log('❌ Erreur dans createProject:', err);
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.log('⏰ ABORT ERROR détecté');
      throw new Error('Le serveur ne répond pas, veuillez réessayer plus tard.');
    }
    throw err;
  }
}
export async function notifyProjectCreated(id, { user_ids, name }, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/${id}/notify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_ids, name })
  });
  if (!res.ok) throw new Error('Failed to send notifications');
  return res.json();
}

export async function updateProject(id, projectData, user_ids, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ ...projectData, user_ids }),
  });
  if (!res.ok) throw new Error('Failed to update project');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function deleteProject(id, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete project');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function getTasks(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

// Nouvelle fonction pour récupérer les tâches indépendantes
export async function getStandaloneTasks(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/standalone`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch standalone tasks');

  return res.json();
}

// Nouvelle fonction pour récupérer les tâches de projet
export async function getProjectTasks(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/project`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch project tasks');

  return res.json();
}

// Nouvelle fonction pour récupérer les tâches d'un utilisateur
export async function getUserTasks(userId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/user/${userId}`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch user tasks');

  return res.json();
}

// Nouvelle fonction pour récupérer toutes les tâches de l'utilisateur (directes + via groupes)
export async function getAllUserTasks(userId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/user/${userId}/all`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch all user tasks');

  return res.json();
}

export async function getTasksByProject(projectId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/project/${projectId}`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch project tasks');

  return res.json();
}

export async function getTasksByProjectWithAssignees(projectId,session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/project/${projectId}/with-assignees`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch project tasks with assignees');

  return res.json();
}

export async function getTasksByProjectAndUser(projectId, userId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/project/${projectId}/user/${userId}`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch user project tasks');

  return res.json();
}

export async function createTask(taskData,user_ids, group_ids,session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({...taskData,user_ids,group_ids}),
  });
  if (!res.ok) throw new Error('Failed to create task');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function updateTask(id, taskData, user_ids = [], group_ids = [], session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      ...taskData,
      user_ids,
      group_ids
    }),
  });
  if (!res.ok) throw new Error('Failed to update task');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function deleteTask(id,session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete task');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function getUsers(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/users/all`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(user, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur lors de la création de l\'utilisateur');
    return data;
  } catch (err) {
    throw err;
  }
}

export async function deleteUser(userId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

export async function updateUserRole(userId, role, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update user role');
  return data;
}

// Group API functions
export async function getAllGroups(session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups`, {
      headers
    });
    if (!res.ok) {
      try {
        const text = await res.text();
        try {
          const obj = JSON.parse(text);
          throw new Error(obj?.message || 'Failed to fetch groups');
        } catch (_) {
          throw new Error(text || 'Failed to fetch groups');
        }
      } catch (__) {
        throw new Error('Failed to fetch groups');
      }
    }
    return res.json();
  } catch (err) {
    throw err;
  }
}

export async function getGroupsWithMembers(session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/with-members`, {
      headers
    });
    if (!res.ok) {
      try {
        const text = await res.text();
        try {
          const obj = JSON.parse(text);
          throw new Error(obj?.message || 'Failed to fetch groups');
        } catch (_) {
          throw new Error(text || 'Failed to fetch groups');
        }
      } catch (__) {
        throw new Error('Failed to fetch groups');
      }
    }
    return res.json();
  } catch (err) {
    throw err;
  }
}

export async function getGroupById(groupId, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch group');
    return data;
  } catch (err) {
    throw err;
  }
}

export async function getGroupDetails(groupId, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}/details`, {
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch group details');
    return data;
  } catch (err) {
    throw err;
  }
}

export async function createGroup(groupData, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(groupData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create group');
    notifyDataUpdated();
    return data;
  } catch (err) {
    throw err;
  }
}

export async function updateGroup(groupId, groupData, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(groupData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update group');
    notifyDataUpdated();
    return data;
  } catch (err) {
    throw err;
  }
}

export async function deleteGroup(groupId, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete group');
    notifyDataUpdated();
    return data;
  } catch (err) {
    throw err;
  }
}

export async function getGroupMembers(groupId, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
      headers
    });
    if (!res.ok) {
      try {
        const text = await res.text();
        try {
          const obj = JSON.parse(text);
          throw new Error(obj?.message || 'Failed to fetch group members');
        } catch (_) {
          throw new Error(text || 'Failed to fetch group members');
        }
      } catch (__) {
        throw new Error('Failed to fetch group members');
      }
    }
    return res.json();
  } catch (err) {
    throw err;
  }
}

export async function addMembersToGroup(groupId, userIds, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ids: userIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add members to group');
    notifyDataUpdated();
    return data;
  } catch (err) {
    throw err;
  }
}

export async function removeMembersFromGroup(groupId, userIds, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ user_ids: userIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to remove members from group');
    notifyDataUpdated();
    return data;
  } catch (err) {
    throw err;
  }
}

export async function getGroupsByUser(userId, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/user/${userId}`, {
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch user groups');
    return data;
  } catch (err) {
    throw err;
  }
}

// Get groups of a user with details (members and tasks)
export async function getUserGroupsWithDetails(userId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/groups/user/${userId}/with-details`, {
    headers
  });
  if (!res.ok) {
    try {
      const maybeJson = await res.json();
      throw new Error(maybeJson?.message || 'Failed to fetch user groups with details');
    } catch (_) {
      try {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch user groups with details');
      } catch (__) {
        throw new Error('Failed to fetch user groups with details');
      }
    }
  }
  return res.json();
}

export async function assignGroupToProject(groupId, projectId, session) {
  try {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${API_URL}/api/groups/${groupId}/assign-project`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ project_id: projectId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to assign group to project');
    return data;
  } catch (err) {
    throw err;
  }
}

export async function unassignGroupFromProject(groupId, projectId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/groups/${groupId}/unassign-project`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ project_id: projectId }),
  });
  if (!res.ok) throw new Error('Failed to unassign group from project');
  return res.json();
}



export async function getGroupsByProject(projectId,session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/groups/project/${projectId}`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch project groups');
  return res.json();
}

export async function getGroupsByTask(taskId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/groups/task/${taskId}`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch groups by task');
  return res.json();
}

export async function getStandaloneTasksWithAssignees(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/standalone/with-assignees`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch standalone tasks with assignees');
  return res.json();
}

export async function getProjectTasksWithAssignees(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/project/with-assignees`, {
    headers
  });
  if (!res.ok) throw new Error('Failed to fetch project tasks with assignees');
  return res.json();
}

// --- Files (Projects) ---
export async function getProjectFiles(projectId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/${projectId}/files`, { headers });
  if (!res.ok) throw new Error('Failed to fetch project files');
  return res.json();
}

export async function addProjectFiles(projectId, files, session) {
  const headers = await getAuthHeaders(session);
  const idParam = typeof projectId === 'string' || typeof projectId === 'number' ? projectId : (projectId?.id || projectId?._id);
  const res = await fetch(`${API_URL}/api/projects/${idParam}/files`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files })
  });
  if (!res.ok) throw new Error('Failed to add project files');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function deleteProjectFile(projectId, path, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/${projectId}/files`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ path })
  });
  if (!res.ok) throw new Error('Failed to delete project file');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

// --- Files (Tasks) ---
export async function getTaskFiles(taskId, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/${taskId}/files`, { headers });
  if (!res.ok) throw new Error('Failed to fetch task files');
  return res.json();
}

export async function addTaskFiles(taskId, files, session) {
  const headers = await getAuthHeaders(session);
  console.log('[api.addTaskFiles] taskId:', taskId, 'payload:', files);
  const res = await fetch(`${API_URL}/api/tasks/${taskId}/files`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files })
  });
  if (!res.ok) throw new Error('Failed to add task files');
  const data = await res.json();
  console.log('[api.addTaskFiles] response:', data);
  notifyDataUpdated();
  return data;
}

export async function deleteTaskFile(taskId, path, session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/tasks/${taskId}/files`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ path })
  });
  if (!res.ok) throw new Error('Failed to delete task file');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}

export async function updateOverdueProjects(session) {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${API_URL}/api/projects/update-overdue`, {
    method: 'POST',
    headers
  });
  if (!res.ok) throw new Error('Failed to update overdue projects');
  const data = await res.json();
  notifyDataUpdated();
  return data;
}