import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileDown } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { jsPDF } from "jspdf";

const IVA = 22;

function newRiga(tipo = "libera") {
  return { tipo, risorsa_id: "", task_type_id: "", codice: "", nome: "", quantita: 1, prezzo_listino: 0, sconto_percentuale: 0, sconto_valore: 0, prezzo_scontato: 0, totale_listino: 0, totale_scontato: 0 };
}

function calcRiga(r) {
  const prezzoScontato = r.sconto_percentuale > 0
    ? r.prezzo_listino * (1 - r.sconto_percentuale / 100)
    : r.prezzo_listino - (r.sconto_valore || 0);
  return {
    ...r,
    prezzo_scontato: Math.max(0, prezzoScontato),
    totale_listino: r.prezzo_listino * (r.quantita || 0),
    totale_scontato: Math.max(0, prezzoScontato) * (r.quantita || 0),
  };
}

function TipoRigaPicker({ onSelect, onClose }) {
  const options = [
    { tipo: "attivita", label: "Attività", desc: "Ore di lavoro dal listino tipologie", icon: "⏱" },
    { tipo: "risorsa", label: "Risorsa", desc: "Prodotto o servizio dal catalogo", icon: "📦" },
    { tipo: "libera", label: "Voce libera", desc: "Inserimento manuale", icon: "✏️" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-80 space-y-3" onClick={e => e.stopPropagation()}>
        <p className="font-semibold text-sm text-foreground">Che tipo di riga vuoi aggiungere?</p>
        {options.map(o => (
          <button key={o.tipo} onClick={() => onSelect(o.tipo)}
            className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/60 transition-colors text-left">
            <span className="text-xl">{o.icon}</span>
            <div>
              <p className="text-sm font-medium text-foreground">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
          </button>
        ))}
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground w-full text-center pt-1">Annulla</button>
      </div>
    </div>
  );
}

export default function PreventivoEditor({ initial = {}, stati = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    data: initial.data || new Date().toISOString().split("T")[0],
    azienda_id: initial.azienda_id || "",
    azienda_nome: initial.azienda_nome || "",
    referente_id: initial.referente_id || "",
    referente_nome: initial.referente_nome || "",
    responsabile_id: initial.responsabile_id || "",
    responsabile_nome: initial.responsabile_nome || "",
    stato_id: initial.stato_id || stati[0]?.id || "",
    stato_nome: initial.stato_nome || stati[0]?.nome || "",
    opportunita_id: initial.opportunita_id || "",
    modalita_pagamento: initial.modalita_pagamento || "",
    note: initial.note || "",
    informazioni_amministrative: initial.informazioni_amministrative || "",
  });
  const [righe, setRighe] = useState(initial.righe?.length ? initial.righe : []);
  const [aziende, setAziende] = useState([]);
  const [persone, setPersone] = useState([]);
  const [users, setUsers] = useState([]);
  const [risorse, setRisorse] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [opportunita, setOpportunita] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [showTipoPicker, setShowTipoPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_risorse").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_settings").select("*").eq("key", "info_amministrative").maybeSingle().then(r => r.data),
      supabase.from("app_settings").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_settings").select("*").eq("key", "modalita_pagamento").maybeSingle().then(r => r.data),
      supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]).then(([az, pe, u, r, opp, infoAmm, appSettings, modSettings, tt]) => {
      setAziende(az); setPersone(pe); setUsers(u); setRisorse(r); setOpportunita(opp); setTaskTypes(tt);
      const logo = appSettings.find(s => s.key === "app_logo");
      if (logo?.value) setLogoUrl(logo.value);
      if (!initial.id) {
        if (infoAmm[0]?.value) setForm(f => ({ ...f, informazioni_amministrative: infoAmm[0].value }));
        if (modSettings[0]?.value) setForm(f => ({ ...f, modalita_pagamento: modSettings[0].value }));
      }
    });
  }, []);

  const referenti = persone.filter(p => p.azienda_id === form.azienda_id);

  const updateRiga = (idx, data) => {
    setRighe(righe.map((r, i) => i === idx ? calcRiga({ ...r, ...data }) : r));
  };

  const selectRisorsa = (idx, risorsaId) => {
    const risorsa = risorse.find(r => r.id === risorsaId);
    if (!risorsa) return;
    setRighe(righe.map((r, i) => i === idx ? calcRiga({
      ...r, risorsa_id: risorsaId,
      codice: risorsa.id.slice(0, 8),
      nome: risorsa.nome,
      prezzo_listino: risorsa.prezzo_listino || 0,
      quantita: 1, sconto_percentuale: 0, sconto_valore: 0,
    }) : r));
  };

  const selectTaskType = (idx, ttId) => {
    const tt = taskTypes.find(t => t.id === ttId);
    if (!tt) return;
    setRighe(righe.map((r, i) => i === idx ? calcRiga({
      ...r, task_type_id: ttId,
      nome: tt.name,
      prezzo_listino: tt.hourly_rate || 0,
      quantita: 1, sconto_percentuale: 0, sconto_valore: 0,
    }) : r));
  };

  const handleAddRiga = (tipo) => {
    setRighe([...righe, newRiga(tipo)]);
    setShowTipoPicker(false);
  };

  const totLordo = righe.reduce((s, r) => s + (r.totale_listino || 0), 0);
  const totScontato = righe.reduce((s, r) => s + (r.totale_scontato || 0), 0);
  const totIva = totScontato * IVA / 100;
  const totConIva = totScontato + totIva;

  const handleSubmit = (e) => {
    e.preventDefault();
    const stato = stati.find(s => s.id === form.stato_id);
    const az = aziende.find(a => a.id === form.azienda_id);
    const ref = persone.find(p => p.id === form.referente_id);
    const resp = users.find(u => u.id === form.responsabile_id);
    onSubmit({
      ...form,
      stato_nome: stato?.nome || form.stato_nome,
      azienda_nome: az?.nome || form.azienda_nome,
      referente_nome: ref ? `${ref.nome} ${ref.cognome}` : form.referente_nome,
      responsabile_nome: resp?.full_name || resp?.email || form.responsabile_nome,
      righe,
      totale_lordo: totLordo,
      totale_scontato: totScontato,
      iva_percentuale: IVA,
      totale_iva: totIva,
      totale_con_iva: totConIva,
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    if (logoUrl) { try { doc.addImage(logoUrl, "JPEG", 14, y, 40, 15); } catch {} }
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("PREVENTIVO", 105, y + 5, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Data: ${form.data}`, 140, y);
    doc.text(`Azienda: ${form.azienda_nome || "—"}`, 14, y + 20);
    doc.text(`Referente: ${form.referente_nome || "—"}`, 14, y + 26);
    y += 40;
    doc.setFont("helvetica", "bold");
    doc.text("Nome", 14, y); doc.text("Qtà", 100, y); doc.text("Prezzo", 120, y); doc.text("Totale", 160, y);
    doc.setFont("helvetica", "normal"); y += 6;
    doc.line(14, y, 196, y); y += 4;
    righe.forEach(r => {
      doc.text(r.nome || "", 14, y, { maxWidth: 82 });
      doc.text(String(r.quantita || 0), 100, y);
      doc.text(`€ ${(r.prezzo_scontato || 0).toFixed(2)}`, 120, y);
      doc.text(`€ ${(r.totale_scontato || 0).toFixed(2)}`, 160, y);
      y += 7;
      if (y > 260) { doc.addPage(); y = 20; }
    });
    y += 4; doc.line(14, y, 196, y); y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Totale Imponibile: € ${totScontato.toFixed(2)}`, 130, y);
    y += 7; doc.text(`IVA ${IVA}%: € ${totIva.toFixed(2)}`, 130, y);
    y += 7; doc.setFontSize(12); doc.text(`TOTALE: € ${totConIva.toFixed(2)}`, 130, y);
    doc.save(`preventivo-${form.data || "draft"}.pdf`);
  };

  return (
    <>
      {showTipoPicker && <TipoRigaPicker onSelect={handleAddRiga} onClose={() => setShowTipoPicker(false)} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Testata */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Opportunità</Label>
            <Select value={form.opportunita_id || ""} onValueChange={v => {
              const opp = opportunita.find(o => o.id === v);
              setForm({ ...form,
                opportunita_id: v,
                azienda_id: opp?.azienda_id || form.azienda_id,
                azienda_nome: opp?.azienda_nome || form.azienda_nome,
                referente_id: opp?.referente_id || form.referente_id,
                referente_nome: opp?.referente_nome || form.referente_nome,
                responsabile_id: opp?.responsabile_id || form.responsabile_id,
                responsabile_nome: opp?.responsabile_nome || form.responsabile_nome,
              });
            }}>
              <SelectTrigger><SelectValue placeholder="Collega opportunità" /></SelectTrigger>
              <SelectContent>{[...opportunita].sort((a,b) => (a.titolo||'').localeCompare(b.titolo||'','it')).map(o => <SelectItem key={o.id} value={o.id}>{o.titolo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stato *</Label>
            <Select value={form.stato_id} onValueChange={v => { const s = stati.find(x => x.id === v); setForm({ ...form, stato_id: v, stato_nome: s?.nome || "" }); }}>
              <SelectTrigger><SelectValue placeholder="Seleziona stato" /></SelectTrigger>
              <SelectContent>{stati.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Azienda</Label>
            <Select value={form.azienda_id} onValueChange={v => { const az = aziende.find(a => a.id === v); setForm({ ...form, azienda_id: v, azienda_nome: az?.nome || "" }); }}>
              <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
              <SelectContent>{[...aziende].sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it')).map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Referente</Label>
            <Select value={form.referente_id} onValueChange={v => { const r = persone.find(p => p.id === v); setForm({ ...form, referente_id: v, referente_nome: r ? `${r.nome} ${r.cognome}` : "" }); }} disabled={referenti.length === 0}>
              <SelectTrigger><SelectValue placeholder="Seleziona referente" /></SelectTrigger>
              <SelectContent>{[...referenti].sort((a,b) => (a.cognome||'').localeCompare(b.cognome||'','it')).map(p => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsabile</Label>
            <Select value={form.responsabile_id} onValueChange={v => { const u = users.find(x => x.id === v); setForm({ ...form, responsabile_id: v, responsabile_nome: u?.full_name || u?.email || "" }); }}>
              <SelectTrigger><SelectValue placeholder="Seleziona responsabile" /></SelectTrigger>
              <SelectContent>{[...users].sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||'','it')).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Righe preventivo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Righe Preventivo</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowTipoPicker(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Aggiungi riga
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-2 py-2 font-medium w-36">Tipo</th>
                  <th className="text-left px-2 py-2 font-medium">Nome / Descrizione</th>
                  <th className="text-center px-2 py-2 font-medium w-14">Qtà</th>
                  <th className="text-right px-2 py-2 font-medium w-24">P. Listino</th>
                  <th className="text-right px-2 py-2 font-medium w-20">Sc. %</th>
                  <th className="text-right px-2 py-2 font-medium w-24">P. Scontato</th>
                  <th className="text-right px-2 py-2 font-medium w-24">Tot. Listino</th>
                  <th className="text-right px-2 py-2 font-medium w-24">Tot. Scontato</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {righe.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-6 text-muted-foreground text-xs italic">Nessuna riga — clicca "Aggiungi riga" per iniziare</td></tr>
                )}
                {righe.map((r, idx) => (
                  <tr key={idx} className="border-b border-border/40">
                    <td className="px-2 py-1.5">
                      {r.tipo === "risorsa" ? (
                        <Select value={r.risorsa_id || ""} onValueChange={v => selectRisorsa(idx, v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Risorsa" /></SelectTrigger>
                          <SelectContent>{[...risorse].sort((a,b) => (a.nome||'').localeCompare(b.nome||'','it')).map(rs => <SelectItem key={rs.id} value={rs.id}>{rs.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : r.tipo === "attivita" ? (
                        <Select value={r.task_type_id || ""} onValueChange={v => selectTaskType(idx, v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tipo attività" /></SelectTrigger>
                          <SelectContent>{[...taskTypes].sort((a,b) => (a.name||'').localeCompare(b.name||'','it')).map(tt => <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground px-1 italic">Voce libera</span>
                      )}
                    </td>

                    <td className="px-2 py-1.5"><Input className="h-7 text-xs" value={r.nome} onChange={e => updateRiga(idx, { nome: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><Input className="h-7 text-xs text-center w-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" min="0" step="0.5" value={r.quantita} onChange={e => updateRiga(idx, { quantita: parseFloat(e.target.value) || 0 })} /></td>
                    <td className="px-2 py-1.5"><Input className="h-7 text-xs text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" step="0.01" value={r.prezzo_listino} onChange={e => updateRiga(idx, { prezzo_listino: parseFloat(e.target.value) || 0 })} /></td>
                    <td className="px-2 py-1.5"><Input className="h-7 text-xs text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" step="0.1" min="0" max="100" value={r.sconto_percentuale} onChange={e => updateRiga(idx, { sconto_percentuale: parseFloat(e.target.value) || 0 })} /></td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">€ {(r.prezzo_scontato || 0).toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">€ {(r.totale_listino || 0).toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right font-medium">€ {(r.totale_scontato || 0).toFixed(2)}</td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => setRighe(righe.filter((_, i) => i !== idx))} className="p-1 hover:text-destructive text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totali */}
        <div className="flex justify-end">
          <div className="space-y-1.5 text-sm w-64">
            <div className="flex justify-between"><span className="text-muted-foreground">Totale Lordo</span><span>€ {totLordo.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Totale Scontato</span><span>€ {totScontato.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA {IVA}%</span><span>€ {totIva.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5"><span>Totale con IVA</span><span>€ {totConIva.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Informazioni Amministrative */}
        <div className="space-y-2">
          <Label>Informazioni Amministrative</Label>
          <div className="rounded-md border border-input overflow-hidden">
            <ReactQuill theme="snow" value={form.informazioni_amministrative} onChange={v => setForm({ ...form, informazioni_amministrative: v })} style={{ minHeight: 100 }} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modalità di Pagamento</Label>
          <Select value={form.modalita_pagamento} onValueChange={v => setForm({ ...form, modalita_pagamento: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona modalità" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Rimessa Diretta">Rimessa Diretta</SelectItem>
              <SelectItem value="30 gg">30 gg</SelectItem>
              <SelectItem value="60 gg">60 gg</SelectItem>
              <SelectItem value="90 gg">90 gg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Note</Label>
          <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Note aggiuntive..." />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva"}</Button>
          <Button type="button" variant="outline" onClick={exportPDF} className="gap-2">
            <FileDown className="h-4 w-4" /> Esporta PDF
          </Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>}
        </div>
      </form>
    </>
  );
}