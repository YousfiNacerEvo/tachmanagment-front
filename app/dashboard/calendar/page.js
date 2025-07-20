"use client";
import React, { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { getProjects, getTasks } from "../../../lib/api";

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projects, tasks] = await Promise.all([
        getProjects(),
        getTasks(),
      ]);
      const projectEvents = projects.map((p) => ({
        id: `project-${p.id || p._id}`,
        title: `📁 ${p.title}`,
        start: p.start,
        end: p.end,
        extendedProps: { ...p, type: "project" },
        backgroundColor: STATUS_COLORS[p.status] || "#60a5fa",
        borderColor: "#fff",
        textColor: "#222",
      }));
      const taskEvents = tasks.map((t) => ({
        id: `task-${t.id}`,
        title: `✅ ${t.title}`,
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
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEventClick = (info) => {
    alert(
      `${info.event.title}\nType: ${info.event.extendedProps.type}\nCliquez pour voir les détails (drawer à venir)`
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#18181b]">
      <style jsx global>{`
        .fc {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          background: transparent;
          color: #f3f4f6;
        }
        .fc .fc-toolbar {
          background: #232329;
          border-radius: 1rem 1rem 0 0;
          padding: 1.5rem 2rem 0.5rem 2rem;
          box-shadow: 0 2px 8px 0 #111827;
        }
        .fc .fc-toolbar-title {
          font-size: 2rem;
          font-weight: 700;
          color: #f3f4f6;
        }
        .fc .fc-button {
          background: #3730a3;
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          margin: 0 0.25rem;
          transition: background 0.2s;
        }
        .fc .fc-button:hover, .fc .fc-button:focus {
          background: #6366f1;
          color: #fff;
        }
        .fc .fc-daygrid-day {
          background: #232329;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background: #3730a3;
          border-radius: 0.5rem;
        }
        .fc .fc-event {
          border-radius: 0.75rem !important;
          box-shadow: 0 2px 8px 0 #111827;
          border: none !important;
          padding: 0.25rem 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          opacity: 0.98;
          color: #fff !important;
          transition: box-shadow 0.2s, opacity 0.2s;
        }
        .fc .fc-event:hover {
          box-shadow: 0 4px 16px 0 #6366f1;
          opacity: 1;
        }
        .fc .fc-daygrid-event-dot {
          display: none;
        }
        .fc .fc-col-header-cell-cushion {
          color: #a5b4fc;
          font-weight: 600;
          font-size: 1rem;
        }
        .fc .fc-scrollgrid {
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 16px 0 #111827;
        }
      `}</style>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Calendrier</h1>
        {/* Legend for colors and types */}
        <div className="flex flex-wrap gap-4 mb-6 items-center bg-[#232329] p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#60a5fa' }}></span>
            <span className="text-gray-200 text-sm">Project (Pending)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#818cf8' }}></span>
            <span className="text-gray-200 text-sm">Project (In Progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#34d399' }}></span>
            <span className="text-gray-200 text-sm">Project (Done)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#6ee7b7' }}></span>
            <span className="text-gray-200 text-sm">Task (Low)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#fde68a' }}></span>
            <span className="text-gray-200 text-sm">Task (Medium)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#fca5a5' }}></span>
            <span className="text-gray-200 text-sm">Task (High)</span>
          </div>
        </div>
        {/* End legend */}
        {loading ? (
          <div className="text-gray-400 text-center py-10">Chargement...</div>
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
          />
        )}
      </div>
    </div>
  );
} 