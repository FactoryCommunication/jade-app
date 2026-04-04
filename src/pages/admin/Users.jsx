import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Users, Pencil, Check, X, Plus, ChevronLeft, ChevronRight, Trash2, Star, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import EmptyState from "../../components/EmptyState";
import moment from "moment";
import "moment/locale/it";

moment.locale("it");

const DAYS = [
  { key: "lun", label: "Lunedì" },
  { key: "mar", label: "Martedì" },
  { key: "mer", label: "Mercoledì" },
  { key: "gio", label: "Giovedì" },
  { key: "ven", label: "Venerdì" },
  { key: "sab", label: "Sabato" },
  { key: "dom", label: "Domenica" },
];

const DEFAULT_USER_TYPES = ["Interno", "Esterno", "Partner", "Freelance"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [newUserType, setNewUserType] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [vacationYear, setVacationYear] = useState(moment().year());
  const [festivita, setFestivita] = useState({}); // { "YYYY-MM-DD": "Label" }
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayLabel, setNewHolidayLabel] = useState("");
  const [savingHolidays, setSavingHolidays] = useState(false);
  const [reinviting, setReinviting] = useState(false);
  const [reinviteMsg, setReinviteMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [u, ut, settings] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("user_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("app_settings").select("*").eq("key", "festivita").maybeSingle().then(r => r.data),
    ]);
    setUsers(u);
    setUserTypes(ut);
    if (settings.length > 0) {
      try { setFestivita(JSON.parse(settings[0].value)); } catch {}
    }
    setLoading(false);
  }

  function getItalianHolidays(year) {
    return {
      [`${year}-01-01`]: "Capodanno",
      [`${year}-01-06`]: "Epifania",
      [`${year}-04-25`]: "Festa della Liberazione",
      [`${year}-05-01`]: "Festa del Lavoro",
      [`${year}-06-02`]: "Festa della Repubblica",
      [`${year}-08-15`]: "Ferragosto",
      [`${year}-11-01`]: "Ognissanti",
      [`${year}-12-08`]: "Immacolata Concezione",
      [`${year}-12-25`]: "Natale",
      [`${year}-12-26`]: "Santo Stefano",
    };
  }

  async function saveFestivita(updated) {
    setSavingHolidays(true);
    const existing = await supabase.from("app_settings").select("*").eq("key", "festivita").maybeSingle().then(r => r.data);
    const payload = { key: "festivita", value: JSON.stringify(updated) };
    if (existing.length > 0) {
      await supabase.from("app_settings").update(payload).eq("id", existing[0].id).select().single().then(r => r.data);
    } else {
      await supabase.from("app_settings").insert(payload).select().single().then(r => r.data);
    }
    setFestivita(updated);
    setSavingHolidays(false);
  }

  async function handleAddHoliday() {
    if (!newHolidayDate || !newHolidayLabel.trim()) return;
    const updated = { ...festivita, [newHolidayDate]: newHolidayLabel.trim() };
    await saveFestivita(updated);
    setNewHolidayDate("");
    setNewHolidayLabel("");
    setShowHolidayForm(false);
  }

  async function handleRemoveHoliday(dateStr) {
    const updated = { ...festivita };
    delete updated[dateStr];
    await saveFestivita(updated);
  }

  async function handlePreloadItalianHolidays() {
    const years = [vacationYear - 1, vacationYear, vacationYear + 1];
    const updated = { ...festivita };
    years.forEach((y) => Object.assign(updated, getItalianHolidays(y)));
    await saveFestivita(updated);
  }

  function openEdit(user) {
    setEditing(user);
    setReinviteMsg("");
    setForm({
      nome: user.nome || "",
      cognome: user.cognome || "",
      job_title: user.job_title || "",
      phone: user.phone || "",
      hourly_rate: user.hourly_rate || "",
      role: user.role || "user",
      user_type: user.user_type || "",
      working_days: user.working_days || ["lun", "mar", "mer", "gio", "ven"],
      working_hours: user.working_hours || {},
      vacation_days: user.vacation_days || [],
    });
  }

  function toggleDay(day) {
    const days = form.working_days || [];
    setForm({
      ...form,
      working_days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    });
  }

  function setDayHours(day, field, value) {
    setForm({
      ...form,
      working_hours: { ...form.working_hours, [day]: { ...(form.working_hours[day] || {}), [field]: value } },
    });
  }

  function toggleVacationDay(dateStr) {
    const days = form.vacation_days || [];
    setForm({
      ...form,
      vacation_days: days.includes(dateStr) ? days.filter((d) => d !== dateStr) : [...days, dateStr],
    });
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("profiles").update({
      ...form,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate).eq("id", editing.id).select().single().then(r => r.data) : undefined,
    });
    setSaving(false);
    setEditing(null);
    loadData();
  }

  async function handleReinvite() {
    if (!editing) return;
    setReinviting(true);
    try {
      await base44.users.inviteUser(editing.email, editing.role || "user");
      setReinviteMsg("Invito inviato con successo!");
    } catch {
      setReinviteMsg("Errore nell'invio dell'invito.");
    }
    setReinviting(false);
  }

  async function handleAddUserType() {
    if (!newUserType.trim()) return;
    await supabase.from("user_types").insert({ name: newUserType.trim().select().single().then(r => r.data) });
    setNewUserType("");
    setAddingType(false);
    loadData();
  }

  const allUserTypes = [...DEFAULT_USER_TYPES, ...userTypes.map((t) => t.name)];

  async function handleInviteUser() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg("");
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMsg("Invito inviato con successo a " + inviteEmail.trim());
      setInviteEmail("");
      setInviteRole("user");
    } catch {
      setInviteMsg("Errore nell'invio dell'invito.");
    }
    setInviting(false);
  }

  // Vacation calendar for current year
  function renderVacationCalendar() {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const firstDay = moment({ year: vacationYear, month: m, day: 1 });
      const daysInMonth = firstDay.daysInMonth();
      const startDow = (firstDay.day() + 6) % 7;
      const cells = [];
      for (let i = 0; i < startDow; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = moment({ year: vacationYear, month: m, day: d }).format("YYYY-MM-DD");
        cells.push({ d, dateStr });
      }
      months.push({ label: firstDay.format("MMMM"), cells });
    }
    return months;
  }

  const vacationMonths = renderVacationCalendar();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Gestione Utenti</h1>
          <p className="text-muted-foreground mt-1">{users.length} utenti registrati</p>
        </div>
        <Button onClick={() => { setShowInvite(true); setInviteMsg(""); }} className="gap-2">
          <Plus className="h-4 w-4" /> Invita Utente
        </Button>
      </div>

      {/* Dialog Invita Utente */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Invita Nuovo Utente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="es. mario@azienda.it" onKeyDown={(e) => e.key === "Enter" && handleInviteUser()} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="team_manager">Responsabile Team</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteMsg && (
              <p className={`text-sm font-medium ${inviteMsg.includes("successo") ? "text-emerald-600" : "text-destructive"}`}>{inviteMsg}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail.trim()} className="flex-1 gap-2">
                <Mail className="h-4 w-4" />{inviting ? "Invio..." : "Invia Invito"}
              </Button>
              <Button variant="outline" onClick={() => setShowInvite(false)}>Annulla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="Nessun utente" description="Gli utenti appariranno qui dopo la registrazione." />
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-accent-foreground">
                  {(user.full_name || user.email || "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{user.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {user.job_title && <span className="text-xs text-muted-foreground">{user.job_title}</span>}
                  {user.user_type && <span className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border">{user.user_type}</span>}
                  {user.hourly_rate && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      €{user.hourly_rate}/h
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role === "admin" ? "Admin" : "Utente"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Utente — {editing?.full_name || editing?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Nome e Cognome */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Mario" />
              </div>
              <div className="space-y-2">
                <Label>Cognome</Label>
                <Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} placeholder="Es. Rossi" />
              </div>
            </div>

            {/* Base info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utente</SelectItem>
                    <SelectItem value="team_manager">Responsabile Team</SelectItem>
                    <SelectItem value="admin">Amministratore</SelectItem>
                  </SelectContent>
              </Select>
              </div>
              <div className="space-y-2">
                <Label>Mansione</Label>
                <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Costo Orario (€)</Label>
                <Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
            </div>

            {/* User type */}
            <div className="space-y-2">
              <Label>Tipologia Utente</Label>
              <div className="flex gap-2">
                <Select value={form.user_type} onValueChange={(v) => setForm({ ...form, user_type: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Seleziona tipologia" /></SelectTrigger>
                  <SelectContent>
                    {allUserTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {addingType ? (
                  <div className="flex gap-1">
                    <Input
                      value={newUserType}
                      onChange={(e) => setNewUserType(e.target.value)}
                      placeholder="Nuova voce..."
                      className="w-36"
                      onKeyDown={(e) => e.key === "Enter" && handleAddUserType()}
                    />
                    <Button size="icon" variant="outline" onClick={handleAddUserType}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setAddingType(false)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <Button variant="outline" size="icon" onClick={() => setAddingType(true)} title="Aggiungi nuova tipologia">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Working days + hours */}
            <div className="space-y-3">
              <Label>Giorni e Orari di Lavoro</Label>
              <div className="space-y-2 border border-border rounded-lg p-3">
                {DAYS.map((d) => {
                  const active = (form.working_days || []).includes(d.key);
                  const hours = (form.working_hours || {})[d.key] || {};
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className={`w-24 py-1.5 px-2 rounded text-xs font-medium border transition-all text-left ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
                        }`}
                      >
                        {d.label}
                      </button>
                      {active && (
                        <div className="flex items-center gap-2 text-sm">
                          <Input
                            type="time"
                            value={hours.start || "09:00"}
                            onChange={(e) => setDayHours(d.key, "start", e.target.value)}
                            className="h-8 w-28 text-xs"
                          />
                          <span className="text-muted-foreground text-xs">→</span>
                          <Input
                            type="time"
                            value={hours.end || "18:00"}
                            onChange={(e) => setDayHours(d.key, "end", e.target.value)}
                            className="h-8 w-28 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vacation calendar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ferie — {vacationYear}</Label>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVacationYear(vacationYear - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVacationYear(vacationYear + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {vacationMonths.map((month) => (
                  <div key={month.label} className="border border-border rounded-lg p-2">
                    <p className="text-xs font-semibold text-foreground capitalize mb-1.5">{month.label}</p>
                    <div className="grid grid-cols-7 gap-px">
                      {month.cells.map((cell, i) => {
                        if (!cell) return <div key={i} />;
                        const isVacation = (form.vacation_days || []).includes(cell.dateStr);
                        const isHoliday = !!festivita[cell.dateStr];
                        const dayOfWeek = moment(cell.dateStr).day();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <button
                            key={i}
                            type="button"
                            title={isHoliday ? festivita[cell.dateStr] : undefined}
                            onClick={() => toggleVacationDay(cell.dateStr)}
                            className={`aspect-square text-[9px] rounded-sm flex items-center justify-center transition-all font-medium ${
                              isVacation
                                ? "bg-rose-400 text-white font-bold"
                                : isHoliday
                                ? "bg-amber-400 text-white font-bold"
                                : isWeekend
                                ? "text-muted-foreground/40"
                                : "hover:bg-secondary text-muted-foreground"
                            }`}
                          >
                            {cell.d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-400 inline-block" />Ferie ({(form.vacation_days || []).filter(d => d.startsWith(String(vacationYear))).length} giorni {vacationYear})</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-400 inline-block" />Festività</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-muted inline-block" />Weekend</span>
              </div>

            </div>

            {/* Holiday Management */}
            <div className="space-y-3 border border-amber-200 rounded-xl p-4 bg-amber-50">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Gestione Festività</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePreloadItalianHolidays} disabled={savingHolidays}>
                    🇮🇹 Carica IT {vacationYear}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowHolidayForm(!showHolidayForm)}>
                    <Plus className="h-3.5 w-3.5" /> Aggiungi
                  </Button>
                </div>
              </div>

              {showHolidayForm && (
                <div className="flex gap-2 items-end">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Nome festività</Label>
                    <Input value={newHolidayLabel} onChange={(e) => setNewHolidayLabel(e.target.value)} placeholder="Es. Natale" className="h-8 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleAddHoliday()} />
                  </div>
                  <Button size="sm" className="h-8" onClick={handleAddHoliday} disabled={savingHolidays || !newHolidayDate || !newHolidayLabel.trim()}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowHolidayForm(false)}><X className="h-4 w-4" /></Button>
                </div>
              )}

              <div className="max-h-36 overflow-y-auto space-y-1">
                {Object.keys(festivita).filter(d => d.startsWith(String(vacationYear))).sort().map((dateStr) => (
                  <div key={dateStr} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-amber-100">
                    <span className="font-medium text-amber-800">{moment(dateStr).format("DD MMM YYYY")}</span>
                    <span className="text-muted-foreground flex-1 mx-3 truncate">{festivita[dateStr]}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveHoliday(dateStr)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {Object.keys(festivita).filter(d => d.startsWith(String(vacationYear))).length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-1">Nessuna festività per {vacationYear}. Usa «Carica IT» per le festività nazionali italiane.</p>
                )}
              </div>
            </div>

            {/* Password & Reinvite */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/30">
              <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Password & Accesso</Label>
              <p className="text-xs text-muted-foreground">La modifica della password avviene tramite il link di invito o la funzione di recupero password dalla pagina di login.</p>
              <Button
                type="button"
                variant="outline"
                className="gap-2 w-full"
                onClick={handleReinvite}
                disabled={reinviting}
              >
                <Mail className="h-4 w-4" />
                {reinviting ? "Invio in corso..." : "Invia nuovamente l'invito"}
              </Button>
              {reinviteMsg && <p className="text-xs text-emerald-600 font-medium">{reinviteMsg}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                <Check className="h-4 w-4" />{saving ? "Salvataggio..." : "Salva"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="gap-1.5">
                <X className="h-4 w-4" />Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}