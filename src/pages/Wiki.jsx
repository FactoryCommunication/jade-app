import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { BookOpen, Plus, Search, Lock, Globe, Pencil, Trash2, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ArticleEditor from "./wiki/ArticleEditor";

export default function Wiki() {
  const [pagine, setPagine] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [progetti, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [wikiTeam, setWikiTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterVis, setFilterVis] = useState("all");
  const [selected, setSelected] = useState(null); // article to view
  const [editing, setEditing] = useState(null); // null | {} | article
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [p, c, pr, teams, user] = await Promise.all([
      supabase.from("wiki_pagine").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("wiki_categorie").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.auth.getUser().then(r => r.data?.user).catch(() => null),
    ]);
    setPagine(p);
    setCategorie(c);
    setProjects(pr);
    setCurrentUser(user);
    const wt = teams.find((t) => t.section === "wiki");
    setWikiTeam(wt || null);
    setLoading(false);
  }

  function canManageRiservato() {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (wikiTeam?.responsabile_id === currentUser.id) return true;
    return false;
  }

  function canEdit(pagina) {
    if (pagina.visibilita === "pubblico") return true;
    return canManageRiservato();
  }

  async function handleSave(data) {
    setSaving(true);
    const cat = categorie.find((c) => c.id === data.categoria_id);
    const proj = progetti.find((p) => p.id === data.progetto_id);
    const payload = {
      ...data,
      categoria_nome: cat?.nome || "",
      progetto_nome: proj?.name || "",
      autore_nome: currentUser?.full_name || currentUser?.email || "",
    };
    if (editing?.id) {
      await supabase.from("wiki_pagine").update(payload).eq("id", editing.id).select().single().then(r => r.data);
    } else {
      await supabase.from("wiki_pagine").insert(payload).select().single().then(r => r.data);
    }
    setSaving(false);
    setEditing(null);
    setSelected(null);
    loadAll();
  }

  async function handleDelete(pagina) {
    if (!window.confirm(`Eliminare "${pagina.titolo}"?`)) return;
    await supabase.from("wiki_pagine").delete().eq("id", pagina.id);
    setSelected(null);
    loadAll();
  }

  const filtered = pagine.filter((p) => {
    if (filterCat !== "all" && p.categoria_id !== filterCat) return false;
    if (filterVis !== "all" && p.visibilita !== filterVis) return false;
    if (search && !p.titolo.toLowerCase().includes(search.toLowerCase()) && !(p.contenuto || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = categorie.reduce((acc, cat) => {
    const items = filtered.filter((p) => p.categoria_id === cat.id);
    if (items.length > 0) acc.push({ cat, items });
    return acc;
  }, []);
  const uncategorized = filtered.filter((p) => !p.categoria_id);
  if (uncategorized.length > 0) grouped.push({ cat: { id: null, nome: "Senza Categoria", colore: "#94a3b8" }, items: uncategorized });

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7" /> Wiki Aziendale
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Documentazione, guide e procedure interne</p>
        </div>
        <Button className="gap-2" onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" /> Nuovo Articolo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cerca articoli..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            {categorie.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterVis} onValueChange={setFilterVis}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Visibilità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            <SelectItem value="pubblico">Pubblico</SelectItem>
            <SelectItem value="riservato">Riservato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Articles grouped by category */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nessun articolo trovato</p>
          <p className="text-sm mt-1">Crea il primo articolo della wiki!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ cat, items }) => (
            <div key={cat.id || "none"}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.colore || "#94a3b8" }} />
                <h2 className="font-semibold text-foreground">{cat.nome}</h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((pagina) => (
                  <div
                    key={pagina.id}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group"
                    onClick={() => setSelected(pagina)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm text-foreground leading-snug line-clamp-2">{pagina.titolo}</h3>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pagina.visibilita === "riservato" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                        {pagina.visibilita === "riservato" ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                        {pagina.visibilita === "riservato" ? "Riservato" : "Pubblico"}
                      </span>
                    </div>
                    {pagina.progetto_nome && (
                      <p className="text-xs text-muted-foreground mt-1.5">📁 {pagina.progetto_nome}</p>
                    )}
                    {pagina.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pagina.tags.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{pagina.autore_nome}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Article Dialog */}
      <Dialog open={!!selected && !editing} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 pr-6">
                  <DialogTitle className="text-xl leading-tight">{selected.titolo}</DialogTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${selected.visibilita === "riservato" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                      {selected.visibilita === "riservato" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      {selected.visibilita === "riservato" ? "Riservato" : "Pubblico"}
                    </span>
                    {canEdit(selected) && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(selected)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(selected)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                  {selected.categoria_nome && <span>📂 {selected.categoria_nome}</span>}
                  {selected.progetto_nome && <span>📁 {selected.progetto_nome}</span>}
                  {selected.autore_nome && <span>✍️ {selected.autore_nome}</span>}
                </div>
              </DialogHeader>
              <div
                className="prose prose-sm max-w-none mt-2"
                dangerouslySetInnerHTML={{ __html: selected.contenuto || "<p>Nessun contenuto.</p>" }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifica Articolo" : "Nuovo Articolo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ArticleEditor
              initial={editing}
              categorie={categorie}
              progetti={progetti}
              canManageRiservato={canManageRiservato()}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              saving={saving}
              onCategorieChange={loadAll}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}