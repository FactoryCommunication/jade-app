import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { FolderKanban, ListTodo, Clock, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import moment from "moment";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, t] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      ]);
      setProjects(p);
      setTasks(t);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === "in_corso").length;
  const completedTasks = tasks.filter((t) => t.status === "completato").length;
  // Ore stimate dai task attività
  const totalHours = tasks.filter((t) => t.tipo_task === "attivita").reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Panoramica dei tuoi progetti e attività</p>
        </div>
        <Link to="/projects">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Progetto
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Progetti Attivi" value={activeProjects} subtitle={`${projects.length} totali`} />
        <StatCard icon={ListTodo} label="Task Totali" value={tasks.length} subtitle={`${completedTasks} completati`} />
        <StatCard icon={Clock} label="Ore Stimate" value={totalHours.toFixed(1)} subtitle="Da attività" />
        <StatCard icon={TrendingUp} label="Completamento" value={tasks.length > 0 ? `${Math.round((completedTasks / tasks.length) * 100)}%` : "0%"} subtitle="Task completati" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Task Recenti</h2>
            <Link to="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
              Vedi tutti <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nessun task ancora</div>
            ) : (
              recentTasks.map((task) => {
                const project = projects.find(p => p.id === task.project_id);
                return (
                <Link key={task.id} to={`/projects/${task.project_id}`} className="p-4 flex items-start justify-between hover:bg-secondary/50 transition-colors block">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary hover:underline truncate">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">{task.project_name} {project?.client && `| ${project.client}`}</span>
                      {task.assignee_name && <span className="text-xs text-muted-foreground">• {task.assignee_name}</span>}
                      {task.due_date && <span className="text-xs text-muted-foreground">• {moment(task.due_date).format('DD MMM')}</span>}
                    </div>
                  </div>
                  <StatusBadge value={task.status} />
                  </Link>
                  );
                  })
            )}
          </div>
        </div>

        {/* Progetti attivi */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Progetti Attivi</h2>
            <Link to="/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
              Vedi tutti <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {projects.filter((p) => p.status === "in_corso").length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nessun progetto attivo</div>
            ) : (
              projects.filter((p) => p.status === "in_corso").slice(0, 5).map((proj) => (
                <Link key={proj.id} to={`/projects/${proj.id}`} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors block">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{proj.name}</p>
                    <p className="text-xs text-muted-foreground">{proj.client}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}