import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Briefcase, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "../../components/EmptyState";

const DEFAULT_FUNZIONI = [
  "Amministratore Delegato (CEO)",
  "Direttore finanziario (CFO)",
  "Direttore operativo (COO)",
  "Direttore Marketing (CMO)",
  "Direttore delle Risorse Umane (HR)",
  "Direttore commerciale (CCO)",
  "Responsabile Servizio Clienti",
  "Responsabile Vendite",
  "Responsabile IT",
  "Responsabile della Produzione",
  "Consulente Legale",
  "Addetto alla fatturazione",
  "Responsabile controllo di gestione",
  "Addetto post-vendita",
];

export default function CRMFunzioneLavorativa() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNome, setNewNome] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await supabase.from("crm_funzioni_lavorative").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setItems(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newNome.trim()) return;
    await supabase.from("crm_funzioni_lavorative").insert({ nome: newNome.trim().select().single().then(r => r.data) });
    setNewNome("");
    loadData();
  }

  async function handleUpdate(id) {
    if (!editNome.trim()) return;
    await supabase.from("crm_funzioni_lavorative").update({ nome: editNome.trim().eq("id", id).select().single().then(r => r.data) });
    setEditingId(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("crm_funzioni_lavorative").delete().eq("id", id);
    loadData();
  }

  async function handleSeedDefaults() {
    setSeeding(true);
    const existing = items.map(i => i.nome);
    const toCreate = DEFAULT_FUNZIONI.filter(f => !existing.includes(f));
    await Promise.all(toCreate.map(nome => supabase.from("crm_funzioni_lavorative").insert({ nome }).select().single().then(r => r.data)));
    await loadData();
    setSeeding(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Funzione Lavorativa CRM</h1>
        <p className="text-muted-foreground mt-1">Gestisci le funzioni lavorative disponibili per i contatti del CRM</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          value={newNome}
          onChange={(e) => setNewNome(e.target.value)}
          placeholder="Nuova funzione lavorativa..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-sm"
        />
        <Button onClick={handleAdd} className="gap-2"><Plus className="h-4 w-4" />Aggiungi</Button>
        {items.length === 0 && (
          <Button variant="outline" onClick={handleSeedDefaults} disabled={seeding} className="gap-2">
            {seeding ? "Caricamento..." : "Carica valori di default"}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nessuna funzione lavorativa" description="Aggiungi le funzioni lavorative o carica i valori di default." />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border max-w-xl">
          {[...items].sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','it')).map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3">
              {editingId === r.id ? (
                <>
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="h-8 flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(r.id)} autoFocus />
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleUpdate(r.id)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{r.nome}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(r.id); setEditNome(r.nome); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}