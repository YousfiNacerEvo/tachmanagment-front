API_URL = "https://tachmanagment-back.onrender.com";

export async function getProjects() {
  try {
    const res = await fetch(`${API_URL}/api/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function createProject(project) {
  try {
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create project');
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function updateProject(id, updates) {
  try {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to update project');
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function deleteProject(id) {
  try {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to delete project');
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

// Task APIs
export async function getTasks() {
  try {
    const res = await fetch(`${API_URL}/api/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function getTasksByProject(projectId) {
  try {
    const res = await fetch(`${API_URL}/api/tasks/project/${projectId}`);
    if (!res.ok) throw new Error('Failed to fetch project tasks');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function createTask(task) {
  try {
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create task');
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function updateTask(id, updates) {
  try {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to update task');
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function deleteTask(id) {
  try {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to delete task');
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function createUser(user) {
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur lors de la création de l\'utilisateur');
    return data;
  } catch (err) {
    throw err;
  }
}
