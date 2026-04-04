import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLifecycle() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: "", colore: "#6366f1", ordine: 0 });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", colore: "#6366f1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await supabase.from("crm_lifecycle_stages").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setStages(data);
    setLoading(false);
  }

  function openEdit(stage) {
    setEditingId(stage.id);
    setEditForm({ nome: stage.nome || "", colore: stage.colore || "#6366f1", ordine: stage.ordine || 0 });
  }

  async function handleSaveEdit() {
    setSaving(true);
    await supabase.from("crm_lifecycle_stages").update({
      nome: editForm.nome,
      colore: editForm.colore,
      ordine: Number(editForm.ordine).eq("id", editingId).select().single().then(r => r.data),
    });
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function handleCreate() {
    if (!newForm.nome.trim()) return;
    setSaving(true);
    await supabase.from("crm_lifecycle_stages").insert({
      nome: newForm.nome.trim().select().single().then(r => r.data),
      colore: newForm.colore,
      ordine: stages.length,
    });
    setNewForm({ nome: "", colore: "#6366f1" });
    setShowNew(false);
    setSaving(false);
    load();
  }

  async function handleDelete(id) {
    await supabase.from("crm_lifecycle_stages").delete().eq("id", id);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lifecycle CRM</h2>
          <p className="text-sm text-muted-foreground">Gestisci le voci del campo Lifecycle per Aziende e Contatti.</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Aggiungi Voce
        </Button>
      </div>

      {/* New Stage Form */}
      {showNew && (
        <div className="border border-border rounded-xl p-4 bg-secondary/30 space-y-3">
          <p className="text-sm font-medium">Nuova voce Lifecycle</p>
          <div className="flex gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Nome *</Label>
              <Input
                autoFocus
                value={newForm.nome}
                onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })}
                placeholder="Es. Cliente attivo"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Colore</Label>
              <input
                type="color"
                value={newForm.colore}
                onChange={(e) => setNewForm({ ...newForm, colore: e.target.value })}
                className="h-9 w-12 rounded-md border border-input cursor-pointer p-0.5"
              />
            </div>
            <Button onClick={handleCreate} disabled={saving || !newForm.nome.trim()} className="gap-1">
              <Check className="h-4 w-4" /> Salva
            </Button>
            <Button variant="ghost" onClick={() => setShowNew(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Stages List */}
      {stages.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">Nessuna voce Lifecycle. Aggiungine una!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {stages.map((stage) => (
            <div key={stage.id} className="p-4 flex items-center gap-4">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <div
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: stage.colore || "#6366f1" }}
              />

              {editingId === stage.id ? (
                <div className="flex gap-3 items-center flex-1">
                  <Input
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  />
                  <input
                    type="color"
                    value={editForm.colore}
                    onChange={(e) => setEditForm({ ...editForm, colore: e.target.value })}
                    className="h-8 w-10 rounded-md border border-input cursor-pointer p-0.5"
                  />
                  <Input
                    type="number"
                    value={editForm.ordine}
                    onChange={(e) => setEditForm({ ...editForm, ordine: e.target.value })}
                    className="w-20 h-8 text-sm"
                    placeholder="Ordine"
                  />
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1 h-8">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{stage.nome}</span>
                  {stage.ordine !== undefined && (
                    <span className="text-xs text-muted-foreground mr-2">#{stage.ordine}</span>
                  )}
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(stage)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(stage.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}