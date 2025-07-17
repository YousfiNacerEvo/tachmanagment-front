'use client';
import React from 'react';
import Link from 'next/link';

function getProgress(status) {
  if (status === 'done') return 100;
  if (status === 'in_progress') return 50;
  return 0;
}

export default function ProjectTable({ projects, onEdit }) {
  return (
    <div className="overflow-x-auto rounded-xl shadow border border-gray-700 bg-[#232329]">
      <table className="min-w-full text-left text-sm text-white">
        <thead>
          <tr className="bg-[#18181b]">
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
              className="border-t border-gray-700 hover:bg-[#18181b] transition-colors cursor-pointer"
              onClick={() => onEdit && onEdit(project)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/projects/${project.id || project._id}`}
                    className="font-semibold hover:text-blue-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.title}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-gray-300">
                  {project.start || '-'} → {project.end || '-'}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold
                  ${project.status === 'done' ? 'bg-green-400 text-green-900' : project.status === 'in_progress' ? 'bg-blue-400 text-blue-900' : 'bg-yellow-400 text-yellow-900'}`}
                >
                  {project.status === 'done' ? 'Done' : project.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgress(project.status) === 100 ? 'bg-green-400' : getProgress(project.status) === 50 ? 'bg-blue-400' : 'bg-yellow-400'}`}
                    style={{ width: getProgress(project.status) + '%' }}
                  ></div>
                </div>
                <span className="text-xs ml-2">{getProgress(project.status)}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 