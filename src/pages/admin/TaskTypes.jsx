import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Tag, Plus, Trash2, Pencil, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmptyState from "../../components/EmptyState";

const DEFAULT_COLORS = { task: "#6366f1", evento: "#10b981", evento_ripetuto: "#f59e0b" };
const TIPO_TASK_LABELS = { task: "Task", evento: "Evento", evento_ripetuto: "Evento Ripetuto" };

export default function AdminTaskTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", hourly_rate: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [colorSettingId, setColorSettingId] = useState(null);
  const [savingColors, setSavingColors] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: t }, { data: settings }] = await Promise.all([
      supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("app_settings").select("*").eq("key", "tipo_task_colors"),
    ]);
    setTypes(t || []);
    if (settings && settings.length > 0) {
      try {
        setColors({ ...DEFAULT_COLORS, ...JSON.parse(settings[0].value) });
        setColorSettingId(settings[0].id);
      } catch {}
    }
    setLoading(false);
  }

  async function saveColors(newColors) {
    setSavingColors(true);
    const value = JSON.stringify(newColors);
    if (colorSettingId) {
      await supabase.from("app_settings").update({ value }).eq("id", colorSettingId);
    } else {
      const { data: rec } = await supabase.from("app_settings").insert({ key: "tipo_task_colors", value }).select().single();
      if (rec) setColorSettingId(rec.id);
    }
    setSavingColors(false);
  }

  function handleColorChange(key, val) {
    setColors({ ...colors, [key]: val });
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", hourly_rate: "", description: "" });
    setShowForm(true);
  }

  function openEdit(type) {
    setEditing(type);
    setForm({ name: type.name, hourly_rate: type.hourly_rate || "", description: type.description || "" });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form, hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null };
    if (editing) {
      await supabase.from("task_types").update(data).eq("id", editing.id);
    } else {
      await supabase.from("task_types").insert(data);
    }
    setSaving(false);
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("task_types").delete().eq("id", id);
    loadData();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Tipologie Task</h1>
          <p className="text-muted-foreground mt-1">{types.length} tipologie di lavoro configurate</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />Nuova Tipologia
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Colori Tipo Task</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(TIPO_TASK_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <input type="color" value={colors[key]} onChange={(e) => handleColorChange(key, e.target.value)} className="h-9 w-9 rounded-lg border border-border cursor-pointer" />
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{colors[key]}</p>
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-4" disabled={savingColors} onClick={() => saveColors(colors)}>
          {savingColors ? "Salvataggio..." : "Salva Colori"}
        </Button>
      </div>

      {types.length === 0 ? (
        <EmptyState icon={Tag} title="Nessuna tipologia di lavoro" description="Crea le tipologie di lavoro con il relativo costo orario."
          action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Crea Tipologia</Button>} />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {[...types].sort((a, b) => a.name.localeCompare(b.name, "it")).map((type) => (
            <div key={type.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Tag className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{type.name}</p>
                {type.description && <p className="text-xs text-muted-foreground">{type.description}</p>}
              </div>
              {type.hourly_rate && (
                <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  €{type.hourly_rate}/h
                </span>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(type)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(type.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Tipo Lavoro" : "Nuovo Tipo Lavoro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es. Grafica, Web Design..." />
            </div>
            <div className="space-y-2">
              <Label>Tariffa oraria</Label>
              <Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="Es. 75" />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? "Salvataggio..." : "Salva"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}