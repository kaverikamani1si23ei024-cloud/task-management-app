import type { Task, Priority, TaskStatus } from '@/lib/supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tasks-api`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  'Content-Type': 'application/json',
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const taskApi = {
  async list(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, { headers: HEADERS });
    return handle<Task[]>(res);
  },

  async get(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { headers: HEADERS });
    return handle<Task>(res);
  },

  async create(payload: {
    title: string;
    description: string;
    priority: Priority;
    due_date: string | null;
    assigned_to: string | null;
  }): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload),
    });
    return handle<Task>(res);
  },

  async update(
    id: string,
    payload: Partial<{
      title: string;
      description: string;
      priority: Priority;
      due_date: string | null;
      assigned_to: string | null;
      status: TaskStatus;
    }>,
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(payload),
    });
    return handle<Task>(res);
  },

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ status }),
    });
    return handle<Task>(res);
  },

  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    return handle<{ success: boolean; id: string }>(res);
  },
};
