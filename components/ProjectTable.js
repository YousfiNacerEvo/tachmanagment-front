'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ProjectTable({ projects, onEdit, pageSize = 10 }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((projects?.length || 0) / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [projects, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const currentProjects = (projects || []).slice(startIndex, startIndex + pageSize);

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

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
          {currentProjects.map((project) => (
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-md border text-sm font-medium ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            aria-label="Previous page"
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold">{currentPage}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 rounded-md border text-sm font-medium ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 