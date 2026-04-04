import { createContext, useContext, useState, useEffect } from "react";

const translations = {
  it: {
    // Navigation
    "nav.pm": "Gestione Progetti",
    "nav.crm": "CRM",
    "nav.seo": "Gestione SEO",
    "nav.vendite": "Vendite",
    "nav.amministrazione": "Amministrazione",
    "nav.finanza": "Finanza",
    "nav.wiki": "Wiki",
    "nav.admin": "Admin",
    // Common
    "common.save": "Salva",
    "common.cancel": "Annulla",
    "common.delete": "Elimina",
    "common.edit": "Modifica",
    "common.new": "Nuovo",
    "common.search": "Cerca...",
    "common.loading": "Caricamento...",
    "common.saving": "Salvataggio...",
    "common.nodata": "Nessun dato",
    "common.confirm_delete": "Sei sicuro di voler eliminare?",
    "common.yes": "Sì",
    "common.no": "No",
    "common.name": "Nome",
    "common.description": "Descrizione",
    "common.status": "Stato",
    "common.priority": "Priorità",
    "common.date": "Data",
    "common.notes": "Note",
    "common.actions": "Azioni",
    "common.coming_soon": "Presto",
    "common.export": "Esporta",
    "common.import": "Importa",
    "common.language": "Lingua",
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.active_projects": "Progetti Attivi",
    "dashboard.completed_tasks": "Task Completati",
    "dashboard.hours_logged": "Ore Registrate",
    "dashboard.recent_tasks": "Task Recenti",
    "dashboard.recent_time": "Ultime Registrazioni",
    // Projects
    "projects.title": "Gestione Progetti",
    "projects.new": "Nuovo Progetto",
    "projects.client": "Cliente",
    "projects.budget": "Budget",
    "projects.hours": "Ore",
    // Tasks
    "tasks.title": "Task",
    "tasks.new": "Nuovo Task",
    "tasks.assignee": "Assegnato a",
    "tasks.due_date": "Scadenza",
    "tasks.estimated": "Ore Stimate",
    // Time
    "time.title": "Time Tracking",
    "time.log": "Registra Tempo",
    "time.collaborator": "Collaboratore",
    "time.hours": "Ore",
    // Calendar
    "calendar.title": "Calendario",
    // CRM
    "crm.companies": "Aziende",
    "crm.contacts": "Contatti",
    "crm.opportunities": "Opportunità",
    "crm.import_export": "Import / Export",
    // Wiki
    "wiki.title": "Wiki Aziendale",
    "wiki.new_article": "Nuovo Articolo",
    "wiki.public": "Pubblico",
    "wiki.reserved": "Riservato",
    "wiki.categories": "Categorie",
    // Admin
    "admin.title": "Amministrazione",
    "admin.users": "Utenti",
    "admin.teams": "Team & Sezioni",
    "admin.task_types": "Tipologie Task",
    "admin.crm_roles": "Ruoli CRM",
    "admin.app_config": "Configurazione App",
    "admin.permissions": "Permessi",
    // Amministrazione section
    "amministrazione.title": "Amministrazione",
    "amministrazione.subtitle": "Gestione preventivi e documenti amministrativi",
    // Finanza section
    "finanza.title": "Finanza",
    "finanza.subtitle": "Prima nota, incassi e gestione finanziaria",
  },
  en: {
    // Navigation
    "nav.pm": "Project Management",
    "nav.crm": "CRM",
    "nav.seo": "SEO Management",
    "nav.vendite": "Sales",
    "nav.amministrazione": "Administration",
    "nav.finanza": "Finance",
    "nav.wiki": "Wiki",
    "nav.admin": "Admin",
    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.new": "New",
    "common.search": "Search...",
    "common.loading": "Loading...",
    "common.saving": "Saving...",
    "common.nodata": "No data",
    "common.confirm_delete": "Are you sure you want to delete?",
    "common.yes": "Yes",
    "common.no": "No",
    "common.name": "Name",
    "common.description": "Description",
    "common.status": "Status",
    "common.priority": "Priority",
    "common.date": "Date",
    "common.notes": "Notes",
    "common.actions": "Actions",
    "common.coming_soon": "Soon",
    "common.export": "Export",
    "common.import": "Import",
    "common.language": "Language",
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.active_projects": "Active Projects",
    "dashboard.completed_tasks": "Completed Tasks",
    "dashboard.hours_logged": "Hours Logged",
    "dashboard.recent_tasks": "Recent Tasks",
    "dashboard.recent_time": "Recent Time Entries",
    // Projects
    "projects.title": "Project Management",
    "projects.new": "New Project",
    "projects.client": "Client",
    "projects.budget": "Budget",
    "projects.hours": "Hours",
    // Tasks
    "tasks.title": "Tasks",
    "tasks.new": "New Task",
    "tasks.assignee": "Assigned to",
    "tasks.due_date": "Due Date",
    "tasks.estimated": "Estimated Hours",
    // Time
    "time.title": "Time Tracking",
    "time.log": "Log Time",
    "time.collaborator": "Collaborator",
    "time.hours": "Hours",
    // Calendar
    "calendar.title": "Calendar",
    // CRM
    "crm.companies": "Companies",
    "crm.contacts": "Contacts",
    "crm.opportunities": "Opportunities",
    "crm.import_export": "Import / Export",
    // Wiki
    "wiki.title": "Company Wiki",
    "wiki.new_article": "New Article",
    "wiki.public": "Public",
    "wiki.reserved": "Reserved",
    "wiki.categories": "Categories",
    // Admin
    "admin.title": "Admin",
    "admin.users": "Users",
    "admin.teams": "Teams & Sections",
    "admin.task_types": "Task Types",
    "admin.crm_roles": "CRM Roles",
    "admin.app_config": "App Configuration",
    "admin.permissions": "Permissions",
    // Amministrazione section
    "amministrazione.title": "Administration",
    "amministrazione.subtitle": "Quotes and administrative documents management",
    // Finanza section
    "finanza.title": "Finance",
    "finanza.subtitle": "General ledger, receipts and financial management",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("app_lang") || "it");

  function setLang(l) {
    localStorage.setItem("app_lang", l);
    setLangState(l);
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations["it"]?.[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}