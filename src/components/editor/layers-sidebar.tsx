import React, { useState } from "react";
import {
  Circle,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Minus,
  Plus,
  Shapes,
  Square,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CertificateField } from "@/types/certificate-field";

export function LayersSidebar({
  fields,
  selectedFieldId,
  onAddField,
  onAddImageField,
  onAddShapeField,
  onRemoveField,
  onDuplicateField,
  onReorderField,
  onMoveLayer,
  onSelectField,
  onUpdateField,
}: {
  fields: CertificateField[];
  selectedFieldId: string;
  onAddField: () => void;
  onAddImageField: () => void;
  onAddShapeField: (shapeType: "rectangle" | "circle" | "line") => void;
  onRemoveField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onReorderField: (draggedId: string, targetId: string) => void;
  onMoveLayer: (id: string, direction: "front" | "back" | "up" | "down") => void;
  onSelectField: (id: string) => void;
  onUpdateField: (id: string, patch: Partial<CertificateField>) => void;
}) {
  const [fieldToDelete, setFieldToDelete] = useState<CertificateField | null>(
    null,
  );
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const startEditing = (field: CertificateField) => {
    setEditingId(field.id);
    setEditingLabel(field.label);
  };

  const saveEditing = () => {
    if (editingId) {
      onUpdateField(editingId, { label: editingLabel.trim() || "Untitled Layer" });
    }
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  return (
    <aside className="h-full min-h-0 overflow-hidden border-r bg-background text-sidebar-foreground transition-colors duration-300">
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Layers
          </h2>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={onAddField}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>Add Text</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="icon" variant="ghost" className="size-7">
                    <Shapes className="size-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => onAddShapeField("rectangle")}>
                  <Square className="size-4 mr-2" /> Rectangle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddShapeField("circle")}>
                  <Circle className="size-4 mr-2" /> Circle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddShapeField("line")}>
                  <Minus className="size-4 mr-2" /> Line
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={onAddImageField}
                  >
                    <ImageIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>Add Image</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
              <p className="text-[10px] font-medium uppercase tracking-wider">
                No Layers
              </p>
            </div>
          ) : (
            fields.map((field) => (
              <div
                key={field.id}
                draggable={editingId !== field.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all cursor-default select-none",
                  field.id === selectedFieldId
                    ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  draggingLayerId === field.id && "opacity-30",
                  dragOverLayerId === field.id &&
                    "bg-primary/5 ring-1 ring-primary/10",
                )}
                onClick={() => onSelectField(field.id)}
                onDoubleClick={() => startEditing(field)}
                onDragStart={(e) => {
                  if (editingId === field.id) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData("text/plain", field.id);
                  setDraggingLayerId(field.id);
                }}
                onDragEnd={() => {
                  setDraggingLayerId(null);
                  setDragOverLayerId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverLayerId(field.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData("text/plain");
                  if (draggedId) onReorderField(draggedId, field.id);
                  setDragOverLayerId(null);
                }}
              >
                <div className="flex shrink-0 items-center justify-center">
                  {field.type === "image" ? (
                    <ImageIcon className="size-3.5" />
                  ) : field.type === "shape" ? (
                    field.shapeType === "circle" ? (
                      <Circle className="size-3.5" />
                    ) : field.shapeType === "line" ? (
                      <Minus className="size-3.5" />
                    ) : (
                      <Square className="size-3.5" />
                    )
                  ) : (
                    <FileText className="size-3.5" />
                  )}
                </div>

                {editingId === field.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-background px-1 py-0 outline-none ring-1 ring-primary rounded-sm min-w-0"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditing();
                      if (e.key === "Escape") cancelEditing();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 truncate">{field.label}</span>
                )}

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="size-5 flex items-center justify-center rounded hover:bg-background transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateField(field.id, { visible: !field.visible });
                    }}
                  >
                    {field.visible ? (
                      <Eye className="size-3" />
                    ) : (
                      <EyeOff className="size-3" />
                    )}
                  </button>
                  <button
                    className="size-5 flex items-center justify-center rounded hover:bg-background transition-colors text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFieldToDelete(field);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={!!fieldToDelete}
        onOpenChange={(open) => !open && setFieldToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Layer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{fieldToDelete?.label}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (fieldToDelete) {
                  onRemoveField(fieldToDelete.id);
                  setFieldToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
