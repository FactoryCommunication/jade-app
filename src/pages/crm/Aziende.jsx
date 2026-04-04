import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Building2, Plus, Search, Pencil, Trash2, ChevronRight, FolderKanban, ExternalLink, Users, Phone, Mail, ArrowDownAZ } from "lucide-react";
import PersonaForm from "@/components/crm/PersonaForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EmptyState from "@/components/EmptyState";
import AziendaForm from "@/components/crm/AziendaForm";

const LIFECYCLE_DEFAULT = ["Lead", "Prospect", "Customer", "Ex Customer", "Ambassador Partner", "Non in Target", "Non Affidabile"];

const lifecycleColors = {
  "Lead": "bg-blue-100 text-blue-700",
  "Prospect": "bg-yellow-100 text-yellow-700",
  "Customer": "bg-green-100 text-green-700",
  "Ex Customer": "bg-gray-100 text-gray-600",
  "Ambassador Partner": "bg-purple-100 text-purple-700",
  "Non in Target": "bg-red-100 text-red-600",
  "Non Affidabile": "bg-red-200 text-red-800",
};

const STATUS_LABELS = { in_corso: "In Corso", completato: "Completato", in_pausa: "In Pausa", pianificato: "Pianificato" };
const STATUS_COLORS = { in_corso: "bg-blue-100 text-blue-700", completato: "bg-green-100 text-green-700", in_pausa: "bg-yellow-100 text-yellow-700", pianificato: "bg-gray-100 text-gray-600" };

