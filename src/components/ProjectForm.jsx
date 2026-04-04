import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function ProjectForm({ initial = {}, onSubmit, onCancel, loading, isAdmin }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    client: initial.client || "",
    description: initial.description || "",
    status: initial.status || "in_corso",
    priority: initial.priority || "media",
    start_date: initial.start_date || "",
    end_date: initial.end_date || "",
    budget_hours: initial.budget_hours || "",
    budget_euro: initial.budget_euro || "",
    team_id: initial.team_id || "",
    manager_id: initial.manager_id || "",
    color: initial.color || "#6366f1",
    aziende_ids: initial.aziende_ids || [],
    aziende_nomi: initial.aziende_nomi || [],
    referente_id: initial.referente_id || "",
    referente_nome: initial.referente_nome || "",
  });
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [persone, setPersone] = useState([]);
  const [showNewAzienda, setShowNewAzienda] = useState(false);
  const [aziendaDropOpen, setAziendaDropOpen] = useState(false);
  const aziendaDropRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (aziendaDropRef.current && !aziendaDropRef.current.contains(e.target)) setAziendaDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const [newAziendaNome, setNewAziendaNome] = useState("");
  const [savingAzienda, setSavingAzienda] = useState(false);

  useEffect(() => {
    async function load() {
      const [t, u, az, pe] = await Promise.all([
        supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
        supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      ]);
      setTeams(t);
      setUsers(u);
      setAziende(az);
      setPersone(pe);
    }
    load();
  }, []);

  function toggleAzienda(az) {
    const ids = form.aziende_ids || [];
    const nomi = form.aziende_nomi || [];
    let newIds, newNomi;
    if (ids.includes(az.id)) {
      newIds = ids.filter((i) => i !== az.id);
      newNomi = nomi.filter((n) => n !== az.nome);
      setForm({ ...form, aziende_ids: newIds, aziende_nomi: newNomi, client: newNomi[0] || "", referente_id: "", referente_nome: "" });
    } else {
      newIds = [...ids, az.id];
      newNomi = [...nomi, az.nome];
      setForm({ ...form, aziende_ids: newIds, aziende_nomi: newNomi, client: newNomi[0] || "" });
    }
  }

  async function handleCreateAzienda() {
    if (!newAziendaNome.trim()) return;
    setSavingAzienda(true);
    const created = await supabase.from("crm_aziende").insert({ nome: newAziendaNome.trim().select().single().then(r => r.data) });
    const updated = await supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setAziende(updated);
    // auto-select the newly created azienda
    const ids = [...(form.aziende_ids || []), created.id];
    const nomi = [...(form.aziende_nomi || []), created.nome];
    setForm({ ...form, aziende_ids: ids, aziende_nomi: nomi, client: nomi[0] || created.nome });
    setNewAziendaNome("");
    setShowNewAzienda(false);
    setSavingAzienda(false);
  }

  const referentiDisponibili = persone.filter((p) => (form.aziende_ids || []).includes(p.azienda_id));

  const handleSubmit = (e) => {
    e.preventDefault();
    const team = teams.find((t) => t.id === form.team_id);
    const manager = users.find((u) => u.id === form.manager_id);
    const referente = persone.find((p) => p.id === form.referente_id);
    onSubmit({
      ...form,
      team_name: team?.name || "",
      manager_name: manager?.full_name || manager?.email || "",
      referente_nome: referente ? `${referente.nome} ${referente.cognome}` : form.referente_nome,
      budget_hours: form.budget_hours ? Number(form.budget_hours) : undefined,
      budget_euro: form.budget_euro ? Number(form.budget_euro) : undefined,
    });
  };

  // Normalize color: if it's an old named color, map to hex
  const colorValue = form.color?.startsWith("#") ? form.color : "#6366f1";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome Progetto *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>

      {/* Cliente = Aziende CRM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cliente (Aziende CRM) *</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowNewAzienda(true)}>
            <Plus className="h-3.5 w-3.5" /> Nuova Azienda
          </Button>
        </div>
        <div className="relative" ref={aziendaDropRef}>
          <button
            type="button"
            onClick={() => setAziendaDropOpen((v) => !v)}
            className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <span className="truncate text-left">
              {(form.aziende_ids || []).length === 0
                ? "Seleziona aziende..."
                : (form.aziende_nomi || []).join(", ")}
            </span>
            <svg className="h-4 w-4 opacity-50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {aziendaDropOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-56 overflow-y-auto">
              {aziende.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">Nessuna azienda nel CRM.</p>
              )}
              {[...aziende].sort((a, b) => a.nome?.localeCompare(b.nome, "it")).map((az) => {
                const sel = (form.aziende_ids || []).includes(az.id);
                return (
                  <label key={az.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-3 py-2">
                    <input type="checkbox" checked={sel} onChange={() => toggleAzienda(az)} className="rounded" />
                    <span className="text-sm">{az.nome}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        {(form.aziende_ids || []).length === 0 && (
          <p className="text-xs text-destructive">Seleziona almeno un'azienda cliente</p>
        )}
      </div>

      {/* Referente */}
      <div className="space-y-2">
        <Label>Referente</Label>
        <Select value={form.referente_id} onValueChange={(v) => setForm({ ...form, referente_id: v })} disabled={referentiDisponibili.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder={referentiDisponibili.length === 0 ? "Seleziona prima un'azienda" : "Seleziona referente"} />
          </SelectTrigger>
          <SelectContent>
            {[...referentiDisponibili].sort((a,b) => (a.cognome||'').localeCompare(b.cognome||'','it')).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}{p.ruolo ? ` — ${p.ruolo}` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Descrizione</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Team</Label>
          <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona team" /></SelectTrigger>
            <SelectContent>
              {[...teams].sort((a,b) => (a.name||'').localeCompare(b.name||'','it')).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Responsabile</Label>
          <Select value={form.manager_id} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona responsabile" /></SelectTrigger>
            <SelectContent>
              {[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Stato</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completato">Completato</SelectItem>
              <SelectItem value="da_pianificare">Da Pianificare</SelectItem>
              <SelectItem value="in_corso">In Corso</SelectItem>
              <SelectItem value="in_pausa">In Pausa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priorità</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="bassa">Bassa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Colore</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorValue}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-9 w-12 rounded-md border border-input cursor-pointer p-0.5 shrink-0"
            />
            <Input
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="#6366f1"
              className="font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Data Inizio</Label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Data Fine</Label>
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Budget Ore</Label>
          <Input type="number" value={form.budget_hours} onChange={(e) => setForm({ ...form, budget_hours: e.target.value })} />
        </div>
      </div>
      {isAdmin && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Budget € <span className="text-xs text-muted-foreground font-normal">(visibile solo admin)</span>
          </Label>
          <Input type="number" value={form.budget_euro} onChange={(e) => setForm({ ...form, budget_euro: e.target.value })} placeholder="Es. 5000" />
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
      </div>
      </form>

    {/* Dialog nuova azienda rapida */}
    <Dialog open={showNewAzienda} onOpenChange={setShowNewAzienda}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nuova Azienda CRM</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nome Azienda *</Label>
            <Input autoFocus value={newAziendaNome} onChange={(e) => setNewAziendaNome(e.target.value)}
              placeholder="Es. Azienda Rossi Srl" onKeyDown={(e) => e.key === "Enter" && handleCreateAzienda()} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleCreateAzienda} disabled={savingAzienda || !newAziendaNome.trim()} className="flex-1">
              {savingAzienda ? "Salvataggio..." : "Crea Azienda"}
            </Button>
            <Button variant="outline" onClick={() => setShowNewAzienda(false)}>Annulla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}