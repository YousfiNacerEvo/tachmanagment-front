"use client";
import React, { useEffect, useState } from "react";
import { getTasks, getProjects } from "../../../lib/api";

const STATUS_LABELS = {
  "à faire": "To do",
  "en cours": "In progress",
  "terminé": "Done",
  "pending": "To do",
  "in_progress": "In progress",
  "done": "Done",
};
const PRIORITY_COLORS = {
  basse: "bg-green-400 text-green-900",
  moyenne: "bg-yellow-400 text-yellow-900",
  haute: "bg-red-400 text-red-900",
  low: "bg-green-400 text-green-900",
  medium: "bg-yellow-400 text-yellow-900",
  high: "bg-red-400 text-red-900",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [tasksData, projectsData] = await Promise.all([
          getTasks(),
          getProjects(),
        ]);
        setTasks(tasksData);
        setProjects(projectsData);
        setError(null);
      } catch (err) {
        setError("Failed to load tasks or projects");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Classement : statut puis date limite
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    return 0;
  });

  function getProjectName(projectId) {
    const project = projects.find(
      (p) => p.id === projectId || p._id === projectId
    );
    return project ? project.title : "-";
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-white mb-6">All Tasks</h1>
      {loading ? (
        <div className="text-white text-center py-10">Loading tasks...</div>
      ) : error ? (
        <div className="text-red-400 text-center py-10">{error}</div>
      ) : sortedTasks.length === 0 ? (
        <div className="text-gray-400 text-center py-10">No tasks found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow border border-gray-700 bg-[#232329]">
          <table className="min-w-full text-left text-sm text-white">
            <thead>
              <tr className="bg-[#18181b]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Priority</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-t border-gray-700 hover:bg-[#18181b] transition-colors"
                >
                  <td className="px-4 py-3 font-semibold">{task.title}</td>
                  <td className="px-4 py-3">{getProjectName(task.project_id)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-700/30">
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.deadline ? (
                      <span>{task.deadline}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        PRIORITY_COLORS[task.priority] || "bg-gray-500 text-white"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 