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

const STATUS_COLUMNS = [
  { value: 'à faire', label: 'À faire' },
  { value: 'en cours', label: 'En cours' },
  { value: 'terminé', label: 'Terminé' },
];

function DroppableColumn({ id, children, label, onNewTask }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="min-w-[260px] w-full max-w-xs flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-bold text-white">{label}</h4>
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="ml-2 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow"
          >
            + Nouvelle tâche
          </button>
        )}
      </div>
      <div className="flex-1 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete }) {
  return (
    <div
      className="bg-[#232329] border border-gray-700 rounded-xl shadow-sm p-4 mb-4 min-w-[220px] max-w-xs cursor-pointer hover:shadow-lg transition-all"
      data-cy={`task-card-${task.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onEdit && onEdit(task);
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-semibold truncate text-white">{task.title}</span>
        <span className={`px-2 py-1 rounded text-sm font-semibold
          ${task.status === 'terminé' ? 'bg-green-500 text-white' : task.status === 'en cours' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}
        >
          {task.status}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              task.priority === 'haute' ? 'bg-red-400' : 
              task.priority === 'moyenne' ? 'bg-yellow-400' : 'bg-green-400'
            }`}></span>
            Priority: {task.priority}
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Progress: {task.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300`}
              style={{ width: `${task.progress || 0}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={e => { e.stopPropagation(); onEdit && onEdit(task); }}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="Edit task"
          data-cy={`task-edit-${task.id}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete && onDelete(task.id); }}
          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="Delete task"
          data-cy={`task-delete-${task.id}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TaskKanban({ tasks, onNewTask, onEdit, onDelete, onStatusChange }) {
  const [activeId, setActiveId] = React.useState(null);
  const [items, setItems] = React.useState(tasks);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const activeTask = items.find(t => t.id === active.id);
      const overColumn = over?.id;

      if (activeTask && overColumn && STATUS_COLUMNS.find(col => col.value === overColumn)) {
        const newStatus = overColumn;
        if (activeTask.status !== newStatus) {
          onStatusChange(activeTask, newStatus);
        }
      }
    }
  }

  const activeTask = activeId ? items.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STATUS_COLUMNS.map((col) => (
          <DroppableColumn key={col.value} id={col.value} label={col.label} onNewTask={onNewTask}>
            <SortableContext
              items={items.filter(t => t.status === col.value).map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.filter(t => t.status === col.value).length === 0 ? (
                <div className="text-gray-400 text-xs text-center py-4">Aucune tâche</div>
              ) : (
                items.filter(t => t.status === col.value).map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
                ))
              )}
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} onEdit={onEdit} /> : null}
      </DragOverlay>
    </DndContext>
  );
} 