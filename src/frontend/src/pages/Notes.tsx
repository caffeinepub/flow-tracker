import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { NotebookPen, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFinanceData } from "../hooks/useFinanceData";
import type { ChecklistItem, Note } from "../types";

const NOTE_COLORS = [
  "#20D18A",
  "#19B7C6",
  "#6EE7B7",
  "#F2C94C",
  "#F97316",
  "#8B5CF6",
  "#EC4899",
  "#EB5757",
];

function emptyNote(): Omit<Note, "id" | "createdAt" | "updatedAt"> {
  return { title: "", body: "", checklist: [], colorTag: undefined };
}

interface NoteEditorProps {
  note: Omit<Note, "id" | "createdAt" | "updatedAt">;
  onChange: (n: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  onSave: () => void;
  onDelete?: () => void;
  isNew: boolean;
}

function NoteEditor({
  note,
  onChange,
  onSave,
  onDelete,
  isNew,
}: NoteEditorProps) {
  const [newItemText, setNewItemText] = useState("");

  const addChecklistItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      text,
      checked: false,
    };
    onChange({ ...note, checklist: [...(note.checklist ?? []), item] });
    setNewItemText("");
  };

  const toggleItem = (id: string) => {
    onChange({
      ...note,
      checklist: (note.checklist ?? []).map((i) =>
        i.id === id ? { ...i, checked: !i.checked } : i,
      ),
    });
  };

  const updateItemText = (id: string, text: string) => {
    onChange({
      ...note,
      checklist: (note.checklist ?? []).map((i) =>
        i.id === id ? { ...i, text } : i,
      ),
    });
  };

  const deleteItem = (id: string) => {
    onChange({
      ...note,
      checklist: (note.checklist ?? []).filter((i) => i.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      {/* Color picker */}
      <div>
        <Label className="text-xs text-muted-foreground">Color Tag</Label>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onChange({ ...note, colorTag: undefined })}
            className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
            style={{
              borderColor: !note.colorTag
                ? "oklch(var(--foreground))"
                : "oklch(var(--border))",
              backgroundColor: "oklch(var(--muted))",
            }}
          >
            {!note.colorTag && <X size={10} />}
          </button>
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...note, colorTag: color })}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor:
                  note.colorTag === color
                    ? "oklch(var(--foreground))"
                    : "transparent",
                boxShadow:
                  note.colorTag === color ? `0 0 0 2px ${color}44` : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={note.title ?? ""}
          onChange={(e) => onChange({ ...note, title: e.target.value })}
          placeholder="Optional title..."
          className="mt-1"
          data-ocid="notes.input"
        />
      </div>

      {/* Body */}
      <div>
        <Label htmlFor="note-body">Notes</Label>
        <Textarea
          id="note-body"
          value={note.body ?? ""}
          onChange={(e) => onChange({ ...note, body: e.target.value })}
          placeholder="Write anything here..."
          className="mt-1 min-h-[100px] resize-none"
          data-ocid="notes.textarea"
        />
      </div>

      {/* Checklist */}
      <div>
        <Label className="mb-2 block">Checklist</Label>
        <div className="space-y-2">
          {(note.checklist ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => toggleItem(item.id)}
                data-ocid="notes.checkbox"
              />
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItemText(item.id, e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none border-b border-transparent focus:border-primary text-foreground"
                style={{
                  textDecoration: item.checked ? "line-through" : "none",
                  opacity: item.checked ? 0.5 : 1,
                }}
              />
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        {/* Add item input */}
        <div className="flex gap-2 mt-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
            placeholder="Add checklist item..."
            className="flex-1 text-sm h-8"
            data-ocid="notes.checklist.input"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addChecklistItem}
            className="h-8 px-2"
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {!isNew && onDelete && (
          <Button
            variant="outline"
            onClick={onDelete}
            className="gap-1"
            style={{ borderColor: "#EB5757", color: "#EB5757" }}
            data-ocid="notes.delete_button"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        )}
        <Button
          onClick={onSave}
          className="flex-1"
          style={{
            backgroundColor: "oklch(var(--primary))",
            color: "oklch(var(--primary-foreground))",
          }}
          data-ocid="notes.save_button"
        >
          {isNew ? "Add Note" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function Notes() {
  const { notes, addNote, editNote, deleteNote } = useFinanceData();
  const [search, setSearch] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [draftNote, setDraftNote] = useState<
    Omit<Note, "id" | "createdAt" | "updatedAt">
  >(emptyNote());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (n.title ?? "").toLowerCase().includes(q) ||
      (n.body ?? "").toLowerCase().includes(q)
    );
  });

  const openNew = () => {
    setEditingNote(null);
    setDraftNote(emptyNote());
    setShowSheet(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setDraftNote({
      title: note.title,
      body: note.body,
      checklist: note.checklist ? [...note.checklist] : [],
      colorTag: note.colorTag,
    });
    setShowSheet(true);
  };

  const handleSave = () => {
    if (
      !draftNote.title?.trim() &&
      !draftNote.body?.trim() &&
      !draftNote.checklist?.length
    ) {
      toast.error("Note is empty");
      return;
    }
    if (editingNote) {
      editNote(editingNote.id, draftNote);
      toast.success("Note updated");
    } else {
      addNote(draftNote);
      toast.success("Note added");
    }
    setShowSheet(false);
    setEditingNote(null);
  };

  const handleDelete = () => {
    if (!editingNote) return;
    setDeleteConfirm(editingNote.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteNote(deleteConfirm);
    toast.success("Note deleted");
    setDeleteConfirm(null);
    setShowSheet(false);
    setEditingNote(null);
  };

  return (
    <div className="pb-28 px-4 pt-2 fade-in">
      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="pl-9"
          data-ocid="notes.search_input"
        />
      </div>

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center rounded-2xl"
          style={{ backgroundColor: "oklch(var(--card))" }}
          data-ocid="notes.empty_state"
        >
          <NotebookPen size={40} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {search
              ? "No notes match your search."
              : "No notes yet. Tap + to add one."}
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-ocid="notes.list">
          {filtered.map((note, idx) => {
            const checkedCount = (note.checklist ?? []).filter(
              (i) => i.checked,
            ).length;
            const totalItems = (note.checklist ?? []).length;
            const bodyPreview = (note.body ?? "")
              .split("\n")
              .slice(0, 2)
              .join("\n");
            return (
              <button
                type="button"
                key={note.id}
                onClick={() => openEdit(note)}
                className="w-full text-left rounded-2xl border border-border overflow-hidden transition-all active:scale-[0.98]"
                style={{ backgroundColor: "oklch(var(--card))" }}
                data-ocid={`notes.item.${idx + 1}`}
              >
                <div className="flex">
                  {/* Color strip */}
                  {note.colorTag && (
                    <div
                      className="w-1 flex-shrink-0"
                      style={{ backgroundColor: note.colorTag }}
                    />
                  )}
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="font-semibold text-sm text-foreground truncate"
                        style={{ color: note.colorTag ?? undefined }}
                      >
                        {note.title || "Untitled"}
                      </p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {format(new Date(note.updatedAt), "MMM d")}
                      </span>
                    </div>
                    {bodyPreview && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {bodyPreview}
                      </p>
                    )}
                    {totalItems > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div
                          className="h-1 rounded-full flex-1 overflow-hidden"
                          style={{ backgroundColor: "oklch(var(--muted))" }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
                              backgroundColor:
                                note.colorTag ?? "oklch(var(--primary))",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {checkedCount}/{totalItems}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={openNew}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-30 transition-all active:scale-95"
        style={{ backgroundColor: "oklch(var(--primary))" }}
        data-ocid="notes.open_modal_button"
      >
        <Plus size={24} className="text-primary-foreground" />
      </button>

      {/* Note editor sheet */}
      <Sheet
        open={showSheet}
        onOpenChange={(o) => {
          if (!o) {
            setShowSheet(false);
            setEditingNote(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-3xl"
          data-ocid="notes.sheet"
        >
          <SheetHeader className="mb-4">
            <SheetTitle>{editingNote ? "Edit Note" : "New Note"}</SheetTitle>
          </SheetHeader>
          <NoteEditor
            note={draftNote}
            onChange={setDraftNote}
            onSave={handleSave}
            onDelete={editingNote ? handleDelete : undefined}
            isNew={!editingNote}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="rounded-2xl p-5 mx-4 max-w-sm w-full"
            style={{ backgroundColor: "oklch(var(--card))" }}
            data-ocid="notes.dialog"
          >
            <h3 className="font-bold text-foreground mb-2">Delete note?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
                data-ocid="notes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={confirmDelete}
                style={{ backgroundColor: "#EB5757", color: "#fff" }}
                data-ocid="notes.confirm_button"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
