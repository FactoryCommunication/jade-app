import { Outlet, Link, useLocation } from "react-router-dom";
import {
  FolderKanban, Menu, X, ShieldCheck,
  Users2, BarChart2, BookOpen,
  FileText, TrendingUp, Globe, ShoppingCart,
  LogOut, User, ChevronUp
} from "lucide-react";
import { applyAppColors } from "@/pages/admin/AppConfig";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const { t, lang, setLang } = useLanguage();
  const { profile, isAdmin, isTeamMember, logout } = useAuth();
  const location = useLocation();

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

  useEffect(() => {
    function handleClick(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navItems = [
    { path: "/crm", label: t("nav.crm"), icon: Users2, show: isTeamMember("CRM") },
    { path: "/", label: t("nav.pm"), icon: FolderKanban, show: isTeamMember("Gestione Progetti") },
    { path: "/seo", label: t("nav.seo"), icon: BarChart2, show: isTeamMember("Gestione SEO") },
    { path: "/vendite", label: t("nav.vendite"), icon: ShoppingCart, show: isTeamMember("Vendite") },
    { path: "/amministrazione", label: t("nav.amministrazione"), icon: FileText, show: isTeamMember("Amministrazione") },
    { path: "/finanza", label: t("nav.finanza"), icon: TrendingUp, show: isTeamMember("Finanza") },
    { path: "/wiki", label: t("nav.wiki"), icon: BookOpen, show: isTeamMember("Wiki") },
    { path: "/admin", label: t("nav.admin"), icon: ShieldCheck, show: isAdmin },
  ].filter((item) => item.show);

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

  function ProfileMenu() {
    return (
      <div className="relative border-t border-border/40" ref={profileMenuRef}>
        {profileMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
            <Link
              to="/profile"
              onClick={() => setProfileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              Il mio profilo
            </Link>
            <button
              onClick={() => { setProfileMenuOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Esci
            </button>
          </div>
        )}
        {profile && (
          <button
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
              {(profile.nome?.[0] || profile.cognome?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium truncate">{profile.nome} {profile.cognome}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile.role || "user"}</p>
            </div>
            <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${profileMenuOpen ? "" : "rotate-180"}`} />
          </button>
        )}
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
        <ProfileMenu />
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
            <ProfileMenu />
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