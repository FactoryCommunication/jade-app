import { useState } from "react";
import { Users, UsersRound, Tag, Settings, ShieldCheck, Layers, Briefcase, Award } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import AdminUsers from "./Users";
import AdminTeams from "./Teams";
import AdminTaskTypes from "./TaskTypes";
import AdminCRMRuoli from "./CRMRuoli";
import AdminLifecycle from "./Lifecycle";
import AdminAppConfig from "./AppConfig";
import AdminPermissions from "./Permissions";
import AdminCRMFunzioneLavorativa from "./CRMFunzioneLavorativa";
import AdminCRMTitolo from "./CRMTitolo";

const CAMPI_TABS = [
  { id: "lifecycle", label: "Lifecycle CRM", icon: Layers, component: AdminLifecycle },
  { id: "crm-funzione", label: "Funzione Lavorativa CRM", icon: Briefcase, component: AdminCRMFunzioneLavorativa },
  { id: "crm-titolo", label: "Titolo CRM", icon: Award, component: AdminCRMTitolo },
  { id: "task-types", label: "Tipologie Task", icon: Tag, component: AdminTaskTypes },
  { id: "teams", label: "Team & Sezioni", icon: UsersRound, component: AdminTeams },
];

const MAIN_TABS = [
  { id: "app-config", label: "Configurazione App", icon: Settings, component: AdminAppConfig },
  { id: "campi", label: "Campi personalizzati", icon: Tag, component: null },
  { id: "users", label: "Utenti", icon: Users, component: AdminUsers },
  { id: "permissions", label: "Permessi", icon: ShieldCheck, component: AdminPermissions },
];

const DEFAULT_TEAMS = [
  { name: "Gestione Progetti", section: "pm" },
  { name: "CRM", section: "crm" },
  { name: "Gestione Servizi", section: "servizi" },
  { name: "Gestione SEO", section: "seo" },
  { name: "Amministrazione", section: "amministrazione" },
  { name: "Finanza", section: "finanza" },
  { name: "Wiki", section: "wiki" },
  { name: "Admin", section: "admin" },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");
  const [activeCampoTab, setActiveCampoTab] = useState("lifecycle");
  const [creatingTeams, setCreatingTeams] = useState(false);
  const [teamsCreated, setTeamsCreated] = useState(false);

  async function handleCreateDefaultTeams() {
    setCreatingTeams(true);
    const existing = await supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
    const existingSections = existing.map((t) => t.section).filter(Boolean);
    const toCreate = DEFAULT_TEAMS.filter((t) => !existingSections.includes(t.section));
    await Promise.all(toCreate.map((t) => supabase.from("teams").insert(t).select().single().then(r => r.data)));
    setCreatingTeams(false);
    setTeamsCreated(true);
    setTimeout(() => setTeamsCreated(false), 3000);
    if (activeTab === "teams") setActiveTab(""), setTimeout(() => setActiveTab("teams"), 50);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestione utenti, team, configurazione e permessi</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 border-b border-border overflow-x-auto flex-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleCreateDefaultTeams} disabled={creatingTeams} className="shrink-0 mb-px">
          {teamsCreated ? "✓ Team creati!" : creatingTeams ? "Creazione..." : "Crea Team di Default"}
        </Button>
      </div>

      {/* Campi personalizzati subtabs */}
      {activeTab === "campi" && (
        <div className="space-y-6">
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {CAMPI_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCampoTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeCampoTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
          {(() => { const C = CAMPI_TABS.find(t => t.id === activeCampoTab)?.component; return C ? <C /> : null; })()}
        </div>
      )}

      {/* Other tabs */}
      {activeTab !== "campi" && (() => { const C = MAIN_TABS.find(t => t.id === activeTab)?.component; return C ? <C /> : null; })()}
    </div>
  );
}