'use client';
import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import ProjectCard from './ProjectCard';

const STATUS_COLUMNS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
];

function DroppableColumn({ id, children, label, onNewProject, projectIds }) {
  React.useEffect(() => {
    console.log(`[Kanban] Column '${label}' ids:`, projectIds);
  }, [projectIds, label]);
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="min-w-[260px] w-full max-w-xs flex flex-col bg-[#232329] rounded-lg p-4 shadow-md"
      style={{ height: '100%', maxHeight: '100%', marginBottom: 16, border: '1px solid #444', marginRight: 24 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-bold text-white">{label}</h4>
      </div>
      <div className="flex-1 flex flex-col gap-2 justify-start" style={{ overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

export default function ProjectKanban({ projects, onNewProject, onEdit, onStatusChange }) {
  const [activeId, setActiveId] = React.useState(null);
  const [items, setItems] = React.useState(projects);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    setItems(projects);
  }, [projects]);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    console.log('[Kanban] handleDragEnd:', { active, over });

    if (!active || !over) {
      console.log('[Kanban] No active or over element');
      return;
    }

    let overId = over?.id;
    let newStatus = null;
    const activeProject = items.find(p => p.id === active.id);

    console.log('[Kanban] activeProject:', activeProject);
    console.log('[Kanban] overId:', overId);

    if (STATUS_COLUMNS.some(col => col.value === overId)) {
      newStatus = overId;
      console.log('[Kanban] Dropped on status column:', newStatus);
    } else {
      // Peut-être qu'on drop sur une carte (projet)
      const overProject = items.find(p => p.id === overId);
      if (overProject) {
        newStatus = overProject.status;
        console.log('[Kanban] Dropped on project, using its status:', newStatus);
      }
    }

    if (activeProject && newStatus && activeProject.status !== newStatus) {
      console.log(`[Kanban] Drag: project ${activeProject.id} from ${activeProject.status} to ${newStatus}`);
      onStatusChange(activeProject, newStatus);
    } else {
      console.warn('[Kanban] Drag error:', { active, over, activeProject, overId, newStatus });
    }
  }

  const activeProject = activeId ? items.find(p => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-8 overflow-x-auto pb-2 items-start" style={{ height: '100%' }}>
        {STATUS_COLUMNS.map((col) => {
          const colProjects = items.filter(p => p.status === col.value);
          const colIds = colProjects.map(p => p.id);
          return (
            <DroppableColumn key={col.value} id={col.value} label={col.label} onNewProject={null} projectIds={colIds}>
              <SortableContext
                items={colIds}
                strategy={verticalListSortingStrategy}
              >
                {colProjects.length === 0 ? (
                  <div className="text-gray-400 text-xs text-center py-4">No projects</div>
                ) : (
                  colProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} onEdit={onEdit} />
                  ))
                )}
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} onEdit={onEdit} /> : null}
      </DragOverlay>
    </DndContext>
  );
} 