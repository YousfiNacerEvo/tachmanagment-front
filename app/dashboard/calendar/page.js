"use client";
import React, { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { getTasks, getAllUserTasks, getProjects, getProjectsByUser } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";

const STATUS_COLORS = {
  pending: "#60a5fa", // bleu pastel
  in_progress: "#818cf8", // violet pastel
  done: "#34d399", // vert pastel
};
const TASK_COLORS = {
  basse: "#6ee7b7", // vert clair
  moyenne: "#fde68a", // jaune pastel
  haute: "#fca5a5", // rouge pastel
  low: "#6ee7b7",
  medium: "#fde68a",
  high: "#fca5a5",
};

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { session, isAdmin, isMember, user } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projects, tasks] = await Promise.all([
        isAdmin ? getProjects(session) : getProjectsByUser(user?.id, session),
        isAdmin ? getTasks(session) : getAllUserTasks(user?.id, session),
      ]);

      const projectEvents = (projects || []).map((p) => ({
        id: `project-${p.id || p._id}`,
        title: p.title,
        start: p.start,
        end: p.end,
        extendedProps: { ...p, type: "project" },
        backgroundColor: STATUS_COLORS[p.status] || "#60a5fa",
        borderColor: "#fff",
        textColor: "#222",
      }));

      const taskEvents = (tasks || []).map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        start: t.deadline || t.start,
        end: t.deadline || t.end,
        extendedProps: { ...t, type: "task" },
        backgroundColor: TASK_COLORS[t.priority] || "#6ee7b7",
        borderColor: "#fff",
        textColor: "#222",
      }));
      setEvents([...projectEvents, ...taskEvents]);
      setError(null);
    } catch (err) {
      setError("Erreur when loading please refresh");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEventClick = (info) => {
    const type = info.event.extendedProps?.type;
    if (type === 'project') {
      // Admin can open the project drawer; members cannot click projects
      if (!isAdmin) return;
      const projectId = info.event.extendedProps?.id || info.event.extendedProps?._id;
      if (projectId) router.push(`/dashboard/projects?projectId=${projectId}`);
      return;
    }
    if (type === 'task') {
      const taskId = info.event.extendedProps?.id;
      if (!taskId) return;
      if (isAdmin) {
        router.push(`/dashboard/tasks?taskId=${taskId}`);
      } else {
        router.push(`/dashboard/my-work?taskId=${taskId}`);
      }
      return;
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <style jsx global>{`
        .fc {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          background: transparent;
          color: #222;
        }
        .fc .fc-toolbar {
          background: #f7f9fb;
          border-radius: 1rem 1rem 0 0;
          padding: 1.5rem 2rem 0.5rem 2rem;
          box-shadow: 0 2px 8px 0 #e5e7eb;
        }
        .fc .fc-toolbar-title {
          font-size: 2rem;
          font-weight: 700;
          color: #222;
        }
        .fc .fc-button {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          margin: 0 0.25rem;
          transition: background 0.2s;
        }
        .fc .fc-button:hover, .fc .fc-button:focus {
          background: #1d4ed8;
          color: #fff;
        }
        .fc .fc-daygrid-day {
          background: #fff;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background: #dbeafe;
          border-radius: 0.5rem;
        }
        .fc .fc-event {
          border-radius: 0.75rem !important;
          box-shadow: 0 2px 8px 0 #e0e7ef;
          border: none !important;
          padding: 0.25rem 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          opacity: 0.98;
          color: #222 !important;
          transition: box-shadow 0.2s, opacity 0.2s;
        }
        .fc .fc-event:hover {
          box-shadow: 0 4px 16px 0 #2563eb;
          opacity: 1;
        }
        .fc .fc-daygrid-event-dot {
          display: none;
        }
        .fc .fc-col-header-cell-cushion {
          color: #2563eb;
          font-weight: 600;
          font-size: 1rem;
        }
        .fc .fc-scrollgrid {
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 16px 0 #e0e7ef;
        }
      `}</style>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Calendrier</h1>
        {/* Legend (projects + tasks) */}
        <div className="flex flex-wrap gap-4 mb-6 items-center bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#60a5fa' }}></span>
            <span className="text-gray-700 text-sm">Project (Pending)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#818cf8' }}></span>
            <span className="text-gray-700 text-sm">Project (In Progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#34d399' }}></span>
            <span className="text-gray-700 text-sm">Project (Done)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#6ee7b7' }}></span>
            <span className="text-gray-700 text-sm">Task (Low)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#fde68a' }}></span>
            <span className="text-gray-700 text-sm">Task (Medium)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#fca5a5' }}></span>
            <span className="text-gray-700 text-sm">Task (High)</span>
          </div>
        </div>
        {/* End legend */}
        {loading ? (
          <div className="text-gray-400 text-center py-10">Loading...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-10">{error}</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            eventDisplay="block"
            dayMaxEventRows={3}
            eventContent={(arg) => {
              const type = arg.event.extendedProps?.type;
              const isProject = type === 'project';
              const icon = isProject
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:text-top"><path d="M10 4h4a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v3H2V9a2 2 0 0 1 2-2h2V6a2 2 0 0 1 2-2Zm4 3V6h-4v1h4Z"></path><path d="M2 13h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5Z"></path></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:text-top"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm5 8.59-5.66 5.66a1 1 0 0 1-1.41 0L7 13.91l1.41-1.41 2.11 2.11 4.95-4.95L17 10.59Z"></path></svg>';
              return { html: `${icon}${arg.event.title}` };
            }}
          />
        )}
      </div>
    </div>
  );
} 