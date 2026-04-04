import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TaskForm from "../components/TaskForm";
import StatusBadge from "../components/StatusBadge";
import moment from "moment";

const GROUP_OPTIONS = [
  { value: "status", label: "Stato" },
  { value: "priority", label: "Priorità" },
  { value: "project", label: "Progetto" },
  { value: "assignee", label: "Assegnato a" },
  { value: "client", label: "Cliente" },
];

const STATUS_COLS = [
  { key: "da_fare", label: "Da Fare" },
  { key: "in_corso", label: "In Corso" },
  { key: "in_revisione", label: "In Revisione" },
  { key: "completato", label: "Completato" },
];
const PRIORITY_COLS = [
  { key: "alta", label: "Alta" },
  { key: "media", label: "Media" },
  { key: "bassa", label: "Bassa" },
];

const STATUS_COLORS = {
  da_fare: "bg-slate-100 border-slate-300",
  in_corso: "bg-blue-50 border-blue-200",
  in_revisione: "bg-amber-50 border-amber-200",
  completato: "bg-emerald-50 border-emerald-200",
};
const PRIORITY_COLORS = {
  alta: "bg-rose-50 border-rose-200",
  media: "bg-amber-50 border-amber-200",
  bassa: "bg-slate-50 border-slate-200",
};

function getColumns(groupBy, tasks, projects, users, aziende) {
  if (groupBy === "status") return STATUS_COLS.map((c) => ({ ...c, color: STATUS_COLORS[c.key] }));
  if (groupBy === "priority") return PRIORITY_COLS.map((c) => ({ ...c, color: PRIORITY_COLORS[c.key] }));
  if (groupBy === "project") {
    const seen = new Set();
    const cols = [];
    projects.forEach((p) => { seen.add(p.id); cols.push({ key: p.id, label: p.name, color: "bg-indigo-50 border-indigo-200" }); });
    tasks.forEach((t) => { if (t.project_id && !seen.has(t.project_id)) { seen.add(t.project_id); cols.push({ key: t.project_id, label: t.project_name || t.project_id, color: "bg-indigo-50 border-indigo-200" }); } });
    cols.sort((a, b) => a.label.localeCompare(b.label, "it"));
    if (cols.length === 0) cols.push({ key: "__none__", label: "Senza Progetto", color: "bg-slate-50 border-slate-200" });
    return cols;
  }
  if (groupBy === "assignee") {
    const seen = new Set();
    const cols = [];
    tasks.forEach((t) => {
      const key = t.assignee_id || "__none__";
      if (!seen.has(key)) { seen.add(key); cols.push({ key, label: t.assignee || "Non assegnato", color: "bg-violet-50 border-violet-200" }); }
    });
    cols.sort((a, b) => a.label.localeCompare(b.label, "it"));
    if (cols.length === 0) cols.push({ key: "__none__", label: "Non assegnato", color: "bg-slate-50 border-slate-200" });
    return cols;
  }
  if (groupBy === "client") {
    const seen = new Set();
    const cols = [];
    aziende.forEach((az) => {
      seen.add(az.id);
      cols.push({ key: az.id, label: az.nome, color: "bg-sky-50 border-sky-200" });
    });
    cols.sort((a, b) => a.label.localeCompare(b.label, "it"));
    if (!seen.has("__none__")) cols.push({ key: "__none__", label: "Senza Cliente", color: "bg-slate-50 border-slate-200" });
    return cols;
  }
  return [];
}

function getTaskColumnKey(task, groupBy, projects) {
  if (groupBy === "status") return task.status || "da_fare";
  if (groupBy === "priority") return task.priority || "media";
  if (groupBy === "project") return task.project_id || "__none__";
  if (groupBy === "assignee") return task.assignee_id || "__none__";
  if (groupBy === "client") {
    const proj = projects.find((p) => p.id === task.project_id);
    return proj?.aziende_ids?.[0] || "__none__";
  }
  return "__none__";
}

