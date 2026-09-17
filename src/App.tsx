import { useState, useEffect, useCallback } from 'react';
import { supabase, type Task, type User, type Workload, type Priority, type TaskStatus } from '@/lib/supabase';
import { taskApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskModal } from '@/components/TaskModal';
import { AddUserModal } from '@/components/AddUserModal';
import { Plus, Users, Filter, AlertTriangle } from 'lucide-react';

const PROJECT_ID = 'a0000000-0000-0000-0000-000000000001';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    return taskApi.list();
  }, []);

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('*').order('name');
    if (error) throw error;
    return data as User[];
  }, []);

  const loadWorkloads = useCallback(async () => {
    const { data, error } = await supabase.from('user_workload').select('*');
    if (error) throw error;
    return data as Workload[];
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [t, u, w] = await Promise.all([loadTasks(), loadUsers(), loadWorkloads()]);
      setTasks(t);
      setUsers(u);
      setWorkloads(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadTasks, loadUsers, loadWorkloads]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    // optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await taskApi.updateStatus(taskId, newStatus);
      await refresh();
    } catch (e) {
      // revert on failure
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t)));
      setError(e instanceof Error ? e.message : 'Failed to move task');
    }
  };

  const handleCreateTask = async (payload: {
    title: string;
    description: string;
    priority: Priority;
    due_date: string | null;
    assigned_to: string | null;
  }) => {
    await taskApi.create(payload);
    await refresh();
  };

  const handleAddUser = async (name: string, color: string) => {
    const { data, error } = await supabase.from('users').insert({ name, color }).select().single();
    if (error) throw error;
    // add to project
    const { error: pmError } = await supabase
      .from('project_members')
      .insert({ project_id: PROJECT_ID, user_id: data.id });
    if (pmError) throw pmError;
    await refresh();
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await taskApi.delete(taskId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task');
      await refresh();
    }
  };

  const overloadedUsers = workloads.filter((w) => w.overloaded);

  const filteredTasks =
    priorityFilter === 'All' ? tasks : tasks.filter((t) => t.priority === priorityFilter);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight sm:text-lg">Product Launch Q1</h1>
              <p className="text-xs text-slate-500">Task Management Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Add User</span>
            </button>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>
        </div>
      </header>

      {/* Overload warning banner */}
      {overloadedUsers.length > 0 && !loading && (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <div className="text-sm">
              <p className="font-semibold text-rose-900">Workload warning</p>
              <p className="text-rose-700">
                {overloadedUsers.map((u) => u.name).join(', ')}{' '}
                {overloadedUsers.length === 1 ? 'has' : 'have'} more than 5 tasks in progress.
                Consider reassigning work to balance the team.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
        <Sidebar workloads={workloads} loading={loading} />

        <main className="min-w-0 flex-1">
          {/* Filter bar */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <Filter className="h-4 w-4" />
              Priority:
            </span>
            {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                  priorityFilter === p
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <KanbanBoard
            tasks={filteredTasks}
            users={users}
            loading={loading}
            onMoveTask={handleMoveTask}
            onDeleteTask={handleDeleteTask}
          />
        </main>
      </div>

      {taskModalOpen && (
        <TaskModal
          users={users}
          onClose={() => setTaskModalOpen(false)}
          onCreate={handleCreateTask}
        />
      )}
      {userModalOpen && (
        <AddUserModal onClose={() => setUserModalOpen(false)} onAdd={handleAddUser} />
      )}
    </div>
  );
}
