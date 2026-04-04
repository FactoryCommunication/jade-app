import { Briefcase } from "lucide-react";

export default function GestioneServizi() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="h-20 w-20 rounded-2xl bg-accent flex items-center justify-center mb-6">
        <Briefcase className="h-10 w-10 text-accent-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Gestione Servizi</h1>
      <p className="text-muted-foreground text-center max-w-sm">
        Questa sezione è in fase di sviluppo. Presto potrai gestire i servizi offerti ai tuoi clienti.
      </p>
    </div>
  );
}