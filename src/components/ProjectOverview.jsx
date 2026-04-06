import { useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Camera, Paperclip, Trash2, Download, Loader2, Save } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "bullet", "indent",
  "blockquote", "code-block", "link", "image",
];

export default function ProjectOverview({ project, onUpdate, canEdit }) {
  const [overview, setOverview] = useState(project.overview || "");
  const [coverUrl, setCoverUrl] = useState(project.cover_url || "");
  const [attachments, setAttachments] = useState(project.attachments || []);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const coverRef = useRef();
  const attachRef = useRef();

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `project-covers/${project.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setCoverUrl(publicUrl);
    }
    setUploadingCover(false);
  }

  async function handleAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttach(true);
    const timestamp = Date.now();
    const path = `project-attachments/${project.id}/${timestamp}_${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const newAttachment = { name: file.name, url: publicUrl, size: file.size, type: file.type, path };
      setAttachments((prev) => [...prev, newAttachment]);
    }
    setUploadingAttach(false);
  }

  async function handleDeleteAttachment(index) {
    const attach = attachments[index];
    await supabase.storage.from("avatars").remove([attach.path]);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("projects").update({
      overview,
      cover_url: coverUrl,
      attachments,
    }).eq("id", project.id);
    setSaving(false);
    setSaved(true);
    onUpdate?.();
    setTimeout(() => setSaved(false), 3000);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      {/* Immagine di testata */}
      <div className="relative rounded-xl overflow-hidden bg-muted border border-border" style={{ height: 200 }}>
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Nessuna immagine di copertina</p>
          </div>
        )}
        {/* Overlay con colore progetto */}
        <div
          className="absolute inset-0 flex items-end p-6"
          style={{ background: `linear-gradient(to top, ${project.color || "#6366f1"}cc, transparent)` }}
        >
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="text-white/80 text-sm mt-1">{project.client}</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => coverRef.current?.click()}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
          >
            {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploadingCover ? "Caricamento..." : "Cambia copertina"}
          </button>
        )}
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* Editor */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Descrizione del progetto</h2>
        {canEdit ? (
          <div className="prose-editor">
            <ReactQuill
              theme="snow"
              value={overview}
              onChange={setOverview}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Descrivi il progetto, gli obiettivi, le note importanti..."
              style={{ minHeight: 300 }}
            />
          </div>
        ) : (
          <div
            className="prose max-w-none text-sm text-foreground ql-editor"
            dangerouslySetInnerHTML={{ __html: overview || "<p class='text-muted-foreground'>Nessuna descrizione.</p>" }}
          />
        )}
      </div>

      {/* Allegati */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Allegati ({attachments.length})</h2>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => attachRef.current?.click()} disabled={uploadingAttach}>
              {uploadingAttach ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              {uploadingAttach ? "Caricamento..." : "Aggiungi allegato"}
            </Button>
          )}
          <input ref={attachRef} type="file" className="hidden" onChange={handleAttachmentUpload} />
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun allegato.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attach, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{attach.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(attach.size)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={attach.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAttachment(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Salva */}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "✓ Salvato!" : <><Save className="h-4 w-4" /> Salva panoramica</>}
        </Button>
      )}
    </div>
  );
}