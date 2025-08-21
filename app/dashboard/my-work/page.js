'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useUser } from '../../../hooks/useUser';
import { useAuth } from '../../../context/AuthContext';
import { 
  getProjectsByUser, 
  getUserTasks, 
  getUserGroupsWithDetails,
  getAllUserTasks,
  getProjects,
  getProjectDetails
} from '../../../lib/api';
import TaskEditModal from '../../../components/TaskEditModal';
import FileManager from '../../../components/FileManager';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FolderOpen, 
  CheckSquare, 
  Users, 
  Search, 
  Filter,
  Calendar,
  Edit3,
  Plus,
  MoreHorizontal,
  Clock,
  Tag,
  User,
  Building,
  ArrowLeft,
  FileText,
  CalendarDays,
  UserCheck,
  Target
} from 'lucide-react';

function MyWorkContent() {
  const { user, loading: userLoading } = useUser();
  const { session, isAdmin, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedFromQueryRef = useRef(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [allProjects, setAllProjects] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    taskType: 'all'
  });
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // New state for project details view
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);

  // Rediriger les admins vers la page projects
  useEffect(() => {
    if (!authLoading && isAdmin && role === 'admin') {
      router.replace('/dashboard/projects');
      return;
    }
  }, [isAdmin, role, authLoading, router]);

  useEffect(() => {
    if (!user || userLoading) return;
    setLoading(true);
    Promise.allSettled([
      getProjectsByUser(user.id, session),
      getAllUserTasks(user.id, session),
      getUserGroupsWithDetails(user.id, session),
      getProjects(session)
    ])
      .then((results) => {
        const [projRes, tasksRes, groupsRes, allProjRes] = results;
        let anySuccess = false;
        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value || []);
          anySuccess = true;
        } else {
          console.warn('Failed to load user projects:', projRes.reason);
        }
        if (tasksRes.status === 'fulfilled') {
          setTasks(tasksRes.value || []);
          setFilteredTasks(tasksRes.value || []);
          anySuccess = true;
        } else {
          console.warn('Failed to load user tasks:', tasksRes.reason);
        }
        if (groupsRes.status === 'fulfilled') {
          setGroups(groupsRes.value || []);
          anySuccess = true;
        } else {
          console.warn('Failed to load user groups:', groupsRes.reason);
        }
        if (allProjRes.status === 'fulfilled') {
          setAllProjects(allProjRes.value || []);
          anySuccess = true;
        } else {
          console.warn('Failed to load all projects:', allProjRes.reason);
        }
        if (!anySuccess) {
          setError('Failed to load your data');
        } else {
          setError(null);
        }
      })
      .finally(() => setLoading(false));
  }, [user, userLoading, session]);

  // Open edit modal when arriving with ?taskId=... after tasks are loaded
  useEffect(() => {
    try {
      if (!tasks || tasks.length === 0) return;
      const tid = searchParams?.get('taskId');
      if (!tid || openedFromQueryRef.current) return;
      const found = tasks.find(t => String(t.id) === String(tid));
      if (found) {
        openedFromQueryRef.current = true;
        setActiveTab('tasks');
        setEditingTask(found);
        setIsEditModalOpen(true);
      }
    } catch (_) {}
  }, [searchParams, tasks]);

  useEffect(() => {
    let filtered = [...tasks];
    
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    
    if (filters.taskType !== 'all') {
      switch (filters.taskType) {
        case 'project':
          filtered = filtered.filter(task => task.project_id && task.project_name);
          break;
        case 'standalone':
          filtered = filtered.filter(task => !task.project_id);
          break;
        case 'group':
          filtered = filtered.filter(task => task.is_group_task === true);
          break;
      }
    }
    
    setFilteredTasks(filtered);
  }, [tasks, filters]);

  const handleTaskUpdate = (updatedTask) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };

  // New function to handle project selection
  const handleProjectClick = async (project) => {
    setSelectedProject(project);
    setLoadingProjectDetails(true);
    try {
      const details = await getProjectDetails(project.id || project._id, session);
      setProjectDetails(details);
    } catch (err) {
      console.error('Error loading project details:', err);
      setError('Failed to load project details');
    } finally {
      setLoadingProjectDetails(false);
    }
  };

  // Function to go back to projects list
  const handleBackToProjects = () => {
    setSelectedProject(null);
    setProjectDetails(null);
    setError(null);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': return 'bg-green-100 text-green-700 border-green-200';
      case 'in progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'to do': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const tabs = [
    { id: 'projects', label: 'Projects', icon: FolderOpen, count: projects.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: filteredTasks.length },
    { id: 'groups', label: 'Groups', icon: Users, count: groups.length }
  ];

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your workspace...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-red-600 text-xl font-semibold mb-2">Oops!</h2>
              <p className="text-gray-600">{error}</p>
              <button 
                onClick={handleBackToProjects}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show project details if a project is selected
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBackToProjects}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Projects
          </motion.button>

          {/* Project Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 mb-8 shadow-sm border border-gray-200"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  {selectedProject.name || selectedProject.title || 'Untitled Project'}
                </h1>
                <p className="text-gray-600 text-lg mb-4">
                  {selectedProject.description || 'No description available'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedProject.status)}`}>
                        {selectedProject.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CalendarDays className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Timeline</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedProject.start ? new Date(selectedProject.start).toLocaleDateString() : 'Not set'} 
                        {selectedProject.end && ` → ${new Date(selectedProject.end).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <UserCheck className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Assigned To</p>
                      <p className="text-sm font-medium text-gray-900">You</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Project Files Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                Project Files
              </h2>
              <p className="text-gray-600 mb-4">
                Manage files for this project. You can add, delete, and organize project documents.
              </p>
              
              {loadingProjectDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading project files...</span>
                </div>
              ) : (
                <FileManager
                  ownerType="project"
                  ownerId={selectedProject.id || selectedProject._id}
                  title="Project Files"
                  className="w-full"
                />
              )}
            </div>
          </motion.div>

          {/* Project Tasks Section (Read-only) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckSquare className="text-green-600" size={24} />
                Project Tasks
              </h2>
              <p className="text-gray-600 mb-4">
                View tasks associated with this project. Contact your project manager to modify tasks.
              </p>
              
              {loadingProjectDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading project tasks...</span>
                </div>
              ) : projectDetails?.tasks && projectDetails.tasks.length > 0 ? (
                <div className="space-y-3">
                  {projectDetails.tasks.map((task, index) => (
                    <div key={task.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-lg mb-2">{task.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {task.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock size={14} />
                                <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckSquare className="text-gray-400 mx-auto mb-3" size={48} />
                  <p>No tasks found for this project</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Workspace</h1>
          <p className="text-gray-600">Manage your projects, tasks, and team collaborations</p>
        </motion.div>
        
        {/* Navigation Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex bg-white rounded-2xl p-1 mb-8 shadow-sm border border-gray-200"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <FolderOpen className="text-blue-600" size={24} />
                    My Projects
                  </h2>
                 
                </div>
                
                {projects.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white rounded-2xl border border-gray-200"
                  >
                    <FolderOpen className="text-gray-400 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-600">Projects assigned to you will appear here</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg cursor-pointer"
                        onClick={() => handleProjectClick(project)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 text-lg">{project.name || project.title || 'Untitled Project'}</h3>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={16} className="text-gray-400" />
                          </button>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {project.description || 'No description available'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                            {project.status || 'Unknown'}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {project.start && new Date(project.start).toLocaleDateString()}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <CheckSquare className="text-green-600" size={24} />
                    My Tasks
                  </h2>
                  
                </div>
                
                {/* Filters */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Filter size={18} />
                    Filters
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search Tasks</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search by title or description..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="all">All Status</option>
                        <option value="to do">To Do</option>
                        <option value="in progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                      <select
                        value={filters.taskType}
                        onChange={(e) => setFilters(prev => ({ ...prev, taskType: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="all">All Types</option>
                        <option value="project">Project Tasks</option>
                        <option value="standalone">Standalone Tasks</option>
                        <option value="group">Group Tasks</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white rounded-2xl border border-gray-200"
                  >
                    <CheckSquare className="text-gray-400 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
                    <p className="text-gray-600">Try adjusting your filters or create new tasks</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-3">
                              <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
                              <div className="flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {task.description || 'No description'}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {task.deadline && (
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                              {task.project_name && (
                                <div className="flex items-center gap-1">
                                  <FolderOpen size={14} />
                                  <span className="text-blue-600">{task.project_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setIsEditModalOpen(true);
                            }}
                            className="ml-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Users className="text-purple-600" size={24} />
                    My Groups
                  </h2>
                </div>
                
                {groups.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white rounded-2xl border border-gray-200"
                  >
                    <Users className="text-gray-400 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No groups yet</h3>
                    <p className="text-gray-600">Groups you belong to will appear here</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groups.map((group, index) => (
                      <motion.div
                        key={group.group_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                          <span className="text-xs text-gray-500">ID: {group.group_id}</span>
                        </div>
                        
                        {/* Group Members */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <User size={16} />
                            Members ({group.members?.length || 0})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {group.members?.map(member => (
                              <span key={member.id} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium border border-purple-200">
                                {member.email}
                                <span className="text-purple-500 ml-1">({member.role})</span>
                              </span>
                            )) || <span className="text-gray-500 text-sm">No members</span>}
                          </div>
                        </div>

                        {/* Group Tasks */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <CheckSquare size={16} />
                            Group Tasks ({group.tasks?.length || 0})
                          </h4>
                          {(!group.tasks || group.tasks.length === 0) ? (
                            <div className="text-gray-500 text-sm">No tasks assigned to this group</div>
                          ) : (
                            <div className="space-y-2">
                              {group.tasks.map(task => (
                                <div key={task.id} className="bg-gray-50 rounded-xl px-3 py-2">
                                  <div className="font-medium text-gray-900 text-sm">{task.title}</div>
                                  <div className="text-gray-500 text-xs">{task.status} | {task.priority}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Task Edit Modal */}
        <TaskEditModal
          task={editingTask}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
          onUpdate={handleTaskUpdate}
          isAdmin={true}
        />
      </div>
    </div>
  );
}

export default function MyWorkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <MyWorkContent />
    </Suspense>
  );
}