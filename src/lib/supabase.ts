import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type Priority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface User {
  id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  priority: Priority;
  due_date: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  sort_order: number;
  created_at?: string;
  // joined fields
  assignee?: User | null;
}

export interface Workload {
  user_id: string;
  name: string;
  color: string;
  in_progress_count: number;
  todo_count: number;
  done_count: number;
  overloaded: boolean;
}

export const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To-Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export const PRIORITY_ORDER: Record<Priority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export const PRIORITY_STYLES: Record<Priority, string> = {
  High: 'bg-rose-50 text-rose-700 ring-rose-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const AVATAR_STYLES: Record<string, string> = {
  rose: 'bg-rose-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-500',
};
