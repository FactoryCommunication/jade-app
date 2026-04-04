import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";

const TIPOLOGIE = [{ value: "abbonamenti", label: "Abbonamenti" }, { value: "prodotti", label: "Prodotti" }, { value: "servizi", label: "Servizi IT" }];

export default function VenditeRisorse() {
  const [risorse, setRisorse] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [aziendeFornitori, setAziendeFornitori] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({});
  const fileRef = useRef();

  const loadData = async () => {
    const [r, c, az] = await Promise.all([
      supabase.from("vendita_risorse").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_categorie_risorse").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    setRisorse(r);
    setCategorie(c);
    setAziendeFornitori(az.filter(a => (a.lifecycle || []).includes("Fornitore")));
  };

  useEffect(() => { loadData(); }, []);

  const openForm = (risorsa = null) => {
    setEditing(risorsa);
    setForm(risorsa ? { ...risorsa } : { tipologia: "servizi", costo_listino: 0, prezzo_listino: 0, magazzino: 0 });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const cat = categorie.find(c => c.id === form.categoria_id);
    const forn = aziendeFornitori.find(a => a.id === form.fornitore_id);
    const data = { ...form, categoria_nome: cat?.nome || "", fornitore_nome: forn?.nome || "" };
    const margine = (data.prezzo_listino || 0) - (data.costo_scontato || data.costo_listino || 0);
    if (editing) {
      await supabase.from("vendita_risorse").update({ ...data, margine }).eq("id", editing.id).select().single().then(r => r.data);
    } else {
      await supabase.from("vendita_risorse").insert({ ...data, margine }).select().single().then(r => r.data);
    }
    await loadData();
    setShowForm(false);
    setSaving(false);
    toast.success("Risorsa salvata");
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa risorsa?")) return;
    await supabase.from("vendita_risorse").delete().eq("id", id);
    setRisorse(r => r.filter(x => x.id !== id));
    toast.success("Risorsa eliminata");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
    });
    await supabase.from("vendita_risorse").bulkCreate(rows);
    await loadData();
    toast.success(`${rows.length} risorse importate`);
    e.target.value = "";
  };

  const filtered = risorse
    .filter(r => !search || r.nome?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it'));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Risorse</h2>
          <p className="text-sm text-muted-foreground">Catalogo prodotti e servizi</p>
        </div>
        <div className="flex gap-2">
          <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Importa CSV
          </Button>
          <Button onClick={() => openForm()} className="gap-2">
            <Plus className="h-4 w-4" /> Nuova Risorsa
          </Button>
        </div>
      </div>

      <Input placeholder="Cerca risorsa..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipologia</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Prezzo Listino</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Costo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">MOL</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Magazzino</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nessuna risorsa</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{r.nome}</td>
                <td className="px-4 py-3">{TIPOLOGIE.find(t => t.value === r.tipologia)?.label || r.tipologia}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.categoria_nome || "—"}</td>
                <td className="px-4 py-3 text-right">€ {(r.prezzo_listino || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">€ {(r.costo_listino || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right font-medium text-emerald-600">€ {((r.prezzo_listino || 0) - (r.costo_scontato || r.costo_listino || 0)).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right">{r.magazzino ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openForm(r)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifica Risorsa" : "Nuova Risorsa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipologia *</Label>
                <Select value={form.tipologia} onValueChange={v => setForm({ ...form, tipologia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOLOGIE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria_id || ""} onValueChange={v => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                  <SelectContent>{[...categorie].sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it')).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fornitore (CRM)</Label>
                <Select value={form.fornitore_id || ""} onValueChange={v => setForm({ ...form, fornitore_id: v })}>
                  <SelectTrigger><SelectValue placeholder={aziendeFornitori.length === 0 ? "Nessun fornitore nel CRM" : "Seleziona fornitore"} /></SelectTrigger>
                  <SelectContent>{[...aziendeFornitori].sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it')).map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Costo Listino (€)</Label>
                <Input type="number" step="0.01" value={form.costo_listino || ""} onChange={e => setForm({ ...form, costo_listino: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Costo Scontato (€)</Label>
                <Input type="number" step="0.01" value={form.costo_scontato || ""} onChange={e => setForm({ ...form, costo_scontato: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Prezzo Listino (€)</Label>
                <Input type="number" step="0.01" value={form.prezzo_listino || ""} onChange={e => setForm({ ...form, prezzo_listino: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Magazzino</Label>
                <Input type="number" value={form.magazzino ?? ""} onChange={e => setForm({ ...form, magazzino: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <div className="rounded-md border border-input overflow-hidden">
                <ReactQuill theme="snow" value={form.descrizione || ""} onChange={v => setForm({ ...form, descrizione: v })} style={{ minHeight: 100 }} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || !form.nome}>{saving ? "Salvataggio..." : "Salva"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}