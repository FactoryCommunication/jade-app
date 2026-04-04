import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { TrendingUp, FileText, Target, Euro } from "lucide-react";

export default function VenditeDashboard() {
  const [opportunita, setOpportunita] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("vendita_opportunita").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("vendita_preventivi").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]).then(([opp, prev]) => {
      setOpportunita(opp);
      setPreventivi(prev);
      setLoading(false);
    });
  }, []);

  const prevApprovati = preventivi.filter(p => p.stato_nome?.toLowerCase().includes("approvato") && !p.stato_nome?.toLowerCase().includes("non"));
  const valoreTotale = prevApprovati.reduce((s, p) => s + (p.totale_scontato || 0), 0);
  const prevInCorso = preventivi.filter(p => !p.stato_nome?.toLowerCase().includes("approvato") && !p.stato_nome?.toLowerCase().includes("non approvato") && !p.stato_nome?.toLowerCase().includes("sospeso"));

  const stats = [
    { label: "Opportunità Attive", value: opportunita.length, icon: Target, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Preventivi Totali", value: preventivi.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Preventivi Approvati", value: prevApprovati.length, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Valore Approvato (€)", value: `€ ${valoreTotale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`, icon: Euro, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard Vendite</h2>
        <p className="text-sm text-muted-foreground mt-1">Panoramica del modulo vendite</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Ultimi Preventivi</h3>
          {preventivi.slice(0, 8).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun preventivo</p>
          ) : (
            <div className="space-y-2">
              {preventivi.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                  <div>
                    <span className="font-medium">{p.numero}</span>
                    <span className="text-muted-foreground ml-2">{p.azienda_nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">€ {(p.totale_scontato || 0).toLocaleString("it-IT")}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-secondary">{p.stato_nome || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Ultime Opportunità</h3>
          {opportunita.slice(0, 8).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna opportunità</p>
          ) : (
            <div className="space-y-2">
              {opportunita.slice(0, 8).map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                  <div>
                    <span className="font-medium">{o.titolo}</span>
                    <span className="text-muted-foreground ml-2">{o.azienda_nome}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-secondary">{o.stato_nome || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}