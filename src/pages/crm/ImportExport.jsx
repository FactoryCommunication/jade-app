import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tracciato Aziende (campi dell'entità CRMAzienda)
const TRACCIATO_AZIENDE = [
  { key: "nome", label: "Nome Azienda", required: true },
  { key: "indirizzo", label: "Indirizzo" },
  { key: "email", label: "Email" },
  { key: "sito_internet", label: "Sito Internet" },
  { key: "partita_iva", label: "Partita IVA" },
  { key: "codice_fiscale", label: "Codice Fiscale" },
  { key: "codice_sdi", label: "Codice SDI" },
  { key: "pec", label: "PEC" },
  { key: "lifecycle", label: "Lifecycle (separato da |)" },
  { key: "note_amministrative", label: "Note Amministrative" },
  { key: "note", label: "Note" },
];

// Tracciato Contatti (campi dell'entità CRMPersona)
const TRACCIATO_PERSONE = [
  { key: "nome", label: "Nome", required: true },
  { key: "cognome", label: "Cognome", required: true },
  { key: "azienda_nome", label: "Azienda (nome per la relazione)", required: true },
  { key: "ruolo", label: "Ruolo / Mansione" },
  { key: "email", label: "Email" },
  { key: "partita_iva", label: "Partita IVA" },
  { key: "codice_fiscale", label: "Codice Fiscale" },
  { key: "indirizzo_residenza", label: "Residenza" },
  { key: "indirizzo_domicilio", label: "Domicilio" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "Twitter / X" },
  { key: "lifecycle", label: "Lifecycle (separato da |)" },
  { key: "note_amministrative", label: "Note Amministrative" },
  { key: "note", label: "Note" },
];

function toCSV(rows, fields) {
  const header = fields.map((f) => f.key).join(";");
  const lines = rows.length > 0
    ? rows.map((r) => fields.map((f) => {
        const val = r[f.key];
        if (Array.isArray(val)) return val.join("|");
        return val ?? "";
      }).join(";"))
    : [];
  return [header, ...lines].join("\n");
}

function downloadCSV(content, filename) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 1) return { headers: [], rows: [] };
  const headers = lines[0].replace(/^\uFEFF/, "").split(";").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(";");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  });
  return { headers, rows };
}

