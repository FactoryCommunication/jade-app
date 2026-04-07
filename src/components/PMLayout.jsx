import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderKanban, ListTodo, CalendarDays, KanbanSquare } from "lucide-react";

const tabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/projects", label: "Progetti", icon: FolderKanban },
      { path: "/tasks", label: "Task", icon: ListTodo },
        { path: "/calendar", label: "Calendario", icon: CalendarDays },
          { path: "/kanban", label: "Kanban", icon: KanbanSquare },
          ];

          export default function PMLayout() {
            const location = useLocation();

              const isActive = (path) =>
                  path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

                    return (
                        <div className="space-y-6">
                              <div className="flex gap-1 border-b border-border overflow-x-auto">
                                      {tabs.map((tab) => (
                                                <Link
                                                            key={tab.path}
                                                                        to={tab.path}
                                                                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                                                                                                  isActive(tab.path)
                                                                                                                  ? "border-primary text-foreground"
                                                                                                                                  : "border-transparent text-muted-foreground hover:text-foreground"
                                                                                                                                              }`}
                                                                                                                                                        >
                                                                                                                                                                    <tab.icon className="h-4 w-4" />
                                                                                                                                                                                {tab.label}
                                                                                                                                                                                          </Link>
                                                                                                                                                                                                  ))}
                                                                                                                                                                                                        </div>
                                                                                                                                                                                                              <Outlet />
                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                    );
                                                                                                                                                                                                                    }