import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function OpportunitaForm({ initial = {}, stati = [], teamVendite = null, onSubmit, onCancel, loading }) {
  const [aziende, setAziende] = useState([]);
  const [persone, setPersone] = useState([]);
  const [users, setUsers] = useState([]);
  const [showNewAzienda, setShowNewAzienda] = useState(false);
  const [newAziendaNome, setNewAziendaNome] = useState("");
  const [savingAzienda, setSavingAzienda] = useState(false);
  const [form, setForm] = useState({
    titolo: initial.titolo || "",
    data: initial.data || new Date().toISOString().split("T")[0],
    azienda_id: initial.azienda_id || "",
    azienda_nome: initial.azienda_nome || "",
    referente_id: initial.referente_id || "",
    referente_nome: initial.referente_nome || "",
    descrizione: initial.descrizione || "",
    budget_euro: initial.budget_euro || "",
    stato_id: initial.stato_id || stati[0]?.id || "",
    stato_nome: initial.stato_nome || stati[0]?.nome || "",
    responsabile_id: initial.responsabile_id || "",
    responsabile_nome: initial.responsabile_nome || "",
    collaboratori: initial.collaboratori || [],
  });

  useEffect(() => {
    Promise.all([
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]).then(([az, pe, allUsers]) => {
      setAziende(az);
      setPersone(pe);
      // Filtra solo utenti del team vendite (responsabile + membri)
      if (teamVendite) {
        const teamIds = new Set([
          ...(teamVendite.member_ids || []),
          ...(teamVendite.responsabile_id ? [teamVendite.responsabile_id] : []),
        ]);
        setUsers(allUsers.filter(u => teamIds.has(u.id)));
      } else {
        setUsers(allUsers);
      }
    });
  }, [teamVendite]);

  const referenti = persone.filter(p => p.azienda_id === form.azienda_id);

  const handleCreaAzienda = async () => {
    if (!newAziendaNome.trim()) return;
    setSavingAzienda(true);
    const created = await supabase.from("crm_aziende").insert({ nome: newAziendaNome.trim().select().single().then(r => r.data) });
    setAziende(prev => [...prev, created]);
    setForm({ ...form, azienda_id: created.id, azienda_nome: created.nome, referente_id: "", referente_nome: "" });
    setNewAziendaNome("");
    setShowNewAzienda(false);
    setSavingAzienda(false);
  };

  const toggleCollab = (u) => {
    const exists = form.collaboratori.find(c => c.user_id === u.id);
    const updated = exists
      ? form.collaboratori.filter(c => c.user_id !== u.id)
      : [...form.collaboratori, { user_id: u.id, user_nome: u.full_name || u.email }];
    setForm({ ...form, collaboratori: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const stato = stati.find(s => s.id === form.stato_id);
    const az = aziende.find(a => a.id === form.azienda_id);
    const ref = persone.find(p => p.id === form.referente_id);
    const resp = users.find(u => u.id === form.responsabile_id);
    onSubmit({
      ...form,
      stato_nome: stato?.nome || form.stato_nome,
      azienda_nome: az?.nome || form.azienda_nome,
      referente_nome: ref ? `${ref.nome} ${ref.cognome}` : form.referente_nome,
      responsabile_nome: resp?.full_name || resp?.email || form.responsabile_nome,
      budget_euro: form.budget_euro ? Number(form.budget_euro) : undefined,
    });
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Titolo *</Label>
        <Input value={form.titolo} onChange={e => setForm({ ...form, titolo: e.target.value })} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Budget (€ netto IVA)</Label>
          <Input type="number" step="0.01" value={form.budget_euro} onChange={e => setForm({ ...form, budget_euro: e.target.value })} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Azienda (CRM)</Label>
          <Select value={form.azienda_id} onValueChange={v => {
            if (v === "__new__") { setShowNewAzienda(true); return; }
            setForm({ ...form, azienda_id: v, referente_id: "", referente_nome: "" });
          }}>
            <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__" className="text-primary font-medium">+ Crea nuova Azienda</SelectItem>
              {[...aziende].sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it')).map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Referente</Label>
          <Select value={form.referente_id} onValueChange={v => setForm({ ...form, referente_id: v })} disabled={referenti.length === 0}>
            <SelectTrigger><SelectValue placeholder={referenti.length === 0 ? "Seleziona prima azienda" : "Seleziona referente"} /></SelectTrigger>
            <SelectContent>{[...referenti].sort((a,b) => (a.cognome||'').localeCompare(b.cognome||'','it')).map(p => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stato</Label>
          <Select value={form.stato_id} onValueChange={v => setForm({ ...form, stato_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona stato" /></SelectTrigger>
            <SelectContent>{stati.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Responsabile</Label>
          <Select value={form.responsabile_id} onValueChange={v => setForm({ ...form, responsabile_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona responsabile" /></SelectTrigger>
            <SelectContent>{[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Collaboratori</Label>
        <div className="flex flex-wrap gap-2 border border-border rounded-lg p-3">
          {[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map(u => {
            const sel = form.collaboratori.some(c => c.user_id === u.id);
            return (
              <button key={u.id} type="button" onClick={() => toggleCollab(u)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary"}`}>
                {u.full_name || u.email}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrizione Richiesta</Label>
        <div className="rounded-md border border-input overflow-hidden">
          <ReactQuill theme="snow" value={form.descrizione} onChange={v => setForm({ ...form, descrizione: v })} style={{ minHeight: 120 }} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
      </div>
    </form>

    <Dialog open={showNewAzienda} onOpenChange={setShowNewAzienda}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nuova Azienda</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nome Azienda *</Label>
            <Input autoFocus value={newAziendaNome} onChange={e => setNewAziendaNome(e.target.value)}
              placeholder="Es. Azienda Rossi" onKeyDown={e => e.key === "Enter" && handleCreaAzienda()} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreaAzienda} disabled={savingAzienda || !newAziendaNome.trim()} className="flex-1">
              {savingAzienda ? "Creazione..." : "Crea Azienda"}
            </Button>
            <Button variant="outline" onClick={() => setShowNewAzienda(false)}>Annulla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}