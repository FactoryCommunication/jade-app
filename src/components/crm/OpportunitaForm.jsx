import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export default function OpportunitaForm({ initial = {}, aziende = [], persone = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    titolo: initial.titolo || "",
    azienda_id: initial.azienda_id || "",
    azienda_nome: initial.azienda_nome || "",
    persona_id: initial.persona_id || "",
    persona_nome: initial.persona_nome || "",
    valore: initial.valore || "",
    stato: initial.stato || "nuova",
    probabilita: initial.probabilita || "",
    data_chiusura: initial.data_chiusura || "",
    servizi: initial.servizi || [],
    note: initial.note || "",
  });
  const [newServizio, setNewServizio] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, valore: form.valore ? Number(form.valore) : undefined, probabilita: form.probabilita ? Number(form.probabilita) : undefined }); }} className="space-y-4">
      <div className="space-y-2"><Label>Titolo *</Label><Input value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })} required /></div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Azienda</Label>
          <Select value={form.azienda_id} onValueChange={(v) => { const a = aziende.find(a => a.id === v); setForm({ ...form, azienda_id: v, azienda_nome: a?.nome || "" }); }}>
            <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
            <SelectContent>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Contatto</Label>
          <Select value={form.persona_id} onValueChange={(v) => { const p = persone.find(p => p.id === v); setForm({ ...form, persona_id: v, persona_nome: p ? `${p.nome} ${p.cognome}` : "" }); }}>
            <SelectTrigger><SelectValue placeholder="Seleziona contatto" /></SelectTrigger>
            <SelectContent>{persone.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Stato *</Label>
          <Select value={form.stato} onValueChange={(v) => setForm({ ...form, stato: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nuova">Nuova</SelectItem>
              <SelectItem value="in_trattativa">In Trattativa</SelectItem>
              <SelectItem value="proposta_inviata">Proposta Inviata</SelectItem>
              <SelectItem value="vinta">Vinta</SelectItem>
              <SelectItem value="persa">Persa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Valore (€)</Label><Input type="number" value={form.valore} onChange={(e) => setForm({ ...form, valore: e.target.value })} /></div>
        <div className="space-y-2"><Label>Probabilità (%)</Label><Input type="number" min="0" max="100" value={form.probabilita} onChange={(e) => setForm({ ...form, probabilita: e.target.value })} /></div>
      </div>

      <div className="space-y-2"><Label>Data Chiusura Prevista</Label><Input type="date" value={form.data_chiusura} onChange={(e) => setForm({ ...form, data_chiusura: e.target.value })} /></div>

      <div className="space-y-2">
        <Label>Servizi</Label>
        <div className="flex gap-2">
          <Input value={newServizio} onChange={(e) => setNewServizio(e.target.value)} placeholder="Aggiungi servizio..." />
          <Button type="button" variant="outline" onClick={() => { if (newServizio) { setForm({ ...form, servizi: [...form.servizi, newServizio] }); setNewServizio(""); } }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.servizi.map((s, i) => (
            <span key={i} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
              {s}<button type="button" onClick={() => setForm({ ...form, servizi: form.servizi.filter((_, idx) => idx !== i) })}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2"><Label>Note</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} /></div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
      </div>
    </form>
  );
}