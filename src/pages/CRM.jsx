import { useState, useEffect } from "react";
import { Building2, UserCircle, TrendingUp, FileUp } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import Aziende from "./crm/Aziende";
import Persone from "./crm/Persone";
import Opportunita from "./crm/Opportunita";
import ImportExport from "./crm/ImportExport";

const tabs = [
  { id: "aziende", label: "Aziende", icon: Building2 },
  { id: "persone", label: "Persone", icon: UserCircle },
  { id: "opportunita", label: "Opportunità", icon: TrendingUp },
];

export default function CRM() {
  const [activeTab, setActiveTab] = useState("aziende");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data?.user).then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const tabs = [
    { id: "aziende", label: "Aziende", icon: Building2 },
    { id: "persone", label: "Persone", icon: UserCircle },
    { id: "opportunita", label: "Opportunità", icon: TrendingUp },
    ...(isAdmin ? [{ id: "import_export", label: "Import / Export", icon: FileUp }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">CRM</h1>
        <p className="text-muted-foreground mt-1">Gestione clienti, contatti e opportunità commerciali</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
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

      {activeTab === "aziende" && <Aziende />}
      {activeTab === "persone" && <Persone />}
      {activeTab === "opportunita" && <Opportunita />}
      {activeTab === "import_export" && <ImportExport />}
    </div>
  );
}