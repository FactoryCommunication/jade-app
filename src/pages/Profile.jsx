import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Camera, Phone, Lock, Puzzle, CheckCircle2, Loader2, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ nome: "", cognome: "", phone: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const fileRef = useRef();
  const { lang, setLang } = useLanguage();

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
      setProfile(p);
      setForm({
        nome: p?.nome || "",
        cognome: p?.cognome || "",
        phone: p?.phone || "",
        avatar_url: p?.avatar_url || "",
      });
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    await supabase.from("profiles").update({
      nome: form.nome,
      cognome: form.cognome,
      phone: form.phone,
      avatar_url: form.avatar_url,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `profile-avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: publicUrl }));
    }
    setUploadingPhoto(false);
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    setChangingPassword(true);
    await supabase.auth.resetPasswordForEmail(user.email);
    setChangingPassword(false);
    setPasswordSent(true);
    setTimeout(() => setPasswordSent(false), 5000);
  }

  const initials = ((form.nome?.[0] || "") + (form.cognome?.[0] || "")).toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  const integrations = [
    { name: "Google Calendar", icon: "📅", description: "Sincronizza eventi e scadenze" },
    { name: "Google Drive", icon: "📁", description: "Collega documenti e file" },
    { name: "Slack", icon: "💬", description: "Notifiche e aggiornamenti" },
    { name: "Notion", icon: "📝", description: "Collega le tue note" },
    { name: "GitHub", icon: "🐙", description: "Traccia commit e PR" },
    { name: "HubSpot", icon: "🔶", description: "Sincronizza contatti CRM" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Il mio profilo</h1>
        <p className="text-muted-foreground mt-1">Gestisci le tue informazioni personali</p>
      </div>

      {/* Dati personali */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Informazioni personali
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold border-2 border-border">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div>
                <p className="font-medium">{form.nome} {form.cognome}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{profile?.role || "user"}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Mario" />
              </div>
              <div className="space-y-2">
                <Label>Cognome</Label>
                <Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} placeholder="Rossi" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+39 333 1234567" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted text-muted-foreground" />
              <p className="text-xs text-muted-foreground">L'email non è modificabile.</p>
            </div>

            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : null}
              {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva modifiche"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Riceverai un'email con il link per reimpostare la password.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handlePasswordReset}
            disabled={changingPassword || passwordSent}
            className="gap-2"
          >
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : passwordSent ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4" />}
            {changingPassword ? "Invio in corso..." : passwordSent ? "Email inviata!" : "Reimposta password"}
          </Button>
        </CardContent>
      </Card>

      {/* Lingua */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Lingua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Seleziona la lingua dell'interfaccia.</p>
          <div className="flex gap-2">
            {[{ value: "it", label: "🇮🇹 Italiano" }, { value: "en", label: "🇬🇧 English" }].map((l) => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  lang === l.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integrazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Puzzle className="h-4 w-4" /> Integrazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Collega i tuoi strumenti preferiti per potenziare il flusso di lavoro.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {integrations.map((int) => (
              <div key={int.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <span className="text-2xl">{int.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{int.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{int.description}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">Presto</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}