export default function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("status");

  // Filters
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterTaskType, setFilterTaskType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Task form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [taskToDelete, setTaskToDelete] = useState(null);

  // Drag state
  const [draggingTask, setDraggingTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [t, p, tt, az] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    let u = [];
    try { u = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []); } catch {}
    setTasks(t); setProjects(p); setUsers(u); setTaskTypes(tt); setAziende(az);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    if (editing) {
      await supabase.from("tasks").update(data).eq("id", editing.id).select().single().then(r => r.data);
    } else {
      await supabase.from("tasks").insert(data).select().single().then(r => r.data);
    }
    setShowForm(false); setEditing(null); setSaving(false);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("tasks").delete().eq("id", id);
    setTaskToDelete(null);
    loadData();
  }

  async function handleDrop(colKey) {
    if (!draggingTask || colKey === getTaskColumnKey(draggingTask, groupBy, projects)) {
      setDraggingTask(null); setDragOverCol(null); return;
    }
    const update = {};
    if (groupBy === "status") update.status = colKey;
    else if (groupBy === "priority") update.priority = colKey;
    else if (groupBy === "project") {
      const proj = projects.find((p) => p.id === colKey);
      update.project_id = colKey === "__none__" ? "" : colKey;
      update.project_name = proj?.name || "";
    } else if (groupBy === "assignee") {
      const u = users.find((u) => u.id === colKey);
      update.assignee_id = colKey === "__none__" ? "" : colKey;
      update.assignee = u?.full_name || u?.email || "";
    }
    // client groupBy: read-only, no drag update
    if (Object.keys(update).length > 0) {
      await supabase.from("tasks").update(update).eq("id", draggingTask.id).select().single().then(r => r.data);
      loadData();
    }
    setDraggingTask(null); setDragOverCol(null);
  }

  const filtered = tasks.filter((t) => {
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false;
    if (filterTaskType !== "all" && t.task_type_id !== filterTaskType) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterDateFrom && t.due_date && t.due_date < filterDateFrom) return false;
    if (filterDateTo && t.due_date && t.due_date > filterDateTo) return false;
    if (filterCliente !== "all") {
      const proj = projects.find((p) => p.id === t.project_id);
      if (!proj || !(proj.aziende_ids || []).includes(filterCliente)) return false;
    }
    return true;
  });

  const columns = getColumns(groupBy, filtered, projects, users, aziende);
  const isClientGroup = groupBy === "client";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Kanban</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} task</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Raggruppa per</span>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" />Nuovo Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti i clienti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {[...aziende].sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','it')).map((az) => <SelectItem key={az.id} value={az.id}>{az.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti i progetti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i progetti</SelectItem>
            {[...projects].sort((a,b)=>(a.name||'').localeCompare(b.name||'','it')).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti gli Utenti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli Utenti</SelectItem>
            {[...users].sort((a,b)=>(a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTaskType} onValueChange={setFilterTaskType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo Lavoro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {[...taskTypes].sort((a,b)=>(a.name||'').localeCompare(b.name||'','it')).map((tt) => <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="da_fare">Da Fare</SelectItem>
            <SelectItem value="in_corso">In Corso</SelectItem>
            <SelectItem value="in_revisione">In Revisione</SelectItem>
            <SelectItem value="completato">Completato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tutte le Priorità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Priorità</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="bassa">Bassa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-32 h-9 text-sm" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-32 h-9 text-sm" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setFilterCliente("all"); setFilterProject("all"); setFilterAssignee("all"); setFilterTaskType("all"); setFilterStatus("all"); setFilterPriority("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
          <X className="h-3.5 w-3.5" />Reset Filtri
        </Button>
      </div>

      {isClientGroup && (
        <p className="text-xs text-muted-foreground italic">Il raggruppamento per cliente è in sola lettura (il cliente è determinato dal progetto del task).</p>
      )}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = filtered.filter((t) => getTaskColumnKey(t, groupBy, projects) === col.key);
          const isOver = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              className={`flex-shrink-0 w-72 rounded-xl border-2 transition-colors ${col.color} ${isOver ? "ring-2 ring-primary ring-offset-1" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{col.label}</span>
                <span className="text-xs bg-black/10 px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[80px]">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!isClientGroup}
                    onDragStart={() => setDraggingTask(task)}
                    onDragEnd={() => { setDraggingTask(null); setDragOverCol(null); }}
                    className={`bg-card rounded-lg border border-border p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow ${!isClientGroup ? "cursor-grab active:cursor-grabbing" : ""} ${draggingTask?.id === task.id ? "opacity-40" : ""}`}
                  >
                    <p className="text-sm font-medium text-foreground leading-tight">{task.title}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {task.project_name && <p className="font-medium truncate">{task.project_name}</p>}
                      {(() => {
                        const proj = projects.find((p) => p.id === task.project_id);
                        const cliente = proj?.aziende_nomi?.[0] || proj?.client;
                        return cliente ? <p className="truncate opacity-75">{cliente}</p> : null;
                      })()}
                      {task.tipo_task === "meeting" ? (
                        <p className="truncate">👤 {(task.participants || []).map(p => p.user_name).join(", ") || "Nessun partecipante"}</p>
                      ) : (task.assignee_name || task.assignee) ? (
                        <p className="truncate">👤 {task.assignee_name || task.assignee}</p>
                      ) : null}
                      {task.due_date && <p>📅 {moment(task.due_date).format("DD MMM YYYY")}</p>}
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <div className="flex gap-1 flex-wrap">
                        <StatusBadge value={task.status} />
                        {task.priority && <StatusBadge type="priority" value={task.priority} />}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(task); setShowForm(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setTaskToDelete(task)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!taskToDelete} onOpenChange={(o) => !o && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il task?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare <strong>{taskToDelete?.title}</strong>? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(taskToDelete?.id)} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifica Task" : "Nuovo Task"}</DialogTitle></DialogHeader>
          <TaskForm initial={editing || {}} projects={projects} onSubmit={handleSave} onCancel={() => setShowForm(false)} loading={saving} />
        </DialogContent>
      </Dialog>
      </div>
      );
      }