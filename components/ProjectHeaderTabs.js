'use client';
import React from 'react';

export default function ProjectHeaderTabs({ viewMode, setViewMode }) {
  return (
    <div className="flex gap-2 mb-6">
      <button
        className={`px-4 py-2 rounded-t font-semibold transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-[#232329] text-gray-300 hover:bg-blue-900/30'}`}
        onClick={() => setViewMode('table')}
      >
        Table View
      </button>
      <button
        className={`px-4 py-2 rounded-t font-semibold transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-[#232329] text-gray-300 hover:bg-blue-900/30'}`}
        onClick={() => setViewMode('kanban')}
      >
        Kanban View
      </button>
    </div>
  );
} 