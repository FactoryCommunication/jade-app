import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { UserCircle, Plus, Search, Pencil, Trash2, Linkedin, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EmptyState from "@/components/EmptyState";
import PersonaForm from "@/components/crm/PersonaForm";

const lifecycleColors = {
  "Lead": "bg-blue-100 text-blue-700",
  "Prospect": "bg-yellow-100 text-yellow-700",
  "Customer": "bg-green-100 text-green-700",
  "Ex Customer": "bg-gray-100 text-gray-600",
  "Ambassador Partner": "bg-purple-100 text-purple-700",
  "Non in Target": "bg-red-100 text-red-600",
  "Non Affidabile": "bg-red-200 text-red-800",
};

export default function Persone() {
  const [persone, setPersone] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [personaToDelete, setPersonaToDelete] = useState(null);
  const [deleteCode, setDeleteCode] = useState("");
  const confirmCode = personaToDelete ? (personaToDelete.cognome + personaToDelete.nome).substring(0, 4).toUpperCase() + "-DEL" : "";

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [p, a] = await Promise.all([
      supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setPersone(p);
    setAziende(a);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    if (editing) await supabase.from("crm_persone").update(data).eq("id", editing.id).select().single().then(r => r.data);
    else await supabase.from("crm_persone").insert(data).select().single().then(r => r.data);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("crm_persone").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    setPersonaToDelete(null);
    setDeleteCode("");
    loadData();
  }

  const filtered = persone
    .filter((p) =>
      `${p.nome} ${p.cognome}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.emails || []).some(e => e.indirizzo?.toLowerCase().includes(search.toLowerCase())) ||
      p.azienda_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.azienda_nome?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (a.cognome || "").localeCompare(b.cognome || "", "it"));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Persone</h2>
          <p className="text-sm text-muted-foreground">{persone.length} contatti nel CRM</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />Nuovo Contatto
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca per nome, email o azienda..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserCircle} title="Nessun contatto" description="Aggiungi il primo contatto al CRM."
          action={<Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" />Nuovo Contatto</Button>} />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {filtered.map((p) => (
            <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {p.foto_url
                  ? <img src={p.foto_url} alt={`${p.nome} ${p.cognome}`} className="h-full w-full object-cover" />
                  : <span className="font-bold text-accent-foreground text-sm">{p.nome?.[0]}{p.cognome?.[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{p.nome} {p.cognome}</p>
                <div className="flex flex-wrap gap-2 mt-0.5 items-center">
                  {p.ruolo && <span className="text-xs text-muted-foreground">{p.ruolo}</span>}
                  {p.azienda_nome && <span className="text-xs text-muted-foreground">• {p.azienda_nome}</span>}
                  {(p.telefoni || []).length > 0 && <span className="text-xs text-muted-foreground">📞 {p.telefoni[0].numero}</span>}
                  {(p.emails || []).length > 0 && <span className="text-xs text-muted-foreground">✉ {p.emails[0].indirizzo}</span>}
                  {(p.lifecycle || []).map((l) => (
                    <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${lifecycleColors[l] || "bg-secondary text-muted-foreground"}`}>{l}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(p); setShowForm(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setPersonaToDelete(p); setDeleteCode(""); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selected.nome} {selected.cognome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {selected.ruolo && <p><span className="font-medium">Ruolo:</span> {selected.ruolo}</p>}
              {selected.azienda_nome && <p><span className="font-medium">Azienda:</span> {selected.azienda_nome}</p>}
              {(selected.emails || []).length > 0 && (
                <div><span className="font-medium">Email:</span>
                  <ul className="mt-1 space-y-0.5">{(selected.emails || []).map((e, i) => <li key={i} className="text-muted-foreground">{e.etichetta}: {e.indirizzo}</li>)}</ul>
                </div>
              )}
              {(selected.telefoni || []).length > 0 && (
                <div><span className="font-medium">Telefoni:</span>
                  <ul className="mt-1 space-y-0.5">{selected.telefoni.map((t, i) => <li key={i} className="text-muted-foreground">{t.etichetta}: {t.numero}</li>)}</ul>
                </div>
              )}
              {selected.indirizzo_residenza && <p><span className="font-medium">Residenza:</span> {selected.indirizzo_residenza}</p>}
              {selected.indirizzo_domicilio && <p><span className="font-medium">Domicilio:</span> {selected.indirizzo_domicilio}</p>}
              {selected.partita_iva && <p><span className="font-medium">P.IVA:</span> {selected.partita_iva}</p>}
              {selected.codice_fiscale && <p><span className="font-medium">C.F.:</span> {selected.codice_fiscale}</p>}
              <div className="flex gap-3 pt-1">
                {selected.linkedin && <a href={selected.linkedin} target="_blank" className="text-primary hover:underline flex items-center gap-1 text-xs"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
                {selected.instagram && <a href={selected.instagram} target="_blank" className="text-primary hover:underline flex items-center gap-1 text-xs"><Instagram className="h-3.5 w-3.5" />Instagram</a>}
                {selected.facebook && <a href={selected.facebook} target="_blank" className="text-primary hover:underline flex items-center gap-1 text-xs"><Facebook className="h-3.5 w-3.5" />Facebook</a>}
              </div>
              {selected.note && <p><span className="font-medium">Note:</span> {selected.note}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => { setEditing(selected); setSelected(null); setShowForm(true); }}>Modifica</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>Chiudi</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!personaToDelete} onOpenChange={(o) => { if (!o) { setPersonaToDelete(null); setDeleteCode(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il contatto?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>Stai per eliminare <strong>{personaToDelete?.nome} {personaToDelete?.cognome}</strong>. Questa azione è irreversibile.</span>
              <span className="block font-mono font-bold text-lg text-foreground bg-secondary px-3 py-1 rounded text-center tracking-widest">{confirmCode}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Input autoFocus placeholder={`Digita ${confirmCode}`} value={deleteCode} onChange={(e) => setDeleteCode(e.target.value.toUpperCase())} className="font-mono tracking-widest" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCode("")}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(personaToDelete?.id)} disabled={deleteCode !== confirmCode} className="bg-destructive text-destructive-foreground disabled:opacity-40">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Contatto" : "Nuovo Contatto"}</DialogTitle>
          </DialogHeader>
          <PersonaForm initial={editing || {}} aziende={aziende} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} loading={saving} />
        </DialogContent>
      </Dialog>
    </div>
  );
}