import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Upload, UserCircle } from "lucide-react";

const LIFECYCLE_OPTIONS = ["Lead", "Prospect", "Customer", "Ex Customer", "Ambassador Partner", "Non in Target", "Non Affidabile"];
const TELEFONO_LABELS_BASE = ["Fisso", "Mobile", "Centralino"];
const EMAIL_LABELS_BASE = ["Aziendale", "Personale"];

export default function PersonaForm({ initial = {}, aziende = [], lifecycleFromAzienda = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    titolo: initial.titolo || "",
    nome: initial.nome || "",
    cognome: initial.cognome || "",
    foto_url: initial.foto_url || "",
    funzione_lavorativa: initial.funzione_lavorativa || "",
    azienda_id: initial.azienda_id || "",
    azienda_nome: initial.azienda_nome || "",
    emails: initial.emails?.length ? initial.emails : (initial.email ? [{ indirizzo: initial.email, etichetta: "Aziendale" }] : []),
    telefoni: initial.telefoni || [],
    lifecycle: initial.lifecycle || [],
    partita_iva: initial.partita_iva || "",
    codice_fiscale: initial.codice_fiscale || "",
    note_amministrative: initial.note_amministrative || "",
    indirizzo_residenza: initial.indirizzo_residenza || "",
    indirizzo_domicilio: initial.indirizzo_domicilio || "",
    linkedin: initial.linkedin || "",
    instagram: initial.instagram || "",
    facebook: initial.facebook || "",
    twitter: initial.twitter || "",
    note: initial.note || "",
  });
  const [tab, setTab] = useState("generale");
  const [funzioni, setFunzioni] = useState([]);
  const [titoli, setTitoli] = useState([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef();

  useEffect(() => {
    Promise.all([
      supabase.from("crm_funzioni_lavorative").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_titoli").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]).then(([f, t]) => { setFunzioni(f); setTitoli(t); });
  }, []);

  // Inherit lifecycle from azienda when azienda changes
  function handleAziendaChange(v) {
    const az = aziende.find((a) => a.id === v);
    setForm({
      ...form,
      azienda_id: v,
      azienda_nome: az?.nome || "",
      lifecycle: az?.lifecycle?.length ? az.lifecycle : form.lifecycle,
    });
  }

  const toggleLifecycle = (val) => {
    const curr = form.lifecycle || [];
    setForm({ ...form, lifecycle: curr.includes(val) ? curr.filter((v) => v !== val) : [...curr, val] });
  };

  const addEmail = () => setForm({ ...form, emails: [...form.emails, { indirizzo: "", etichetta: "Aziendale" }] });
  const removeEmail = (i) => setForm({ ...form, emails: form.emails.filter((_, idx) => idx !== i) });
  const updateEmail = (i, key, val) => {
    const e = [...form.emails];
    e[i] = { ...e[i], [key]: val };
    setForm({ ...form, emails: e });
  };
  const handleEmailEtichettaChange = (i, val) => {
    if (val === "__altro__") {
      const e = [...form.emails];
      e[i] = { ...e[i], etichetta: "", _customLabel: true };
      setForm({ ...form, emails: e });
    } else {
      const e = [...form.emails];
      e[i] = { ...e[i], etichetta: val, _customLabel: false };
      setForm({ ...form, emails: e });
    }
  };

  const addTelefono = () => setForm({ ...form, telefoni: [...form.telefoni, { numero: "", etichetta: "Mobile" }] });
  const removeTelefono = (i) => setForm({ ...form, telefoni: form.telefoni.filter((_, idx) => idx !== i) });
  const updateTelefono = (i, key, val) => {
    const t = [...form.telefoni];
    t[i] = { ...t[i], [key]: val };
    setForm({ ...form, telefoni: t });
  };
  const handleEtichettaChange = (i, val) => {
    if (val === "__altro__") {
      const t = [...form.telefoni];
      t[i] = { ...t[i], etichetta: "", _customLabel: true };
      setForm({ ...form, telefoni: t });
    } else {
      const t = [...form.telefoni];
      t[i] = { ...t[i], etichetta: val, _customLabel: false };
      setForm({ ...form, telefoni: t });
    }
  };

  async function handleFotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, foto_url: file_url });
    setUploadingFoto(false);
  }

  const tabs = [
    { id: "generale", label: "Generale" },
    { id: "amministrativa", label: "Amministrativa" },
    { id: "indirizzi", label: "Indirizzi" },
    { id: "social", label: "Social" },
  ];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "generale" && (
        <div className="space-y-4">
          {/* Foto contatto */}
          <div className="space-y-2">
            <Label>Foto Contatto</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fotoInputRef.current?.click()} disabled={uploadingFoto}>
                  <Upload className="h-3.5 w-3.5" />{uploadingFoto ? "Caricamento..." : "Carica foto"}
                </Button>
                {form.foto_url && (
                  <Button type="button" variant="ghost" size="sm" className="gap-2 text-destructive h-7 text-xs" onClick={() => setForm({ ...form, foto_url: "" })}>
                    <X className="h-3 w-3" />Rimuovi
                  </Button>
                )}
              </div>
              <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Titolo</Label>
              <Select value={form.titolo} onValueChange={(v) => setForm({ ...form, titolo: v })}>
                <SelectTrigger><SelectValue placeholder="Titolo" /></SelectTrigger>
                <SelectContent>{titoli.map((t) => <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Cognome *</Label><Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} required /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Azienda</Label>
              <Select value={form.azienda_id} onValueChange={handleAziendaChange}>
                <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                <SelectContent>{[...aziende].sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','it')).map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Funzione Lavorativa</Label>
              <Select value={form.funzione_lavorativa} onValueChange={(v) => setForm({ ...form, funzione_lavorativa: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona funzione" /></SelectTrigger>
                <SelectContent>{[...funzioni].sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','it')).map((f) => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEmail} className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" />Aggiungi</Button>
            </div>
            {form.emails.map((em, i) => (
              <div key={i} className="flex gap-2 items-center">
                {em._customLabel ? (
                  <Input
                    value={em.etichetta}
                    onChange={(e) => updateEmail(i, "etichetta", e.target.value)}
                    placeholder="Etichetta personalizzata"
                    className="w-36 h-9 text-sm"
                  />
                ) : (
                  <select
                    value={em.etichetta || "Aziendale"}
                    onChange={(e) => handleEmailEtichettaChange(i, e.target.value)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-32"
                  >
                    {EMAIL_LABELS_BASE.map((l) => <option key={l} value={l}>{l}</option>)}
                    <option value="__altro__">Altro...</option>
                  </select>
                )}
                <Input type="email" value={em.indirizzo} onChange={(e) => updateEmail(i, "indirizzo", e.target.value)} placeholder="indirizzo@email.com" />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeEmail(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
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

          {/* Lifecycle - eredita dall'azienda selezionata */}
          <div className="space-y-2">
            <Label>
              Lifecycle
              {form.azienda_id && <span className="ml-2 text-xs text-muted-foreground font-normal">(ereditato dall'azienda selezionata)</span>}
            </Label>
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => toggleLifecycle(opt)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${form.lifecycle?.includes(opt) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2"><Label>Note</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} /></div>
        </div>
      )}

      {tab === "amministrativa" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Partita IVA</Label><Input value={form.partita_iva} onChange={(e) => setForm({ ...form, partita_iva: e.target.value })} /></div>
            <div className="space-y-2"><Label>Codice Fiscale</Label><Input value={form.codice_fiscale} onChange={(e) => setForm({ ...form, codice_fiscale: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Note Amministrative</Label><Textarea value={form.note_amministrative} onChange={(e) => setForm({ ...form, note_amministrative: e.target.value })} rows={3} /></div>
        </div>
      )}

      {tab === "indirizzi" && (
        <div className="space-y-4">
          <div className="space-y-2"><Label>Indirizzo Residenza</Label><Input value={form.indirizzo_residenza} onChange={(e) => setForm({ ...form, indirizzo_residenza: e.target.value })} /></div>
          <div className="space-y-2"><Label>Indirizzo Domicilio</Label><Input value={form.indirizzo_domicilio} onChange={(e) => setForm({ ...form, indirizzo_domicilio: e.target.value })} /></div>
        </div>
      )}

      {tab === "social" && (
        <div className="space-y-4">
          <div className="space-y-2"><Label>LinkedIn</Label><Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
          <div className="space-y-2"><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/..." /></div>
          <div className="space-y-2"><Label>Facebook</Label><Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/..." /></div>
          <div className="space-y-2"><Label>Twitter / X</Label><Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="https://x.com/..." /></div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
      </div>
    </form>
  );
}