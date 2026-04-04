import { Link } from "react-router-dom";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import moment from "moment";

export default function ProjectCard({ project, taskCount, hoursLogged }) {
  const color = project.color || "indigo";

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-300 hover:border-primary/20 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`h-3 w-3 rounded-full bg-${color}-500`} />
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">{project.client}</p>
      <div className="flex items-center gap-3 mb-3">
        <StatusBadge value={project.status} />
        {project.priority && <StatusBadge type="priority" value={project.priority} />}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
        {project.end_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {moment(project.end_date).format("DD MMM YYYY")}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {hoursLogged || 0}h{project.budget_hours ? ` / ${project.budget_hours}h` : ""}
        </span>
      </div>
    </Link>
  );
}