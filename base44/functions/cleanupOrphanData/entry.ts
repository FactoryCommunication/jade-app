import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  const [entries, tasks, users] = await Promise.all([
    base44.asServiceRole.entities.TimeEntry.list('-date', 5000),
    base44.asServiceRole.entities.Task.list('-created_date', 2000),
    base44.asServiceRole.entities.User.list(),
  ]);

  const validUserIds = new Set(users.map((u) => u.id));

  // TimeEntry senza collaborator_id valido
  const orphanEntries = entries.filter((e) => !e.collaborator_id || !validUserIds.has(e.collaborator_id));
  // Task senza assignees con ID valido E senza assignee_id valido
  const orphanTasks = tasks.filter((t) => {
    const hasValidAssignee = (t.assignees || []).some((a) => a.user_id && validUserIds.has(a.user_id));
    const hasValidLegacy = t.assignee_id && validUserIds.has(t.assignee_id);
    return !hasValidAssignee && !hasValidLegacy;
  });

  let deletedEntries = 0;
  let deletedTasks = 0;

  for (const e of orphanEntries) {
    await base44.asServiceRole.entities.TimeEntry.delete(e.id);
    deletedEntries++;
  }

  for (const t of orphanTasks) {
    await base44.asServiceRole.entities.Task.delete(t.id);
    deletedTasks++;
  }

  return Response.json({
    success: true,
    deleted_time_entries: deletedEntries,
    deleted_tasks: deletedTasks,
    orphan_entries_found: orphanEntries.length,
    orphan_tasks_found: orphanTasks.length,
  });
});