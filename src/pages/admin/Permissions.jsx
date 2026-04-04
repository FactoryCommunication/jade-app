import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { ShieldCheck, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "projects", label: "Progetti" },
  { key: "tasks", label: "Task" },
  { key: "time_tracking", label: "Time Tracking" },
  { key: "calendar", label: "Calendario" },
  { key: "crm", label: "CRM" },
  { key: "crm_import_export", label: "CRM — Import/Export" },
  { key: "servizi", label: "Gestione Servizi" },
  { key: "seo", label: "Gestione SEO" },
  { key: "admin", label: "Area Admin" },
];

const ROLES = ["admin", "user"];
const ROLE_LABELS = { admin: "Amministratore", user: "Utente" };

export default function Permissions() {
  const [permissions, setPermissions] = useState({}); // sectionKey → { id?, allowed_roles[] }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("section_permissions").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []).then((data) => {
      const map = {};
      // Default: tutti visibili a tutti
      SECTIONS.forEach((s) => { map[s.key] = { allowed_roles: [...ROLES] }; });
      data.forEach((p) => {
        map[p.section_key] = { id: p.id, allowed_roles: p.allowed_roles || [] };
      });
      setPermissions(map);
      setLoading(false);
    });
  }, []);

  function toggle(sectionKey, role) {
    const current = permissions[sectionKey]?.allowed_roles || [];
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    // Admin always keeps admin access
    if (sectionKey === "admin" && role === "admin") return;
    setPermissions((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], allowed_roles: updated } }));
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all(
      SECTIONS.map(async (s) => {
        const perm = permissions[s.key];
        const payload = { section_key: s.key, section_label: s.label, allowed_roles: perm?.allowed_roles || [] };
        if (perm?.id) {
          await supabase.from("section_permissions").update(payload).eq("id", perm.id).select().single().then(r => r.data);
        } else {
          const created = await supabase.from("section_permissions").insert(payload).select().single().then(r => r.data);
          setPermissions((prev) => ({ ...prev, [s.key]: { ...prev[s.key], id: created.id } }));
        }
      })
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Gestione Permessi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Definisci quali ruoli possono accedere a ogni sezione dell'app.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid bg-secondary/50 border-b border-border px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          style={{ gridTemplateColumns: "1fr repeat(2, 120px)" }}>
          <span>Sezione</span>
          {ROLES.map((r) => <span key={r} className="text-center">{ROLE_LABELS[r]}</span>)}
        </div>

        {/* Rows */}
        {SECTIONS.map((section, i) => {
          const perm = permissions[section.key] || { allowed_roles: [...ROLES] };
          return (
            <div
              key={section.key}
              className={`grid px-5 py-3.5 items-center border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/20"}`}
              style={{ gridTemplateColumns: "1fr repeat(2, 120px)" }}
            >
              <span className="text-sm font-medium text-foreground">{section.label}</span>
              {ROLES.map((role) => {
                const isChecked = perm.allowed_roles.includes(role);
                const isLocked = section.key === "admin" && role === "admin";
                return (
                  <div key={role} className="flex justify-center">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggle(section.key, role)}
                      className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50"
                      } ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {isChecked && <Check className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2 h-11 px-8">
          {saved ? <><Check className="h-4 w-4" /> Salvato!</> : saving ? "Salvataggio..." : <><Save className="h-4 w-4" /> Salva Permessi</>}
        </Button>
        <p className="text-xs text-muted-foreground">I permessi si applicano alla navigazione e alla visibilità delle sezioni.</p>
      </div>
    </div>
  );
}