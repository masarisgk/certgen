import React, { useEffect, useRef } from "react";

function clampNumber(value: number, min?: number, max?: number) {
  return Math.min(max ?? value, Math.max(min ?? value, value));
}

function useDraftNumberInput(
  value: number,
  onChange: (value: number) => void,
  min?: number,
  max?: number,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;

    if (!input || document.activeElement === input) {
      return;
    }

    input.value = String(Math.round(value));
  }, [value]);

  function commitValue(nextValue: string) {
    const input = inputRef.current;

    if (nextValue.trim() === "") {
      if (input) {
        input.value = String(Math.round(value));
      }
      return;
    }

    const parsedValue = Number(nextValue);

    if (!Number.isFinite(parsedValue)) {
      if (input) {
        input.value = String(Math.round(value));
      }
      return;
    }

    const clampedValue = clampNumber(parsedValue, min, max);

    if (input) {
      input.value = String(Math.round(clampedValue));
    }

    onChange(clampedValue);
  }

  function updateValue(nextValue: string) {
    if (nextValue.trim() === "") {
      return;
    }

    const parsedValue = Number(nextValue);

    if (Number.isFinite(parsedValue)) {
      onChange(clampNumber(parsedValue, min, max));
    }
  }

  return { inputRef, updateValue, commitValue };
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
  const { inputRef, updateValue, commitValue } = useDraftNumberInput(
    value,
    onChange,
  );

  return (
    <div className="group relative flex items-center gap-0 overflow-hidden rounded-lg border bg-background transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-r bg-muted/30 text-[10px] font-black text-muted-foreground select-none group-focus-within:text-foreground transition-colors uppercase tracking-tighter">
        {label}
      </div>
      <input
        ref={inputRef}
        type="number"
        defaultValue={Math.round(value)}
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
  const { inputRef, updateValue, commitValue } = useDraftNumberInput(
    value,
    onChange,
    min,
    max,
  );

  return (
    <input
      ref={inputRef}
      id={id}
      type="number"
      min={min}
      max={max}
      defaultValue={Math.round(value)}
      className={className}
      onBlur={(event) => commitValue(event.target.value)}
      onChange={(event) => updateValue(event.target.value)}
    />
  );
}
