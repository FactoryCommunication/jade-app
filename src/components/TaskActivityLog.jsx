import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { ChevronDown, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TaskActivityLog({ taskId }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !taskId) return;
    setLoading(true);
    supabase.from("task_activity_logs").select("*").eq("task_id", taskId).order("date", { ascending: false }).limit(100).then(r => r.data || [])
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [open, taskId]);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Registro Attività
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 bg-background/60">
          {loading && (
            <p className="text-xs text-muted-foreground py-2 text-center">Caricamento...</p>
          )}
          {!loading && logs.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">Nessuna attività registrata.</p>
          )}
          {!loading && logs.map((log) => (
            <div key={log.id} className="flex gap-3 items-start">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug">
                  <span className="font-medium">{log.user_name || "Sistema"}</span>
                  {" — "}
                  {log.action}
                  {log.details && <span className="text-muted-foreground"> · {log.details}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(log.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}