import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OpportunitaForm from "@/components/vendite/OpportunitaForm";
import PreventivoEditor from "@/components/vendite/PreventivoEditor.jsx";
import { toast } from "sonner";

export default function VenditeOpportunita() {
  const [stati, setStati] = useState([]);
  const [opportunita, setOpportunita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [teamVendite, setTeamVendite] = useState(null);
  const [preventivi, setPreventivi] = useState([]);
  const [statiPrev, setStatiPrev] = useState([]);
  const [showPrevForm, setShowPrevForm] = useState(false);
  const [editingPrev, setEditingPrev] = useState(null);
  const [savingPrev, setSavingPrev] = useState(false);

  const loadData = async () => {
    const [s, o, user, teams, prev, sp] = await Promise.all([
      supabase.from("vendita_stati_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.auth.getUser().then(r => r.data?.user),
      supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_stati_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setStati(s);
    setOpportunita(o);
    setCurrentUser(user);
    setTeamVendite(teams.find(t => t.section === "vendite") || null);
    setPreventivi(prev);
    setStatiPrev(sp);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Permission helpers
  const isAdmin = currentUser?.role === "admin";
  const isResponsabile = teamVendite?.responsabile_id === currentUser?.id;
  const isTeamMember = isAdmin || isResponsabile || (teamVendite?.member_ids || []).includes(currentUser?.id);

  const canEdit = (opp) => isAdmin || isResponsabile || opp.created_by === currentUser?.email;
  const canDelete = (opp) => canEdit(opp);
  const canDrag = (opp) => canEdit(opp);

  const handleDrop = async (oppId, nuovoStatoId, nuovoStatoNome) => {
    const opp = opportunita.find(o => o.id === oppId);
    if (!opp || !canDrag(opp)) return;
    await supabase.from("vendita_opportunita").update({ stato_id: nuovoStatoId, stato_nome: nuovoStatoNome }).eq("id", oppId).select().single().then(r => r.data);
    setOpportunita(prev => prev.map(o => o.id === oppId ? { ...o, stato_id: nuovoStatoId, stato_nome: nuovoStatoNome } : o));
    // Sync preventivo stato (1:1) — trova preventivo collegato e aggiorna stato per nome
    const prevCollegato = preventivi.find(p => p.opportunita_id === oppId);
    if (prevCollegato) {
      const statoMatch = statiPrev.find(sp => sp.nome.toLowerCase() === nuovoStatoNome.toLowerCase());
      if (statoMatch) {
        await supabase.from("vendita_preventivi").update({ stato_id: statoMatch.id, stato_nome: statoMatch.nome }).eq("id", prevCollegato.id).select().single().then(r => r.data);
        setPreventivi(prev => prev.map(p => p.id === prevCollegato.id ? { ...p, stato_id: statoMatch.id, stato_nome: statoMatch.nome } : p));
      }
    }
  };

  const handleSave = async (data) => {
    setSaving(true);
    if (editing) {
      await supabase.from("vendita_opportunita").update(data).eq("id", editing.id).select().single().then(r => r.data);
    } else {
      const count = await supabase.from("vendita_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      const num = `OPP-${new Date().getFullYear()}-${String((count.length || 0) + 1).padStart(3, "0")}`;
      await supabase.from("vendita_opportunita").insert({ ...data, numero: num, data: data.data || new Date().select().single().then(r => r.data).toISOString().split("T")[0] });
    }
    await loadData();
    setShowForm(false);
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa opportunità?")) return;
    await supabase.from("vendita_opportunita").delete().eq("id", id);
    setOpportunita(prev => prev.filter(o => o.id !== id));
    toast.success("Opportunità eliminata");
  };

  const handleCreaPreventivo = async (opp) => {
    // 1:1 check — se esiste già, apri quello esistente
    const existing = preventivi.find(p => p.opportunita_id === opp.id);
    if (existing) {
      setEditingPrev(existing);
      setShowPrevForm(true);
      return;
    }
    // Crea nuovo preventivo
    const allPrev = await supabase.from("vendita_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    const num = `PRV-${new Date().getFullYear()}-${String(allPrev.length + 1).padStart(3, "0")}`;
    const sp = statiPrev.length > 0 ? statiPrev[0] : null;
    const created = await supabase.from("vendita_preventivi").insert({
      numero: num,
      data: new Date().select().single().then(r => r.data).toISOString().split("T")[0],
      opportunita_id: opp.id,
      azienda_id: opp.azienda_id,
      azienda_nome: opp.azienda_nome,
      referente_id: opp.referente_id,
      referente_nome: opp.referente_nome,
      stato_id: sp?.id || "",
      stato_nome: sp?.nome || "",
      iva_percentuale: 22,
    });
    // Aggiorna opportunità a Prospect
    const statoProspect = stati.find(s => s.nome.toLowerCase().includes("prospect"));
    if (statoProspect) {
      await supabase.from("vendita_opportunita").update({ stato_id: statoProspect.id, stato_nome: statoProspect.nome }).eq("id", opp.id).select().single().then(r => r.data);
      setOpportunita(prev => prev.map(o => o.id === opp.id ? { ...o, stato_id: statoProspect.id, stato_nome: statoProspect.nome } : o));
    }
    // Lifecycle azienda → Prospect
    if (opp.azienda_id) {
      const az = await supabase.from("crm_aziende").select("*").eq("id", opp.azienda_id ).maybeSingle().then(r => r.data);
      if (az[0]) {
        const lc = az[0].lifecycle || [];
        if (!lc.includes("Prospect")) await supabase.from("crm_aziende").update({ lifecycle: [...lc, "Prospect"] }).eq("id", opp.azienda_id).select().single().then(r => r.data);
      }
    }
    setPreventivi(prev => [...prev, created]);
    setEditingPrev(created);
    setShowPrevForm(true);
    toast.success(`Preventivo ${num} creato`);
  };

  const handleSavePrev = async (data) => {
    setSavingPrev(true);
    await supabase.from("vendita_preventivi").update(data).eq("id", editingPrev.id).select().single().then(r => r.data);
    // Se approvato → opportunità Preventivo confermato + lifecycle Customer
    if (data.stato_nome?.toLowerCase() === "approvato") {
      const statoConf = stati.find(s => s.nome.toLowerCase().includes("confermato"));
      if (statoConf && data.opportunita_id) {
        await supabase.from("vendita_opportunita").update({ stato_id: statoConf.id, stato_nome: statoConf.nome, valore_preventivo: data.totale_scontato }).eq("id", data.opportunita_id).select().single().then(r => r.data);
        setOpportunita(prev => prev.map(o => o.id === data.opportunita_id ? { ...o, stato_id: statoConf.id, stato_nome: statoConf.nome } : o));
      }
      if (data.azienda_id) {
        const az = await supabase.from("crm_aziende").select("*").eq("id", data.azienda_id ).maybeSingle().then(r => r.data);
        if (az[0]) {
          const lc = az[0].lifecycle || [];
          if (!lc.includes("Customer")) await supabase.from("crm_aziende").update({ lifecycle: [...lc.filter(l => l !== "Prospect").eq("id", data.azienda_id).select().single().then(r => r.data), "Customer"] });
        }
      }
    }
    await loadData();
    setShowPrevForm(false);
    setEditingPrev(null);
    setSavingPrev(false);
    toast.success("Preventivo salvato");
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Opportunità</h2>
          <p className="text-sm text-muted-foreground">Funnel di vendita</p>
        </div>
        {isTeamMember && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuova Opportunità
          </Button>
        )}
      </div>
      {!isTeamMember && (
        <div className="text-sm text-muted-foreground bg-secondary/40 rounded-xl p-4 text-center">
          Solo i membri del Team Vendite possono gestire le opportunità.
        </div>
      )}

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: stati.length * 280 + "px" }}>
          {stati.map(stato => {
            const cards = opportunita.filter(o => o.stato_id === stato.id);
            return (
              <div key={stato.id} className="flex-shrink-0 w-64 bg-secondary/40 rounded-xl p-3 flex flex-col gap-2"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const id = e.dataTransfer.getData("oppId");
                  if (id) handleDrop(id, stato.id, stato.nome);
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stato.colore || "#6b7280" }} />
                  <span className="text-xs font-semibold text-foreground">{stato.nome}</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-background/60 rounded-full px-2">{cards.length}</span>
                </div>
                {cards.map(opp => (
                  <div key={opp.id} draggable
                    onDragStart={e => e.dataTransfer.setData("oppId", opp.id)}
                    className="bg-card rounded-lg border border-border p-3 cursor-grab hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-foreground truncate">{opp.titolo}</p>
                    {opp.azienda_nome && <p className="text-xs text-muted-foreground mt-0.5">{opp.azienda_nome}</p>}
                    {opp.budget_euro && <p className="text-xs text-emerald-600 font-medium mt-1">€ {opp.budget_euro.toLocaleString("it-IT")}</p>}
                    <div className="flex items-center gap-1 mt-2">
                      {isTeamMember && (() => {
                        const hasPrev = preventivi.some(p => p.opportunita_id === opp.id);
                        return (
                          <button onClick={() => handleCreaPreventivo(opp)} title={hasPrev ? "Apri Preventivo" : "Crea Preventivo"}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                              hasPrev ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}>
                            <FileText className="h-3 w-3" /> {hasPrev ? "Preventivo ✓" : "Preventivo"}
                          </button>
                        );
                      })()}
                      {canEdit(opp) && (
                        <button onClick={() => { setEditing(opp); setShowForm(true); }}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {canDelete(opp) && (
                        <button onClick={() => handleDelete(opp.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Opportunità" : "Nuova Opportunità"}</DialogTitle>
          </DialogHeader>
          <OpportunitaForm
            initial={editing || {}}
            stati={stati}
            teamVendite={teamVendite}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            loading={saving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPrevForm} onOpenChange={setShowPrevForm}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPrev ? `Preventivo ${editingPrev.numero}` : "Preventivo"}</DialogTitle>
          </DialogHeader>
          {editingPrev && (
            <PreventivoEditor
              initial={editingPrev}
              stati={statiPrev}
              onSubmit={handleSavePrev}
              onCancel={() => { setShowPrevForm(false); setEditingPrev(null); }}
              loading={savingPrev}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}