export default function Aziende() {
  const navigate = useNavigate();
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aziendaToDelete, setAziendaToDelete] = useState(null);
  const [deleteCode, setDeleteCode] = useState("");
  const confirmCode = aziendaToDelete ? aziendaToDelete.nome.substring(0, 4).toUpperCase() + "-DEL" : "";
  const [sortAlpha, setSortAlpha] = useState(true);
  const [personeCounts, setPersoneCounts] = useState({});
  const [aziendaProjects, setAziendaProjects] = useState([]);
  const [aziendaPersone, setAziendaPersone] = useState([]);
  const [editingPersona, setEditingPersona] = useState(null);
  const [savingPersona, setSavingPersona] = useState(false);
  const [timeEntriesMap, setTimeEntriesMap] = useState({});
  const [taskTypes, setTaskTypes] = useState([]);

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(r => r.data?.user).then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
    supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []).then(setTaskTypes).catch(() => {});
    supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []).then((persone) => {
      const counts = {};
      persone.forEach((p) => { if (p.azienda_id) counts[p.azienda_id] = (counts[p.azienda_id] || 0) + 1; });
      setPersoneCounts(counts);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setAziendaProjects([]); setAziendaPersone([]); return; }
    async function loadRelated() {
      const [allProjects, allEntries, allPersone] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("time_entries").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("crm_persone").select("*").eq("azienda_id", selected.id ).order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      ]);
      const related = allProjects.filter((p) => (p.aziende_ids || []).includes(selected.id));
      setAziendaProjects(related);
      setAziendaPersone(allPersone);
      const map = {};
      allEntries.forEach((e) => { if (e.project_id) map[e.project_id] = (map[e.project_id] || 0) + (e.hours || 0); });
      setTimeEntriesMap(map);
    }
    loadRelated();
  }, [selected?.id]);

  async function loadData() {
    const data = await supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setAziende(data);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    if (editing) await supabase.from("crm_aziende").update(data).eq("id", editing.id).select().single().then(r => r.data);
    else await supabase.from("crm_aziende").insert(data).select().single().then(r => r.data);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("crm_aziende").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    setAziendaToDelete(null);
    setDeleteCode("");
    loadData();
  }

  const filtered = aziende
    .filter((a) =>
      a.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => sortAlpha ? a.nome?.localeCompare(b.nome, "it") : 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Aziende</h2>
          <p className="text-sm text-muted-foreground">{aziende.length} aziende nel CRM</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className={`gap-2 ${sortAlpha ? "border-primary text-primary" : ""}`} onClick={() => setSortAlpha((v) => !v)}>
            <ArrowDownAZ className="h-4 w-4" /> A→Z
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" />Nuova Azienda
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca per nome o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Nessuna azienda" description="Aggiungi la prima azienda al CRM."
          action={<Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" />Nuova Azienda</Button>} />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {filtered.map((az) => (
            <div key={az.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelected(az)}>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {az.logo_url
                  ? <img src={az.logo_url} alt={az.nome} className="h-full w-full object-contain" />
                  : <Building2 className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{az.nome}</p>
                <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                  {(az.lifecycle || []).map((l) => (
                    <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${lifecycleColors[l] || "bg-secondary text-muted-foreground"}`}>{l}</span>
                  ))}
                  {az.indirizzo && <span className="text-xs text-muted-foreground">📍 {az.indirizzo}</span>}
                  {(az.telefoni || []).length > 0 && <span className="text-xs text-muted-foreground">📞 {az.telefoni[0].numero}</span>}
                  {personeCounts[az.id] > 0 && <span className="text-xs text-muted-foreground">👤 {personeCounts[az.id]} contatti</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(az); setShowForm(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setAziendaToDelete(az); setDeleteCode(""); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />{selected.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {selected.indirizzo && <p><span className="font-medium">Indirizzo:</span> {selected.indirizzo}</p>}
              {selected.email && <p><span className="font-medium">Email:</span> {selected.email}</p>}
              {selected.sito_internet && <p><span className="font-medium">Sito:</span> <a href={selected.sito_internet} target="_blank" className="text-primary underline">{selected.sito_internet}</a></p>}
              {(selected.telefoni || []).length > 0 && (
                <div><span className="font-medium">Telefoni:</span>
                  <ul className="mt-1 space-y-0.5">{selected.telefoni.map((t, i) => <li key={i} className="text-muted-foreground">{t.etichetta}: {t.numero}</li>)}</ul>
                </div>
              )}
              {(selected.lifecycle || []).length > 0 && (
                <div><span className="font-medium">Lifecycle:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">{selected.lifecycle.map((l) => (
                    <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${lifecycleColors[l] || "bg-secondary text-muted-foreground"}`}>{l}</span>
                  ))}</div>
                </div>
              )}
              {selected.partita_iva && <p><span className="font-medium">P.IVA:</span> {selected.partita_iva}</p>}
              {selected.codice_fiscale && <p><span className="font-medium">C.F.:</span> {selected.codice_fiscale}</p>}
              {selected.codice_sdi && <p><span className="font-medium">SDI:</span> {selected.codice_sdi}</p>}
              {selected.pec && <p><span className="font-medium">PEC:</span> {selected.pec}</p>}
              {selected.note && <p><span className="font-medium">Note:</span> {selected.note}</p>}

              {/* Contatti */}
              <div className="pt-2">
                <h3 className="font-semibold text-base text-foreground flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" /> Contatti collegati
                </h3>
                {aziendaPersone.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">Nessun contatto collegato a questa azienda.</p>
                ) : (
                  <div className="space-y-2">
                    {aziendaPersone.map((p) => (
                      <div key={p.id} className="border border-border rounded-lg p-3 flex items-center gap-3 bg-secondary/30">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{p.nome} {p.cognome}</p>
                          {p.ruolo && <p className="text-xs text-muted-foreground mt-0.5">{p.ruolo}</p>}
                          <div className="flex flex-wrap gap-3 mt-1">
                            {(p.telefoni || []).slice(0, 1).map((t, i) => (
                              <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />{t.numero}
                              </span>
                            ))}
                            {p.email && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />{p.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setEditingPersona(p)}>
                          <Pencil className="h-3.5 w-3.5" /> Modifica
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progetti */}
              <div className="pt-2">
                <h3 className="font-semibold text-base text-foreground flex items-center gap-2 mb-3">
                  <FolderKanban className="h-4 w-4 text-primary" /> Progetti collegati
                </h3>
                {aziendaProjects.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">Nessun progetto collegato a questa azienda.</p>
                ) : (
                  <div className="space-y-2">
                    {aziendaProjects.map((proj) => {
                      const loggedHours = timeEntriesMap[proj.id] || 0;
                      const hourlyRate = proj.task_type_id
                        ? (taskTypes.find((t) => t.id === proj.task_type_id)?.hourly_rate || 0)
                        : 0;
                      const avgRate = taskTypes.length > 0
                        ? taskTypes.reduce((s, t) => s + (t.hourly_rate || 0), 0) / taskTypes.filter((t) => t.hourly_rate).length || 0
                        : 0;
                      const effectiveRate = hourlyRate || avgRate || 0;
                      const totalCost = loggedHours * effectiveRate;
                      return (
                        <div key={proj.id} className="border border-border rounded-lg p-3 flex items-start gap-3 bg-secondary/30">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">{proj.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[proj.status] || "bg-gray-100 text-gray-600"}`}>
                                {STATUS_LABELS[proj.status] || proj.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium text-foreground">Ore previste:</span>
                                <span>{proj.budget_hours ? `${proj.budget_hours}h` : "—"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium text-foreground">Ore realizzate:</span>
                                <span className={loggedHours > (proj.budget_hours || 0) && proj.budget_hours ? "text-red-600 font-semibold" : ""}>
                                  {loggedHours > 0 ? `${loggedHours.toFixed(1)}h` : "0h"}
                                </span>
                              </div>
                              {isAdmin && (
                                <>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <span className="font-medium text-foreground">Budget previsto:</span>
                                    <span>{proj.budget_euro ? `€ ${proj.budget_euro.toLocaleString("it-IT")}` : "—"}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <span className="font-medium text-foreground">Costo totale:</span>
                                    <span className={totalCost > (proj.budget_euro || 0) && proj.budget_euro ? "text-red-600 font-semibold" : ""}>
                                      {effectiveRate > 0 ? `€ ${totalCost.toLocaleString("it-IT", { maximumFractionDigits: 0 })}` : "—"}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            onClick={() => { setSelected(null); navigate(`/projects/${proj.id}`); }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Modifica
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => { setEditing(selected); setSelected(null); setShowForm(true); }}>Modifica</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>Chiudi</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit contatto dialog */}
      <Dialog open={!!editingPersona} onOpenChange={(o) => !o && setEditingPersona(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Contatto</DialogTitle></DialogHeader>
          {editingPersona && (
            <PersonaForm
              initial={editingPersona}
              onSubmit={async (data) => {
                setSavingPersona(true);
                await supabase.from("crm_persone").update(data).eq("id", editingPersona.id).select().single().then(r => r.data);
                setSavingPersona(false);
                setEditingPersona(null);
                // Refresh contacts
                const refreshed = await supabase.from("crm_persone").select("*").eq("azienda_id", selected.id ).order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
                setAziendaPersone(refreshed);
              }}
              onCancel={() => setEditingPersona(null)}
              loading={savingPersona}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aziendaToDelete} onOpenChange={(o) => { if (!o) { setAziendaToDelete(null); setDeleteCode(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'azienda?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>Stai per eliminare <strong>{aziendaToDelete?.nome}</strong>. Questa azione è irreversibile.</span>
              <span className="block font-mono font-bold text-lg text-foreground bg-secondary px-3 py-1 rounded text-center tracking-widest">{confirmCode}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Input autoFocus placeholder={`Digita ${confirmCode}`} value={deleteCode} onChange={(e) => setDeleteCode(e.target.value.toUpperCase())} className="font-mono tracking-widest" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCode("")}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(aziendaToDelete?.id)} disabled={deleteCode !== confirmCode} className="bg-destructive text-destructive-foreground disabled:opacity-40">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Azienda" : "Nuova Azienda"}</DialogTitle>
          </DialogHeader>
          <AziendaForm initial={editing || {}} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} loading={saving} />
        </DialogContent>
      </Dialog>
    </div>
  );
}