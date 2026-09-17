import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PROJECT_ID = "a0000000-0000-0000-0000-000000000001";
const VALID_STATUSES = ["todo", "in_progress", "done"];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Server misconfigured: missing Supabase credentials");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function validateTaskFields(body: Record<string, unknown>) {
  const errors: string[] = [];
  if ("title" in body) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      errors.push("title must be a non-empty string");
    }
  }
  if ("priority" in body && body.priority !== null) {
    if (typeof body.priority !== "string" || !VALID_PRIORITIES.includes(body.priority)) {
      errors.push(`priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
    }
  }
  if ("status" in body && body.status !== null) {
    if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
  }
  if ("due_date" in body && body.due_date !== null && body.due_date !== "") {
    if (typeof body.due_date === "string" && isNaN(Date.parse(body.due_date))) {
      errors.push("due_date must be a valid date string");
    }
  }
  if ("description" in body && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.push("description must be a string");
    }
  }
  return errors;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const path = url.pathname;
    // path will be like /functions/v1/tasks-api/tasks/... or /tasks-api/tasks/...
    // Normalize: extract everything after "tasks-api"
    const afterFn = path.split("tasks-api")[1] || "/";
    const segments = afterFn.split("/").filter(Boolean); // e.g. ["tasks", "<id>"] or ["tasks"]

    const method = req.method;

    // GET /tasks — list all tasks for the project
    if (method === "GET" && segments.length <= 1) {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:users!assigned_to(*)")
        .eq("project_id", PROJECT_ID)
        .order("sort_order", { ascending: true });
      if (error) return errorResponse(error.message, 500);
      return json(data);
    }

    // GET /tasks/:id
    if (method === "GET" && segments.length === 2 && segments[0] === "tasks") {
      const id = segments[1];
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:users!assigned_to(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) return errorResponse(error.message, 500);
      if (!data) return errorResponse("Task not found", 404);
      return json(data);
    }

    // POST /tasks — create
    if (method === "POST" && segments.length <= 1) {
      const body = await req.json();
      const errors = validateTaskFields(body);
      if (errors.length > 0) return errorResponse(errors.join("; "), 400);
      if (!body.title || typeof body.title !== "string") {
        return errorResponse("title is required", 400);
      }
      const insertPayload = {
        project_id: PROJECT_ID,
        title: body.title.trim(),
        description: typeof body.description === "string" ? body.description.trim() : "",
        priority: body.priority ?? "Medium",
        due_date: body.due_date || null,
        assigned_to: body.assigned_to || null,
        status: "todo",
        sort_order: 0,
      };
      const { data, error } = await supabase
        .from("tasks")
        .insert(insertPayload)
        .select("*, assignee:users!assigned_to(*)")
        .single();
      if (error) return errorResponse(error.message, 400);
      return json(data, 201);
    }

    // PUT /tasks/:id — full update
    if (method === "PUT" && segments.length === 2 && segments[0] === "tasks") {
      const id = segments[1];
      const body = await req.json();
      const errors = validateTaskFields(body);
      if (errors.length > 0) return errorResponse(errors.join("; "), 400);
      const updatePayload: Record<string, unknown> = {};
      if ("title" in body) updatePayload.title = (body.title as string).trim();
      if ("description" in body) updatePayload.description = body.description;
      if ("priority" in body) updatePayload.priority = body.priority;
      if ("due_date" in body) updatePayload.due_date = body.due_date || null;
      if ("assigned_to" in body) updatePayload.assigned_to = body.assigned_to || null;
      if ("status" in body) updatePayload.status = body.status;
      const { data, error } = await supabase
        .from("tasks")
        .update(updatePayload)
        .eq("id", id)
        .select("*, assignee:users!assigned_to(*)")
        .maybeSingle();
      if (error) return errorResponse(error.message, 400);
      if (!data) return errorResponse("Task not found", 404);
      return json(data);
    }

    // PATCH /tasks/:id/status — update status only (used by drag and drop)
    if (method === "PATCH" && segments.length === 3 && segments[0] === "tasks" && segments[2] === "status") {
      const id = segments[1];
      const body = await req.json();
      if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status)) {
        return errorResponse(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
      }
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: body.status })
        .eq("id", id)
        .select("*, assignee:users!assigned_to(*)")
        .maybeSingle();
      if (error) return errorResponse(error.message, 400);
      if (!data) return errorResponse("Task not found", 404);
      return json(data);
    }

    // DELETE /tasks/:id
    if (method === "DELETE" && segments.length === 2 && segments[0] === "tasks") {
      const id = segments[1];
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) return errorResponse(error.message, 500);
      return json({ success: true, id });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(msg, 500);
  }
});
