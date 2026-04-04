import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";

const MODALITA_PRESET = ["Rimessa Diretta", "30 gg", "60 gg", "90 gg"];

function StageList({ title, items, onAdd, onDelete, onUpdate, newNome, setNewNome, newColore, setNewColore }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="space-y-2">
        {items.sort((a,b) => (a.ordine||0) - (b.ordine||0)).map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: item.colore || "#6b7280" }} />
            <Input value={item.nome} onChange={e => onUpdate(item.id, { nome: e.target.value })} className="h-8 text-sm flex-1" />
            <input type="color" value={item.colore || "#6b7280"} onChange={e => onUpdate(item.id, { colore: e.target.value })} className="h-8 w-10 rounded border border-input cursor-pointer p-0.5 shrink-0" />
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Input placeholder="Nuovo stato..." value={newNome} onChange={e => setNewNome(e.target.value)} className="h-8 text-sm" onKeyDown={e => e.key === "Enter" && onAdd()} />
        <input type="color" value={newColore} onChange={e => setNewColore(e.target.value)} className="h-8 w-10 rounded border border-input cursor-pointer p-0.5 shrink-0" />
        <Button size="sm" onClick={onAdd} disabled={!newNome.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function VenditePersonalizzazione() {
  const [statiOpp, setStatiOpp] = useState([]);
  const [statiPrev, setStatiPrev] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [infoAmm, setInfoAmm] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [modalitaCustom, setModalitaCustom] = useState("Rimessa Diretta");
  const [savingModalita, setSavingModalita] = useState(false);
  const [newOppNome, setNewOppNome] = useState("");
  const [newOppColore, setNewOppColore] = useState("#6366f1");
  const [newPrevNome, setNewPrevNome] = useState("");
  const [newPrevColore, setNewPrevColore] = useState("#6366f1");
  const [newCatNome, setNewCatNome] = useState("");

  const loadData = async () => {
    const [so, sp, cat, settings, modSettings] = await Promise.all([
      supabase.from("vendita_stati_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_stati_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_categorie_risorse").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_settings").select("*").eq("key", "info_amministrative").maybeSingle().then(r => r.data),
      supabase.from("vendita_settings").select("*").eq("key", "modalita_pagamento").maybeSingle().then(r => r.data),
    ]);
    setStatiOpp(so);
    setStatiPrev(sp);
    setCategorie(cat);
    setInfoAmm(settings[0]?.value || "");
    setModalitaCustom(modSettings[0]?.value || "Rimessa Diretta");
  };

  useEffect(() => { loadData(); }, []);

  const addStato = async (entity, nome, colore, items, setFn, setNome, setColore) => {
    if (!nome.trim()) return;
    const rec = await base44.entities[entity].create({ nome: nome.trim(), colore, ordine: items.length });
    setFn(prev => [...prev, rec]);
    setNome(""); setColore("#6366f1");
  };

  const updateStato = async (entity, id, data, setFn) => {
    await base44.entities[entity].update(id, data);
    setFn(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteStato = async (entity, id, setFn) => {
    await base44.entities[entity].delete(id);
    setFn(prev => prev.filter(s => s.id !== id));
  };

  const saveInfoAmm = async () => {
    setSavingInfo(true);
    const existing = await supabase.from("vendita_settings").select("*").eq("key", "info_amministrative").maybeSingle().then(r => r.data);
    if (existing[0]) {
      await supabase.from("vendita_settings").update({ value: infoAmm }).eq("id", existing[0].id).select().single().then(r => r.data);
    } else {
      await supabase.from("vendita_settings").insert({ key: "info_amministrative", value: infoAmm }).select().single().then(r => r.data);
    }
    setSavingInfo(false);
    toast.success("Informazioni amministrative salvate");
  };

  const saveModalita = async () => {
    if (!modalitaCustom.trim()) return;
    setSavingModalita(true);
    const val = modalitaCustom.trim();
    const existing = await supabase.from("vendita_settings").select("*").eq("key", "modalita_pagamento").maybeSingle().then(r => r.data);
    if (existing[0]) {
      await supabase.from("vendita_settings").update({ value: val }).eq("id", existing[0].id).select().single().then(r => r.data);
    } else {
      await supabase.from("vendita_settings").insert({ key: "modalita_pagamento", value: val }).select().single().then(r => r.data);
    }
    await loadData();
    setSavingModalita(false);
    toast.success(`Modalità salvata: ${val}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Personalizzazione</h2>
        <p className="text-sm text-muted-foreground">Configura stati, categorie e testi del modulo vendite</p>
      </div>

      {/* Modalità di Pagamento */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Modalità di Pagamento (opzioni preventivo)</h3>
        <div className="flex flex-wrap gap-2">
          {["Rimessa Diretta", "30 gg", "60 gg", "90 gg"].map(v => (
            <span key={v} className="px-3 py-1.5 rounded-full text-xs border bg-secondary text-foreground">{v}</span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <StageList
          title="Stati Opportunità (Colonne Kanban)"
          items={statiOpp}
          newNome={newOppNome} setNewNome={setNewOppNome}
          newColore={newOppColore} setNewColore={setNewOppColore}
          onAdd={() => addStato("VenditaStatoOpportunita", newOppNome, newOppColore, statiOpp, setStatiOpp, setNewOppNome, setNewOppColore)}
          onUpdate={(id, data) => updateStato("VenditaStatoOpportunita", id, data, setStatiOpp)}
          onDelete={(id) => deleteStato("VenditaStatoOpportunita", id, setStatiOpp)}
        />
        <StageList
          title="Stati Preventivo"
          items={statiPrev}
          newNome={newPrevNome} setNewNome={setNewPrevNome}
          newColore={newPrevColore} setNewColore={setNewPrevColore}
          onAdd={() => addStato("VenditaStatoPreventivo", newPrevNome, newPrevColore, statiPrev, setStatiPrev, setNewPrevNome, setNewPrevColore)}
          onUpdate={(id, data) => updateStato("VenditaStatoPreventivo", id, data, setStatiPrev)}
          onDelete={(id) => deleteStato("VenditaStatoPreventivo", id, setStatiPrev)}
        />
      </div>

      {/* Categorie Risorse */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Categorie Risorse</h3>
        <div className="flex flex-wrap gap-2">
          {categorie.map(c => (
            <div key={c.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-sm">
              <span>{c.nome}</span>
              <button onClick={async () => { await supabase.from("vendita_categorie_risorse").delete().eq("id", c.id); setCategorie(prev => prev.filter(x => x.id !== c.id)); }}
                className="ml-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Nuova categoria..." value={newCatNome} onChange={e => setNewCatNome(e.target.value)} className="h-8 text-sm max-w-xs"
            onKeyDown={async e => {
              if (e.key === "Enter" && newCatNome.trim()) {
                const rec = await supabase.from("vendita_categorie_risorse").insert({ nome: newCatNome.trim() });
                setCategorie(prev => [...prev, rec]); setNewCatNome("");
              }
            }} />
          <Button size="sm" disabled={!newCatNome.trim()} onClick={async () => {
            const rec = await supabase.from("vendita_categorie_risorse").insert({ nome: newCatNome.trim() });
            setCategorie(prev => [...prev, rec]); setNewCatNome("");
          }}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Informazioni Amministrative */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Informazioni Amministrative (template preventivo)</h3>
        <div className="rounded-md border border-input overflow-hidden">
          <ReactQuill theme="snow" value={infoAmm} onChange={setInfoAmm} style={{ minHeight: 150 }} />
        </div>
        <Button onClick={saveInfoAmm} disabled={savingInfo}>{savingInfo ? "Salvataggio..." : "Salva"}</Button>
      </div>
    </div>
  );
}