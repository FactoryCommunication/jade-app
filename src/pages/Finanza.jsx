import { TrendingUp, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Finanza() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t("finanza.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("finanza.subtitle")}</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Sezione in arrivo</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Questa sezione gestirà prima nota, incassi, pagamenti e reportistica finanziaria. Disponibile prossimamente.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary px-4 py-2 rounded-full">
          <Clock className="h-3.5 w-3.5" /> In sviluppo
        </div>
      </div>
    </div>
  );
}