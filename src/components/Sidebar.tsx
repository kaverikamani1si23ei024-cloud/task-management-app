import type { Workload } from '@/lib/supabase';
import { AVATAR_STYLES } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

interface SidebarProps {
  workloads: Workload[];
  loading: boolean;
}

export function Sidebar({ workloads, loading }: SidebarProps) {
  const sorted = [...workloads].sort((a, b) => b.in_progress_count - a.in_progress_count);

  return (
    <aside className="hidden w-72 flex-shrink-0 lg:block">
      <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Team Workload</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {workloads.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((w) => {
              const initials = w.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const avatarColor = AVATAR_STYLES[w.color] ?? AVATAR_STYLES.slate;
              return (
                <li
                  key={w.user_id}
                  className={`rounded-xl border p-3 transition ${
                    w.overloaded
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
                      >
                        {initials}
                      </div>
                      {w.overloaded && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{w.name}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-slate-300" />
                          {w.todo_count}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${w.overloaded ? 'bg-rose-500' : 'bg-amber-400'}`}
                          />
                          {w.in_progress_count}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          {w.done_count}
                        </span>
                      </div>
                    </div>
                    {w.overloaded && (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
                    )}
                  </div>
                  {w.overloaded && (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      Overloaded — {w.in_progress_count} tasks in progress
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Legend:</span> avatars pulse red when a
          member has more than 5 In Progress tasks.
        </div>
      </div>
    </aside>
  );
}
