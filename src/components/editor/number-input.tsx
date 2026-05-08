import React, { useEffect, useState } from "react";

function useDraftNumber(
  value: number,
  onChange: (value: number) => void,
  min?: number,
  max?: number,
) {
  const [draftValue, setDraftValue] = useState(String(Math.round(value)));

  useEffect(() => {
    setDraftValue(String(Math.round(value)));
  }, [value]);

  function commitValue(nextValue: string) {
    if (nextValue.trim() === "") {
      setDraftValue(String(Math.round(value)));
      return;
    }

    const parsedValue = Number(nextValue);

    if (Number.isFinite(parsedValue)) {
      const clampedValue = Math.min(
        max ?? parsedValue,
        Math.max(min ?? parsedValue, parsedValue),
      );
      setDraftValue(String(Math.round(clampedValue)));
      onChange(clampedValue);
    } else {
      setDraftValue(String(Math.round(value)));
    }
  }

  function updateValue(nextValue: string) {
    setDraftValue(nextValue);

    if (nextValue.trim() !== "") {
      commitValue(nextValue);
    }
  }

  return { draftValue, updateValue, commitValue };
}

export function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { draftValue, updateValue, commitValue } = useDraftNumber(
    value,
    onChange,
  );

  return (
    <div className="group relative flex items-center gap-0 overflow-hidden rounded-lg border bg-background transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-r bg-muted/30 text-[10px] font-black text-muted-foreground select-none group-focus-within:text-foreground transition-colors uppercase tracking-tighter">
        {label}
      </div>
      <input
        type="number"
        value={draftValue}
        className="h-9 w-full bg-transparent px-3 text-[11px] font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
        onBlur={(event) => commitValue(event.target.value)}
        onChange={(event) => updateValue(event.target.value)}
      />
    </div>
  );
}

export function BareNumberInput({
  id,
  value,
  min,
  max,
  className,
  onChange,
}: {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  className?: string;
  onChange: (value: number) => void;
}) {
  const { draftValue, updateValue, commitValue } = useDraftNumber(
    value,
    onChange,
    min,
    max,
  );

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      value={draftValue}
      className={className}
      onBlur={(event) => commitValue(event.target.value)}
      onChange={(event) => updateValue(event.target.value)}
    />
  );
}
