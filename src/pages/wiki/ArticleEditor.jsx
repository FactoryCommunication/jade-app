import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

export default function ArticleEditor({ initial, categorie, progetti, canManageRiservato, onSave, onCancel, saving, onCategorieChange }) {
  const [form, setForm] = useState({
    titolo: initial?.titolo || "",
    contenuto: initial?.contenuto || "",
    categoria_id: initial?.categoria_id || "",
    progetto_id: initial?.progetto_id || "",
    visibilita: initial?.visibilita || "pubblico",
    tags: initial?.tags || [],
  });
  const [tagInput, setTagInput] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  }

  async function createCategory() {
    if (!newCatName.trim()) return;
    const cat = await supabase.from("wiki_categorie").insert({ nome: newCatName.trim().select().single().then(r => r.data) });
    setForm({ ...form, categoria_id: cat.id });
    setNewCatName("");
    setAddingCat(false);
    onCategorieChange();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Titolo *</Label>
        <Input value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })} placeholder="Titolo dell'articolo..." autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Visibilità *</Label>
          <Select value={form.visibilita} onValueChange={(v) => setForm({ ...form, visibilita: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pubblico">🌐 Pubblico</SelectItem>
              {canManageRiservato && <SelectItem value="riservato">🔒 Riservato</SelectItem>}
            </SelectContent>
          </Select>
          {!canManageRiservato && (
            <p className="text-xs text-muted-foreground">Solo il Responsabile Wiki e l'Admin possono creare contenuti riservati.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          {!addingCat ? (
            <div className="flex gap-2">
              <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nessuna</SelectItem>
                  {categorie.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setAddingCat(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome categoria..." />
              <Button type="button" size="sm" onClick={createCategory}>Crea</Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setAddingCat(false)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Progetto Collegato</Label>
        <Select value={form.progetto_id} onValueChange={(v) => setForm({ ...form, progetto_id: v })}>
          <SelectTrigger><SelectValue placeholder="Nessun progetto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Nessuno</SelectItem>
            {progetti.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Aggiungi tag..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>Aggiungi</Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {form.tags.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-secondary text-foreground text-xs px-2 py-0.5 rounded">
                {t}
                <button onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Contenuto</Label>
        <div className="border border-border rounded-md overflow-hidden">
          <ReactQuill
            theme="snow"
            value={form.contenuto}
            onChange={(v) => setForm({ ...form, contenuto: v })}
            modules={QUILL_MODULES}
            style={{ minHeight: 220 }}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={saving || !form.titolo} className="flex-1">
          {saving ? "Salvataggio..." : "Salva Articolo"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
      </div>
    </div>
  );
}