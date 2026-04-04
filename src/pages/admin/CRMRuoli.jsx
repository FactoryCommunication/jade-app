import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Tag, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "../../components/EmptyState";

export default function CRMRuoli() {
  const [ruoli, setRuoli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNome, setNewNome] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await supabase.from("crm_ruoli").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setRuoli(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newNome.trim()) return;
    await supabase.from("crm_ruoli").insert({ nome: newNome.trim() });
    setNewNome("");
    loadData();
  }

  async function handleUpdate(id) {
    if (!editNome.trim()) return;
    await supabase.from("crm_ruoli").update({ nome: editNome.trim() });
    setEditingId(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("crm_ruoli").delete().eq("id", id);
    loadData();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Ruoli / Mansioni CRM</h1>
        <p className="text-muted-foreground mt-1">Gestisci i ruoli disponibili per i contatti del CRM</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newNome}
          onChange={(e) => setNewNome(e.target.value)}
          placeholder="Nuovo ruolo / mansione..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-sm"
        />
        <Button onClick={handleAdd} className="gap-2"><Plus className="h-4 w-4" />Aggiungi</Button>
      </div>

      {ruoli.length === 0 ? (
        <EmptyState icon={Tag} title="Nessun ruolo" description="Aggiungi i ruoli/mansioni per i contatti CRM." />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border max-w-xl">
          {ruoli.map((r) => (
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