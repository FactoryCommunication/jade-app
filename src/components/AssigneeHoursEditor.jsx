import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus } from "lucide-react";

export default function AssigneeHoursEditor({ assignees = [], users = [], onChange }) {
  const [selectedUserId, setSelectedUserId] = useState("");

  const availableUsers = users.filter((u) => !assignees.find((a) => a.user_id === u.id));

  function addAssignee() {
    if (!selectedUserId) return;
    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;
    const updated = [...assignees, { user_id: user.id, user_name: user.full_name || user.email, estimated_hours: 0 }];
    onChange(updated);
    setSelectedUserId("");
  }

  function removeAssignee(userId) {
    onChange(assignees.filter((a) => a.user_id !== userId));
  }

  function updateHours(userId, hours) {
    onChange(assignees.map((a) => a.user_id === userId ? { ...a, estimated_hours: Number(hours) || 0 } : a));
  }

  const total = assignees.reduce((s, a) => s + (a.estimated_hours || 0), 0);

  return (
    <div className="space-y-2">
      {assignees.map((a) => (
        <div key={a.user_id} className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium text-foreground truncate">{a.user_name}</span>
          <Input
            type="number"
            min="0"
            step="0.25"
            value={a.estimated_hours || ""}
            onChange={(e) => updateHours(a.user_id, e.target.value)}
            placeholder="0h"
            className="w-24 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">h</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAssignee(a.user_id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {assignees.length > 0 && (
        <div className="flex justify-end text-xs text-muted-foreground font-medium pt-1 border-t border-border">
          Totale stimato: <span className="ml-1 text-foreground font-bold">{total}h</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1 h-8 text-sm">
            <SelectValue placeholder={availableUsers.length === 0 ? "Tutti aggiunti" : "Aggiungi utente..."} />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={addAssignee} disabled={!selectedUserId}>
          <UserPlus className="h-3.5 w-3.5" /> Aggiungi
        </Button>
      </div>
    </div>
  );
}