import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // This function is called by a scheduled automation, no user auth needed
  // Use service role to access entities
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Alert tasks due in 1 or 3 days
  const alertDays = [1, 3];

  const dueDates = alertDays.map((d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split("T")[0];
  });

  const tasks = await base44.asServiceRole.entities.Task.list("-due_date", 500);

  const tasksToAlert = tasks.filter((t) =>
    t.due_date &&
    dueDates.includes(t.due_date) &&
    t.status !== "completato"
  );

  const users = await base44.asServiceRole.entities.User.list();
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  let sent = 0;
  for (const task of tasksToAlert) {
    const daysLeft = dueDates.indexOf(task.due_date) === 0 ? alertDays[0] : alertDays[1];

    // Collect recipients: assignee + meeting participants
    const recipients = new Set();
    if (task.assignee_id && userMap[task.assignee_id]?.email) {
      recipients.add(userMap[task.assignee_id].email);
    }
    for (const p of task.participants || []) {
      const u = userMap[p.user_id];
      if (u?.email) recipients.add(u.email);
    }

    for (const email of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `⏰ Task in scadenza tra ${daysLeft} giorno/i: "${task.title}"`,
        body: `<p>Il task <strong>"${task.title}"</strong> scade il <strong>${task.due_date}</strong> (tra ${daysLeft} giorno/i).</p><p>Progetto: ${task.project_name || "—"}<br>Stato attuale: ${task.status}</p>`,
      });
      sent++;
    }
  }

  return Response.json({ ok: true, tasks_found: tasksToAlert.length, emails_sent: sent });
});