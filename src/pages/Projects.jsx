import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { FolderKanban, Plus, LayoutGrid, List, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProjectCard from "../components/ProjectCard";
import ProjectForm from "../components/ProjectForm";
import EmptyState from "../components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/StatusBadge";
import { Link } from "react-router-dom";
import moment from "moment";

function cleanProject(data) {
  return {
    name: data.name || "",
    client: data.client || data.aziende_nomi?.[0] || "—",
    description: data.description || null,
    status: data.status || "da_pianificare",
    priority: data.priority || "media",
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    color: data.color || "#6366f1",
    team_id: data.team_id === "none" || !data.team_id ? null : data.team_id,
    team_name: data.team_name || null,
    manager_id: data.manager_id === "none" || !data.manager_id ? null : data.manager_id,
    manager_name: data.manager_name || null,
    referente_id: data.referente_id === "none" || !data.referente_id ? null : data.referente_id,
    referente_nome: data.referente_nome || null,
    budget_hours: data.budget_hours ? Number(data.budget_hours) : null,
    budget_euro: data.budget_euro ? Number(data.budget_euro) : null,
    aziende_ids: data.aziende_ids?.length > 0 ? data.aziende_ids : null,
    aziende_nomi: data.aziende_nomi?.length > 0 ? data.aziende_nomi : null,
  };
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterResponsabile, setFilterResponsabile] = useState("all");
  const [filterStato, setFilterStato] = useState("all");
  const [filterPriorita, setFilterPriorita] = useState("all");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [searchText, setSearchText] = useState("");

  function handleSort(col) {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function getSorted(list) {
    if (!sortCol) return list;
    return [...list].sort((a, b) => {
      let av, bv;
      if (sortCol === "name") { av = a.name || ""; bv = b.name || ""; }
      else if (sortCol === "client") { av = (a.aziende_nomi || [])[0] || a.client || ""; bv = (b.aziende_nomi || [])[0] || b.client || ""; }
      else if (sortCol === "manager") { av = a.manager_name || ""; bv = b.manager_name || ""; }
      else if (sortCol === "status") { av = a.status || ""; bv = b.status || ""; }
      else if (sortCol === "priority") { const o = { alta: 0, media: 1, bassa: 2 }; av = o[a.priority] ?? 3; bv = o[b.priority] ?? 3; return sortDir === "asc" ? av - bv : bv - av; }
      else if (sortCol === "end_date") { av = a.end_date || ""; bv = b.end_date || ""; }
      else if (sortCol === "ore") { av = getProjectHours(a.id); bv = getProjectHours(b.id); return sortDir === "asc" ? av - bv : bv - av; }
      else if (sortCol === "task") { av = getProjectTaskCount(a.id); bv = getProjectTaskCount(b.id); return sortDir === "asc" ? av - bv : bv - av; }
      const cmp = String(av).localeCompare(String(bv), "it", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
          setIsAdmin(data?.role === "admin");
        });
      }
    });
  }, []);

  async function loadData() {
    const [{ data: p }, { data: te }, { data: t }, { data: u }] = await Promise.all([
      supabase.from("projects").select("*").order("name", { ascending: true }),
      supabase.from("time_entries").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("*").order("cognome", { ascending: true }),
    ]);
    setProjects(p || []);
    setTimeEntries(te || []);
    setTasks(t || []);
    setUsers(u || []);
    setLoading(false);
  }

  async function handleCreate(data) {
    setSaving(true);
    const cleaned = cleanProject(data);
    console.log("📦 DATI INVIATI:", JSON.stringify(cleaned, null, 2));
    const { data: result, error } = await supabase.from("projects").insert(cleaned).select().single();
    console.log("✅ RISULTATO:", result);
    console.log("❌ ERRORE:", error);
    if (!error) {
      setShowCreate(false);
      loadData();
    }
    setSaving(false);
  }

  function getProjectHours(projectId) {
    const logged = timeEntries.filter((te) => te.project_id === projectId).reduce((sum, te) => sum + (te.hours || 0), 0);
    const loggedTaskIds = new Set(timeEntries.filter((te) => te.project_id === projectId && te.task_id).map((te) => te.task_id));
    const estimated = tasks.filter((t) => t.project_id === projectId && !loggedTaskIds.has(t.id) && (t.estimated_hours || 0) > 0)
      .reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    return logged + estimated;
  }

  function getProjectTaskCount(projectId) {
    return tasks.filter((t) => t.project_id === projectId).length;
  }

  const allClienti = [...new Set([
    ...projects.flatMap((p) => p.aziende_nomi || []),
    ...projects.map((p) => p.client).filter(Boolean),
  ])].sort();

  const filteredProjects = projects.filter((p) => {
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      if (!(p.name || "").toLowerCase().includes(q) &&
          !(p.client || "").toLowerCase().includes(q) &&
          !(p.aziende_nomi || []).some((n) => n.toLowerCase().includes(q)) &&
          !(p.manager_name || "").toLowerCase().includes(q)) return false;
    }
    if (filterCliente !== "all") {
      if (!(p.aziende_nomi || []).includes(filterCliente) && p.client !== filterCliente) return false;
    }
    if (filterResponsabile !== "all" && p.manager_id !== filterResponsabile) return false;
    if (filterStato !== "all" && p.status !== filterStato) return false;
    if (filterPriorita !== "all" && p.priority !== filterPriorita) return false;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Progetti</h1>
          <p className="text-muted-foreground mt-1">{filteredProjects.length} di {projects.length} progetti</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />Nuovo Progetto
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Cerca progetto..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-52 bg-white" />
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Tutti i clienti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {allClienti.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterResponsabile} onValueChange={setFilterResponsabile}>
          <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Tutti i responsabili" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i responsabili</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="completato">Completato</SelectItem>
            <SelectItem value="da_pianificare">Da Pianificare</SelectItem>
            <SelectItem value="in_corso">In Corso</SelectItem>
            <SelectItem value="in_pausa">In Pausa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriorita} onValueChange={setFilterPriorita}>
          <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="Tutte le priorità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le priorità</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="bassa">Bassa</SelectItem>
            <SelectItem value="media">Media</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button variant={viewMode === "card" ? "default" : "outline"} size="icon" onClick={() => setViewMode("card")} className="h-9 w-9">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")} className="h-9 w-9">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Nessun progetto"
          description={projects.length === 0 ? "Crea il tuo primo progetto." : "Nessun progetto corrisponde ai filtri."}
          action={projects.length === 0 ? <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" />Crea Progetto</Button> : null} />
      ) : viewMode === "card" ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} taskCount={getProjectTaskCount(project.id)} hoursLogged={getProjectHours(project.id)} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {[{col:"name",label:"Progetto"},{col:"client",label:"Cliente",cls:"hidden sm:table-cell"},{col:"manager",label:"Responsabile",cls:"hidden md:table-cell"},{col:"status",label:"Stato"},{col:"priority",label:"Priorità",cls:"hidden sm:table-cell"},{col:"end_date",label:"Scadenza",cls:"hidden lg:table-cell"},{col:"ore",label:"Ore",cls:"hidden md:table-cell"},{col:"task",label:"Task"}].map(({col,label,cls=""})=>(
                  <th key={col} className={`text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${cls}`} onClick={()=>handleSort(col)}>
                    <span className="inline-flex items-center gap-1">{label}{sortCol===col?(sortDir==="asc"?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>):<span className="h-3 w-3 opacity-30"><ChevronUp className="h-3 w-3"/></span>}</span>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {getSorted(filteredProjects).map((project) => (
                <tr key={project.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color || "#6366f1" }} />
                      <Link to={`/projects/${project.id}`} className="font-medium text-foreground hover:text-primary transition-colors">{project.name}</Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{(project.aziende_nomi || []).join(", ") || project.client || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{project.manager_name || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge value={project.status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell">{project.priority ? <StatusBadge type="priority" value={project.priority} /> : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{project.end_date ? moment(project.end_date).format("DD MMM YYYY") : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{getProjectHours(project.id)}h{project.budget_hours ? ` / ${project.budget_hours}h` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getProjectTaskCount(project.id)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Progetto</DialogTitle>
          </DialogHeader>
          <ProjectForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} isAdmin={isAdmin} />
        </DialogContent>
      </Dialog>
    </div>
  );
}