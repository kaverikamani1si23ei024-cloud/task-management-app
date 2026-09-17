import type { Task, User, TaskStatus } from '@/lib/supabase';
import { STATUS_COLUMNS } from '@/lib/supabase';
import { TaskCard } from '@/components/TaskCard';
import { useState } from 'react';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  loading: boolean;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export function KanbanBoard({ tasks, loading, onMoveTask, onDeleteTask }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedId) onMoveTask(draggedId, status);
    setDraggedId(null);
    setDragOverStatus(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStatus(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        const isDragOver = dragOverStatus === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
            onDragLeave={() => setDragOverStatus((s) => (s === col.key ? null : s))}
            className={`flex flex-col rounded-2xl border bg-slate-100/60 transition-colors ${
              isDragOver ? 'border-slate-400 bg-slate-200/60' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    col.key === 'todo'
                      ? 'bg-slate-400'
                      : col.key === 'in_progress'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                />
                <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                {colTasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 px-3 pb-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
                ))
              ) : colTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dragging={draggedId === task.id}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
