'use client';
import React, { useState, useEffect } from 'react';
import { updateTask } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function TaskEditModal({ task, isOpen, onClose, onUpdate, isAdmin = false }) {
  const { session } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'to do',
    priority: 'medium',
    deadline: '',
    project_id: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'to do',
        priority: task.priority || 'medium',
        deadline: task.deadline ? task.deadline.split('T')[0] : '',
        project_id: task.project_id || null
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let taskData;
      
      // Pour les utilisateurs non-admin, permettre seulement la mise à jour du status
      if (!isAdmin) {
        taskData = { status: form.status };
      } else {
        // Pour les admins, permettre la mise à jour de tous les champs
        taskData = { ...form };
        if (!taskData.deadline) {
          delete taskData.deadline;
        }
        if (!taskData.project_id) {
          taskData.project_id = null;
        }
      }

      const updatedTask = await updateTask(task.id, taskData, [], [], session);
      onUpdate(updatedTask);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-400 text-xl"
          title="Close"
        >
          ×
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Task</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-600 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              required
              disabled={!isAdmin}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="to do">To Do</option>
                <option value="in progress">In Progress</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                  !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={!isAdmin}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
              className={`w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none ${
                !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isAdmin}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-xl transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 