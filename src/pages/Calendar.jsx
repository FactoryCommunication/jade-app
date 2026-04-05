import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import TaskForm from "../components/TaskForm";
import moment from "moment";
import "moment/locale/it";

moment.locale("it");

const DEFAULT_COLORS = { attivita: "#6366f1", meeting: "#0ea5e9", evento: "#10b981", evento_ripetuto: "#f59e0b" };
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORK_HOUR_START = 7;
const SLOT_HEIGHT = 60;

function getTaskColor(task, colors) {
  if (task.tipo_task === 'meeting') return colors.meeting || DEFAULT_COLORS.meeting;
  if (task.modalita === 'multiplo') return colors.evento_ripetuto || DEFAULT_COLORS.evento_ripetuto;
  if (task.tipo_task === 'evento') return colors.evento || DEFAULT_COLORS.evento;
  return colors.attivita || DEFAULT_COLORS.attivita;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function expandTasksForWeek(tasks, weekDays) {
  const result = [];
  const weekStart = moment(weekDays[0]);
  const weekEnd = moment(weekDays[6]);
  tasks.forEach((task) => {
    const isRecurring = task.modalita === "multiplo" || task.tipo_task === "evento_ripetuto";
    const baseDate = isRecurring
      ? (task.recurrence_start_date || task.event_date || task.due_date)
      : (task.event_date || task.due_date);
    if (!baseDate) return;
    const base = moment(baseDate);
    if (base.isBetween(weekStart, weekEnd, "day", "[]")) {
      result.push({ ...task, _displayDate: baseDate });
    }
    if (isRecurring && task.recurrence) {
      const endDate = task.recurrence_end_date ? moment(task.recurrence_end_date) : weekEnd;
      let current = base.clone();
      let count = 0;
      while (count < 500) {
        count++;
        if (task.recurrence === "giornaliera") current = current.clone().add(1, "days");
        else if (task.recurrence === "settimanale") current = current.clone().add(1, "weeks");
        else if (task.recurrence === "mensile") current = current.clone().add(1, "months");
        else if (task.recurrence === "annuale") current = current.clone().add(1, "years");
        if (current.isAfter(endDate) || current.isAfter(weekEnd)) break;
        if (current.isBefore(weekStart)) continue;
        result.push({ ...task, _displayDate: current.format("YYYY-MM-DD"), _isRecurrence: true });
      }
    }
  });
  return result;
}

export default function Calendar() {
  const today = moment();
  const [currentWeekStart, setCurrentWeekStart] = useState(moment().startOf("isoWeek"));
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [loading, setLoading] = useState(true);

  const [filterCliente, setFilterCliente] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterTaskType, setFilterTaskType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTaskInitial, setNewTaskInitial] = useState({});

  const [selectedTask, setSelectedTask] = useState(null);
  const [taskAction, setTaskAction] = useState(null);
  const [saving, setSaving] = useState(false);

  const gridScrollRef = useRef(null);
  const dragRef = useRef(null);
  const didDragRef = useRef(false);
  const [dragging, setDragging] = useState(null);

  // Drag & drop stato
  const taskDragRef = useRef(null);
  const [draggingTask, setDraggingTask] = useState(null);

  // Resize stato
  const resizeRef = useRef(null);
  const [resizing, setResizing] = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!loading && gridScrollRef.current) {
      gridScrollRef.current.scrollTop = WORK_HOUR_START * SLOT_HEIGHT;
    }
  }, [loading]);

  function scrollGrid(direction) {
    if (!gridScrollRef.current) return;
    gridScrollRef.current.scrollTop += direction * SLOT_HEIGHT * 3;
  }

  async function loadData() {
    const [t, p, tt, settings, az] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("task_types").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
      supabase.from("app_settings").select("*").eq("key", "tipo_task_colors").maybeSingle().then(r => r.data),
      supabase.from("crm_aziende").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);
    let u = [];
    try { u = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200).then(r => r.data || []); } catch {}
    setTasks(t);
    setProjects(p);
    setTaskTypes(tt);
    setUsers(u);
    setAziende(az);
    if (settings?.value) {
      try { setColors({ ...DEFAULT_COLORS, ...JSON.parse(settings.value) }); } catch {}
    }
    setLoading(false);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    currentWeekStart.clone().add(i, "days").format("YYYY-MM-DD")
  );

  const filteredTasks = tasks.filter((t) => {
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false;
    if (filterTaskType !== "all" && t.task_type_id !== filterTaskType) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterDateFrom && (t.event_date || t.due_date) && (t.event_date || t.due_date) < filterDateFrom) return false;
    if (filterDateTo && (t.event_date || t.due_date) && (t.event_date || t.due_date) > filterDateTo) return false;
    if (filterCliente !== "all") {
      const proj = projects.find((p) => p.id === t.project_id);
      if (!proj || !(proj.aziende_ids || []).includes(filterCliente)) return false;
    }
    return true;
  });

  const expanded = expandTasksForWeek(filteredTasks, weekDays);

  // ─── CREA TASK TRASCINANDO SUL CALENDARIO ───
  function getMinutesFromY(y, containerTop) {
    const relY = y - containerTop;
    const rawMin = (relY / SLOT_HEIGHT) * 60 + HOURS[0] * 60;
    return Math.round(rawMin / 15) * 15;
  }

  function handleMouseDown(e, dateStr) {
    if (e.button !== 0) return;
    if (taskDragRef.current || resizeRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = getMinutesFromY(e.clientY, rect.top + gridScrollRef.current.scrollTop - gridScrollRef.current.getBoundingClientRect().top);
    dragRef.current = { dateStr, startMin, endMin: startMin + 60, rect, startY: e.clientY };
    didDragRef.current = false;
    setDragging({ dateStr, startMin, endMin: startMin + 60 });
    e.preventDefault();
  }

  function handleMouseMove(e) {
    // Resize task
    if (resizeRef.current) {
      const { task, type, startY, origStartMins, origEndMins, colRect } = resizeRef.current;
      const deltaY = e.clientY - startY;
      const deltaMins = Math.round((deltaY / SLOT_HEIGHT) * 60 / 15) * 15;
      let newStartMins = origStartMins;
      let newEndMins = origEndMins;
      if (type === "top") newStartMins = Math.max(0, Math.min(origStartMins + deltaMins, origEndMins - 15));
      if (type === "bottom") newEndMins = Math.max(origStartMins + 15, Math.min(origEndMins + deltaMins, 23 * 60 + 45));
      setResizing({ task, type, newStartMins, newEndMins });
      return;
    }

    // Drag task
    if (taskDragRef.current) {
      const { task, startY, origDateStr, origStartMins, origEndMins, duration } = taskDragRef.current;
      const deltaY = e.clientY - startY;
      const deltaMins = Math.round((deltaY / SLOT_HEIGHT) * 60 / 15) * 15;
      const newStartMins = Math.max(0, Math.min(origStartMins + deltaMins, 23 * 60 - duration));
      const newEndMins = newStartMins + duration;

      // Trova la colonna del giorno sotto il cursore
      let newDateStr = origDateStr;
      weekDays.forEach((d) => {
        const col = document.querySelector(`[data-date="${d}"]`);
        if (col) {
          const rect = col.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right) newDateStr = d;
        }
      });

      taskDragRef.current.newDateStr = newDateStr;
      taskDragRef.current.newStartMins = newStartMins;
      taskDragRef.current.newEndMins = newEndMins;
      setDraggingTask({ task, newDateStr, newStartMins, newEndMins });
      return;
    }

    // Crea task trascinando
    if (!dragRef.current) return;
    const { rect, startMin, dateStr, startY } = dragRef.current;
    if (Math.abs(e.clientY - startY) > 8) didDragRef.current = true;
    const scrollTop = gridScrollRef.current?.scrollTop || 0;
    const gridTop = gridScrollRef.current?.getBoundingClientRect().top || 0;
    const relY = e.clientY - gridTop + scrollTop;
    const rawMin = (relY / SLOT_HEIGHT) * 60;
    const endMin = Math.max(startMin + 15, Math.round(rawMin / 15) * 15);
    dragRef.current.endMin = endMin;
    setDragging({ dateStr, startMin, endMin });
  }

  async function handleMouseUp(e) {
    // Fine resize
    if (resizeRef.current && resizing) {
      const { task } = resizeRef.current;
      const { newStartMins, newEndMins } = resizing;
      resizeRef.current = null;
      setResizing(null);
      await supabase.from("tasks").update({
        event_start_time: minutesToTime(newStartMins),
        event_end_time: minutesToTime(newEndMins),
        estimated_hours: (newEndMins - newStartMins) / 60,
      }).eq("id", task.id);
      loadData();
      return;
    }

    // Fine drag task
    if (taskDragRef.current && draggingTask) {
      const { task, newDateStr, newStartMins, newEndMins } = taskDragRef.current;
      taskDragRef.current = null;
      setDraggingTask(null);
      await supabase.from("tasks").update({
        event_date: newDateStr,
        event_start_time: minutesToTime(newStartMins),
        event_end_time: minutesToTime(newEndMins),
      }).eq("id", task.id);
      loadData();
      return;
    }

    // Fine crea task trascinando
    if (!dragRef.current) return;
    const { dateStr, startMin, endMin } = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    if (didDragRef.current) {
      openNewTask(dateStr, minutesToTime(startMin), minutesToTime(Math.min(endMin, 23 * 60 + 45)));
    }
    didDragRef.current = false;
  }

  function openNewTask(dateStr, startTime, endTime) {
    setNewTaskInitial({ event_date: dateStr, event_start_time: startTime, event_end_time: endTime, tipo_task: "attivita", status: "da_fare" });
    setShowNewForm(true);
  }

  function handleTaskClick(task, e) {
    if (taskDragRef.current || resizeRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedTask(task);
    setTaskAction(null);
  }

  function closeTaskMenu() {
    setSelectedTask(null);
    setTaskAction(null);
  }

  async function handleDeleteTask() {
    setSaving(true);
    await supabase.from("tasks").delete().eq("id", selectedTask.id);
    setSaving(false);
    closeTaskMenu();
    loadData();
  }

  async function handleUpdateTask(data) {
    setSaving(true);
    await supabase.from("tasks").update(data).eq("id", selectedTask.id).select().single().then(r => r.data);
    setSaving(false);
    closeTaskMenu();
    loadData();
  }

  async function handleCreateNewTask(data) {
    setSaving(true);
    try {
      const { error } = await supabase.from("tasks").insert(data).select().single();
      if (error) {
        console.error("❌ ERRORE CREA TASK CALENDARIO:", error);
        alert(`Errore: ${error.message}`);
      } else {
        setShowNewForm(false);
        loadData();
      }
    } catch (err) {
      console.error("❌ ECCEZIONE CREA TASK CALENDARIO:", err);
    } finally {
      setSaving(false);
    }
  }

  function getTaskVisualState(task) {
    const isCompleted = task.status === "completato";
    return { isCompleted, isTimeMet: isCompleted, isOvertime: false, loggedHours: 0 };
  }

  function renderTaskPill(task, i) {
    const isDragged = draggingTask?.task?.id === task.id;
    const isResized = resizing?.task?.id === task.id;

    let startMins = timeToMinutes(task.event_start_time || "09:00");
    let endMins = timeToMinutes(task.event_end_time || "10:00");

    if (isDragged && draggingTask) { startMins = draggingTask.newStartMins; endMins = draggingTask.newEndMins; }
    if (isResized && resizing) { startMins = resizing.newStartMins; endMins = resizing.newEndMins; }

    const gridStart = HOURS[0] * 60;
    const { isCompleted, isTimeMet } = getTaskVisualState(task);
    const top = ((startMins - gridStart) / 60) * SLOT_HEIGHT;
    const height = Math.max(24, ((endMins - startMins) / 60) * SLOT_HEIGHT);
    const baseColor = getTaskColor(task, colors);
    const isFaded = isCompleted || isTimeMet;
    const bgStyle = isFaded ? hexToRgba(baseColor, 0.35) : baseColor;
    const borderStyle = isFaded ? `2px solid ${baseColor}` : "none";

    return (
      <div
        key={`${task.id}-${i}`}
        className={`absolute left-0.5 right-0.5 rounded px-1.5 py-1 text-xs overflow-hidden z-10 shadow-sm group transition-all ${isDragged ? "opacity-70 cursor-grabbing z-30" : "cursor-grab hover:brightness-110"}`}
        style={{ top, height, backgroundColor: bgStyle, border: borderStyle, color: isFaded ? baseColor : "#ffffff" }}
        title={`${task.title} — trascina per spostare`}
        onMouseDown={(e) => {
          e.stopPropagation();
          // Inizia drag task
          const origStartMins = timeToMinutes(task.event_start_time || "09:00");
          const origEndMins = timeToMinutes(task.event_end_time || "10:00");
          taskDragRef.current = {
            task,
            startY: e.clientY,
            origDateStr: task._displayDate || task.event_date,
            origStartMins,
            origEndMins,
            duration: origEndMins - origStartMins,
            newDateStr: task._displayDate || task.event_date,
            newStartMins: origStartMins,
            newEndMins: origEndMins,
          };
          didDragRef.current = false;
          e.preventDefault();
        }}
        onClick={(e) => {
          if (!taskDragRef.current) handleTaskClick(task, e);
        }}
      >
        {/* Handle resize top */}
        <div
          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize z-20"
          onMouseDown={(e) => {
            e.stopPropagation();
            resizeRef.current = {
              task,
              type: "top",
              startY: e.clientY,
              origStartMins: timeToMinutes(task.event_start_time || "09:00"),
              origEndMins: timeToMinutes(task.event_end_time || "10:00"),
            };
            setResizing({ task, type: "top", newStartMins: timeToMinutes(task.event_start_time || "09:00"), newEndMins: timeToMinutes(task.event_end_time || "10:00") });
            e.preventDefault();
          }}
        />

        <span className="font-semibold block truncate">{task.event_start_time && `${task.event_start_time} `}{task.title}</span>
        {task.project_name && <span className="opacity-80 truncate block text-[10px] font-medium">{task.project_name}</span>}
        {(() => {
          const proj = projects.find((p) => p.id === task.project_id);
          const cliente = proj?.aziende_nomi?.[0] || proj?.client || null;
          return cliente ? <span className="opacity-60 truncate block text-[10px]">{cliente}</span> : null;
        })()}
        {isCompleted && <span className="text-[9px] font-bold opacity-80 block">✓ Completato</span>}

        {/* Handle resize bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-20"
          onMouseDown={(e) => {
            e.stopPropagation();
            resizeRef.current = {
              task,
              type: "bottom",
              startY: e.clientY,
              origStartMins: timeToMinutes(task.event_start_time || "09:00"),
              origEndMins: timeToMinutes(task.event_end_time || "10:00"),
            };
            setResizing({ task, type: "bottom", newStartMins: timeToMinutes(task.event_start_time || "09:00"), newEndMins: timeToMinutes(task.event_end_time || "10:00") });
            e.preventDefault();
          }}
        />
      </div>
    );
  }

  function renderAllDayTasks(dateStr) {
    const dayTasks = expanded.filter((t) => t._displayDate === dateStr && !t.event_start_time);
    return dayTasks.map((task, i) => {
      const { isCompleted, isTimeMet } = getTaskVisualState(task);
      const isFaded = isCompleted || isTimeMet;
      return (
        <div
          key={i}
          className="text-[10px] px-1.5 py-0.5 rounded truncate mb-0.5 cursor-pointer hover:opacity-80 border"
          style={{
            backgroundColor: isFaded ? hexToRgba(getTaskColor(task, colors), 0.2) : getTaskColor(task, colors),
            color: isFaded ? getTaskColor(task, colors) : "#ffffff",
            borderColor: isFaded ? getTaskColor(task, colors) : "transparent",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => handleTaskClick(task, e)}
        >
          {task.title}
        </div>
      );
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Calendario</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {currentWeekStart.format("DD MMM")} — {currentWeekStart.clone().endOf("isoWeek").format("DD MMM YYYY")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(currentWeekStart.clone().subtract(1, "week"))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(moment().startOf("isoWeek"))}>Oggi</Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(currentWeekStart.clone().add(1, "week"))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="gap-2" onClick={() => openNewTask(today.format("YYYY-MM-DD"), "09:00", "10:00")}>
            <Plus className="h-4 w-4" />Nuovo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti i clienti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i clienti</SelectItem>
            {aziende.map((az) => <SelectItem key={az.id} value={az.id}>{az.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti i progetti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i progetti</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tutti gli Utenti" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli Utenti</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTaskType} onValueChange={setFilterTaskType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo Lavoro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {taskTypes.map((tt) => <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="da_fare">Da Fare</SelectItem>
            <SelectItem value="in_corso">In Corso</SelectItem>
            <SelectItem value="in_revisione">In Revisione</SelectItem>
            <SelectItem value="completato">Completato</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tutte le Priorità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Priorità</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="bassa">Bassa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-32 h-9 text-sm" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-32 h-9 text-sm" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center">
        {Object.entries({ attivita: "Attività", meeting: "Meeting", evento: "Evento", evento_ripetuto: "Ricorrente" }).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[key] || DEFAULT_COLORS[key] }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <div className="h-3 w-3 rounded-full border-2 border-indigo-400 bg-indigo-100" />
          Completato
        </div>
        <span className="text-xs text-muted-foreground italic">Trascina per creare/spostare • Bordi per ridimensionare • Clicca per le azioni</span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="border-r border-border" />
          {weekDays.map((d) => {
            const isToday = d === today.format("YYYY-MM-DD");
            const m = moment(d);
            return (
              <div key={d} className={`p-2 text-center border-r border-border last:border-r-0 ${isToday ? "bg-accent/30" : ""}`}>
                <p className="text-xs text-muted-foreground uppercase">{m.format("ddd")}</p>
                <p className={`text-lg font-bold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                  {m.format("D")}
                </p>
                <div className="min-h-[20px] mt-1">{renderAllDayTasks(d)}</div>
              </div>
            );
          })}
        </div>

        {/* Scroll controls */}
        <div className="flex justify-end gap-1 px-2 py-1 border-b border-border bg-muted/30">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => scrollGrid(-1)}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => scrollGrid(1)}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground self-center ml-1">scorri orari</span>
        </div>

        {/* Scrollable time grid */}
        <div ref={gridScrollRef} style={{ height: 600, overflowY: "auto" }}>
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div>
              {HOURS.map((h) => (
                <div key={h} className="border-b border-border/50 text-right pr-2 text-xs text-muted-foreground flex items-start justify-end pt-1" style={{ height: SLOT_HEIGHT }}>
                  {`${String(h).padStart(2,"0")}:00`}
                </div>
              ))}
            </div>
            {weekDays.map((dateStr) => {
              const isToday = dateStr === today.format("YYYY-MM-DD");
              const dayTasks = expanded.filter((t) => t._displayDate === dateStr && t.event_start_time);
              const isDraggingHere = dragging?.dateStr === dateStr;
              const isDraggingTaskHere = draggingTask?.newDateStr === dateStr;
              return (
                <div
                  key={dateStr}
                  data-date={dateStr}
                  className={`relative border-l border-border select-none ${isToday ? "bg-accent/10" : ""}`}
                  style={{ height: SLOT_HEIGHT * HOURS.length }}
                  onMouseDown={(e) => handleMouseDown(e, dateStr)}
                >
                  {HOURS.map((h) => (
                    <div key={h} className={`absolute left-0 right-0 border-b ${h >= WORK_HOUR_START && h < 19 ? "border-border/60" : "border-border/20"}`} style={{ top: h * SLOT_HEIGHT }} />
                  ))}
                  {HOURS.map((h) => (
                    <div key={`${h}h`} className="absolute left-0 right-0 border-b border-border/10 border-dashed" style={{ top: h * SLOT_HEIGHT + SLOT_HEIGHT / 2 }} />
                  ))}
                  <div className="absolute left-0 right-0 pointer-events-none" style={{ top: WORK_HOUR_START * SLOT_HEIGHT, height: (19 - WORK_HOUR_START) * SLOT_HEIGHT, backgroundColor: "rgba(0,0,0,0.02)" }} />

                  {/* Preview crea task */}
                  {isDraggingHere && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded bg-primary/30 border border-primary z-20 pointer-events-none"
                      style={{
                        top: (dragging.startMin / 60) * SLOT_HEIGHT,
                        height: Math.max(10, ((dragging.endMin - dragging.startMin) / 60) * SLOT_HEIGHT),
                      }}
                    >
                      <span className="text-xs text-primary font-semibold px-1">
                        {minutesToTime(dragging.startMin)} – {minutesToTime(dragging.endMin)}
                      </span>
                    </div>
                  )}

                  {/* Preview drag task */}
                  {isDraggingTaskHere && draggingTask && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded z-20 pointer-events-none opacity-60 border-2 border-dashed border-primary"
                      style={{
                        top: (draggingTask.newStartMins / 60) * SLOT_HEIGHT,
                        height: Math.max(24, ((draggingTask.newEndMins - draggingTask.newStartMins) / 60) * SLOT_HEIGHT),
                        backgroundColor: getTaskColor(draggingTask.task, colors),
                      }}
                    >
                      <span className="text-xs text-white font-semibold px-1">
                        {minutesToTime(draggingTask.newStartMins)} – {minutesToTime(draggingTask.newEndMins)}
                      </span>
                    </div>
                  )}

                  {dayTasks.map((task, i) => renderTaskPill(task, i))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DIALOGS */}

      {/* 1. Azioni task */}
      <Dialog open={!!selectedTask && !taskAction} onOpenChange={(o) => !o && closeTaskMenu()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cosa vuoi fare?</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-3">
              <div className="bg-secondary rounded-lg p-3">
                <p className="font-semibold text-sm text-foreground">{selectedTask.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedTask.project_name}</p>
                {selectedTask.event_start_time && (
                  <p className="text-xs text-muted-foreground">{selectedTask.event_start_time} → {selectedTask.event_end_time}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Button className="w-full gap-3 h-12 text-base" variant="outline" onClick={() => setTaskAction("edit")}>
                  <Pencil className="h-5 w-5" /> Modifica Task
                </Button>
                <Button className="w-full gap-3 h-12 text-base" variant="destructive" onClick={handleDeleteTask} disabled={saving}>
                  <Trash2 className="h-5 w-5" /> {saving ? "Eliminazione..." : "Elimina Task"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Modifica task */}
      <Dialog open={taskAction === "edit"} onOpenChange={(o) => !o && closeTaskMenu()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Task</DialogTitle></DialogHeader>
          {selectedTask && (
            <TaskForm
              initial={selectedTask}
              projects={projects}
              parentTasks={tasks.filter((t) => !t.parent_task_id)}
              onSubmit={handleUpdateTask}
              onCancel={closeTaskMenu}
              loading={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Crea nuovo task */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            initial={newTaskInitial}
            projects={projects}
            parentTasks={tasks.filter((t) => !t.parent_task_id)}
            onSubmit={handleCreateNewTask}
            onCancel={() => setShowNewForm(false)}
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}