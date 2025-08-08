'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getUsers, getProjects, getAllGroups, getProjectTasksWithAssignees, getStandaloneTasksWithAssignees, getAllUserTasks, getUserGroupsWithDetails } from '../../../lib/api';

function StatCard({ label, value, sub }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function MiniBar({ values = [] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((v, i) => (
        <div key={i} className="flex-1 bg-blue-100 rounded" style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

export default function StatisticsPage() {
  const { isAdmin, user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [userGroups, setUserGroups] = useState([]);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const [usersData, projectsData, groupsData, projectTasks, standaloneTasks] = await Promise.all([
          getUsers(session),
          getProjects(session),
          getAllGroups(session),
          getProjectTasksWithAssignees(session),
          getStandaloneTasksWithAssignees(session)
        ]);
        setUsers(usersData || []);
        setProjects(projectsData || []);
        setGroups(groupsData || []);
        setTasks([...(projectTasks || []), ...(standaloneTasks || [])]);
      } else if (user?.id) {
        const [tasksData, groupsDetails] = await Promise.all([
          getAllUserTasks(user.id, session),
          getUserGroupsWithDetails(user.id, session)
        ]);
        setUserTasks(tasksData || []);
        setUserGroups(groupsDetails || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Admin aggregates
  const adminStats = useMemo(() => {
    if (!isAdmin) return null;
    const totalUsers = users.length;
    const totalProjects = projects.length;
    const totalGroups = groups.length;
    const totalTasks = tasks.length;
    const completed = tasks.filter(t => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'terminé').length;
    const overdue = tasks.filter(t => (t.status || '').toLowerCase() === 'overdue').length;
    const pending = totalTasks - completed - overdue;

    // Most active users: by number of tasks (direct assignees)
    const userCount = new Map();
    for (const t of tasks) {
      const uids = t.user_ids || t.assignees || [];
      for (const id of uids) userCount.set(id, (userCount.get(id) || 0) + 1);
    }
    const mostActiveUsers = Array.from(userCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, email: users.find(u => u.id === id)?.email || id, count }));

    // Most active groups: by number of group-assigned tasks
    const groupCount = new Map();
    for (const t of tasks) {
      const gids = t.group_ids || t.groups || [];
      for (const id of gids) groupCount.set(id, (groupCount.get(id) || 0) + 1);
    }
    const mostActiveGroups = Array.from(groupCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, name: groups.find(g => g.id === id)?.name || id, count }));

    // Daily/weekly completion graph (last 14 days)
    const completedByDay = new Map();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      completedByDay.set(key, 0);
    }
    for (const t of tasks) {
      if ((t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'terminé') {
        const d = (t.updated_at || t.completed_at || t.deadline || t.created_at || '').slice(0, 10);
        if (completedByDay.has(d)) completedByDay.set(d, (completedByDay.get(d) || 0) + 1);
      }
    }
    const dailySeries = Array.from(completedByDay.values());

    return { totalUsers, totalProjects, totalGroups, totalTasks, completed, pending, overdue, mostActiveUsers, mostActiveGroups, dailySeries };
  }, [isAdmin, users, projects, groups, tasks]);

  // Member/guest stats
  const memberStats = useMemo(() => {
    if (isAdmin) return null;
    const total = userTasks.length;
    const completed = userTasks.filter(t => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'terminé').length;
    const pending = total - completed;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, rate };
  }, [isAdmin, userTasks]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>

      {isAdmin ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Users" value={adminStats.totalUsers} />
            <StatCard label="Projects" value={adminStats.totalProjects} />
            <StatCard label="Groups" value={adminStats.totalGroups} />
            <StatCard label="Tasks" value={adminStats.totalTasks} />
            <StatCard label="Completed" value={adminStats.completed} />
            <StatCard label="Pending" value={adminStats.pending} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="font-semibold mb-3">Most Active Users</div>
              {adminStats.mostActiveUsers.length === 0 ? (
                <div className="text-sm text-gray-500">No data</div>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {adminStats.mostActiveUsers.map(u => (
                    <li key={u.id} className="flex justify-between"><span>{u.email}</span><span className="text-gray-500">{u.count}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="font-semibold mb-3">Most Active Groups</div>
              {adminStats.mostActiveGroups.length === 0 ? (
                <div className="text-sm text-gray-500">No data</div>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {adminStats.mostActiveGroups.map(g => (
                    <li key={g.id} className="flex justify-between"><span>{g.name}</span><span className="text-gray-500">{g.count}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="font-semibold mb-3">Daily Completions (last 14 days)</div>
            <MiniBar values={adminStats.dailySeries} />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Assigned" value={memberStats.total} />
            <StatCard label="Completed" value={memberStats.completed} />
            <StatCard label="Pending" value={memberStats.pending} />
            <StatCard label="Completion Rate" value={`${memberStats.rate}%`} />
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="font-semibold mb-3">My Groups Activity</div>
            {userGroups.length === 0 ? (
              <div className="text-sm text-gray-500">No groups</div>
            ) : (
              <ul className="text-sm text-gray-800 space-y-1">
                {userGroups.map(g => (
                  <li key={g.group_id} className="flex justify-between">
                    <span>{g.name}</span>
                    <span className="text-gray-500">{(g.tasks || []).length} tasks</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


