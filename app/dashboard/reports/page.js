'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { getProjectsReport, getTasksReport } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

// Dynamically import react-chartjs-2 components to avoid SSR issues
const BarChart = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(m => m.Pie), { ssr: false });

// Register Chart.js (only on client)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
}

// Utility: export charts to PDF using Chart.js canvases (avoids html2canvas color parsing issues)
async function exportChartsToPDF({ title, rangeText, barChart, pieChart, filename = 'report.pdf' }) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, 40, 40);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  if (rangeText) pdf.text(rangeText, 40, 58);

  // Export images from Chart.js
  const barImg = barChart?.toBase64Image?.() || null;
  const pieImg = pieChart?.toBase64Image?.() || null;

  let y = 80;
  const maxWidth = pageWidth - 80;
  const addImageScaled = (imgData) => {
    if (!imgData) return;
    // Use a target height for readability
    const targetWidth = maxWidth;
    const targetHeight = 260; // ~3.6" at 72pt/inch
    pdf.addImage(imgData, 'PNG', 40, y, targetWidth, targetHeight);
    y += targetHeight + 24;
  };

  addImageScaled(barImg);
  addImageScaled(pieImg);

  pdf.save(filename);
}

// Utility: export data to Excel using SheetJS
async function exportToExcel({ filename, sheets }) {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, filename);
}

function useDateRangeDefault() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(today, 'yyyy-MM-dd'),
  };
}

