'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

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
      className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4 min-w-[220px] max-w-xs cursor-pointer hover:shadow-lg transition-all ${
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
          className="text-base font-semibold truncate text-gray-800 hover:text-blue-600 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {project.title}
        </Link>
        <span className={`px-2 py-1 rounded text-xs font-semibold
          ${project.displayStatus === 'done' ? 'bg-green-500 text-white' : 
            project.displayStatus === 'in_progress' ? 'bg-blue-500 text-white' : 
            project.displayStatus === 'overdue' ? 'bg-red-500 text-white' : 
            'bg-yellow-500 text-white'}`}
        >
          {project.displayStatus === 'done' ? 'Done' : 
           project.displayStatus === 'in_progress' ? 'In Progress' : 
           project.displayStatus === 'overdue' ? 'Overdue' : 
           'Pending'}
        </span>
      </div>
      <div className="text-xs text-gray-600 mb-2">
        {project.start || '-'} → {project.end || '-'}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full bg-blue-500`}
          style={{ width: '100%' }}
        ></div>
      </div>
      <span className="text-xs text-gray-500">No progress data</span>
    </div>
  );
} 