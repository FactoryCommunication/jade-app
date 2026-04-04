import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import ChecklistEditor from "./ChecklistEditor";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const RECURRENCE_OPTIONS = [
  { value: "giornaliera", label: "Giornaliera" },
  { value: "settimanale", label: "Settimanale" },
  { value: "mensile", label: "Mensile" },
  { value: "annuale", label: "Annuale" },
];

export default function TaskForm({ initial = {}, projects: initialProjects = [], parentTasks = [], onSubmit, onCancel, loading }) {
  const [projects, setProjects] = useState(initialProjects);
  const [taskTypes, setTaskTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const [form, setForm] = useState({
    title: initial.title || "",
    description: initial.description || "",
    tipo_task: initial.tipo_task || "attivita",
    modalita: initial.modalita || "singolo",
    project_id: initial.project_id || "",
    task_type_id: initial.task_type_id || "",
    da_fatturare: initial.da_fatturare || "no_compreso",
    event_date: initial.event_date || "",
    event_start_time: initial.event_start_time || "",
    event_end_time: initial.event_end_time || "",
    recurrence: initial.recurrence || "",
    recurrence_start_date: initial.recurrence_start_date || "",
    recurrence_end_date: initial.recurrence_end_date || "",
    status: initial.status || "da_fare",
    priority: initial.priority || "media",
    due_date: initial.due_date || "",
    assignee_id: initial.assignee_id || "",
    assignee_name: initial.assignee_name || "",
    estimated_hours: initial.estimated_hours || "",
    parent_task_id: initial.parent_task_id || "",
  });

  const [participants, setParticipants] = useState(
    initial.participants && initial.participants.length > 0
      ? initial.participants
      : (initial.assignees || []).map((a) => ({ user_id: a.user_id, user_name: a.user_name }))
  );

  useEffect(() => {
    Promise.all([
      supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]).then(([tt, u, p]) => {
      setTaskTypes(tt);
      setUsers(u);
      setProjects(p);
    });
  }, []);

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setSavingProject(true);
    const created = await supabase.from("projects").insert({
      name: newProjectName.trim().select().single().then(r => r.data),
      client: newProjectClient.trim() || "—",
      status: "in_corso",
    });
    const updated = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setProjects(updated);
    setForm({ ...form, project_id: created.id });
    setNewProjectName(""); setNewProjectClient("");
    setShowNewProject(false);
    setSavingProject(false);
  }

  function toggleParticipant(user) {
    const exists = participants.find((p) => p.user_id === user.id);
    if (exists) {
      setParticipants(participants.filter((p) => p.user_id !== user.id));
    } else {
      setParticipants([...participants, { user_id: user.id, user_name: user.full_name || user.email }]);
    }
  }

  function getMeetingHours() {
    if (!form.event_start_time || !form.event_end_time) return 0;
    const [sh, sm] = form.event_start_time.split(":").map(Number);
    const [eh, em] = form.event_end_time.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return mins > 0 ? mins / 60 : 0;
  }

  const isAttivita = form.tipo_task === "attivita";
  const isMultiplo = form.modalita === "multiplo";
  const meetingHours = getMeetingHours();

  const handleSubmit = (e) => {
    e.preventDefault();
    const project = projects.find((p) => p.id === form.project_id);
    const taskType = taskTypes.find((t) => t.id === form.task_type_id);
    const assigneeUser = users.find((u) => u.id === form.assignee_id);
    const parentTask = parentTasks.find((t) => t.id === form.parent_task_id);
    onSubmit({
      ...form,
      project_name: project?.name || "",
      task_type_name: taskType?.name || "",
      assignee_name: isAttivita ? (assigneeUser?.full_name || assigneeUser?.email || form.assignee_name) : "",
      participants: isAttivita ? [] : participants,
      estimated_hours: isAttivita ? (form.estimated_hours ? Number(form.estimated_hours) : 0) : meetingHours,
      assignees: [],
      assignee: isAttivita ? (assigneeUser?.full_name || assigneeUser?.email || "") : "",
      estimated_hours_total: isAttivita ? (form.estimated_hours ? Number(form.estimated_hours) : 0) : meetingHours,
      parent_task_id: form.parent_task_id || "",
      parent_task_title: parentTask?.title || "",
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Riga 1: Tipo Task + Modalità */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo Task</Label>
            <div className="flex gap-1.5">
              {[{ value: "attivita", label: "Attività" }, { value: "meeting", label: "Meeting" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, tipo_task: opt.value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${form.tipo_task === opt.value ? "bg-primary text-primary-foreground border-2 border-primary" : "bg-card text-muted-foreground border-2 border-border hover:border-slate-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Modalità</Label>
            <div className="flex gap-1.5">
              {[{ value: "singolo", label: "Singolo" }, { value: "multiplo", label: "Ricorrente" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, modalita: opt.value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${form.modalita === opt.value ? "bg-primary text-primary-foreground border-2 border-primary" : "bg-card text-muted-foreground border-2 border-border hover:border-slate-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Titolo */}
        <div className="space-y-2">
          <Label>Titolo *</Label>
          <Input className="bg-white" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>

        {/* Riga: Progetto + Tipo Lavoro + Sub-task */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Progetto *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs px-1.5" onClick={() => setShowNewProject(true)}>
                <Plus className="h-3 w-3" /> Nuovo
              </Button>
            </div>
            <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Seleziona progetto" /></SelectTrigger>
              <SelectContent>
                {[...projects].sort((a,b) => (a.name||'').localeCompare(b.name||'','it')).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo Lavoro</Label>
            <Select value={form.task_type_id} onValueChange={(v) => setForm({ ...form, task_type_id: v })}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Seleziona tipo lavoro" /></SelectTrigger>
              <SelectContent>
                {[...taskTypes].sort((a,b) => (a.name||'').localeCompare(b.name||'','it')).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sub-task di</Label>
            <Select value={form.parent_task_id || "__none__"} onValueChange={(v) => setForm({ ...form, parent_task_id: v === "__none__" ? "" : v })}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Nessun task padre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nessun task padre</SelectItem>
                {[...parentTasks].sort((a,b) => (a.title||'').localeCompare(b.title||'','it')).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Descrizione */}
        <div className="space-y-2">
          <Label>Descrizione</Label>
          <div className="rounded-md border border-input overflow-hidden bg-white [&_.ql-editor]:min-h-[180px]">
            <ReactQuill theme="snow" value={form.description} onChange={(val) => setForm({ ...form, description: val })} />
          </div>
        </div>

        {/* Checklist */}
        {initial.id ? (
          <div className="space-y-2">
            <Label>Checklist</Label>
            <div className="border border-border rounded-lg p-3 bg-card">
              <ChecklistEditor taskId={initial.id} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic border border-border rounded-lg p-3 bg-white">
            Salva il task per aggiungere elementi alla checklist.
          </p>
        )}

        {/* Data / Orari */}
        {!isMultiplo ? (
          <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-border rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ora Inizio</Label>
              <Input type="time" value={form.event_start_time} onChange={(e) => setForm({ ...form, event_start_time: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ora Fine</Label>
              <Input type="time" value={form.event_end_time} onChange={(e) => setForm({ ...form, event_end_time: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3 bg-white border border-border rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ora Inizio</Label>
                <Input type="time" value={form.event_start_time} onChange={(e) => setForm({ ...form, event_start_time: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ora Fine</Label>
                <Input type="time" value={form.event_end_time} onChange={(e) => setForm({ ...form, event_end_time: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ripetizione</Label>
              <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleziona frequenza..." /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data Inizio</Label>
                <Input type="date" value={form.recurrence_start_date} onChange={(e) => setForm({ ...form, recurrence_start_date: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fine</Label>
                <Input type="date" value={form.recurrence_end_date} onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
          </div>
        )}

        {/* Assegnazione */}
        {isAttivita ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assegnato a</Label>
              <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
                <SelectContent>
                  {[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ore Stimate</Label>
              {form.event_start_time && form.event_end_time ? (
                <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {getMeetingHours() > 0 ? `${getMeetingHours().toFixed(1)}h (calcolate automaticamente)` : "Orari non validi"}
                </div>
              ) : (
                <Input type="number" step="0.5" min="0" className="bg-white" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} placeholder="Es. 4" />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Partecipanti Meeting</Label>
            <div className="border border-border rounded-lg p-3 bg-white space-y-2">
              <div className="flex flex-wrap gap-2">
                {[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map((u) => {
                  const sel = participants.some((p) => p.user_id === u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleParticipant(u)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}>
                      {u.full_name || u.email}
                    </button>
                  );
                })}
              </div>
              {participants.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {participants.length} partecipant{participants.length === 1 ? "e" : "i"}
                  {meetingHours > 0 && ` · ${(meetingHours * participants.length).toFixed(1)}h totali (${meetingHours.toFixed(1)}h × ${participants.length})`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Riga finale: Da Fatturare + Stato + Priorità + Scadenza */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label>Da Fatturare</Label>
            <Select value={form.da_fatturare} onValueChange={(v) => setForm({ ...form, da_fatturare: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no_compreso">NO compreso</SelectItem>
                <SelectItem value="no_non_previsto">NO non previsto</SelectItem>
                <SelectItem value="si_extra">SI extra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stato</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="da_fare">Da Fare</SelectItem>
                <SelectItem value="in_corso">In Corso</SelectItem>
                <SelectItem value="in_revisione">In Revisione</SelectItem>
                <SelectItem value="completato">Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priorità</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="bassa">Bassa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scadenza</Label>
            <Input type="date" className="bg-white" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
        </div>
      </form>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuovo Progetto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome Progetto *</Label>
              <Input autoFocus value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Es. Sito web ABC" onKeyDown={(e) => e.key === "Enter" && handleCreateProject()} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={newProjectClient} onChange={(e) => setNewProjectClient(e.target.value)} placeholder="Es. Azienda Rossi" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreateProject} disabled={savingProject || !newProjectName.trim()} className="flex-1">
                {savingProject ? "Salvataggio..." : "Crea Progetto"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewProject(false)}>Annulla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}