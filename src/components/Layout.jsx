import { Outlet, Link, useLocation } from "react-router-dom";
import {
  FolderKanban, Menu, X, ShieldCheck,
  Users2, BarChart2, BookOpen,
  FileText, TrendingUp, Globe, ShoppingCart
} from "lucide-react";
import { applyAppColors } from "@/pages/admin/AppConfig";
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const { t, lang, setLang } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      if (!data) return;
      const logoSetting = data.find((s) => s.key === "app_logo");
      if (logoSetting?.value) setLogoUrl(logoSetting.value);
      const colSetting = data.find((s) => s.key === "app_colors");
      if (colSetting?.value) {
        try { applyAppColors(JSON.parse(colSetting.value)); } catch {}
      }
    });
  }, []);

  const navItems = [
    { path: "/crm", label: t("nav.crm"), icon: Users2 },
    { path: "/", label: t("nav.pm"), icon: FolderKanban },
    { path: "/seo", label: t("nav.seo"), icon: BarChart2 },
    { path: "/vendite", label: t("nav.vendite"), icon: ShoppingCart },
    { path: "/amministrazione", label: t("nav.amministrazione"), icon: FileText },
    { path: "/finanza", label: t("nav.finanza"), icon: TrendingUp },
    { path: "/wiki", label: t("nav.wiki"), icon: BookOpen },
    ...(isAdmin ? [{ path: "/admin", label: t("nav.admin"), icon: ShieldCheck }] : []),
  ];

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  function NavLinks({ onClose }) {
    return (
      <div className="px-3 py-4 space-y-0.5 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive(item.path)
                ? "bg-primary/12 text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <item.icon className={`h-4 w-4 shrink-0 ${isActive(item.path) ? "text-primary" : ""}`} />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  function LanguageToggle() {
    return (
      <div className="px-3 py-3 border-t border-border/40">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.language")}</span>
        </div>
        <div className="flex gap-1">
          {["it", "en"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                lang === l
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {l === "it" ? "IT" : "EN"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-60 bg-card/90 backdrop-blur-xl border-r border-border/50 fixed inset-y-0 left-0 z-30 shadow-sm">
        <div className="p-5 border-b border-border/40">
          <img src={logoUrl || "/jabe.png"} alt="jabe" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          <NavLinks />
        </div>
        <LanguageToggle />
        {profile && (
          <Link to="/profile" className="flex items-center gap-3 px-4 py-3.5 border-t border-border/40 hover:bg-muted/50 transition-colors">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
              {(profile.nome?.[0] || profile.cognome?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile.nome} {profile.cognome}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile.role || "user"}</p>
            </div>
          </Link>
        )}
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/90 backdrop-blur-xl border-b border-border/40 z-40 flex items-center px-4 shadow-sm">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-muted/60 transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-3">
          <img src={logoUrl || "/jabe.png"} alt="jabe" className="h-8 w-auto object-contain" />
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-card shadow-xl flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <img src={logoUrl || "/jabe.png"} alt="jabe" className="h-8 w-auto object-contain" />
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col">
              <NavLinks onClose={() => setMobileOpen(false)} />
            </div>
            <LanguageToggle />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 bg-background">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}