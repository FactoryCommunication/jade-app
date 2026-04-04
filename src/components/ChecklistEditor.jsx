import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export default function ChecklistEditor({ taskId }) {
  const [items, setItems] = useState([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId) loadItems();
  }, [taskId]);

  async function loadItems() {
    const list = await supabase.from("checklist_items").select("*").eq("task_id", taskId ).order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    setItems(list);
  }

  async function addItem() {
    if (!newText.trim() || !taskId) return;
    setLoading(true);
    await supabase.from("checklist_items").insert({
      task_id: taskId,
      text: newText.trim(),
      completed: false,
      order: items.length,
    });
    setNewText("");
    await loadItems();
    setLoading(false);
  }

  async function toggleItem(item) {
    await supabase.from("checklist_items").update({ completed: !item.completed }).eq("id", item.id).select().single().then(r => r.data);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, completed: !i.completed } : i));
  }

  async function deleteItem(id) {
    await supabase.from("checklist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const completed = items.filter((i) => i.completed).length;

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{completed}/{items.length}</span>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={item.completed}
            onCheckedChange={() => toggleItem(item)}
            id={`cl-${item.id}`}
          />
          <label
            htmlFor={`cl-${item.id}`}
            className={`flex-1 text-sm cursor-pointer select-none ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
          >
            {item.text}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
            onClick={() => deleteItem(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {!taskId && (
        <p className="text-xs text-muted-foreground italic">Salva il task per aggiungere elementi alla checklist.</p>
      )}

      {taskId && (
        <div className="flex gap-2 pt-1">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Aggiungi elemento..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
          />
          <Button type="button" size="sm" className="h-8 gap-1" onClick={addItem} disabled={loading || !newText.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}