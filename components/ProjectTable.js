'use client';
import React from 'react';
import Link from 'next/link';

export default function ProjectTable({ projects, onEdit }) {
  return (
    <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm text-gray-900">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Dates</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Completion</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id || project._id}
              className="border-t border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onEdit && onEdit(project)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                 
                    {project.title}
                  
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-gray-500">
                  {project.start || '-'} → {project.end || '-'}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold
                  ${project.status === 'done' ? 'bg-green-100 text-green-700' : project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}
                >
                  {project.status === 'done' ? 'Done' : project.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${project.progress === 100 ? 'bg-green-400' : project.progress >= 50 ? 'bg-blue-400' : project.progress > 0 ? 'bg-yellow-400' : 'bg-gray-300'}`}
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
                <span className="text-xs ml-2 text-gray-500">{project.progress || 0}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 