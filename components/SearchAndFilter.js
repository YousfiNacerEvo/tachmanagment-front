'use client';
import React from 'react';

export default function SearchAndFilter({ 
  searchTerm, 
  onSearchChange, 
  filters, 
  onFilterChange,
  showStatusFilter = true,
  showPriorityFilter = true,
  showProjectFilter = false,
  showProgressFilter = false,
  isTaskContext = false, // Nouvelle prop pour différencier tâches vs projets
  projects = []
}) {
  // Options de statut selon le contexte
  const getStatusOptions = () => {
    if (isTaskContext) {
      return [
        { value: 'to do', label: 'To Do' },
        { value: 'in progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
        { value: 'overdue', label: 'Overdue' }
      ];
    } else {
      return [
        { value: 'pending', label: 'Pending' },
        { value: 'in progress', label: 'In Progress' },
        { value: 'done', label: 'Done' }
      ];
    }
  };

  const statusOptions = getStatusOptions();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Barre de recherche */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, description..."
            className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtre par statut */}
        {showStatusFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtre par priorité */}
        {showPriorityFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => onFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        )}

        {/* Filtre par progression (pour les projets) */}
        {showProgressFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progress
            </label>
            <select
              value={filters.progress}
              onChange={(e) => onFilterChange('progress', e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Progress</option>
              <option value="0">0%</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
            </select>
          </div>
        )}

        {/* Filtre par projet (pour les tâches) */}
        {showProjectFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => onFilterChange('project', e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bouton pour réinitialiser les filtres */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            onSearchChange('');
            onFilterChange('status', '');
            onFilterChange('priority', '');
            onFilterChange('project', '');
            onFilterChange('progress', '');
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
} 