'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getUsers, getProjects, getAllGroups, getProjectTasksWithAssignees, getStandaloneTasksWithAssignees, getAllUserTasks, getUserGroupsWithDetails } from '../../../lib/api';

function StatCard({ label, value, sub, icon = null, color = 'blue' }) {
  const colorMap = {
    blue: 'from-blue-50 to-blue-100 text-blue-700',
    green: 'from-green-50 to-green-100 text-green-700',
    purple: 'from-purple-50 to-purple-100 text-purple-700',
    amber: 'from-amber-50 to-amber-100 text-amber-700',
    rose: 'from-rose-50 to-rose-100 text-rose-700',
    slate: 'from-slate-50 to-slate-100 text-slate-700',
  };
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color] || colorMap.blue} opacity-60 pointer-events-none`} />
      <div className="relative flex items-start gap-3">
        {icon && (
          <div className="shrink-0 p-2 rounded-lg bg-white/70 border border-gray-200">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function RingProgress({ percent = 0, size = 120, stroke = 12, label = 'Completion' }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white">
      <svg width={size} height={size} className="shrink-0" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#grad)"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-lg font-bold fill-gray-900">
          {clamped}%
        </text>
      </svg>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-gray-900 font-semibold">Tasks completed</div>
        <div className="text-xs text-gray-500">Based on current totals</div>
      </div>
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

    // Project status analysis
    const normalizeProjectStatus = (status) => {
      const s = (status || '').toLowerCase();
      if (s === 'terminé' || s === 'completed' || s === 'done') return 'done';
      if (s === 'in_progress' || s === 'in progress') return 'in progress';
      if (s === 'pending' || s === 'à faire' || s === 'to do') return 'pending';
      return s;
    };

    let projectPendingCount = 0;
    let projectInProgressCount = 0;
    let projectDoneCount = 0;
    for (const p of projects) {
      const ns = normalizeProjectStatus(p.status);
      if (ns === 'pending') projectPendingCount += 1;
      else if (ns === 'in progress') projectInProgressCount += 1;
      else if (ns === 'done') projectDoneCount += 1;
    }

    const projectCompleted = projectDoneCount;
    const projectCompletionRate = totalProjects === 0 ? 0 : Math.round((projectCompleted / totalProjects) * 100);

    const normalizeStatus = (status) => {
      const s = (status || '').toLowerCase();
      if (s === 'terminé' || s === 'completed' || s === 'done') return 'done';
      if (s === 'in_progress' || s === 'in progress') return 'in progress';
      if (s === 'pending' || s === 'à faire' || s === 'to do') return 'to do';
      if (s === 'overdue') return 'overdue';
      return s;
    };

    let toDoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;
    let overdueCount = 0;
    for (const t of tasks) {
      const ns = normalizeStatus(t.status);
      if (ns === 'to do') toDoCount += 1;
      else if (ns === 'in progress') inProgressCount += 1;
      else if (ns === 'done') doneCount += 1;
      else if (ns === 'overdue') overdueCount += 1;
    }

    const completed = doneCount;
    const overdue = overdueCount;
    const pending = toDoCount + inProgressCount; // keep legacy aggregate for existing cards

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

    return { 
      totalUsers, 
      totalProjects, 
      totalGroups, 
      totalTasks, 
      completed, 
      pending, 
      overdue, 
      toDoCount, 
      inProgressCount, 
      doneCount, 
      overdueCount, 
      projectCompleted,
      projectCompletionRate,
      projectPendingCount,
      projectInProgressCount,
      projectDoneCount,
      mostActiveUsers, 
      mostActiveGroups, 
      dailySeries 
    };
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
          <div className="grid grid-cols-5 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
            <StatCard
              label="Users"
              value={adminStats.totalUsers}
              color="blue"
              icon={(
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4.26a4 4 0 10-8 0 4 4 0 008 0z" />
                </svg>
              )}
            />
            <StatCard
              label="Groups"
              value={adminStats.totalGroups}
              color="amber"
              icon={(
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M12 7a4 4 0 110-8 4 4 0 010 8z" />
                </svg>
              )}
            />
            <StatCard
              label="Projects"
              value={adminStats.totalProjects}
              color="purple"
              icon={(
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21h8m-4-4v4m-7-8h14l-7-8-7 8z" />
                </svg>
              )}
            />
             <StatCard
              label="Tasks"
              value={adminStats.totalTasks}
              color="slate"
              icon={(
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6M9 8h6m2 10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10z" />
                </svg>
              )}
            />
            <StatCard
              label="Completed Projects"
              value={adminStats.projectCompleted}
              color="green"
              icon={(
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            />
            
           
            <StatCard
              label="Completed (tasks)"
              value={adminStats.completed}
              color="green"
              icon={(
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            />
          
          </div>
          {/* Task Distribution */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900">Task Workload Overview</div>
              <div className="text-sm text-gray-500">Distribution of tasks by status</div>
            </div>
            {adminStats.totalTasks === 0 ? (
              <div className="text-sm text-gray-500">No tasks</div>
            ) : (
              <>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
                  <div className="h-3 bg-blue-400" style={{ width: `${Math.round((adminStats.toDoCount / adminStats.totalTasks) * 100)}%` }} />
                  <div className="h-3 bg-yellow-400" style={{ width: `${Math.round((adminStats.inProgressCount / adminStats.totalTasks) * 100)}%` }} />
                  <div className="h-3 bg-green-500" style={{ width: `${Math.round((adminStats.doneCount / adminStats.totalTasks) * 100)}%` }} />
                  <div className="h-3 bg-rose-400" style={{ width: `${Math.round((adminStats.overdueCount / adminStats.totalTasks) * 100)}%` }} />
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-400" /> To do {adminStats.toDoCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400" /> In progress {adminStats.inProgressCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /> Done {adminStats.doneCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-rose-400" /> Overdue {adminStats.overdueCount}</div>
                </div>
              </>
            )}
          </div>

          {/* Project Distribution */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900">Project Workload Overview</div>
              <div className="text-sm text-gray-500">Distribution of projects by status</div>
            </div>
            {adminStats.totalProjects === 0 ? (
              <div className="text-sm text-gray-500">No projects</div>
            ) : (
              <>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
                  <div className="h-3 bg-blue-400" style={{ width: `${Math.round((adminStats.projectPendingCount / adminStats.totalProjects) * 100)}%` }} />
                  <div className="h-3 bg-yellow-400" style={{ width: `${Math.round((adminStats.projectInProgressCount / adminStats.totalProjects) * 100)}%` }} />
                  <div className="h-3 bg-green-500" style={{ width: `${Math.round((adminStats.projectDoneCount / adminStats.totalProjects) * 100)}%` }} />
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-400" /> Pending {adminStats.projectPendingCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400" /> In progress {adminStats.projectInProgressCount}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /> Completed {adminStats.projectDoneCount}</div>
                </div>
              </>
            )}
          </div>

          {/* Completion rate rings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RingProgress
              percent={adminStats.totalTasks === 0 ? 0 : Math.round((adminStats.completed / adminStats.totalTasks) * 100)}
              label="Task Completion Rate"
            />
            <RingProgress
              percent={adminStats.projectCompletionRate}
              label="Project Completion Rate"
            />
          </div>
          
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Assigned" value={memberStats.total} color="slate" icon={(<svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6M9 8h6m2 10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10z" /></svg>)} />
            <StatCard label="Completed" value={memberStats.completed} color="green" icon={(<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>)} />
            <StatCard label="Pending" value={memberStats.pending} color="amber" icon={(<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>)} />
            <StatCard label="Completion Rate" value={`${memberStats.rate}%`} color="blue" icon={(<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RingProgress percent={memberStats.rate} label="My Completion Rate" />
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="font-semibold mb-3">My Workload</div>
              {memberStats.total === 0 ? (
                <div className="text-sm text-gray-500">No tasks</div>
              ) : (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 bg-green-500" style={{ width: `${Math.round((memberStats.completed / memberStats.total) * 100)}%` }} />
                    <div className="h-3 bg-yellow-400" style={{ width: `${Math.round((memberStats.pending / memberStats.total) * 100)}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /> Completed {memberStats.completed}</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400" /> Pending {memberStats.pending}</div>
                  </div>
                </>
              )}
            </div>
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