function Section({
  title,
  timeSeries,
  byStatus,
  loading,
  onExportPDF,
  onExportExcel,
  onChartRefs,
  statusColors,
}) {
  const barRef = React.useRef(null);
  const pieRef = React.useRef(null);
  useEffect(() => {
    if (onChartRefs) onChartRefs({ barRef, pieRef });
  }, [onChartRefs]);
  const barData = useMemo(() => {
    // Prefer timeSeriesByStatus when provided to show per-status histogram
    if (timeSeries?.labels && timeSeries?.datasets) {
      // Pretty month labels if labels are YYYY-MM
      const prettyLabels = timeSeries.labels.map(l => {
        if (/^\d{4}-\d{2}$/.test(l)) {
          const [y, m] = l.split('-');
          const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
          return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        }
        return l;
      });
      return { ...timeSeries, labels: prettyLabels };
    }
    // Backward compatibility: fallback to single series (per day)
    return {
      labels: (timeSeries || []).map(p => p.date),
      datasets: [
        {
          label: `${title} per day`,
          data: (timeSeries || []).map(p => p.count),
          backgroundColor: [
            'rgba(34,197,94,0.7)', // green
            'rgba(59,130,246,0.7)', // blue
            'rgba(234,179,8,0.7)', // yellow
            'rgba(239,68,68,0.7)', // red
            'rgba(148,163,184,0.7)', // slate
          ],
          borderColor: 'rgba(59,130,246,1)',
          borderWidth: 1,
        },
      ],
    };
  }, [timeSeries, title]);

  const pieData = useMemo(() => {
    const labels = (byStatus || []).map(s => s.status);
    const normalize = (s) => (s || '').toString().replace(/_/g, ' ').toLowerCase();
    const defaultPalette = {
      'done': 'rgba(34,197,94,0.7)',
      'in progress': 'rgba(59,130,246,0.7)',
      'pending': 'rgba(234,179,8,0.7)',
      'to do': 'rgba(148,163,184,0.7)',
      'overdue': 'rgba(239,68,68,0.7)'
    };
    const bg = labels.map(l => {
      const key = normalize(l);
      return (statusColors && statusColors[key]) || defaultPalette[key] || 'rgba(148,163,184,0.7)';
    });
    return {
      labels,
      datasets: [
        {
          label: `${title} status distribution`,
          data: (byStatus || []).map(s => s.count),
          backgroundColor: bg,
          borderWidth: 0,
        },
      ],
    };
  }, [byStatus, title, statusColors]);

  return (
    <section className="bg-white/40 rounded-xl p-4 md:p-6 shadow border border-[#1e293b]">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-black">{title}</h2>
        <div className="flex gap-2">
          <button onClick={onExportPDF} className="px-3 py-2 rounded bg-white/10 text-black hover:bg-white/20 transition" disabled={loading}>Export PDF</button>
          <button onClick={onExportExcel} className="px-3 py-2 rounded bg-white/10 text-black hover:bg-white/20 transition">Export Excel</button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-10">Loading {title.toLowerCase()} report...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white text-black rounded-lg p-3">
            <h3 className="text-black mb-2">Evolution over time</h3>
            <div className="h-64">
              <BarChart ref={barRef} data={barData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#cbd5e1', usePointStyle: true, pointStyle: 'rectRounded' }
                  },
                  title: { display: false }
                },
                scales: {
                  x: { ticks: { color: '#cbd5e1' } },
                  y: {
                    beginAtZero: true,
                    ticks: { color: '#cbd5e1', stepSize: 1 }
                  }
                }
              }} />
            </div>
          </div>
          <div className="bg-white text-black rounded-lg p-3">
            <h3 className="text-black mb-2">Status distribution</h3>
            <div className="h-64">
              <PieChart ref={pieRef} data={pieData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } }
              }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ReportsPage() {
  const { isAdmin, session } = useAuth();
  const initialRange = useDateRangeDefault();
  const [range, setRange] = useState(initialRange);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [projectsData, setProjectsData] = useState({ timeSeries: [], byStatus: [], timeSeriesByStatus: null });
  const [tasksData, setTasksData] = useState({ timeSeries: [], byStatus: [], timeSeriesByStatus: null });

  const [projectsChartRefs, setProjectsChartRefs] = useState(null);
  const [tasksChartRefs, setTasksChartRefs] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!session) return;
    setLoadingProjects(true);
    setLoadingTasks(true);
    try {
      const [p, t] = await Promise.all([
        getProjectsReport(range, session),
        getTasksReport(range, session),
      ]);
      setProjectsData(p);
      setTasksData(t);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoadingProjects(false);
      setLoadingTasks(false);
    }
  }, [session, range]);

  useEffect(() => {
    if (!isAdmin) return; // page admin only
    fetchReports();
  }, [fetchReports, isAdmin]);

  // Debounced auto refresh when range changes
  useEffect(() => {
    if (!isAdmin) return;
    const id = setTimeout(() => {
      fetchReports();
    }, 400);
    return () => clearTimeout(id);
  }, [range.start, range.end, fetchReports, isAdmin]);

  // Refetch when window regains focus or tab becomes visible
  useEffect(() => {
    const onFocus = () => fetchReports();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchReports();
    };
    const onDataUpdated = () => fetchReports();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('tach:dataUpdated', onDataUpdated);
    window.addEventListener('storage', (e) => {
      if (e.key === 'tach:dataUpdated') fetchReports();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('tach:dataUpdated', onDataUpdated);
    };
  }, [fetchReports]);

  // IMPORTANT: Call hooks (like useMemo) before any conditional returns to keep hook order stable
  const projectsTimeSeriesForBar = useMemo(() => {
    if (projectsData.timeSeriesByStatus?.labels) {
      const colors = {
        pending: 'rgba(234,179,8,0.7)', // yellow
        in_progress: 'rgba(59,130,246,0.7)', // blue
        done: 'rgba(34,197,94,0.7)', // green
        overdue: 'rgba(239,68,68,0.7)' // red
      };
      
      // Function to normalize status labels
      const normalizeStatusLabel = (status) => {
        switch (status) {
          case 'pending': return 'Pending';
          case 'in_progress': return 'In Progress';
          case 'done': return 'Done';
          case 'overdue': return 'Overdue';
          default: return status.replace('_', ' ');
        }
      };
      
      return {
        labels: projectsData.timeSeriesByStatus.labels,
        datasets: (projectsData.timeSeriesByStatus.datasets || []).map(ds => ({
          label: normalizeStatusLabel(ds.status),
          data: ds.counts,
          backgroundColor: colors[ds.status] || 'rgba(148,163,184,0.7)'
        }))
      };
    }
    return projectsData.timeSeries;
  }, [projectsData]);

  const tasksTimeSeriesForBar = useMemo(() => {
    if (tasksData.timeSeriesByStatus?.labels) {
      const colors = {
        'to do': 'rgba(148,163,184,0.7)', // slate
        'in progress': 'rgba(59,130,246,0.7)', // blue
        'done': 'rgba(34,197,94,0.7)', // green
        'overdue': 'rgba(239,68,68,0.7)' // red
      };
      
      // Function to normalize task status labels
      const normalizeTaskStatusLabel = (status) => {
        switch (status) {
          case 'to do': return 'To Do';
          case 'in progress': return 'In Progress';
          case 'done': return 'Done';
          case 'overdue': return 'Overdue';
          default: return status;
        }
      };
      
      return {
        labels: tasksData.timeSeriesByStatus.labels,
        datasets: (tasksData.timeSeriesByStatus.datasets || []).map(ds => ({
          label: normalizeTaskStatusLabel(ds.status),
          data: ds.counts,
          backgroundColor: colors[ds.status] 
        }))
      };
    }
    return tasksData.timeSeries;
  }, [tasksData]);

  const handleExportProjectsPDF = async () => {
    const bar = projectsChartRefs?.barRef?.current;
    const pie = projectsChartRefs?.pieRef?.current;
    await exportChartsToPDF({
      title: 'Projects Report',
      rangeText: `${range.start} → ${range.end}`,
      barChart: bar,
      pieChart: pie,
      filename: `projects-report-${range.start}_to_${range.end}.pdf`,
    });
  };
  const handleExportTasksPDF = async () => {
    const bar = tasksChartRefs?.barRef?.current;
    const pie = tasksChartRefs?.pieRef?.current;
    await exportChartsToPDF({
      title: 'Tasks Report',
      rangeText: `${range.start} → ${range.end}`,
      barChart: bar,
      pieChart: pie,
      filename: `tasks-report-${range.start}_to_${range.end}.pdf`,
    });
  };

  const handleExportProjectsExcel = () => exportToExcel({
    filename: `projects-report-${range.start}_to_${range.end}.xlsx`,
    sheets: [
      { name: 'TimeSeries', rows: projectsData.timeSeries },
      { name: 'ByStatus', rows: projectsData.byStatus },
    ],
  });
  const handleExportTasksExcel = () => exportToExcel({
    filename: `tasks-report-${range.start}_to_${range.end}.xlsx`,
    sheets: [
      { name: 'TimeSeries', rows: tasksData.timeSeries },
      { name: 'ByStatus', rows: tasksData.byStatus },
    ],
  });

  if (!isAdmin) {
    return (
      <div className="p-6 text-slate-200">Access denied. Admins only.</div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-slate-200">
      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Start date</label>
            <input
              type="date"
              value={range.start}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
              className="w-full rounded bg-white text-black border border-[#1e293b] p-2"
              max={range.end}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">End date</label>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
              className="w-full rounded bg-white border border-[#1e293b] p-2 text-black"
              min={range.start}
            />
          </div>
        </div>
        <button onClick={fetchReports} className="h-10 px-4 rounded bg-blue-600 hover:bg-blue-500 transition">Refresh</button>
      </div>

      <div className="space-y-6">
        <Section
          title="Projects"
          timeSeries={projectsTimeSeriesForBar}
          byStatus={projectsData.byStatus}
          loading={loadingProjects}
          onExportPDF={handleExportProjectsPDF}
          onExportExcel={handleExportProjectsExcel}
          onChartRefs={setProjectsChartRefs}
          statusColors={{ 'pending': 'rgba(234,179,8,0.7)', 'in progress': 'rgba(59,130,246,0.7)', 'done': 'rgba(34,197,94,0.7)', 'overdue': 'rgba(239,68,68,0.7)' }}
        />
        <Section
          title="Tasks"
          timeSeries={tasksTimeSeriesForBar}
          byStatus={tasksData.byStatus}
          loading={loadingTasks}
          onExportPDF={handleExportTasksPDF}
          onExportExcel={handleExportTasksExcel}
          onChartRefs={setTasksChartRefs}
          statusColors={{ 'to do': 'rgba(148,163,184,0.7)', 'in progress': 'rgba(59,130,246,0.7)', 'done': 'rgba(34,197,94,0.7)', 'overdue': 'rgba(239,68,68,0.7)' }}
        />
      </div>
    </div>
  );
}


