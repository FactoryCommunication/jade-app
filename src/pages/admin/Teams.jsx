import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Users, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyState from "../../components/EmptyState";

const SECTION_OPTIONS = [
  { value: "pm", label: "Project Management" },
  { value: "crm", label: "CRM" },
  { value: "vendite", label: "Vendite" },
  { value: "servizi", label: "Servizi" },
  { value: "seo", label: "SEO" },
  { value: "amministrazione", label: "Amministrazione" },
  { value: "finanza", label: "Finanza" },
  { value: "wiki", label: "Wiki" },
  { value: "admin", label: "Admin" },
];

function userName(u) {
  if (u.nome || u.cognome) return `${u.nome || ""} ${u.cognome || ""}`.trim();
  return u.email || "Utente senza nome";
}

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", sections: [], responsabile_id: "", member_ids: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setTeams(t || []);
    setUsers(u || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", sections: [], responsabile_id: "", member_ids: [] });
    setShowForm(true);
  }

  function openEdit(team) {
    setEditing(team);
    // Supporta sia section (stringa) che sections (array) per retrocompatibilità
    const sections = team.sections || (team.section ? [team.section] : []);
    setForm({
      name: team.name,
      description: team.description || "",
      sections,
      responsabile_id: team.responsabile_id || "",
      member_ids: team.member_ids || [],
    });
    setShowForm(true);
  }

  function toggleMember(userId) {
    const ids = form.member_ids || [];
    setForm({ ...form, member_ids: ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId] });
  }

  function toggleSection(value) {
    const sections = form.sections || [];
    setForm({ ...form, sections: sections.includes(value) ? sections.filter((s) => s !== value) : [...sections, value] });
  }

  async function handleSave() {
    setSaving(true);
    const selectedUsers = users.filter((u) => form.member_ids.includes(u.id));
    const member_names = selectedUsers.map((u) => userName(u));
    const resp = users.find((u) => u.id === form.responsabile_id);
    const data = {
      name: form.name,
      description: form.description,
      sections: form.sections,
      section: form.sections[0] || null, // retrocompatibilità
      responsabile_id: form.responsabile_id || null,
      responsabile_nome: resp ? userName(resp) : "",
      member_ids: form.member_ids,
      member_names,
    };
    if (editing) {
      await supabase.from("teams").update(data).eq("id", editing.id);
    } else {
      await supabase.from("teams").insert(data);
    }
    setSaving(false);
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("teams").delete().eq("id", id);
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">{teams.length} team creati</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />Nuovo Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState icon={Users} title="Nessun team" description="Crea il primo team e assegna i collaboratori."
          action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Crea Team</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team) => {
            const sections = team.sections || (team.section ? [team.section] : []);
            return (
              <div key={team.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{team.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(team)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(team.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {sections.map((s) => (
                    <span key={s} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {SECTION_OPTIONS.find((o) => o.value === s)?.label || s}
                    </span>
                  ))}
                </div>
                {team.description && <p className="text-sm text-muted-foreground mb-3">{team.description}</p>}
                {team.responsabile_nome && <p className="text-xs text-muted-foreground mb-2">👤 Responsabile: <strong>{team.responsabile_nome}</strong></p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(team.member_names || []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nessun membro</span>
                  ) : (
                    (team.member_names || []).map((name, i) => (
                      <span key={i} className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">{name}</span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Team" : "Nuovo Team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Team *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Moduli (puoi selezionarne più di uno)</Label>
              <div className="space-y-2 border border-border rounded-lg p-3 max-h-40 overflow-y-auto">
                {SECTION_OPTIONS.map((s) => (
                  <div key={s.value} className="flex items-center gap-3">
                    <Checkbox
                      checked={(form.sections || []).includes(s.value)}
                      onCheckedChange={() => toggleSection(s.value)}
                    />
                    <span className="text-sm">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsabile</Label>
              <Select value={form.responsabile_id} onValueChange={(v) => setForm({ ...form, responsabile_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona responsabile..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuno</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{userName(u)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Membri</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={(form.member_ids || []).includes(user.id)}
                      onCheckedChange={() => toggleMember(user.id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{userName(user)}</p>
                      {user.job_title && <p className="text-xs text-muted-foreground">{user.job_title}</p>}
                    </div>
                  </div>
                ))}
              </div>
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