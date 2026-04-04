import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Camera, Phone, Lock, Puzzle, CheckCircle2, Loader2, Mail } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userEntity, setUserEntity] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", avatar_url: "", nome: "", cognome: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data?.user).then(async (u) => {
      setUser(u);
      // Load User entity record for nome/cognome
      let entity = null;
      if (u?.id) {
        const list = await supabase.from("profiles").select("*").eq("id", u.id ).maybeSingle().then(r => r.data);
        entity = list?.[0] || null;
        setUserEntity(entity);
      }
      setForm({
        first_name: u?.first_name || "",
        last_name: u?.last_name || "",
        phone: u?.phone || "",
        avatar_url: u?.avatar_url || "",
        nome: entity?.nome || u?.full_name?.split(" ")?.[0] || "",
        cognome: entity?.cognome || u?.full_name?.split(" ")?.slice(1).join(" ") || "",
      });
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await base44.auth.updateMe(form);
    // Also update nome/cognome on User entity
    if (userEntity?.id) {
      await supabase.from("profiles").update({ nome: form.nome, cognome: form.cognome }).eq("id", userEntity.id).select().single().then(r => r.data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, avatar_url: file_url }));
    setUploadingPhoto(false);
  }

  const initials = user
    ? ((form.first_name?.[0] || "") + (form.last_name?.[0] || "")).toUpperCase() ||
      user.full_name?.[0]?.toUpperCase() ||
      user.email?.[0]?.toUpperCase()
    : "?";

  const integrations = [
    { name: "Google Calendar", icon: "📅", description: "Sincronizza eventi e scadenze", status: "coming_soon" },
    { name: "Google Drive", icon: "📁", description: "Collega documenti e file", status: "coming_soon" },
    { name: "Slack", icon: "💬", description: "Notifiche e aggiornamenti", status: "coming_soon" },
    { name: "Notion", icon: "📝", description: "Collega le tue note", status: "coming_soon" },
    { name: "GitHub", icon: "🐙", description: "Traccia commit e PR", status: "coming_soon" },
    { name: "HubSpot", icon: "🔶", description: "Sincronizza contatti CRM", status: "coming_soon" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Il mio profilo</h1>
        <p className="text-muted-foreground mt-1">Gestisci le tue informazioni personali e le integrazioni</p>
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
            {/* Foto */}
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
                <p className="font-medium">{user?.full_name || user?.email}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role || "user"}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome <span className="text-xs text-muted-foreground">(visualizzato nell'app)</span></Label>
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
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Per cambiare la password puoi effettuare il logout e usare la funzione "Password dimenticata" nella schermata di accesso.
          </p>
          <Button
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            Esci e reimposta password
          </Button>
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