export default function ImportExport() {
  const [importing, setImporting] = useState(null); // 'aziende' | 'persone'
  const [result, setResult] = useState(null); // { ok, errors, count }
  const [downloading, setDownloading] = useState(false);

  async function downloadTracciato(type) {
    setDownloading(true);
    const fields = type === "aziende" ? TRACCIATO_AZIENDE : TRACCIATO_PERSONE;
    const csv = toCSV([], fields);
    downloadCSV(csv, `tracciato_${type}.csv`);
    setDownloading(false);
  }

  async function downloadExport(type) {
    setDownloading(true);
    let data, fields;
    if (type === "aziende") {
      data = await supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      fields = TRACCIATO_AZIENDE;
    } else {
      data = await supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      fields = TRACCIATO_PERSONE;
    }
    downloadCSV(toCSV(data, fields), `export_${type}.csv`);
    setDownloading(false);
  }

  async function handleImport(type, file) {
    if (!file) return;
    setImporting(type);
    setResult(null);
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    const errors = [];
    let count = 0;

    if (type === "aziende") {
      // Load existing aziende for dedup by nome
      const existing = await supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      const existingMap = {};
      existing.forEach((a) => { existingMap[a.nome?.toLowerCase()] = a; });

      for (const row of rows) {
        if (!row.nome) { errors.push(`Riga saltata: campo "nome" mancante`); continue; }
        const payload = {};
        TRACCIATO_AZIENDE.forEach(({ key }) => {
          if (row[key] !== undefined && row[key] !== "") {
            payload[key] = key === "lifecycle" && row[key] ? row[key].split("|").map((s) => s.trim()) : row[key];
          }
        });
        const match = existingMap[row.nome.toLowerCase()];
        if (match) {
          await supabase.from("crm_aziende").update(payload).eq("id", match.id).select().single().then(r => r.data);
        } else {
          await supabase.from("crm_aziende").insert(payload).select().single().then(r => r.data);
        }
        count++;
      }
    } else {
      // Load existing aziende to resolve nome → id
      const aziende = await supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      const aziendeMap = {};
      aziende.forEach((a) => { aziendeMap[a.nome?.toLowerCase()] = a; });

      const existing = await supabase.from("crm_persone").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      const existingMap = {};
      existing.forEach((p) => { existingMap[`${p.nome?.toLowerCase()} ${p.cognome?.toLowerCase()} ${p.azienda_nome?.toLowerCase()}`] = p; });

      for (const row of rows) {
        if (!row.nome || !row.cognome) { errors.push(`Riga saltata: nome o cognome mancante`); continue; }
        const payload = {};
        TRACCIATO_PERSONE.forEach(({ key }) => {
          if (row[key] !== undefined && row[key] !== "") {
            payload[key] = key === "lifecycle" && row[key] ? row[key].split("|").map((s) => s.trim()) : row[key];
          }
        });
        // Resolve azienda_nome → azienda_id
        if (row.azienda_nome) {
          const az = aziendeMap[row.azienda_nome.toLowerCase()];
          if (az) { payload.azienda_id = az.id; payload.azienda_nome = az.nome; }
        }
        const key = `${row.nome.toLowerCase()} ${row.cognome.toLowerCase()} ${(row.azienda_nome || "").toLowerCase()}`;
        const match = existingMap[key];
        if (match) {
          await supabase.from("crm_persone").update(payload).eq("id", match.id).select().single().then(r => r.data);
        } else {
          await supabase.from("crm_persone").insert(payload).select().single().then(r => r.data);
        }
        count++;
      }
    }

    setResult({ ok: errors.length === 0, errors, count });
    setImporting(null);
  }

  function Section({ type, title, tracciato }) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-lg text-foreground">{title}</h2>

        {/* Tracciato record */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Info className="h-4 w-4 text-primary" /> Tracciato Record
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 pr-4 text-muted-foreground font-medium">Colonna CSV</th>
                  <th className="text-left py-1 text-muted-foreground font-medium">Descrizione</th>
                  <th className="text-left py-1 pl-4 text-muted-foreground font-medium">Obbl.</th>
                </tr>
              </thead>
              <tbody>
                {tracciato.map((f) => (
                  <tr key={f.key} className="border-b border-border/40">
                    <td className="py-1 pr-4 font-mono text-primary">{f.key}</td>
                    <td className="py-1 text-muted-foreground">{f.label}</td>
                    <td className="py-1 pl-4">{f.required ? <span className="text-red-500 font-bold">✓</span> : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadTracciato(type)} disabled={downloading}>
            <Download className="h-4 w-4" /> Scarica Tracciato Vuoto
          </Button>
        </div>

        {/* Export */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => downloadExport(type)} disabled={downloading}>
            <FileText className="h-4 w-4" /> Esporta {title}
          </Button>
          <span className="text-xs text-muted-foreground">Esporta tutti i record esistenti in CSV</span>
        </div>

        {/* Import */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Importa da CSV</p>
          <p className="text-xs text-muted-foreground">Se un record esiste già (stesso nome azienda / stesso nome+cognome+azienda) verrà aggiornato, altrimenti creato.</p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleImport(type, e.target.files?.[0])}
              disabled={!!importing}
            />
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${importing === type ? "opacity-50 cursor-not-allowed bg-secondary" : "bg-background border-border hover:bg-secondary cursor-pointer"}`}>
              <Upload className="h-4 w-4" />
              {importing === type ? "Importazione in corso..." : `Scegli file CSV — ${title}`}
            </span>
          </label>
        </div>

        {result && (
          <div className={`rounded-lg p-3 flex items-start gap-2 text-sm ${result.ok ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
            {result.ok ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />}
            <div>
              <p className={result.ok ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
                {result.count} record importati con successo.
              </p>
              {result.errors.map((e, i) => <p key={i} className="text-amber-600 text-xs mt-0.5">{e}</p>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Import / Export</h2>
        <p className="text-sm text-muted-foreground mt-1">Importa o esporta i dati del CRM in formato CSV. Il separatore è il punto e virgola (;).</p>
      </div>
      <Section type="aziende" title="Aziende" tracciato={TRACCIATO_AZIENDE} />
      <Section type="persone" title="Contatti" tracciato={TRACCIATO_PERSONE} />
    </div>
  );
}