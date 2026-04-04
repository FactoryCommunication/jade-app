import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { ArrowLeft, Pencil, Trash2, Plus, Clock, ListTodo, Users, Euro, TrendingUp, MessageSquare, X } from "lucide-react";
import TaskCommentSection from "../components/TaskCommentSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "../components/StatusBadge";
import ProjectForm from "../components/ProjectForm";
import TaskForm from "../components/TaskForm";

import moment from "moment";

function TaskRow({ task, isSubTask = false, onStatusChange, onEdit, onDelete, onComment }) {
  return (
    <div className={`p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors ${isSubTask ? "pl-10 bg-secondary/10" : ""}`}>
      {isSubTask && <span className="text-muted-foreground text-xs mr-1">↳</span>}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-foreground truncate ${isSubTask ? "text-sm" : ""}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.task_type_name && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">{task.task_type_name}</span>
          )}
          {task.tipo_task === "meeting" ? (
            <span className="text-xs text-muted-foreground">👤 {(task.participants || []).map(p => p.user_name).join(", ") || "Nessun partecipante"}</span>
          ) : task.assignee_name || task.assignee ? (
            <span className="text-xs text-muted-foreground">👤 {task.assignee_name || task.assignee}</span>
          ) : null}
          {(task.estimated_hours || task.estimated_hours_total) > 0 && (
            <span className="text-xs text-muted-foreground">⏱ {task.estimated_hours || task.estimated_hours_total}h stimate</span>
          )}
          {task.due_date && <span className="text-xs text-muted-foreground">• {moment(task.due_date).format("DD MMM")}</span>}
        </div>
      </div>
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
        className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-foreground"
      >
        <option value="da_fare">Da Fare</option>
        <option value="in_corso">In Corso</option>
        <option value="in_revisione">In Revisione</option>
        <option value="completato">Completato</option>
      </select>
      {task.priority && <StatusBadge type="priority" value={task.priority} />}
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Commenti" onClick={() => onComment(task)}>
        <MessageSquare className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(task)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [commentTask, setCommentTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const confirmCode = project ? project.name.substring(0, 4).toUpperCase() + "-DEL" : "";

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(r => r.data?.user).then(setCurrentUser).catch(() => {});
  }, [id]);

  async function loadData() {
    try {
      const [projArr, allProjects, allTasks, allUsers, me] = await Promise.all([
        supabase.from("projects").select("*").limit(200).then(r => r.data || []),
        supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("tasks").select("*").eq("project_id", id ).order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.auth.getUser().then(r => r.data?.user).catch(() => null),
      ]);
      setProject(projArr[0] || null);
      setProjects(allProjects);
      setTasks(allTasks);
      setUsers(allUsers);
      setIsAdmin(me?.role === "admin");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(data) {
    setSaving(true);
    await supabase.from("projects").update(data).eq("id", id).select().single().then(r => r.data);
    setSaving(false);
    setShowEdit(false);
    loadData();
  }

  async function handleDelete() {
    await supabase.from("projects").delete().eq("id", id);
    navigate("/projects");
  }

  async function handleDeleteTask(taskId) {
    await supabase.from("tasks").delete().eq("id", taskId);
    setTaskToDelete(null);
    loadData();
  }

  async function handleCreateTask(data) {
    setSaving(true);
    await supabase.from("tasks").insert(data).select().single().then(r => r.data);
    setSaving(false);
    setShowTaskForm(false);
    loadData();
  }

  async function handleUpdateTask(data) {
    setSaving(true);
    await supabase.from("tasks").update(data).eq("id", editingTask.id).select().single().then(r => r.data);
    setSaving(false);
    setEditingTask(null);
    loadData();
  }





  async function handleUpdateTaskStatus(taskId, status) {
    await supabase.from("tasks").update({ status }).eq("id", taskId).select().single().then(r => r.data);
    loadData();
  }

  function calculateCosts() {
    let total = 0;
    const byCollaborator = {};
    tasks.forEach((task) => {
      const hours = task.estimated_hours || task.estimated_hours_total || 0;
      const user = users.find((u) => u.id === task.assignee_id);
      const rate = user?.hourly_rate || 0;
      const cost = hours * rate;
      total += cost;
      const name = user?.full_name || user?.email || task.assignee_name || task.assignee || "Non assegnato";
      if (!byCollaborator[name]) byCollaborator[name] = { hours: 0, cost: 0, rate };
      byCollaborator[name].hours += hours;
      byCollaborator[name].cost += cost;
    });
    return { total, byCollaborator };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Progetto non trovato</p>
        <Button variant="link" onClick={() => navigate("/projects")}>Torna ai progetti</Button>
      </div>
    );
  }

  // Gerarchia task
  const rootTasks = tasks.filter((t) => !t.parent_task_id);
  const subTasksMap = tasks.reduce((acc, t) => {
    if (t.parent_task_id) {
      if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
      acc[t.parent_task_id].push(t);
    }
    return acc;
  }, {});

  // Ore = somma ore stimate attività + ore meeting (durata * partecipanti)
  const totalHours = tasks.reduce((s, t) => {
    if (t.tipo_task === "meeting" || t.tipo_task === "evento") {
      if (t.event_start_time && t.event_end_time) {
        const [sh, sm] = t.event_start_time.split(":").map(Number);
        const [eh, em] = t.event_end_time.split(":").map(Number);
        const h = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        const n = (t.participants || t.assignees || []).length || 1;
        return s + Math.max(0, h * n);
      }
      return s;
    }
    return s + (t.estimated_hours || t.estimated_hours_total || 0);
  }, 0);
  const completedTasks = tasks.filter((t) => t.status === "completato").length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const hoursProgress = project.budget_hours ? Math.min(100, Math.round((totalHours / project.budget_hours) * 100)) : 0;
  const { total: totalCost, byCollaborator } = calculateCosts();
  const projectColor = project.color?.startsWith("#") ? project.color : "#6366f1";

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/projects")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Progetti
      </Button>

      {/* Project Header */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: projectColor }} />
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            </div>
            <p className="text-muted-foreground">{project.client}</p>
            {project.description && <p className="text-sm text-muted-foreground mt-2">{project.description}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <StatusBadge value={project.status} />
              {project.priority && <StatusBadge type="priority" value={project.priority} />}
              {project.team_name && (
                <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-2.5 py-0.5 rounded-full border border-border">
                  <Users className="h-3 w-3" />{project.team_name}
                </span>
              )}
              {project.manager_name && (
                <span className="text-xs text-muted-foreground">Resp.: <strong>{project.manager_name}</strong></span>
              )}
            </div>
            {project.start_date && (
              <p className="text-xs text-muted-foreground mt-2">
                {moment(project.start_date).format("DD MMM YYYY")} → {project.end_date ? moment(project.end_date).format("DD MMM YYYY") : "In corso"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Modifica
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => { setDeleteCode(""); setShowDeleteProject(true); }}>
              <Trash2 className="h-3.5 w-3.5" /> Elimina
            </Button>
          </div>
        </div>

        {/* Progress + Budget */}
        <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <ListTodo className="h-4 w-4" /> Avanzamento Task
              </span>
              <span className="text-sm text-muted-foreground">{completedTasks}/{tasks.length}</span>
            </div>
            <Progress value={taskProgress} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Ore Utilizzate
              </span>
              <span className="text-sm text-muted-foreground">{totalHours.toFixed(1)}h{project.budget_hours ? ` / ${project.budget_hours}h` : ""}</span>
            </div>
            <Progress value={project.budget_hours ? hoursProgress : 0} className="h-2" />
          </div>
        </div>

        {/* Admin-only: Budget + Costi */}
        {isAdmin && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div className="border border-border rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Euro className="h-3.5 w-3.5" /> Budget (solo admin)
              </p>
              <p className="text-xl font-bold text-foreground">
                {project.budget_euro ? `€${project.budget_euro.toLocaleString("it-IT")}` : "—"}
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Costo Commessa
              </p>
              <p className="text-xl font-bold text-foreground">€{totalCost.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              {project.budget_euro && (
                <p className={`text-xs mt-0.5 ${totalCost > project.budget_euro ? "text-destructive" : "text-emerald-600"}`}>
                  {totalCost > project.budget_euro
                    ? `Sforamento di €${(totalCost - project.budget_euro).toLocaleString("it-IT", { maximumFractionDigits: 0 })}`
                    : `Residuo €${(project.budget_euro - totalCost).toLocaleString("it-IT", { maximumFractionDigits: 0 })}`}
                </p>
              )}
            </div>
            {Object.keys(byCollaborator).length > 0 && (
              <div className="sm:col-span-2 border border-border rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Dettaglio Costi per Collaboratore</p>
                <div className="space-y-1.5">
                  {Object.entries(byCollaborator).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{name}</span>
                      <span className="text-muted-foreground text-xs">
                        {data.hours}h × €{data.rate}/h = <strong className="text-foreground">€{data.cost.toFixed(2)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Task ({tasks.length})</h2>
          <Button size="sm" onClick={() => setShowTaskForm(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Aggiungi Task
          </Button>
        </div>
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nessun task ancora</div>
        ) : (
          <div className="divide-y divide-border">
            {rootTasks.map((task) => (
              <>
                <TaskRow key={task.id} task={task} onStatusChange={handleUpdateTaskStatus} onEdit={setEditingTask} onDelete={setTaskToDelete} onComment={setCommentTask} />
                {(subTasksMap[task.id] || []).map((sub) => (
                  <TaskRow key={sub.id} task={sub} isSubTask onStatusChange={handleUpdateTaskStatus} onEdit={setEditingTask} onDelete={setTaskToDelete} onComment={setCommentTask} />
                ))}
              </>
            ))}
          </div>
        )}
      </div>



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

      {/* Conferma elimina task */}
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
            <AlertDialogAction onClick={() => handleDeleteTask(taskToDelete?.id)} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conferma elimina progetto con codice */}
      <AlertDialog open={showDeleteProject} onOpenChange={setShowDeleteProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il progetto?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>Questa azione è irreversibile. Per confermare, digita il codice:</span>
              <span className="block font-mono font-bold text-lg text-foreground bg-secondary px-3 py-1 rounded text-center tracking-widest">{confirmCode}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Input
              autoFocus
              placeholder={`Digita ${confirmCode}`}
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCode("")}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCode !== confirmCode}
              className="bg-destructive text-destructive-foreground disabled:opacity-40"
            >Elimina Progetto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Progetto</DialogTitle></DialogHeader>
          <ProjectForm initial={project} onSubmit={handleUpdate} onCancel={() => setShowEdit(false)} loading={saving} isAdmin={isAdmin} />
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuovo Task</DialogTitle></DialogHeader>
          <TaskForm initial={{ project_id: id }} projects={projects} parentTasks={rootTasks} onSubmit={handleCreateTask} onCancel={() => setShowTaskForm(false)} loading={saving} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Task</DialogTitle></DialogHeader>
          <TaskForm initial={editingTask || {}} projects={projects} onSubmit={handleUpdateTask} onCancel={() => setEditingTask(null)} loading={saving} />
        </DialogContent>
      </Dialog>


    </div>
  );
}