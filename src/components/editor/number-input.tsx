import React from "react";
import { RotateCw } from "lucide-react";

export function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="group relative flex items-center gap-0 overflow-hidden rounded-lg border bg-background transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-r bg-muted/30 text-[10px] font-black text-muted-foreground select-none group-focus-within:text-foreground transition-colors uppercase tracking-tighter">
        {label}
      </div>
      <input
        type="number"
        value={Math.round(value)}
        className="h-9 w-full bg-transparent px-3 text-[11px] font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
