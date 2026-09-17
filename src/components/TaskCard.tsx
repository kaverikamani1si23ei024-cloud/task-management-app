import type { Task } from '@/lib/supabase';
import { PRIORITY_STYLES, AVATAR_STYLES } from '@/lib/supabase';
import { Calendar, GripVertical, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDelete: (taskId: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

export function TaskCard({ task, dragging, onDragStart, onDragEnd, onDelete }: TaskCardProps) {
  const assignee = task.assignee;
  const initials = assignee
    ? assignee.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : null;
  const avatarColor = assignee ? AVATAR_STYLES[assignee.color] ?? AVATAR_STYLES.slate : null;
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug text-slate-900">{task.title}</h4>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <GripVertical className="mt-0.5 h-4 w-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
        </div>
      </div>

      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {task.description}
        </p>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-1 text-xs ${overdue ? 'font-medium text-rose-600' : 'text-slate-500'}`}
        >
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(task.due_date)}
          {overdue && <span className="ml-0.5">· overdue</span>}
        </div>
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avatarColor}`}
              title={assignee.name}
            >
              {initials}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}
      </div>
    </div>
  );
}
