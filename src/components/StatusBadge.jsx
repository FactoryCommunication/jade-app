const statusConfig = {
  in_corso: { label: "In Corso", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completato: { label: "Completato", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_pausa: { label: "In Pausa", className: "bg-amber-50 text-amber-700 border-amber-200" },
  pianificato: { label: "Da Pianificare", className: "bg-slate-50 text-slate-600 border-slate-200" },
  da_pianificare: { label: "Da Pianificare", className: "bg-slate-50 text-slate-600 border-slate-200" },
  da_fare: { label: "Da Fare", className: "bg-slate-50 text-slate-600 border-slate-200" },
  in_revisione: { label: "In Revisione", className: "bg-purple-50 text-purple-700 border-purple-200" },
};

const priorityConfig = {
  alta: { label: "Alta", className: "bg-rose-50 text-rose-700 border-rose-200" },
  media: { label: "Media", className: "bg-amber-50 text-amber-700 border-amber-200" },
  bassa: { label: "Bassa", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function StatusBadge({ type = "status", value }) {
  const config = type === "priority" ? priorityConfig : statusConfig;
  const item = config[value];
  if (!item) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.className}`}>
      {item.label}
    </span>
  );
}