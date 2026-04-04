import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Upload, Palette, Check } from "lucide-react";

const COLOR_FIELDS = [
  { key: "bg", label: "Colore sfondo pagina" },
  { key: "border", label: "Colore bordi" },
  { key: "cardBg", label: "Colore sfondo campi" },
  { key: "titles", label: "Colore Titoli" },
  { key: "fieldText", label: "Colore Testo nei campi" },
  { key: "primaryBg", label: "Colore principale Fondo Bottoni" },
  { key: "primaryText", label: "Colore titolo Bottoni" },
];

const DEFAULT_COLORS = {
  bg: "#eef0f5",
  border: "#e0e0e0",
  cardBg: "#ffffff",
  titles: "#111111",
  fieldText: "#888888",
  primaryBg: "#1a1a1a",
  primaryText: "#ffffff",
};

function hexToHSL(hex) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyAppColors(colors) {
  const root = document.documentElement;
  const map = {
    bg: ["--background"],
    border: ["--border", "--input"],
    cardBg: ["--card", "--secondary", "--muted", "--popover"],
    titles: ["--foreground", "--card-foreground", "--popover-foreground"],
    fieldText: ["--muted-foreground"],
    primaryBg: ["--primary"],
    primaryText: ["--primary-foreground"],
  };
  Object.entries(map).forEach(([key, vars]) => {
    const hsl = hexToHSL(colors[key]);
    if (hsl) vars.forEach((v) => root.style.setProperty(v, hsl));
  });
}

export default function AppConfig() {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingIds, setSettingIds] = useState({});

  useEffect(() => {
    async function load() {
      const settings = await supabase.from("app_settings").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []);
      const ids = {};
      settings.forEach((s) => { ids[s.key] = s.id; });
      setSettingIds(ids);
      const colSetting = settings.find((s) => s.key === "app_colors");
      if (colSetting) {
        try { setColors({ ...DEFAULT_COLORS, ...JSON.parse(colSetting.value) }); } catch {}
      }
      const logoSetting = settings.find((s) => s.key === "app_logo");
      if (logoSetting) setLogoUrl(logoSetting.value || "");
    }
    load();
  }, []);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploading(false);
  }

  async function upsert(key, value) {
    if (settingIds[key]) {
      await supabase.from("app_settings").update({ key, value }).eq("id", settingIds[key]).select().single().then(r => r.data);
    } else {
      const created = await supabase.from("app_settings").insert({ key, value }).select().single().then(r => r.data);
      setSettingIds((prev) => ({ ...prev, [key]: created.id }));
    }
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all([
      upsert("app_colors", JSON.stringify(colors)),
      upsert("app_logo", logoUrl),
    ]);
    applyAppColors(colors);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleColorChange(key, value) {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    applyAppColors(updated);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurazione App
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Personalizza logo e colori dell'interfaccia</p>
      </div>

      {/* Logo */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Logo Azienda</h2>
        {logoUrl && (
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="Logo" className="h-14 object-contain rounded border border-border bg-secondary p-1" />
            <Button variant="outline" size="sm" onClick={() => setLogoUrl("")}>Rimuovi</Button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-secondary text-sm font-medium transition-colors">
              <Upload className="h-4 w-4" /> {uploading ? "Caricamento..." : "Carica Logo"}
            </span>
          </label>
          {logoUrl && <span className="text-xs text-muted-foreground truncate max-w-xs">{logoUrl}</span>}
        </div>
      </div>

      {/* Colors */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-foreground flex items-center gap-2"><Palette className="h-4 w-4" /> Colori Interfaccia</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key] || "#000000"}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-9 w-12 rounded-md border border-input cursor-pointer p-0.5 shrink-0"
                />
                <Input
                  value={colors[key] || ""}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2 h-11 px-8">
        {saved ? <><Check className="h-4 w-4" /> Salvato!</> : saving ? "Salvataggio..." : "Salva Configurazione"}
      </Button>
    </div>
  );
}