import { Outlet, Link, useLocation } from "react-router-dom";
import {
  FolderKanban, Menu, X, ShieldCheck,
  Users2, BarChart2, BookOpen,
  FileText, TrendingUp, Globe, ShoppingCart,
  LogOut, User, ChevronUp, Bell, AlertTriangle
} from "lucide-react";
import { applyAppColors } from "@/pages/admin/AppConfig";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";
import "moment/locale/it";

moment.locale("it");

const DAYS_WARNING = 7;

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scadenze, setScadenze] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const profileMenuRef = useRef(null);
  const notifRef = useRef(null);
  const { t } = useLanguage();
  const { profile, isAdmin, isTeamMember, logout, user } = useAuth();
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
    if (!user?.id) return;
    async function loadScadenze() {
      const limit = moment().add(DAYS_WARNING, "days").format("YYYY-MM-DD");
      const { data } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, project_name, assignee_id")
        .neq("status", "completato")
        .not("due_date", "is", null)
        .lte("due_date", limit)
        .order("due_date", { ascending: true });
      setScadenze(data || []);
    }
    loadScadenze();
  }, [user?.id, location.pathname]);

  useEffect(() => {
    setBannerDismissed(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClick(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const scadenzeOggi = scadenze.filter((t) => t.due_date === moment().format("YYYY-MM-DD"));
  const scadenzeScadute = scadenze.filter((t) => t.due_date < moment().format("YYYY-MM-DD"));
  const scadenzeImminenti = scadenze.filter((t) => t.due_date > moment().format("YYYY-MM-DD"));
  const totaleBadge = scadenze.length;
  const showBanner = !bannerDismissed && (scadenzeOggi.length > 0 || scadenzeScadute.length > 0);

  function getLabelScadenza(due_date) {
    const today = moment().format("YYYY-MM-DD");
    const diff = moment(due_date).diff(moment(today), "days");
    if (diff < 0) return { label: `Scaduto ${Math.abs(diff)}g fa`, color: "text-destructive" };
    if (diff === 0) return { label: "Scade oggi", color: "text-amber-600" };
    if (diff === 1) return { label: "Scade domani", color: "text-amber-500" };
    return { label: `Scade tra ${diff}g`, color: "text-muted-foreground" };
  }

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

  function NotifButton() {
    return (
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totaleBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
              {totaleBadge > 9 ? "9+" : totaleBadge}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Scadenze</p>
              <span className="text-xs text-muted-foreground">{totaleBadge} task</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {scadenze.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nessuna scadenza imminente 🎉
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {scadenzeScadute.length > 0 && (
                    <div className="px-3 py-1.5 bg-destructive/5">
                      <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Scaduti</p>
                    </div>
                  )}
                  {scadenzeScadute.map((task) => {
                    const { label, color } = getLabelScadenza(task.due_date);
                    return (
                      <div key={task.id} className="px-3 py-2.5 hover:bg-muted/40 transition-colors">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        {task.project_name && <p className="text-xs text-muted-foreground truncate">{task.project_name}</p>}
                        <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
                      </div>
                    );
                  })}
                  {scadenzeOggi.length > 0 && (
                    <div className="px-3 py-1.5 bg-amber-500/5">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Oggi</p>
                    </div>
                  )}
                  {scadenzeOggi.map((task) => {
                    const { label, color } = getLabelScadenza(task.due_date);
                    return (
                      <div key={task.id} className="px-3 py-2.5 hover:bg-muted/40 transition-colors">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        {task.project_name && <p className="text-xs text-muted-foreground truncate">{task.project_name}</p>}
                        <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
                      </div>
                    );
                  })}
                  {scadenzeImminenti.length > 0 && (
                    <div className="px-3 py-1.5 bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prossimi {DAYS_WARNING} giorni</p>
                    </div>
                  )}
                  {scadenzeImminenti.map((task) => {
                    const { label, color } = getLabelScadenza(task.due_date);
                    return (
                      <div key={task.id} className="px-3 py-2.5 hover:bg-muted/40 transition-colors">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        {task.project_name && <p className="text-xs text-muted-foreground truncate">{task.project_name}</p>}
                        <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border">
              <Link
                to="/"
                onClick={() => setNotifOpen(false)}
                className="block text-center text-xs text-primary hover:underline py-1"
              >
                Vai a Gestione Progetti →
              </Link>
            </div>
          </div>
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
        <ProfileMenu />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/90 backdrop-blur-xl border-b border-border/40 z-40 flex items-center px-4 shadow-sm">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-muted/60 transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-3 flex-1">
          <img src={logoUrl || "/jabe.png"} alt="jabe" className="h-8 w-auto object-contain" />
        </div>
        <NotifButton />
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
            <ProfileMenu />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 bg-background">
        {showBanner && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              {scadenzeScadute.length > 0 && (
                <span className="font-semibold text-destructive">{scadenzeScadute.length} task scaduti. </span>
              )}
              {scadenzeOggi.length > 0 && (
                <span className="font-semibold text-amber-700">{scadenzeOggi.length} task in scadenza oggi. </span>
              )}
              <button onClick={() => setNotifOpen(true)} className="underline text-amber-700 hover:text-amber-900">
                Vedi dettagli
              </button>
            </p>
            <button onClick={() => setBannerDismissed(true)} className="text-amber-600 hover:text-amber-900 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="hidden lg:flex justify-end px-8 pt-4 pb-0">
          <NotifButton />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}