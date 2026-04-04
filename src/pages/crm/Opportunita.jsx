import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmptyState from "@/components/EmptyState";
import OpportunitaForm from "@/components/crm/OpportunitaForm";
import moment from "moment";

const statoConfig = {
  nuova: { label: "Nuova", cls: "bg-blue-100 text-blue-700" },
  in_trattativa: { label: "In Trattativa", cls: "bg-yellow-100 text-yellow-700" },
  proposta_inviata: { label: "Proposta Inviata", cls: "bg-purple-100 text-purple-700" },
  vinta: { label: "Vinta", cls: "bg-green-100 text-green-700" },
  persa: { label: "Persa", cls: "bg-red-100 text-red-600" },
};

export default function Opportunita() {
  const [opps, setOpps] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [persone, setPersone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [o, a, p] = await Promise.all([
      supabase.from("crm_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setOpps(o);
    setAziende(a);
    setPersone(p);
    setLoading(false);
  }

  async function handleSave(data) {
    setSaving(true);
    if (editing) await supabase.from("crm_opportunita").update(data).eq("id", editing.id).select().single().then(r => r.data);
    else await supabase.from("crm_opportunita").insert(data).select().single().then(r => r.data);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("crm_opportunita").delete().eq("id", id);
    loadData();
  }

  const totaleValore = opps.filter(o => o.stato !== "persa").reduce((s, o) => s + (o.valore || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Opportunità</h2>
          <p className="text-sm text-muted-foreground">{opps.length} opportunità · Pipeline: €{totaleValore.toLocaleString("it-IT")}</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />Nuova Opportunità
        </Button>
      </div>

      {opps.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nessuna opportunità" description="Aggiungi la prima opportunità commerciale."
          action={<Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" />Nuova Opportunità</Button>} />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {opps.map((op) => {
            const s = statoConfig[op.stato] || { label: op.stato, cls: "bg-secondary text-muted-foreground" };
            return (
              <div key={op.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{op.titolo}</p>
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    {op.azienda_nome && <span className="text-xs text-muted-foreground">{op.azienda_nome}</span>}
                    {op.persona_nome && <span className="text-xs text-muted-foreground">• {op.persona_nome}</span>}
                    {op.data_chiusura && <span className="text-xs text-muted-foreground">• Chiusura: {moment(op.data_chiusura).format("DD/MM/YYYY")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {op.valore && <span className="font-bold text-foreground">€{op.valore.toLocaleString("it-IT")}</span>}
                  {op.probabilita != null && <span className="text-xs text-muted-foreground">{op.probabilita}%</span>}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(op); setShowForm(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(op.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Opportunità" : "Nuova Opportunità"}</DialogTitle>
          </DialogHeader>
          <OpportunitaForm initial={editing || {}} aziende={aziende} persone={persone} onSubmit={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} loading={saving} />
        </DialogContent>
      </Dialog>
    </div>
  );
}