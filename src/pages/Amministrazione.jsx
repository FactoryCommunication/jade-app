import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { FileText, X, TrendingUp, Users, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import moment from "moment";
import "moment/locale/it";

moment.locale("it");

// Calcola ore da un task (attività: ore stimate; meeting: durata * partecipanti)
function getTaskHours(task) {
  if (task.tipo_task === "meeting" || task.tipo_task === "evento") {
    if (task.event_start_time && task.event_end_time) {
      const [sh, sm] = task.event_start_time.split(":").map(Number);
      const [eh, em] = task.event_end_time.split(":").map(Number);
      const h = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
      const n = (task.participants || task.assignees || []).length || 1;
      return Math.max(0, h * n);
    }
    return 0;
  }
  // attività: ore stimate del singolo assegnatario
  return task.estimated_hours || task.estimated_hours_total || 0;
}

// Ritorna il mese di riferimento del task (due_date oppure event_date)
function getTaskMonth(task) {
  const d = task.due_date || task.event_date || task.recurrence_start_date;
  if (!d) return null;
  return d.substring(0, 7); // "YYYY-MM"
}

export default function Amministrazione() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterCollaborator, setFilterCollaborator] = useState("all");
  const [filterMonth, setFilterMonth] = useState(moment().format("YYYY-MM"));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [p, t, az, u] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setProjects(p);
    setTasks(t);
    setAziende(az);
    setUsers(u);
    setLoading(false);
  }

  function resetFilters() {
    setFilterCliente("all");
    setFilterProject("all");
    setFilterCollaborator("all");
    setFilterMonth(moment().format("YYYY-MM"));
  }

  // Filtra task per mese, cliente, progetto, collaboratore
  const filteredTasks = tasks.filter((t) => {
    const proj = projects.find((p) => p.id === t.project_id);
    if (filterCliente !== "all") {
      if (!proj || !(proj.aziende_ids || []).includes(filterCliente)) return false;
    }
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (filterMonth) {
      const taskMonth = getTaskMonth(t);
      if (!taskMonth || taskMonth !== filterMonth) return false;
    }
    if (filterCollaborator !== "all") {
      // attività: per assignee_id; meeting: per partecipante
      if (t.tipo_task === "meeting" || t.tipo_task === "evento") {
        const parts = t.participants || t.assignees || [];
        if (!parts.some((p) => p.user_id === filterCollaborator)) return false;
      } else {
        if (t.assignee_id !== filterCollaborator) return false;
      }
    }
    return true;
  });

  // Ore per cliente
  const orePerCliente = {};
  filteredTasks.forEach((t) => {
    const proj = projects.find((p) => p.id === t.project_id);
    const clienteNomi = proj?.aziende_nomi || (proj?.client ? [proj.client] : ["Senza cliente"]);
    const ore = getTaskHours(t);
    clienteNomi.forEach((nome) => {
      if (!orePerCliente[nome]) orePerCliente[nome] = { total: 0, progetti: {} };
      orePerCliente[nome].total += ore;
      const pName = t.project_name || "Senza progetto";
      orePerCliente[nome].progetti[pName] = (orePerCliente[nome].progetti[pName] || 0) + ore;
    });
  });

  // Ore per utente
  const orePerUtente = {};
  filteredTasks.forEach((t) => {
    const ore = getTaskHours(t);
    if (t.tipo_task === "meeting" || t.tipo_task === "evento") {
      // ogni partecipante contribuisce con ore_meeting (non totali)
      const parts = t.participants || t.assignees || [];
      const orePerPart = parts.length > 0 ? (ore / parts.length) : ore;
      parts.forEach((p) => {
        const key = p.user_id || p.user_name || "Sconosciuto";
        const userRecord = users.find((u) => u.id === p.user_id);
        const displayName = userRecord ? (userRecord.full_name || userRecord.email) : (p.user_name || "Sconosciuto");
        if (!orePerUtente[key]) orePerUtente[key] = { name: displayName, total: 0 };
        orePerUtente[key].total += orePerPart;
      });
    } else {
      const key = t.assignee_id || t.assignee || "Non assegnato";
      const userRecord = users.find((u) => u.id === t.assignee_id);
      const displayName = userRecord ? (userRecord.full_name || userRecord.email) : (t.assignee_name || t.assignee || "Non assegnato");
      if (!orePerUtente[key]) orePerUtente[key] = { name: displayName, total: 0 };
      orePerUtente[key].total += ore;
    }
  });

  // Extra da fatturare nel mese corrente
  const currentMonth = moment().format("YYYY-MM");
  const taskExtra = tasks.filter((t) => t.da_fatturare === "si_extra" && getTaskMonth(t) === currentMonth);
  const oreExtraCurrentMonth = taskExtra.reduce((s, t) => s + getTaskHours(t), 0);

  const totalOre = filteredTasks.reduce((s, t) => s + getTaskHours(t), 0);
  const collaborators = users;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Amministrazione</h1>
        <p className="text-sm text-muted-foreground mt-1">Dashboard ore e fatturazione</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-44 h-9 text-sm"
        />
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tutti i clienti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {[...aziende].sort((a, b) => a.nome?.localeCompare(b.nome, "it")).map((az) => (
              <SelectItem key={az.id} value={az.id}>{az.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tutti i progetti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i progetti</SelectItem>
            {[...projects].sort((a, b) => a.name?.localeCompare(b.name, "it")).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCollaborator} onValueChange={setFilterCollaborator}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tutti i collaboratori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i collaboratori</SelectItem>
            {collaborators.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={resetFilters}>
          <X className="h-3.5 w-3.5" />Reset Filtri
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Ore Totali</span>
          </div>
          <p className="text-2xl font-bold">{totalOre.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">{filterMonth}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground font-medium">Clienti Attivi</span>
          </div>
          <p className="text-2xl font-bold">{Object.keys(orePerCliente).length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground font-medium">Collaboratori</span>
          </div>
          <p className="text-2xl font-bold">{Object.keys(orePerUtente).length}</p>
        </div>
        <div className="bg-card border border-amber-300 rounded-xl p-4 bg-amber-50">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">Extra da Fatturare</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{oreExtraCurrentMonth.toFixed(1)}h</p>
          <p className="text-xs text-amber-600">mese corrente</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ore per Cliente + Progetto */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Ore per Cliente / Progetto
            </h2>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {Object.keys(orePerCliente).length === 0 && (
              <p className="text-sm text-muted-foreground p-4 text-center">Nessun dato per il periodo selezionato</p>
            )}
            {Object.entries(orePerCliente)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cliente, data]) => (
                <div key={cliente} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-foreground">{cliente}</span>
                    <span className="text-sm font-bold text-primary">{data.total.toFixed(1)}h</span>
                  </div>
                  <div className="space-y-1 pl-3 border-l-2 border-primary/20">
                    {Object.entries(data.progetti)
                      .sort((a, b) => b[1] - a[1])
                      .map(([proj, ore]) => (
                        <div key={proj} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate mr-2">{proj}</span>
                          <span className="text-foreground font-medium shrink-0">{ore.toFixed(1)}h</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Ore per Utente */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Ore per Collaboratore
            </h2>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {Object.keys(orePerUtente).length === 0 && (
              <p className="text-sm text-muted-foreground p-4 text-center">Nessun dato per il periodo selezionato</p>
            )}
            {Object.entries(orePerUtente)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([key, data]) => {
                const pct = totalOre > 0 ? (data.total / totalOre) * 100 : 0;
                return (
                  <div key={key} className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{data.name}</span>
                      <span className="text-sm font-bold text-primary">{data.total.toFixed(1)}h</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% del totale</p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Dettaglio Extra da Fatturare nel mese corrente */}
      <div className="bg-card border border-amber-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-200 bg-amber-50">
          <h2 className="font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Attività Extra da Fatturare — {moment().format("MMMM YYYY")}
          </h2>
        </div>
        <div className="divide-y divide-border max-h-72 overflow-y-auto">
          {taskExtra.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nessuna attività extra da fatturare questo mese</p>
          ) : (
            taskExtra.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between gap-3 hover:bg-amber-50/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.project_name} • {t.assignee_name || t.assignee || ""} • {getTaskMonth(t)}</p>
                </div>
                <span className="text-sm font-bold text-amber-700 shrink-0">{getTaskHours(t).toFixed(1)}h</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}