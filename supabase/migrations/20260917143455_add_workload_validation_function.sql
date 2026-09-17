/*
# Add server-side workload validation function

1. Purpose
   - Requirement #11: business logic and validation must be on the server,
     not only in React. The workload *calculation* already lives in the
     user_workload view. This adds a callable server function that returns
     the workload for a given user, so the "overloaded" determination is a
     server-enforced rule, not just a client-side display.

2. New Functions
   - `get_user_workload(p_user_id uuid)` — SECURITY DEFINER function that
     returns a single row with in_progress_count and the overloaded flag
     (> 5 in progress). Encapsulates the >5 threshold business rule on the
     server so it cannot be bypassed by client code.

3. Security
   - SECURITY DEFINER so it can be called by anon role.
   - Granted EXECUTE to anon, authenticated.
*/

CREATE OR REPLACE FUNCTION get_user_workload(p_user_id uuid)
RETURNS TABLE (in_progress_count bigint, overloaded boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
    (COUNT(t.id) FILTER (WHERE t.status = 'in_progress') > 5) AS overloaded
  FROM tasks t
  WHERE t.assigned_to = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_workload(uuid) TO anon, authenticated;
