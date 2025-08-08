'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getUsers, getStandaloneTasksWithAssignees, getProjectTasksWithAssignees, getGroupsWithMembers, getGroupMembers } from '../../../lib/api';

// Simple progress bar
function ProgressBar({ completed, total }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className="h-2 bg-green-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TaskLoadOverviewPage() {
  const { isAdmin, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupMembersMap, setGroupMembersMap] = useState(new Map()); // groupId -> [userId]

  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [usersData, standaloneTasks, projectTasks, groupsData] = await Promise.all([
        getUsers(session),
        getStandaloneTasksWithAssignees(session),
        getProjectTasksWithAssignees(session),
        getGroupsWithMembers(session)
      ]);

      setUsers(usersData || []);
      setTasks([...(standaloneTasks || []), ...(projectTasks || [])]);
      const groupsList = groupsData || [];
      setGroups(groupsList);

      // Fetch members for each group to build membership map
      const membersByGroupEntries = await Promise.all(
        (groupsList || []).map(async (g) => {
          try {
            const members = await getGroupMembers(g.id, session);
            const ids = (members || []).map(m => m.user_id || m.id);
            return [g.id, ids];
          } catch (_) {
            return [g.id, []];
          }
        })
      );
      setGroupMembersMap(new Map(membersByGroupEntries));
    } catch (err) {
      setError(err.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isAdmin && session) fetchData();
  }, [isAdmin, session, fetchData]);

  // Re-fetch on window focus for near real-time updates
  useEffect(() => {
    const onFocus = () => fetchData();
    const onStorage = (e) => { if (e.key === 'tach:dataUpdated') fetchData(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchData]);

  // Build userId -> groupIds map
  const userGroupIdsMap = useMemo(() => {
    const map = new Map();
    for (const [gid, memberIds] of groupMembersMap.entries()) {
      for (const uid of memberIds) {
        if (!map.has(uid)) map.set(uid, new Set());
        map.get(uid).add(gid);
      }
    }
    return map;
  }, [groupMembersMap]);

  // Build per-user task lists: direct and via groups
  const { tasksDirectByUserId, tasksViaGroupByUserId } = useMemo(() => {
    const direct = new Map();
    const via = new Map();
    for (const u of users) {
      direct.set(u.id, []);
      via.set(u.id, []);
    }
    for (const t of tasks) {
      const directUserIds = (t.user_ids || t.assignees || []);
      for (const uid of directUserIds) {
        if (!direct.has(uid)) direct.set(uid, []);
        direct.get(uid).push(t);
      }
      const groupIds = (t.group_ids || t.groups || []);
      if (groupIds.length > 0) {
        for (const [uid, gidSet] of userGroupIdsMap.entries()) {
          for (const gid of groupIds) {
            if (gidSet.has(gid)) {
              if (!via.has(uid)) via.set(uid, []);
              via.get(uid).push(t);
              break;
            }
          }
        }
      }
    }
    return { tasksDirectByUserId: direct, tasksViaGroupByUserId: via };
  }, [tasks, users, userGroupIdsMap]);

  const userRows = useMemo(() => {
    return (users || []).map(u => {
      const directArr = tasksDirectByUserId.get(u.id) || [];
      const viaArr = tasksViaGroupByUserId.get(u.id) || [];
      const directIds = new Set(directArr.map(t => t.id));
      const viaIds = new Set(viaArr.map(t => t.id));
      // via only (not directly assigned)
      const viaOnlyIds = new Set(Array.from(viaIds).filter(id => !directIds.has(id)));
      // total = union(directIds, viaIds)
      const totalIds = new Set([...directIds, ...viaIds]);
      const totalArr = [...totalIds].map(id => (directArr.find(t => t.id === id) || viaArr.find(t => t.id === id)));
      const total = totalArr.length;
      const completed = totalArr.filter(t => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'terminé').length;
      const pending = total - completed;
      return {
        id: u.id,
        email: u.email,
        direct: directIds.size,
        via: viaOnlyIds.size,
        total,
        completed,
        pending
      };
    });
  }, [users, tasksDirectByUserId, tasksViaGroupByUserId]);

  const sortedUserRows = useMemo(() => {
    const rows = [...userRows];
    const { key, direction } = sortConfig;
    rows.sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [userRows, sortConfig]);

  const setSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // Group-level aggregates
  const groupRows = useMemo(() => {
    // Build group->tasks mapping from tasks assigned to groups
    const groupTaskCount = new Map();
    for (const t of tasks) {
      const gIds = t.group_ids || t.groups || [];
      for (const gid of gIds) {
        if (!groupTaskCount.has(gid)) groupTaskCount.set(gid, []);
        groupTaskCount.get(gid).push(t);
      }
    }

    return (groups || []).map(g => {
      const gTasks = groupTaskCount.get(g.id) || [];
      const total = gTasks.length;
      const completed = gTasks.filter(t => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'terminé').length;
      // Breakdown per user in this group (count tasks that belong to this group and are directly assigned to the user)
      const members = groupMembersMap.get(g.id) || [];
      const breakdownMap = new Map();
      for (const uid of members) breakdownMap.set(uid, 0);
      for (const t of gTasks) {
        const userIds = t.user_ids || t.assignees || [];
        for (const uid of userIds) {
          if (breakdownMap.has(uid)) breakdownMap.set(uid, (breakdownMap.get(uid) || 0) + 1);
        }
      }
      const breakdown = Array.from(breakdownMap.entries()).map(([uid, count]) => ({ uid, count }));
      return { id: g.id, name: g.name, total, completed, breakdown };
    });
  }, [groups, tasks, groupMembersMap]);

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Task Load Overview</h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 border border-red-200 p-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-10">
          {/* Users table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Per-user workload</h2>
                <p className="text-sm text-gray-500">Assigned, completed, pending with progress</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4 cursor-pointer" onClick={() => setSort('direct')}>Direct</th>
                    <th className="py-2 pr-4 cursor-pointer" onClick={() => setSort('via')}>Via groups</th>
                    <th className="py-2 pr-4 cursor-pointer" onClick={() => setSort('completed')}>Completed</th>
                    <th className="py-2 pr-4 cursor-pointer" onClick={() => setSort('pending')}>Pending</th>
                    <th className="py-2 pr-4 cursor-pointer" onClick={() => setSort('total')}>Total</th>
                    {/* <th className="py-2 pr-4">Progress</th> */}
                  </tr>
                </thead>
                <tbody>
                  {sortedUserRows.map(row => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-gray-900">{row.email}</td>
                      <td className="py-2 pr-4">{row.direct}</td>
                      <td className="py-2 pr-4">{row.via}</td>
                      <td className="py-2 pr-4 text-green-700">{row.completed}</td>
                      <td className="py-2 pr-4 text-yellow-700">{row.pending}</td>
                      <td className="py-2 pr-4">{row.total}</td>
                      {/* <td className="py-2 pr-4 w-48">
                        <ProgressBar completed={row.completed} total={row.total} />
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Group section */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Group overview</h2>
              <p className="text-sm text-gray-500">Totals and per-user breakdown</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupRows.map(g => {
                const total = g.total;
                const completed = g.completed;
                return (
                  <div key={g.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900">{g.name}</div>
                      <div className="text-xs text-gray-500">{completed}/{total} done</div>
                    </div>
                    <ProgressBar completed={completed} total={total} />
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-gray-500">Per-user breakdown</div>
                      <div className="space-y-1 max-h-40 overflow-auto">
                        {g.breakdown.length === 0 ? (
                          <div className="text-xs text-gray-400">No user-assigned tasks in this group</div>
                        ) : (
                          g.breakdown.map(item => {
                            const user = users.find(u => u.id === item.uid);
                            return (
                              <div key={`${g.id}-${item.uid}`} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 truncate mr-2">{user?.email || item.uid}</span>
                                <span className="text-gray-900 font-medium">{item.count}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

