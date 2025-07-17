'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

function getProgress(status) {
  if (status === 'done') return 100;
  if (status === 'in_progress') return 50;
  return 0;
}

export default function ProjectCard({ project, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id || project._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-[#232329] border border-gray-700 rounded-xl shadow-sm p-4 mb-4 min-w-[220px] max-w-xs cursor-pointer hover:shadow-lg transition-all ${
        isDragging ? 'shadow-2xl scale-105' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onEdit && onEdit(project);
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <Link
          href={`/dashboard/projects/${project.id || project._id}`}
          className="text-base font-semibold truncate text-white hover:text-blue-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {project.title}
        </Link>
        <span className={`px-2 py-1 rounded text-xs font-semibold
          ${project.status === 'done' ? 'bg-green-400 text-green-900' : project.status === 'in_progress' ? 'bg-blue-400 text-blue-900' : 'bg-yellow-400 text-yellow-900'}`}
        >
          {project.status === 'done' ? 'Done' : project.status === 'in_progress' ? 'In Progress' : 'Pending'}
        </span>
      </div>
      <div className="text-xs text-gray-300 mb-2">
        {project.start || '-'} → {project.end || '-'}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${getProgress(project.status) === 100 ? 'bg-green-400' : getProgress(project.status) === 50 ? 'bg-blue-400' : 'bg-yellow-400'}`}
          style={{ width: getProgress(project.status) + '%' }}
        ></div>
      </div>
      <span className="text-xs text-gray-400">{getProgress(project.status)}% complete</span>
    </div>
  );
} 