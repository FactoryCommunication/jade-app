import { useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Upload, Building2 } from "lucide-react";

const LIFECYCLE_OPTIONS = ["Lead", "Prospect", "Customer", "Ex Customer", "Ambassador Partner", "Non in Target", "Non Affidabile"];
const TELEFONO_LABELS_BASE = ["Fisso", "Mobile", "Centralino"];

export default function AziendaForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    nome: initial.nome || "",
    logo_url: initial.logo_url || "",
    indirizzo: initial.indirizzo || "",
    email: initial.email || "",
    sito_internet: initial.sito_internet || "",
    partita_iva: initial.partita_iva || "",
    codice_fiscale: initial.codice_fiscale || "",
    codice_sdi: initial.codice_sdi || "",
    pec: initial.pec || "",
    note_amministrative: initial.note_amministrative || "",
    servizi_richiesti: initial.servizi_richiesti || [],
    servizi_proposti: initial.servizi_proposti || [],
    note: initial.note || "",
    telefoni: initial.telefoni || [],
    lifecycle: initial.lifecycle || [],
  });
  const [tab, setTab] = useState("generale");
  const [newServizioRichiesto, setNewServizioRichiesto] = useState("");
  const [newServizioProposto, setNewServizioProposto] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef();

  const toggleLifecycle = (val) => {
    const curr = form.lifecycle || [];
    setForm({ ...form, lifecycle: curr.includes(val) ? curr.filter((v) => v !== val) : [...curr, val] });
  };

  const addTelefono = () => setForm({ ...form, telefoni: [...form.telefoni, { numero: "", etichetta: "Mobile" }] });
  const removeTelefono = (i) => setForm({ ...form, telefoni: form.telefoni.filter((_, idx) => idx !== i) });
  const updateTelefono = (i, key, val) => {
    const t = [...form.telefoni];
    t[i] = { ...t[i], [key]: val };
    setForm({ ...form, telefoni: t });
  };

  // When etichetta is "Altro", show a custom text input
  const handleEtichettaChange = (i, val) => {
    if (val === "__altro__") {
      updateTelefono(i, "etichetta", "");
      updateTelefono(i, "_customLabel", true);
    } else {
      const t = [...form.telefoni];
      t[i] = { ...t[i], etichetta: val, _customLabel: false };
      setForm({ ...form, telefoni: t });
    }
  };

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, logo_url: file_url });
    setUploadingLogo(false);
  }

  const tabs = [
    { id: "generale", label: "Generale" },
    { id: "amministrativa", label: "Amministrativa" },
    { id: "servizi", label: "Servizi" },
  ];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="flex gap-1 border-b border-border pb-0">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "generale" && (
        <div className="space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo Azienda</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="h-3.5 w-3.5" />{uploadingLogo ? "Caricamento..." : "Carica logo"}
                </Button>
                {form.logo_url && (
                  <Button type="button" variant="ghost" size="sm" className="gap-2 text-destructive h-7 text-xs" onClick={() => setForm({ ...form, logo_url: "" })}>
                    <X className="h-3 w-3" />Rimuovi
                  </Button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome Azienda *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Indirizzo</Label>
              <Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sito Internet</Label>
            <Input type="url" value={form.sito_internet} onChange={(e) => setForm({ ...form, sito_internet: e.target.value })} placeholder="https://" />
          </div>

          {/* Telefoni */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Telefoni</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTelefono} className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" />Aggiungi</Button>
            </div>
            {form.telefoni.map((t, i) => (
              <div key={i} className="flex gap-2 items-center">
                {t._customLabel ? (
                  <Input
                    value={t.etichetta}
                    onChange={(e) => updateTelefono(i, "etichetta", e.target.value)}
                    placeholder="Etichetta personalizzata"
                    className="w-36 h-9 text-sm"
                  />
                ) : (
                  <select
                    value={t.etichetta || "Mobile"}
                    onChange={(e) => handleEtichettaChange(i, e.target.value)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-32"
                  >
                    {TELEFONO_LABELS_BASE.map((l) => <option key={l} value={l}>{l}</option>)}
                    <option value="__altro__">Altro...</option>
                  </select>
                )}
                <Input value={t.numero} onChange={(e) => updateTelefono(i, "numero", e.target.value)} placeholder="Numero" />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeTelefono(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Lifecycle */}
          <div className="space-y-2">
            <Label>Lifecycle</Label>
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => toggleLifecycle(opt)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${form.lifecycle?.includes(opt) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>
        </div>
      )}

      {tab === "amministrativa" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Partita IVA</Label><Input value={form.partita_iva} onChange={(e) => setForm({ ...form, partita_iva: e.target.value })} /></div>
            <div className="space-y-2"><Label>Codice Fiscale</Label><Input value={form.codice_fiscale} onChange={(e) => setForm({ ...form, codice_fiscale: e.target.value })} /></div>
            <div className="space-y-2"><Label>Codice SDI</Label><Input value={form.codice_sdi} onChange={(e) => setForm({ ...form, codice_sdi: e.target.value })} /></div>
            <div className="space-y-2"><Label>PEC</Label><Input type="email" value={form.pec} onChange={(e) => setForm({ ...form, pec: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Note Amministrative</Label>
            <Textarea value={form.note_amministrative} onChange={(e) => setForm({ ...form, note_amministrative: e.target.value })} rows={3} />
          </div>
        </div>
      )}

      {tab === "servizi" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Servizi Richiesti</Label>
            <div className="flex gap-2">
              <Input value={newServizioRichiesto} onChange={(e) => setNewServizioRichiesto(e.target.value)} placeholder="Aggiungi servizio..." />
              <Button type="button" variant="outline" onClick={() => { if (newServizioRichiesto) { setForm({ ...form, servizi_richiesti: [...form.servizi_richiesti, newServizioRichiesto] }); setNewServizioRichiesto(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.servizi_richiesti.map((s, i) => (
                <span key={i} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                  {s}<button type="button" onClick={() => setForm({ ...form, servizi_richiesti: form.servizi_richiesti.filter((_, idx) => idx !== i) })}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Servizi Proposti</Label>
            <div className="flex gap-2">
              <Input value={newServizioProposto} onChange={(e) => setNewServizioProposto(e.target.value)} placeholder="Aggiungi servizio..." />
              <Button type="button" variant="outline" onClick={() => { if (newServizioProposto) { setForm({ ...form, servizi_proposti: [...form.servizi_proposti, newServizioProposto] }); setNewServizioProposto(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.servizi_proposti.map((s, i) => (
                <span key={i} className="flex items-center gap-1 bg-accent/20 text-accent-foreground text-xs px-2 py-1 rounded-full">
                  {s}<button type="button" onClick={() => setForm({ ...form, servizi_proposti: form.servizi_proposti.filter((_, idx) => idx !== i) })}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
      </div>
    </form>
  );
}