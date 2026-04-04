import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, UserCircle, Upload, Loader2 } from "lucide-react";

const LIFECYCLE_OPTIONS = ["Lead", "Prospect", "Customer", "Ex Customer", "Ambassador Partner", "Non in Target", "Non Affidabile"];
const TELEFONO_LABELS_BASE = ["Fisso", "Mobile", "Centralino"];
const EMAIL_LABELS_BASE = ["Aziendale", "Personale"];

export default function PersonaForm({ initial = {}, aziende = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    titolo: initial.titolo || "none",
    nome: initial.nome || "",
    cognome: initial.cognome || "",
    foto_url: initial.foto_url || "",
    funzione_lavorativa: initial.funzione_lavorativa || "none",
    azienda_id: initial.azienda_id || "none",
    azienda_nome: initial.azienda_nome || "",
    emails: initial.emails?.length ? initial.emails : [],
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
      supabase.from("crm_funzioni_lavorative").select("*").order("nome", { ascending: true }),
      supabase.from("crm_titoli").select("*").order("nome", { ascending: true }),
    ]).then(([{ data: f }, { data: t }]) => {
      setFunzioni(f || []);
      setTitoli(t || []);
    });
  }, []);

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
    const e = [...form.emails]; e[i] = { ...e[i], [key]: val }; setForm({ ...form, emails: e });
  };
  const handleEmailEtichettaChange = (i, val) => {
    const e = [...form.emails];
    e[i] = val === "__altro__" ? { ...e[i], etichetta: "", _customLabel: true } : { ...e[i], etichetta: val, _customLabel: false };
    setForm({ ...form, emails: e });
  };

  const addTelefono = () => setForm({ ...form, telefoni: [...form.telefoni, { numero: "", etichetta: "Mobile" }] });
  const removeTelefono = (i) => setForm({ ...form, telefoni: form.telefoni.filter((_, idx) => idx !== i) });
  const updateTelefono = (i, key, val) => {
    const t = [...form.telefoni]; t[i] = { ...t[i], [key]: val }; setForm({ ...form, telefoni: t });
  };
  const handleEtichettaChange = (i, val) => {
    const t = [...form.telefoni];
    t[i] = val === "__altro__" ? { ...t[i], etichetta: "", _customLabel: true } : { ...t[i], etichetta: val, _customLabel: false };
    setForm({ ...form, telefoni: t });
  };

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `persona_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        setForm((f) => ({ ...f, foto_url: data.publicUrl }));
      }
    } catch (err) {
      console.error("Errore upload foto:", err);
    }
    setUploadingFoto(false);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanForm = {
      ...form,
      titolo: form.titolo === "none" ? null : form.titolo,
      azienda_id: form.azienda_id === "none" ? null : form.azienda_id,
      funzione_lavorativa: form.funzione_lavorativa === "none" ? null : form.funzione_lavorativa,
      emails: form.emails.map(({ _customLabel, ...e }) => e),
      telefoni: form.telefoni.map(({ _customLabel, ...t }) => t),
    };
    onSubmit(cleanForm);
  };

  const tabs = [
    { id: "generale", label: "Generale" },
    { id: "amministrativa", label: "Amministrativa" },
    { id: "indirizzi", label: "Indirizzi" },
    { id: "social", label: "Social" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "generale" && (
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-20 w-20 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7 w-20 bg-white" onClick={() => fotoInputRef.current?.click()} disabled={uploadingFoto}>
                {uploadingFoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {uploadingFoto ? "..." : "Foto"}
              </Button>
              {form.foto_url && (
                <button type="button" className="text-xs text-destructive" onClick={() => setForm({ ...form, foto_url: "" })}>Rimuovi</button>
              )}
              <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
            </div>

            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Titolo</Label>
                <Select value={form.titolo} onValueChange={(v) => setForm({ ...form, titolo: v })}>
                  <SelectTrigger className="bg-white h-9"><SelectValue placeholder="Titolo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {titoli.map((t) => <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="bg-white h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cognome *</Label>
                <Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} required className="bg-white h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Azienda</Label>
                <Select value={form.azienda_id} onValueChange={handleAziendaChange}>
                  <SelectTrigger className="bg-white h-9"><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna</SelectItem>
                    {[...aziende].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it')).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Funzione Lavorativa</Label>
                <Select value={form.funzione_lavorativa} onValueChange={(v) => setForm({ ...form, funzione_lavorativa: v })}>
                  <SelectTrigger className="bg-white h-9"><SelectValue placeholder="Seleziona funzione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna</SelectItem>
                    {funzioni.map((f) => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Email</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEmail} className="gap-1 h-6 text-xs px-2 bg-white">
                  <Plus className="h-3 w-3" />Aggiungi
                </Button>
              </div>
              <div className="space-y-2">
                {form.emails.map((em, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    {em._customLabel ? (
                      <Input value={em.etichetta} onChange={(e) => updateEmail(i, "etichetta", e.target.value)} placeholder="Etichetta" className="w-24 h-8 text-xs bg-white" />
                    ) : (
                      <select value={em.etichetta || "Aziendale"} onChange={(e) => handleEmailEtichettaChange(i, e.target.value)}
                        className="h-8 rounded-md border border-input bg-white px-2 text-xs w-24">
                        {EMAIL_LABELS_BASE.map((l) => <option key={l} value={l}>{l}</option>)}
                        <option value="__altro__">Altro...</option>
                      </select>
                    )}
                    <Input type="email" value={em.indirizzo} onChange={(e) => updateEmail(i, "indirizzo", e.target.value)} placeholder="email@..." className="bg-white h-8 text-xs flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEmail(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Telefoni</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTelefono} className="gap-1 h-6 text-xs px-2 bg-white">
                  <Plus className="h-3 w-3" />Aggiungi
                </Button>
              </div>
              <div className="space-y-2">
                {form.telefoni.map((t, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    {t._customLabel ? (
                      <Input value={t.etichetta} onChange={(e) => updateTelefono(i, "etichetta", e.target.value)} placeholder="Etichetta" className="w-24 h-8 text-xs bg-white" />
                    ) : (
                      <select value={t.etichetta || "Mobile"} onChange={(e) => handleEtichettaChange(i, e.target.value)}
                        className="h-8 rounded-md border border-input bg-white px-2 text-xs w-24">
                        {TELEFONO_LABELS_BASE.map((l) => <option key={l} value={l}>{l}</option>)}
                        <option value="__altro__">Altro...</option>
                      </select>
                    )}
                    <Input value={t.numero} onChange={(e) => updateTelefono(i, "numero", e.target.value)} placeholder="Numero" className="bg-white h-8 text-xs flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeTelefono(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Lifecycle</Label>
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => toggleLifecycle(opt)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${form.lifecycle?.includes(opt) ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground hover:border-primary"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="bg-white" />
          </div>
        </div>
      )}

      {tab === "amministrativa" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Partita IVA</Label>
              <Input value={form.partita_iva} onChange={(e) => setForm({ ...form, partita_iva: e.target.value })} className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Codice Fiscale</Label>
              <Input value={form.codice_fiscale} onChange={(e) => setForm({ ...form, codice_fiscale: e.target.value })} className="bg-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note Amministrative</Label>
            <Textarea value={form.note_amministrative} onChange={(e) => setForm({ ...form, note_amministrative: e.target.value })} rows={4} className="bg-white" />
          </div>
        </div>
      )}

      {tab === "indirizzi" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Indirizzo Residenza</Label>
              <Input value={form.indirizzo_residenza} onChange={(e) => setForm({ ...form, indirizzo_residenza: e.target.value })} className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Indirizzo Domicilio</Label>
              <Input value={form.indirizzo_domicilio} onChange={(e) => setForm({ ...form, indirizzo_domicilio: e.target.value })} className="bg-white" />
            </div>
          </div>
        </div>
      )}

      {tab === "social" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>LinkedIn</Label>
              <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/..." className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Facebook</Label>
              <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/..." className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Twitter / X</Label>
              <Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="https://x.com/..." className="bg-white" />
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