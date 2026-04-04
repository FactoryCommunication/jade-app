import { useState } from "react";
import { LayoutDashboard, Target, FileText, Package, Settings } from "lucide-react";
import VenditeDashboard from "./vendite/VenditeDashboard";
import VenditeOpportunita from "./vendite/VenditeOpportunita";
import VenditePreventivi from "./vendite/VenditePreventivi";
import VenditeRisorse from "./vendite/VenditeRisorse";
import VenditePersonalizzazione from "./vendite/VenditePersonalizzazione";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "opportunita", label: "Opportunità", icon: Target },
  { key: "preventivi", label: "Preventivi", icon: FileText },
  { key: "risorse", label: "Risorse", icon: Package },
  { key: "personalizzazione", label: "Personalizzazione", icon: Settings },
];

export default function Vendite() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendite</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestione opportunità, preventivi e risorse</p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto pb-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "dashboard" && <VenditeDashboard />}
        {tab === "opportunita" && <VenditeOpportunita />}
        {tab === "preventivi" && <VenditePreventivi />}
        {tab === "risorse" && <VenditeRisorse />}
        {tab === "personalizzazione" && <VenditePersonalizzazione />}
      </div>
    </div>
  );
}