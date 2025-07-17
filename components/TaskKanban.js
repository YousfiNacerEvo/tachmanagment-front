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
      onClick={(e) => {
        e.stopPropagation();
        onEdit && onEdit(task);
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base font-semibold truncate text-white">{task.title}</span>
        <span className={`px-2 py-1 rounded text-xs font-semibold
          ${task.status === 'terminé' ? 'bg-green-400 text-green-900' : task.status === 'en cours' ? 'bg-blue-400 text-blue-900' : 'bg-gray-400 text-gray-900'}`}
        >
          {task.status}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
        <span className={`px-2 py-1 rounded font-semibold
          ${task.priority === 'haute' ? 'bg-red-400 text-red-900' : task.priority === 'moyenne' ? 'bg-yellow-400 text-yellow-900' : 'bg-green-400 text-green-900'}`}
        >
          {task.priority}
        </span>
        <span>Deadline: {task.deadline || '-'}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
        <div
          className={`h-2 rounded-full ${task.progress === 100 ? 'bg-green-400' : task.progress >= 50 ? 'bg-blue-400' : 'bg-yellow-400'}`}
          style={{ width: `${task.progress}%` }}
        ></div>
      </div>
      <span className="text-xs text-gray-400">{task.progress}%</span>
      <div className="flex gap-2 mt-2">
        <button
          onClick={e => { e.stopPropagation(); onEdit && onEdit(task); }}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
        >
          Éditer
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete && onDelete(task.id); }}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
        >
          Supprimer
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