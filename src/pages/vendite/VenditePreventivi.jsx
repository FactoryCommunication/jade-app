import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PreventivoEditor from "@/components/vendite/PreventivoEditor.jsx";
import { toast } from "sonner";

export default function VenditePreventivi() {
  const [preventivi, setPreventivi] = useState([]);
  const [stati, setStati] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [prev, s] = await Promise.all([
      supabase.from("vendita_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_stati_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setPreventivi(prev);
    setStati(s);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (data) => {
    setSaving(true);
    if (editing) {
      await supabase.from("vendita_preventivi").update(data).eq("id", editing.id).select().single().then(r => r.data);
      // Se stato = Approvato → opportunità → Preventivo confermato + lifecycle Customer
      if (data.stato_nome?.toLowerCase() === "approvato" && data.opportunita_id) {
        const statiOpp = await supabase.from("vendita_stati_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
        const statoConf = statiOpp.find(s => s.nome.toLowerCase().includes("confermato"));
        if (statoConf) await supabase.from("vendita_opportunita").update({ stato_id: statoConf.id, stato_nome: statoConf.nome, valore_preventivo: data.totale_scontato }).eq("id", data.opportunita_id).select().single().then(r => r.data);
        if (data.azienda_id) {
          const az = await supabase.from("crm_aziende").select("*").eq("id", data.azienda_id ).maybeSingle().then(r => r.data);
          if (az[0]) {
            const lc = az[0].lifecycle || [];
            if (!lc.includes("Customer")) await supabase.from("crm_aziende").update({ lifecycle: [...lc.filter(l => l !== "Prospect").eq("id", data.azienda_id).select().single().then(r => r.data), "Customer"] });
          }
        }
      }
    } else {
      const allPrev = await supabase.from("vendita_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      const num = `PRV-${new Date().getFullYear()}-${String(allPrev.length + 1).padStart(3, "0")}`;
      const created = await supabase.from("vendita_preventivi").insert({ ...data, numero: num }).select().single().then(r => r.data);
      // Se collegato a opportunità → Prospect
      if (data.opportunita_id) {
        const statiOpp = await supabase.from("vendita_stati_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
        const statoProspect = statiOpp.find(s => s.nome.toLowerCase().includes("prospect"));
        if (statoProspect) await supabase.from("vendita_opportunita").update({ stato_id: statoProspect.id, stato_nome: statoProspect.nome }).eq("id", data.opportunita_id).select().single().then(r => r.data);
        if (data.azienda_id) {
          const az = await supabase.from("crm_aziende").select("*").eq("id", data.azienda_id ).maybeSingle().then(r => r.data);
          if (az[0]) {
            const lc = az[0].lifecycle || [];
            if (!lc.includes("Prospect")) await supabase.from("crm_aziende").update({ lifecycle: [...lc, "Prospect"] }).eq("id", data.azienda_id).select().single().then(r => r.data);
          }
        }
      }
    }
    await loadData();
    setShowForm(false);
    setEditing(null);
    setSaving(false);
    toast.success("Preventivo salvato");
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questo preventivo?")) return;
    await supabase.from("vendita_preventivi").delete().eq("id", id);
    setPreventivi(prev => prev.filter(p => p.id !== id));
    toast.success("Preventivo eliminato");
  };

  const handleDuplica = async (prev) => {
    const allPrev = await supabase.from("vendita_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    const num = `PRV-${new Date().getFullYear()}-${String(allPrev.length + 1).padStart(3, "0")}`;
    const { id, created_date, updated_date, ...rest } = prev;
    await supabase.from("vendita_preventivi").insert({ ...rest, numero: num, data: new Date().select().single().then(r => r.data).toISOString().split("T")[0] });
    await loadData();
    toast.success(`Preventivo duplicato: ${num}`);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Preventivi</h2>
          <p className="text-sm text-muted-foreground">{preventivi.length} preventivi totali</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Preventivo
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Numero</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Azienda</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Referente</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Imponibile</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {preventivi.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nessun preventivo</td></tr>
            )}
            {preventivi.map(p => (
              <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{p.numero}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.data}</td>
                <td className="px-4 py-3">{p.azienda_nome || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.referente_nome || "—"}</td>
                <td className="px-4 py-3 text-right font-medium">€ {(p.totale_scontato || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{p.stato_nome || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Modifica ${editing.numero}` : "Nuovo Preventivo"}</DialogTitle>
          </DialogHeader>
          <PreventivoEditor
            initial={editing || {}}
            stati={stati}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}