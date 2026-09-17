/*
# Task Management Schema (single-tenant, no auth)

1. Purpose
   - Supports a Kanban-style task management dashboard.
   - Projects contain tasks; users belong to projects via project_members;
     tasks are assigned to users.

2. New Tables
   - `users` — team members that can be assigned tasks and join projects.
     - id (uuid PK)
     - name (text, not null)
     - color (text) — avatar accent color
     - created_at (timestamptz default now())
   - `projects` — a project groups tasks and members.
     - id (uuid PK)
     - name (text, not null)
     - description (text)
     - created_at (timestamptz default now())
   - `project_members` — join table: a user belongs to a project.
     - project_id (uuid FK -> projects.id ON DELETE CASCADE)
     - user_id (uuid FK -> users.id ON DELETE CASCADE)
     - joined_at (timestamptz default now())
     - PRIMARY KEY (project_id, user_id)
   - `tasks` — a task within a project, assignable to a user.
     - id (uuid PK)
     - project_id (uuid FK -> projects.id ON DELETE CASCADE)
     - title (text, not null)
     - description (text default '')
     - priority (text check in Low/Medium/High, default 'Medium')
     - due_date (date)
     - status (text check in todo/in_progress/done, default 'todo')
     - assigned_to (uuid FK -> users.id ON DELETE SET NULL)
     - sort_order (int default 0)
     - created_at (timestamptz default now())
   - `user_workload` (VIEW) — per-user count of In Progress tasks across all
     projects, plus a boolean `overloaded` flag (> 5 in-progress tasks).
     Workload calculation lives on the server, not the client.

3. Indexes
   - tasks(project_id), tasks(assigned_to), tasks(status),
     project_members(user_id), project_members(project_id).

4. Security
   - This is a no-auth single-tenant app; the frontend uses the anon key.
   - RLS enabled on users, projects, project_members, tasks.
   - CRUD policies grant TO anon, authenticated (intentionally shared data).
   - Views are exposed read-only via SELECT policy.

5. Notes
   - No user_id / auth.users linkage (no sign-in screen requested).
   - Cascade deletes keep data consistent when a project or user is removed.
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'slate',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
  due_date date,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id);

-- Workload view: counts In Progress tasks per user + overload flag (>5).
CREATE OR REPLACE VIEW user_workload AS
SELECT
  u.id AS user_id,
  u.name,
  u.color,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
  COUNT(t.id) FILTER (WHERE t.status = 'todo') AS todo_count,
  COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count,
  (COUNT(t.id) FILTER (WHERE t.status = 'in_progress') > 5) AS overloaded
FROM users u
LEFT JOIN tasks t ON t.assigned_to = u.id
GROUP BY u.id, u.name, u.color;

-- RLS: enable on all tables.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- users policies
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- projects policies
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- project_members policies
DROP POLICY IF EXISTS "anon_select_pm" ON project_members;
CREATE POLICY "anon_select_pm" ON project_members FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pm" ON project_members;
CREATE POLICY "anon_insert_pm" ON project_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pm" ON project_members;
CREATE POLICY "anon_delete_pm" ON project_members FOR DELETE
  TO anon, authenticated USING (true);

-- tasks policies
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);
