import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function TimeEntryForm({ initial = {}, projects = [], tasks = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    project_id: initial.project_id || "",
    task_id: initial.task_id || "",
    collaborator: initial.collaborator || "",
    collaborator_id: initial.collaborator_id || "",
    hours: initial.hours || "",
    date: initial.date || new Date().toISOString().split("T")[0],
    notes: initial.notes || "",
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    async function load() {
      const [me, users, teamsData] = await Promise.all([
        supabase.auth.getUser().then(r => r.data?.user).catch(() => null),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      ]);
      setCurrentUser(me);
      setAllUsers(users);
      setTeams(teamsData);

      // Pre-fill collaborator with self if not set
      if (!initial.collaborator && me) {
        setForm((f) => ({ ...f, collaborator: me.full_name || me.email || "", collaborator_id: me.id || "" }));
      }
    }
    load();
  }, []);

  const filteredTasks = tasks.filter((t) => !form.project_id || t.project_id === form.project_id);

  // Determine available collaborators based on role
  const availableCollaborators = (() => {
    if (!currentUser) return [];
    const role = currentUser.role;

    if (role === "admin") {
      // All users
      return allUsers.map((u) => ({ id: u.id, name: u.full_name || u.email }));
    }

    if (role === "team_manager") {
      // Self + members of teams where currentUser is a member
      const myTeams = teams.filter((t) => (t.member_ids || []).includes(currentUser.id));
      const memberIds = new Set([currentUser.id]);
      myTeams.forEach((t) => (t.member_ids || []).forEach((id) => memberIds.add(id)));

      // If a project is selected, further filter to members assigned on that project's team
      if (form.project_id) {
        // find teams linked to that project
        const projectTeamIds = new Set(
          teams.filter((t) => (t.member_ids || []).includes(currentUser.id)).map((t) => t.id)
        );
        // Just use all memberIds from manager's teams
      }

      return allUsers
        .filter((u) => memberIds.has(u.id))
        .map((u) => ({ id: u.id, name: u.full_name || u.email }));
    }

    // Normal user: only self
    return currentUser ? [{ id: currentUser.id, name: currentUser.full_name || currentUser.email }] : [];
  })();

  const isCollaboratorLocked = currentUser?.role === "user";
  const canChooseCollaborator = currentUser?.role === "admin" || currentUser?.role === "team_manager";

  const handleSubmit = (e) => {
    e.preventDefault();
    const project = projects.find((p) => p.id === form.project_id);
    const task = tasks.find((t) => t.id === form.task_id);
    onSubmit({
      ...form,
      project_name: project?.name || "",
      task_title: task?.title || "",
      hours: Number(form.hours),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Progetto *</Label>
          <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v, task_id: "" })}>
            <SelectTrigger><SelectValue placeholder="Seleziona progetto" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Task</Label>
          <Select value={form.task_id} onValueChange={(v) => setForm({ ...form, task_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona task" /></SelectTrigger>
            <SelectContent>
              {filteredTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            Collaboratore *
            {isCollaboratorLocked && (
              <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">Solo tu</span>
            )}
          </Label>
          {canChooseCollaborator ? (
            <Select
              value={form.collaborator_id}
              onValueChange={(id) => {
                const found = availableCollaborators.find((c) => c.id === id);
                setForm({ ...form, collaborator_id: id, collaborator: found?.name || id });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Seleziona collaboratore" /></SelectTrigger>
              <SelectContent>
                {availableCollaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.collaborator}
              disabled
              className="bg-secondary text-muted-foreground cursor-not-allowed"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Ore *</Label>
          <Input type="number" step="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} required min="0.25" />
        </div>
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Note</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Descrivi il lavoro svolto..." />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
      </div>
    </form>
  );
}