import React, { useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CertificateField } from "@/types/certificate-field";

export function ImageUploadInput({
  id,
  onChange,
}: {
  id: string;
  onChange: (patch: Partial<CertificateField>) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleImage(file: File | null) {
    if (!file) {
      return;
    }

    const isPng =
      file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    const isJpeg =
      file.type === "image/jpeg" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg");

    if (!isPng && !isJpeg) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({
        imageDataUrl: e.target?.result as string,
        imageMimeType: isPng ? "image/png" : "image/jpeg",
        value: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className={cn(
        "relative flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground transition-all",
        isDragOver
          ? "border-primary bg-primary/5 text-primary"
          : "hover:border-primary hover:bg-muted/50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        void handleImage(e.dataTransfer.files[0]);
      }}
    >
      <div className="flex flex-col items-center gap-1.5 p-4 text-center">
        <FileUp
          className={cn(
            "size-5 transition-transform",
            isDragOver && "scale-110",
          )}
        />
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium">Drop image here</p>
          <p className="text-[9px] opacity-60">or click to browse (PNG, JPG)</p>
        </div>
      </div>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => void handleImage(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
