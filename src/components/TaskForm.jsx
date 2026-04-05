import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import ChecklistEditor from "./ChecklistEditor";

function userName(u) {
  if (u.nome || u.cognome) return `${u.nome || ""} ${u.cognome || ""}`.trim();
  return u.email || "Utente senza nome";
}

const RECURRENCE_OPTIONS = [
  { value: "giornaliera", label: "Giornaliera" },
  { value: "settimanale", label: "Settimanale" },
  { value: "mensile", label: "Mensile" },
  { value: "annuale", label: "Annuale" },
];

function calcDeltaHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : null;
}

export default function TaskForm({ initial = {}, projects: initialProjects = [], parentTasks = [], onSubmit, onCancel, loading }) {
  const [projects, setProjects] = useState(initialProjects);
  const [taskTypes, setTaskTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [subTasks, setSubTasks] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const [form, setForm] = useState({
    title: initial.title || "",
    description: initial.description || "",
    tipo_task: initial.tipo_task || "attivita",
    modalita: initial.modalita || "singolo",
    project_id: initial.project_id || "none",
    task_type_id: initial.task_type_id || "none",
    da_fatturare: initial.da_fatturare || "no_compreso",
    event_date: initial.event_date || "",
    event_start_time: initial.event_start_time || "",
    event_end_time: initial.event_end_time || "",
    recurrence: initial.recurrence || "none",
    recurrence_start_date: initial.recurrence_start_date || "",
    recurrence_end_date: initial.recurrence_end_date || "",
    status: initial.status || "da_fare",
    priority: initial.priority || "media",
    due_date: initial.due_date || "",
    assignee_id: initial.assignee_id || "none",
    assignee_name: initial.assignee_name || "",
    estimated_hours: initial.estimated_hours || "",
    parent_task_id: initial.parent_task_id || "none",
  });

  const [participants, setParticipants] = useState(
    initial.participants && initial.participants.length > 0 ? initial.participants : []
  );

  const deltaHours = calcDeltaHours(form.event_start_time, form.event_end_time);
  const hoursFromDelta = deltaHours !== null;

  useEffect(() => {
    if (hoursFromDelta) {
      setForm((f) => ({ ...f, estimated_hours: deltaHours.toFixed(2) }));
    }
  }, [form.event_start_time, form.event_end_time]);

  useEffect(() => {
    Promise.all([
      supabase.from("task_types").select("*").order("name", { ascending: true }),
      supabase.from("profiles").select("*").order("cognome", { ascending: true }),
      supabase.from("projects").select("*").order("name", { ascending: true }),
    ]).then(([{ data: tt }, { data: u }, { data: p }]) => {
      setTaskTypes(tt || []);
      setUsers(u || []);
      setProjects(p || []);
    });
  }, []);

  // Carica subtask se stiamo modificando un task esistente
  useEffect(() => {
    if (initial.id) {
      supabase.from("tasks").select("*").eq("parent_task_id", initial.id).then(({ data }) => {
        setSubTasks(data || []);
      });
    }
  }, [initial.id]);

  const subHours = subTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setSavingProject(true);
    const { data: created } = await supabase.from("projects").insert({
      name: newProjectName.trim(),
      client: newProjectClient.trim() || "—",
      status: "in_corso",
    }).select().single();
    const { data: updated } = await supabase.from("projects").select("*").order("name", { ascending: true });
    setProjects(updated || []);
    if (created) setForm({ ...form, project_id: created.id });
    setNewProjectName("");
    setNewProjectClient("");
    setShowNewProject(false);
    setSavingProject(false);
  }

  function toggleParticipant(user) {
    const exists = participants.find((p) => p.user_id === user.id);
    if (exists) {
      setParticipants(participants.filter((p) => p.user_id !== user.id));
    } else {
      setParticipants([...participants, { user_id: user.id, user_name: userName(user) }]);
    }
  }

  const isAttivita = form.tipo_task === "attivita";
  const isMultiplo = form.modalita === "multiplo";
  const isExistingTask = !!initial.id;
  const isSubTask = form.parent_task_id !== "none";

  const handleSubmit = (e) => {
    e.preventDefault();
    const project = projects.find((p) => p.id === form.project_id);
    const taskType = taskTypes.find((t) => t.id === form.task_type_id);
    const assigneeUser = users.find((u) => u.id === form.assignee_id);
    const parentTask = parentTasks.find((t) => t.id === form.parent_task_id);

    const finalHours = hoursFromDelta
      ? deltaHours
      : (form.estimated_hours ? Number(form.estimated_hours) : null);

    onSubmit({
      ...form,
      project_id: form.project_id === "none" ? null : form.project_id,
      task_type_id: form.task_type_id === "none" ? null : form.task_type_id,
      assignee_id: form.assignee_id === "none" ? null : form.assignee_id,
      parent_task_id: form.parent_task_id === "none" ? null : form.parent_task_id,
      recurrence: form.recurrence === "none" ? null : form.recurrence,
      due_date: form.due_date || null,
      event_date: form.event_date || null,
      recurrence_start_date: form.recurrence_start_date || null,
      recurrence_end_date: form.recurrence_end_date || null,
      project_name: project?.name || "",
      task_type_name: taskType?.name || "",
      assignee_name: isAttivita ? userName(assigneeUser || {}) : "",
      participants: isAttivita ? [] : participants,
      estimated_hours: finalHours,
      parent_task_title: parentTask?.title || "",
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo Task</Label>
            <div className="flex gap-1.5">
              {[{ value: "attivita", label: "Attività" }, { value: "meeting", label: "Meeting" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, tipo_task: opt.value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${form.tipo_task === opt.value ? "bg-primary text-primary-foreground border-2 border-primary" : "bg-white text-muted-foreground border-2 border-border hover:border-slate-400"}`}>
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
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${form.modalita === opt.value ? "bg-primary text-primary-foreground border-2 border-primary" : "bg-white text-muted-foreground border-2 border-border hover:border-slate-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Titolo *</Label>
          <Input className="bg-white" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>

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
                <SelectItem value="none">Nessuno</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo Lavoro</Label>
            <Select value={form.task_type_id} onValueChange={(v) => setForm({ ...form, task_type_id: v })}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Seleziona tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuno</SelectItem>
                {taskTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sub-task di</Label>
            <Select value={form.parent_task_id} onValueChange={(v) => setForm({ ...form, parent_task_id: v })}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Nessun task padre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun task padre</SelectItem>
                {parentTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrizione</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Descrizione del task..."
          />
        </div>

        {initial.id && (
          <div className="space-y-2">
            <Label>Checklist</Label>
            <div className="border border-border rounded-lg p-3 bg-white">
              <ChecklistEditor taskId={initial.id} />
            </div>
          </div>
        )}

        {!isMultiplo ? (
          <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-border rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="h-8 text-xs bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ora Inizio</Label>
              <Input type="time" value={form.event_start_time} onChange={(e) => setForm({ ...form, event_start_time: e.target.value })} className="h-8 text-xs bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ora Fine</Label>
              <Input type="time" value={form.event_end_time} onChange={(e) => setForm({ ...form, event_end_time: e.target.value })} className="h-8 text-xs bg-white" />
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3 bg-white border border-border rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ora Inizio</Label>
                <Input type="time" value={form.event_start_time} onChange={(e) => setForm({ ...form, event_start_time: e.target.value })} className="h-8 text-xs bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ora Fine</Label>
                <Input type="time" value={form.event_end_time} onChange={(e) => setForm({ ...form, event_end_time: e.target.value })} className="h-8 text-xs bg-white" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ripetizione</Label>
              <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Seleziona frequenza..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna</SelectItem>
                  {RECURRENCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data Inizio</Label>
                <Input type="date" value={form.recurrence_start_date} onChange={(e) => setForm({ ...form, recurrence_start_date: e.target.value })} className="h-8 text-xs bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fine</Label>
                <Input type="date" value={form.recurrence_end_date} onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })} className="h-8 text-xs bg-white" />
              </div>
            </div>
          </div>
        )}

        {isAttivita ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assegnato a</Label>
              <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{userName(u)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Ore Stimate
                {hoursFromDelta && (
                  <span className="text-xs text-emerald-600 font-normal">calcolate automaticamente</span>
                )}
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                className={`${hoursFromDelta ? "bg-muted text-muted-foreground" : "bg-white"}`}
                value={hoursFromDelta ? deltaHours.toFixed(2) : form.estimated_hours}
                onChange={(e) => !hoursFromDelta && setForm({ ...form, estimated_hours: e.target.value })}
                readOnly={hoursFromDelta}
                placeholder="Es. 4"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partecipanti Meeting</Label>
              <div className="border border-border rounded-lg p-3 bg-white flex flex-wrap gap-2">
                {users.map((u) => {
                  const sel = participants.some((p) => p.user_id === u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleParticipant(u)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}>
                      {userName(u)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Ore Stimate
                {hoursFromDelta && (
                  <span className="text-xs text-emerald-600 font-normal">calcolate automaticamente</span>
                )}
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                className={`${hoursFromDelta ? "bg-muted text-muted-foreground" : "bg-white"}`}
                value={hoursFromDelta ? deltaHours.toFixed(2) : form.estimated_hours}
                onChange={(e) => !hoursFromDelta && setForm({ ...form, estimated_hours: e.target.value })}
                readOnly={hoursFromDelta}
                placeholder="Es. 4"
              />
            </div>
          </div>
        )}

        {/* Riepilogo subtask — visibile solo su task esistenti con subtask */}
        {isExistingTask && !isSubTask && subTasks.length > 0 && (
          <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
            <p className="text-xs font-semibold text-primary mb-2">
              📋 Riepilogo Subtask ({subTasks.length})
            </p>
            <div className="space-y-1">
              {subTasks.map((st) => (
                <div key={st.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate flex-1">{st.title}</span>
                  <span className="text-muted-foreground ml-2 shrink-0">
                    {st.estimated_hours ? `${st.estimated_hours}h` : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-primary/20 flex justify-between text-xs font-semibold">
              <span className="text-foreground">Totale ore subtask</span>
              <span className="text-primary">{subHours}h</span>
            </div>
          </div>
        )}

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
          <Button type="submit" disabled={loading || form.project_id === "none"}>
            {loading ? "Salvataggio..." : "Salva"}
          </Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
        </div>
      </form>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuovo Progetto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome Progetto *</Label>
              <Input autoFocus value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Es. Sito web ABC" className="bg-white" onKeyDown={(e) => e.key === "Enter" && handleCreateProject()} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={newProjectClient} onChange={(e) => setNewProjectClient(e.target.value)} placeholder="Es. Azienda Rossi" className="bg-white" />
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