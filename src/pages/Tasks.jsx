import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { ListTodo, Plus, Trash2, Pencil, X, MessageSquare } from "lucide-react";
import TaskCommentSection from "../components/TaskCommentSection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import TaskForm from "../components/TaskForm";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import moment from "moment";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [commentTask, setCommentTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterTaskType, setFilterTaskType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(r => r.data?.user).then(setCurrentUser).catch(() => {});
  }, []);

  async function loadData() {
    const [t, p, tt, az] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    let u = [];
    try { u = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []); } catch {}
    setTasks(t);
    setProjects(p);
    setUsers(u);
    setTaskTypes(tt);
    setAziende(az);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    if (editing) {
      await supabase.from("tasks").update(data).eq("id", editing.id).select().single().then(r => r.data);
    } else {
      await supabase.from("tasks").insert(data).select().single().then(r => r.data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("tasks").delete().eq("id", id);
    setTaskToDelete(null);
    loadData();
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

  // Build hierarchical list: root tasks + their sub-tasks interleaved
  const filteredRoots = filtered.filter((t) => !t.parent_task_id);
  const filteredSubMap = filtered.reduce((acc, t) => {
    if (t.parent_task_id) {
      if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
      acc[t.parent_task_id].push(t);
    }
    return acc;
  }, {});
  // Also include sub-tasks whose parent is NOT in filtered (parent filtered out)
  const orphanSubs = filtered.filter((t) => t.parent_task_id && !filtered.find((r) => r.id === t.parent_task_id));
  const hierarchicalList = [];
  filteredRoots.forEach((t) => {
    hierarchicalList.push({ task: t, isSubTask: false });
    (filteredSubMap[t.id] || []).forEach((sub) => hierarchicalList.push({ task: sub, isSubTask: true }));
  });
  orphanSubs.forEach((t) => hierarchicalList.push({ task: t, isSubTask: false }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Task</h1>
          <p className="text-muted-foreground mt-1">{tasks.length} task totali</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tutti i clienti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {[...aziende].sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it')).map((az) => <SelectItem key={az.id} value={az.id}>{az.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tutti i progetti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i progetti</SelectItem>
            {[...projects].sort((a,b) => (a.name||'').localeCompare(b.name||'','it')).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Assegnato a" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli Utenti</SelectItem>
            {[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTaskType} onValueChange={setFilterTaskType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo Lavoro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {[...taskTypes].sort((a,b) => (a.name||'').localeCompare(b.name||'','it')).map((tt) => <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="da_fare">Da Fare</SelectItem>
            <SelectItem value="in_corso">In Corso</SelectItem>
            <SelectItem value="in_revisione">In Revisione</SelectItem>
            <SelectItem value="completato">Completato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priorità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Priorità</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="bassa">Bassa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-36 h-9 text-sm" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-36 h-9 text-sm" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 bg-white" onClick={() => { setFilterProject("all"); setFilterStatus("all"); setFilterAssignee("all"); setFilterTaskType("all"); setFilterPriority("all"); setFilterDateFrom(""); setFilterDateTo(""); setFilterCliente("all"); }}>
          <X className="h-3.5 w-3.5" />Reset Filtri
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nessun task"
          description="Crea il tuo primo task per iniziare."
          action={<Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" />Crea Task</Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {hierarchicalList.map(({ task, isSubTask }) => (
            <div key={task.id} className={`p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors ${isSubTask ? "pl-10 bg-secondary/10" : ""}`}>
              {isSubTask && <span className="text-muted-foreground text-xs -ml-4 mr-0">↳</span>}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{task.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{task.project_name}</span>
                  {task.tipo_task === "meeting" ? (
                    <span className="text-xs text-muted-foreground">• {(task.participants || []).map(p => p.user_name).join(", ")}</span>
                  ) : (task.assignee_name || task.assignee) ? (
                    <span className="text-xs text-muted-foreground">• {task.assignee_name || task.assignee}</span>
                  ) : null}
                  {task.task_type_name && <span className="text-xs text-muted-foreground">• {task.task_type_name}</span>}
                  {task.due_date && <span className="text-xs text-muted-foreground">• {moment(task.due_date).format("DD MMM")}</span>}
                  {task.parent_task_title && <span className="text-xs text-muted-foreground italic">• Sub-task di: {task.parent_task_title}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge value={task.status} />
                {task.priority && <StatusBadge type="priority" value={task.priority} />}
                {task.tipo_task && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{task.tipo_task === 'attivita' ? '🔵 Attività' : '🟣 Meeting'} {task.modalita === 'multiplo' ? '(Ricorrente)' : ''}</span>}
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Commenti" onClick={() => setCommentTask(task)}>
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(task); setShowForm(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTaskToDelete(task)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!taskToDelete} onOpenChange={(o) => !o && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il task?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong>{taskToDelete?.title}</strong>. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(taskToDelete?.id)} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pannello commenti task */}
      {commentTask && (
        <div className="fixed inset-0 z-40" onClick={() => setCommentTask(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground">Commenti task</p>
                <h3 className="font-semibold text-foreground truncate max-w-xs">{commentTask.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCommentTask(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TaskCommentSection task={commentTask} users={users} currentUser={currentUser} />
            </div>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl p-0">
          <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
            <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
              <DialogTitle>{editing ? "Modifica Task" : "Nuovo Task"}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <TaskForm
              initial={editing || {}}
              projects={projects}
              parentTasks={tasks.filter((t) => !t.parent_task_id && (!editing || t.id !== editing.id))}
              onSubmit={handleSave}
              onCancel={() => setShowForm(false)}
              loading={saving}
            />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      );
      }