import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Clock, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TimeEntryForm from "../components/TimeEntryForm";
import EmptyState from "../components/EmptyState";
import moment from "moment";

export default function TimeTracking() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterProject, setFilterProject] = useState("all");
  const [filterCollaborator, setFilterCollaborator] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [e, p, t] = await Promise.all([
      supabase.from("time_entries").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setEntries(e);
    setProjects(p);
    setTasks(t);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    await supabase.from("time_entries").insert(data).select().single().then(r => r.data);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("time_entries").delete().eq("id", id);
    loadData();
  }

  const collaborators = [...new Set(entries.map((e) => e.collaborator).filter(Boolean))];

  const filtered = entries.filter((e) => {
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    if (filterCollaborator !== "all" && e.collaborator !== filterCollaborator) return false;
    return true;
  });

  const totalHours = filtered.reduce((sum, e) => sum + (e.hours || 0), 0);

  // Group by date
  const grouped = {};
  filtered.forEach((entry) => {
    const key = entry.date || "senza_data";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Registrazione Tempo</h1>
          <p className="text-muted-foreground mt-1">{totalHours.toFixed(1)} ore totali</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Registra Tempo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tutti i progetti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i progetti</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCollaborator} onValueChange={setFilterCollaborator}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tutti i collaboratori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i collaboratori</SelectItem>
            {collaborators.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setFilterProject("all"); setFilterCollaborator("all"); }}>
          <X className="h-3.5 w-3.5" />Reset Filtri
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nessuna registrazione"
          description="Inizia a registrare il tempo sui tuoi progetti."
          action={<Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" />Registra Tempo</Button>}
        />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {date === "senza_data" ? "Senza data" : moment(date).format("dddd DD MMMM YYYY")}
                </h3>
                <span className="text-sm font-medium text-muted-foreground">
                  {grouped[date].reduce((s, e) => s + (e.hours || 0), 0).toFixed(1)}h
                </span>
              </div>
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {grouped[date].map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{entry.project_name}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {entry.task_title && <span className="text-xs text-muted-foreground">{entry.task_title}</span>}
                        <span className="text-xs text-muted-foreground">• {entry.collaborator}</span>
                        {entry.notes && <span className="text-xs text-muted-foreground">• {entry.notes}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0">{entry.hours}h</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registra Tempo</DialogTitle>
          </DialogHeader>
          <TimeEntryForm projects={projects} tasks={tasks} onSubmit={handleSave} onCancel={() => setShowForm(false)} loading={saving} />
        </DialogContent>
      </Dialog>
    </div>
  );
}