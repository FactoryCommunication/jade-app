import { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import moment from "moment";

export default function TaskCommentSection({ task, users = [], currentUser }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mentionSearch, setMentionSearch] = useState(null); // null or string
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadComments();
  }, [task.id]);

  async function loadComments() {
    setLoading(true);
    const data = await supabase.from("task_comments").select("*").eq("task_id", task.id).order("created_at", { ascending: false }).limit(100).then(r => r.data || []);
    setComments(data);
    setLoading(false);
  }

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textUpToCursor = val.slice(0, cursor);
    const atMatch = textUpToCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionSearch(atMatch[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionSearch(null);
    }
  }

  const filteredMentions = mentionSearch !== null
    ? users.filter((u) => {
        const name = (u.full_name || u.email || "").toLowerCase();
        return name.includes(mentionSearch) && (u.role !== undefined && u.role !== null);
      }).slice(0, 5)
    : [];

  function insertMention(user) {
    const cursor = textareaRef.current?.selectionStart || text.length;
    const textUpToCursor = text.slice(0, cursor);
    const replaced = textUpToCursor.replace(/@\w*$/, `@${user.full_name || user.email} `);
    const newText = replaced + text.slice(cursor);
    setText(newText);
    setMentionSearch(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e) {
    if (mentionSearch !== null && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIndex]); }
      else if (e.key === "Escape") setMentionSearch(null);
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setSaving(true);

    // Extract mentioned users
    const mentionedNames = [...text.matchAll(/@([\w\s]+?)(?=\s|$|@)/g)].map((m) => m[1].trim().toLowerCase());
    const mentionedUsers = users.filter((u) =>
      mentionedNames.some((n) => (u.full_name || u.email || "").toLowerCase().startsWith(n))
    );

    await supabase.from("task_comments").create({
      task_id: task.id,
      task_title: task.title,
      project_id: task.project_id,
      user_id: currentUser?.id || "",
      user_name: currentUser?.full_name || currentUser?.email || "Anonimo",
      content: text.trim(),
      mentioned_user_ids: mentionedUsers.map((u) => u.id),
      mentioned_user_emails: mentionedUsers.map((u) => u.email),
    });

    // Send email to mentioned users
    for (const u of mentionedUsers) {
      if (u.email) {
        base44.integrations.Core.SendEmail({
          to: u.email,
          subject: `Sei stato menzionato in un commento: "${task.title}"`,
          body: `<p><strong>${currentUser?.full_name || "Un utente"}</strong> ti ha menzionato in un commento sul task <strong>"${task.title}"</strong>:</p><blockquote>${text.trim()}</blockquote>`,
        }).catch(() => {});
      }
    }

    setText("");
    setSaving(false);
    loadComments();
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4" /> Commenti ({comments.length})
      </h4>

      {loading ? (
        <div className="text-xs text-muted-foreground">Caricamento...</div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nessun commento ancora.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="bg-secondary/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground">{c.user_name}</span>
                <span className="text-xs text-muted-foreground">{moment(c.created_date).format("DD MMM HH:mm")}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Input with @mention */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un commento... usa @ per menzionare un utente (Ctrl+Invio per inviare)"
          className="text-sm resize-none min-h-[72px] pr-10"
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2 h-7 w-7"
          onClick={handleSubmit}
          disabled={saving || !text.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>

        {/* @mention dropdown */}
        {mentionSearch !== null && filteredMentions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-48 overflow-hidden">
            {filteredMentions.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${i === mentionIndex ? "bg-accent" : ""}`}
              >
                <span className="font-medium">{u.full_name || u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}