import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  const [entries, users] = await Promise.all([
    base44.asServiceRole.entities.TimeEntry.list('-date', 5000),
    base44.asServiceRole.entities.User.list(),
  ]);

  // Build lookup maps from user full_name and email -> user
  const byFullName = {};
  const byEmail = {};
  users.forEach((u) => {
    const name = (u.full_name || '').trim().toLowerCase();
    const email = (u.email || '').trim().toLowerCase();
    if (name) byFullName[name] = u;
    if (email) byEmail[email] = u;
    // Also map "nome cognome" from User entity fields if available
    if (u.nome && u.cognome) {
      const combined = `${u.nome} ${u.cognome}`.trim().toLowerCase();
      byFullName[combined] = u;
    }
  });

  let updated = 0;
  let skipped = 0;
  let notFound = [];

  for (const entry of entries) {
    // Skip if already has valid collaborator_id
    if (entry.collaborator_id) {
      skipped++;
      continue;
    }

    const raw = (entry.collaborator || '').trim();
    const rawLower = raw.toLowerCase();

    // Try exact match on full_name or email
    let matched = byFullName[rawLower] || byEmail[rawLower];

    // Try partial match: check if any user full_name starts with the raw value
    if (!matched) {
      matched = users.find((u) => {
        const fn = (u.full_name || '').toLowerCase();
        return fn.startsWith(rawLower) || rawLower.startsWith(fn.split(' ')[0]);
      });
    }

    if (matched) {
      await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        collaborator_id: matched.id,
        collaborator: matched.full_name || matched.email,
      });
      updated++;
    } else {
      notFound.push(raw);
      skipped++;
    }
  }

  return Response.json({
    success: true,
    total: entries.length,
    updated,
    skipped,
    not_found: [...new Set(notFound)],
  });
});