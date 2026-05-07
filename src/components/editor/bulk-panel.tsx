import React, { useState } from "react";
import Papa from "papaparse";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CertificateField, BulkRow } from "@/types/certificate-field";

export function BulkPanel({
  fields,
  rows,
  previewIndex,
  filenameTemplate,
  isGenerating,
  onRowsChange,
  onPreviewIndexChange,
  onFilenameTemplateChange,
  onGenerate,
}: {
  fields: CertificateField[];
  rows: BulkRow[];
  previewIndex: number;
  filenameTemplate: string;
  isGenerating: "pdf" | "jpg" | null;
  onRowsChange: (rows: BulkRow[]) => void;
  onPreviewIndexChange: (index: number) => void;
  onFilenameTemplateChange: (value: string) => void;
  onGenerate: (type: "pdf" | "jpg") => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const textFields = fields.filter((field) => field.type === "text");
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const mappedCount = textFields.filter((field) =>
    headers.includes(field.label),
  ).length;
  const isUploaded = rows.length > 0;

  function handleCsv(file: File | null) {
    if (!file) {
      return;
    }

    Papa.parse<BulkRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsedRows = result.data.filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim()),
        );
        onRowsChange(parsedRows);
      },
    });
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];

    if (
      file?.type === "text/csv" ||
      file?.name.toLowerCase().endsWith(".csv")
    ) {
      handleCsv(file);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Bulk Generate</h3>
        <p className="text-xs text-muted-foreground">
          Upload CSV with headers matching field labels.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">CSV Data</Label>
          {isUploaded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRowsChange([])}
              className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
            >
              Remove
            </Button>
          )}
        </div>
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : isUploaded
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-muted/30",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploaded && !isDragOver ? (
            <CheckCircle2 className="size-8 text-primary" />
          ) : (
            <FileUp
              className={cn(
                "size-8 transition-colors",
                isDragOver ? "text-foreground" : "text-muted-foreground",
              )}
            />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploaded && !isDragOver ? "CSV Loaded" : "Drop CSV here"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isUploaded && !isDragOver
                ? `${rows.length} rows detected`
                : "or click to browse"}
            </p>
          </div>
          <Label htmlFor="bulk-csv" className="absolute inset-0 cursor-pointer">
            <span className="sr-only">Upload CSV</span>
          </Label>
          <Input
            id="bulk-csv"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => handleCsv(event.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-muted/50 p-3 text-sm transition-colors">
        <p className="text-xs font-medium">{rows.length} rows</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {mappedCount} of {textFields.length} fields mapped.
        </p>
      </div>

      {headers.length ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Detected Headers
          </Label>
          <div className="flex flex-wrap gap-1">
            {headers.map((header) => (
              <span
                key={header}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border"
              >
                {header}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <>
          <div className="space-y-2">
            <Label
              htmlFor="bulk-preview-row"
              className="text-xs text-muted-foreground"
            >
              Preview Row
            </Label>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 bg-muted hover:bg-accent"
                disabled={previewIndex <= 0}
                onClick={() => onPreviewIndexChange(previewIndex - 1)}
              >
                <ChevronLeft className="size-4 text-muted-foreground" />
              </Button>
              <Input
                id="bulk-preview-row"
                type="number"
                min={1}
                max={rows.length}
                value={previewIndex + 1}
                className="h-8 text-center text-xs"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    onPreviewIndexChange(
                      Math.min(Math.max(0, val - 1), rows.length - 1),
                    );
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 bg-muted hover:bg-accent"
                disabled={previewIndex >= rows.length - 1}
                onClick={() => onPreviewIndexChange(previewIndex + 1)}
              >
                <ChevronRight className="size-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="bulk-filename"
              className="text-xs text-muted-foreground"
            >
              Filename Pattern
            </Label>
            <Input
              id="bulk-filename"
              value={filenameTemplate}
              className="h-8 text-xs"
              onChange={(event) => onFilenameTemplateChange(event.target.value)}
            />
            <p className="text-[10px] text-muted-foreground italic">
              Use {"{row}"} or headers like {"{Name}"}.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button
              className="w-full text-xs font-bold uppercase tracking-wider"
              disabled={!!isGenerating}
              onClick={() => onGenerate("pdf")}
            >
              {isGenerating === "pdf" ? (
                <Loader2 className="size-3.5 mr-2 animate-spin" />
              ) : (
                <Download className="size-3.5 mr-2" />
              )}
              {isGenerating === "pdf" ? "Generating..." : "Generate ZIP (PDF)"}
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs font-bold uppercase tracking-wider"
              disabled={!!isGenerating}
              onClick={() => onGenerate("jpg")}
            >
              {isGenerating === "jpg" ? (
                <Loader2 className="size-3.5 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="size-3.5 mr-2" />
              )}
              {isGenerating === "jpg" ? "Generating..." : "Generate ZIP (JPG)"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
