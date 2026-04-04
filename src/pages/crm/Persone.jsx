import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Pencil, Trash2, UserCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PersonaForm from "@/components/crm/PersonaForm";
import EmptyState from "@/components/EmptyState";

export default function Persone() {
  const [persone, setPersone] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("crm_persone").select("*").order("cognome", { ascending: true }),
      supabase.from("crm_aziende").select("*").order("nome", { ascending: true }),
    ]);
    setPersone(p || []);
    setAziende(a || []);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    if (editing) {
      await supabase.from("crm_persone").update(data).eq("id", editing.id);
    } else {
      await supabase.from("crm_persone").insert(data);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm("Eliminare questo contatto?")) return;
    await supabase.from("crm_persone").delete().eq("id", id);
    loadData();
  }

  function openEdit(persona) {
    setEditing(persona);
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  const filtered = persone.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.nome || "").toLowerCase().includes(q) ||
      (p.cognome || "").toLowerCase().includes(q) ||
      (p.azienda_nome || "").toLowerCase().includes(q) ||
      (p.emails || []).some((e) => e.indirizzo?.toLowerCase().includes(q))
    );
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Persone</h1>
          <p className="text-muted-foreground mt-1">{persone.length} contatti nel CRM</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Contatto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, azienda, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="Nessun contatto"
          description={persone.length === 0 ? "Aggiungi il primo contatto al CRM." : "Nessun contatto corrisponde alla ricerca."}
          action={persone.length === 0 ? <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nuovo Contatto</Button> : null}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {filtered.map((persona) => (
            <div key={persona.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
              <div className="h-10 w-10 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {persona.foto_url ? (
                  <img src={persona.foto_url} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {persona.titolo && persona.titolo !== "none" ? `${persona.titolo} ` : ""}{persona.nome} {persona.cognome}
                </p>
                {persona.azienda_nome && (
                  <p className="text-sm text-muted-foreground">• {persona.azienda_nome}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-1">
                  {(persona.emails || []).slice(0, 1).map((e, i) => (
                    <span key={i} className="text-xs text-muted-foreground">{e.indirizzo}</span>
                  ))}
                  {(persona.telefoni || []).slice(0, 1).map((t, i) => (
                    <span key={i} className="text-xs text-muted-foreground">• {t.numero}</span>
                  ))}
                </div>
                {(persona.lifecycle || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {persona.lifecycle.map((l) => (
                      <span key={l} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{l}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(persona)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(persona.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Contatto" : "Nuovo Contatto"}</DialogTitle>
          </DialogHeader>
          <PersonaForm
            initial={editing || {}}
            aziende={aziende}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}