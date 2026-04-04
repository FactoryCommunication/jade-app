import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Called by entity automation when a TimeEntry is created or updated.
// Compares total logged hours vs estimated hours and auto-updates task status.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const entry = body.data;

    if (!entry?.task_id) {
      return Response.json({ skipped: "no task_id" });
    }

    // Get task
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: entry.task_id }, "-created_date", 1);
    const task = tasks[0];
    if (!task) return Response.json({ skipped: "task not found" });

    const estimatedHours = task.estimated_hours_total || task.estimated_hours || 0;
    if (!estimatedHours) return Response.json({ skipped: "no estimated hours on task" });

    // Sum all time entries for this task
    const allEntries = await base44.asServiceRole.entities.TimeEntry.filter({ task_id: entry.task_id }, "-created_date", 1000);
    const totalLogged = allEntries.reduce((s, e) => s + (e.hours || 0), 0);

    let newStatus = null;
    if (totalLogged >= estimatedHours) {
      newStatus = "completato";
    } else if (totalLogged > 0) {
      newStatus = "in_corso";
    }

    if (newStatus && task.status !== newStatus) {
      await base44.asServiceRole.entities.Task.update(task.id, { status: newStatus });
      return Response.json({ updated: true, task_id: task.id, new_status: newStatus, total_logged: totalLogged, estimated: estimatedHours });
    }

    return Response.json({ updated: false, total_logged: totalLogged, estimated: estimatedHours });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});