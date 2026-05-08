import React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Italic,
  RotateCw,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleFontLoader } from "@/lib/fonts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { GoogleFontSelect } from "./google-font-select";
import { BareNumberInput, NumberInput } from "./number-input";
import { ImageUploadInput } from "./image-upload-input";
import type {
  CertificateField,
  CertificateFieldAlignment,
} from "@/types/certificate-field";

export function FieldSettings({
  field,
  onChange,
}: {
  field: CertificateField;
  onChange: (patch: Partial<CertificateField>) => void;
}) {
  useGoogleFontLoader([field.fontFamily]);

  return (
    <section className="space-y-5">
      {!field.isBackground && (
        <div className="grid gap-2">
          <Label htmlFor="field-label" className="text-xs text-muted-foreground">
            Label
          </Label>
          <Input
            id="field-label"
            value={field.label}
            className="h-8 text-xs"
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </div>
      )}

      {field.type === "image" ? (
        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="field-image" className="text-xs text-muted-foreground">
              Image
            </Label>
            <ImageUploadInput id="field-image" onChange={onChange} />
            {field.imageDataUrl && (
              <div className="rounded-md border bg-muted/20 p-2 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={field.imageDataUrl}
                  alt={field.label}
                  className="max-h-24 w-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Object Fit */}
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Object Fit</Label>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
              {(["contain", "cover", "fill"] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  className={cn(
                    "flex h-7 items-center justify-center rounded px-1 text-[11px] font-medium capitalize transition-all",
                    (field.objectFit ?? "contain") === fit
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onChange({ objectFit: fit })}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>

          {/* Border */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Border
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <NumberInput
                  label="Px"
                  value={field.imageBorderWidth ?? 0}
                  onChange={(val) => onChange({ imageBorderWidth: val })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Radius</Label>
                <NumberInput
                  label="Px"
                  value={field.imageBorderRadius ?? 0}
                  onChange={(val) => onChange({ imageBorderRadius: val })}
                />
              </div>
            </div>
            {(field.imageBorderWidth ?? 0) > 0 && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label className="text-xs text-muted-foreground">Border Color</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={field.imageBorderColor ?? "#000000"}
                      className="h-8 pl-5 text-[11px] font-mono uppercase"
                      onChange={(event) =>
                        onChange({ imageBorderColor: event.target.value })
                      }
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      #
                    </span>
                  </div>
                  <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md border shadow-sm transition-colors hover:border-primary">
                    <Input
                      type="color"
                      value={field.imageBorderColor ?? "#000000"}
                      className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                      onChange={(event) =>
                        onChange({ imageBorderColor: event.target.value })
                      }
                    />
                    <div
                      className="h-full w-full"
                      style={{ backgroundColor: field.imageBorderColor ?? "#000000" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Filters
            </h3>
            <div className="space-y-3">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Grayscale</Label>
                  <Switch
                    checked={field.imageGrayscale ?? false}
                    onCheckedChange={(checked) =>
                      onChange({ imageGrayscale: checked })
                    }
                    className="scale-75 origin-right"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Brightness</Label>
                  <span className="w-8 text-[10px] font-mono text-right">
                    {Math.round((field.imageBrightness ?? 100))}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={field.imageBrightness ?? 100}
                  className="h-4 w-full cursor-pointer accent-primary"
                  onChange={(e) =>
                    onChange({ imageBrightness: Number(e.target.value) })
                  }
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Contrast</Label>
                  <span className="w-8 text-[10px] font-mono text-right">
                    {Math.round((field.imageContrast ?? 100))}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={field.imageContrast ?? 100}
                  className="h-4 w-full cursor-pointer accent-primary"
                  onChange={(e) =>
                    onChange({ imageContrast: Number(e.target.value) })
                  }
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Blur</Label>
                  <span className="w-8 text-[10px] font-mono text-right">
                    {(field.imageBlur ?? 0).toFixed(0)}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={field.imageBlur ?? 0}
                  className="h-4 w-full cursor-pointer accent-primary"
                  onChange={(e) =>
                    onChange({ imageBlur: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Appearance
            </h3>
            <div className="grid gap-4">
              <div className="grid min-w-0 gap-2">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={field.opacity ?? 1}
                    className="h-4 min-w-0 flex-1 cursor-pointer accent-primary"
                    onChange={(e) =>
                      onChange({ opacity: Number(e.target.value) })
                    }
                  />
                  <span className="w-6 shrink-0 text-right text-[10px] font-mono">
                    {(field.opacity ?? 1).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 gap-2">
                <Label className="text-xs text-muted-foreground">Rotation</Label>
                <div className="group relative flex items-center gap-0 overflow-hidden rounded-md border transition-colors focus-within:border-primary">
                  <div className="flex h-8 w-7 shrink-0 items-center justify-center border-r bg-muted text-[10px] font-bold text-muted-foreground select-none group-focus-within:text-foreground transition-colors">
                    <RotateCw className="size-3" />
                  </div>
                  <BareNumberInput
                    value={field.rotate ?? 0}
                    className="h-8 w-full bg-background px-2 text-xs font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                    onChange={(rotate) => onChange({ rotate })}
                  />
                  <div className="flex h-8 w-6 shrink-0 items-center justify-center text-[10px] text-muted-foreground">
                    °
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shadow */}
          <Separator className="opacity-50" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Shadow</Label>
              <Switch
                checked={!!field.shadowColor}
                onCheckedChange={(checked) =>
                  onChange({ shadowColor: checked ? "#000000" : "" })
                }
              />
            </div>

            {field.shadowColor !== undefined && field.shadowColor !== "" && (
              <div className="space-y-4 rounded-md border bg-muted/20 p-3 animate-in fade-in slide-in-from-top-2">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Shadow Color
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={field.shadowColor}
                        className="h-8 pl-5 text-[11px] font-mono uppercase"
                        onChange={(event) =>
                          onChange({ shadowColor: event.target.value })
                        }
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        #
                      </span>
                    </div>
                    <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md border">
                      <Input
                        type="color"
                        value={field.shadowColor}
                        className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                        onChange={(event) =>
                          onChange({ shadowColor: event.target.value })
                        }
                      />
                      <div
                        className="h-full w-full"
                        style={{ backgroundColor: field.shadowColor }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Offset X
                    </Label>
                    <NumberInput
                      label="X"
                      value={field.shadowOffsetX ?? 2}
                      onChange={(val) => onChange({ shadowOffsetX: val })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Offset Y
                    </Label>
                    <NumberInput
                      label="Y"
                      value={field.shadowOffsetY ?? 2}
                      onChange={(val) => onChange({ shadowOffsetY: val })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Shadow Opacity
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={field.shadowOpacity ?? 0.5}
                      className="h-4 flex-1 cursor-pointer accent-primary"
                      onChange={(e) =>
                        onChange({ shadowOpacity: Number(e.target.value) })
                      }
                    />
                    <span className="w-8 text-[10px] font-mono">
                      {(field.shadowOpacity ?? 0.5).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : field.type === "shape" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Fill Color
              </Label>
              {field.fillColor && (
                <button
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => onChange({ fillColor: "" })}
                >
                  None
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative h-8 w-full overflow-hidden rounded-md border shadow-sm transition-colors hover:border-primary">
                {field.fillColor ? (
                  <>
                    <Input
                      type="color"
                      value={field.fillColor}
                      className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                      onChange={(event) =>
                        onChange({ fillColor: event.target.value })
                      }
                      disabled={field.shapeType === "line"}
                    />
                    <div
                      className={cn(
                        "h-full w-full",
                        field.shapeType === "line" && "bg-muted opacity-50",
                      )}
                      style={{
                        backgroundColor:
                          field.shapeType === "line"
                            ? undefined
                            : field.fillColor,
                      }}
                    />
                  </>
                ) : (
                  <button
                    className="flex h-full w-full items-center justify-center bg-muted/30 text-[10px] text-muted-foreground hover:bg-muted/50 transition-all"
                    onClick={() => onChange({ fillColor: "#ffffff" })}
                  >
                    Transparent
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Stroke Color
              </Label>
              {field.strokeColor && (
                <button
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => onChange({ strokeColor: "" })}
                >
                  None
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative h-8 w-full overflow-hidden rounded-md border shadow-sm transition-colors hover:border-primary">
                {field.strokeColor ? (
                  <>
                    <Input
                      type="color"
                      value={field.strokeColor}
                      className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                      onChange={(event) =>
                        onChange({ strokeColor: event.target.value })
                      }
                    />
                    <div
                      className="h-full w-full"
                      style={{ backgroundColor: field.strokeColor }}
                    />
                  </>
                ) : (
                  <button
                    className="flex h-full w-full items-center justify-center bg-muted/30 text-[10px] text-muted-foreground hover:bg-muted/50 transition-all"
                    onClick={() => onChange({ strokeColor: "#000000" })}
                  >
                    None
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="field-value" className="text-xs text-muted-foreground">
            Content
          </Label>
          <Textarea
            id="field-value"
            value={field.value}
            className="min-h-20 text-xs resize-none"
            placeholder="Type content here... (Shift+Enter for a new line)"
            onChange={(event) => onChange({ value: event.target.value })}
          />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Layout
        </h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <NumberInput
            label="X"
            value={field.x}
            onChange={(x) => onChange({ x })}
          />
          <NumberInput
            label="Y"
            value={field.y}
            onChange={(y) => onChange({ y })}
          />
          <NumberInput
            label="W"
            value={field.width}
            onChange={(width) => onChange({ width })}
          />
          <NumberInput
            label="H"
            value={field.height}
            onChange={(height) => onChange({ height })}
          />
        </div>
      </div>

      {field.type === "shape" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              Stroke Width
            </Label>
            <NumberInput
              label="Px"
              value={field.strokeWidth ?? 1}
              onChange={(val) => onChange({ strokeWidth: val })}
            />
          </div>
          {field.shapeType === "rectangle" && (
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Radius</Label>
              <NumberInput
                label="Px"
                value={field.borderRadius ?? 0}
                onChange={(val) => onChange({ borderRadius: val })}
              />
            </div>
          )}
        </div>
      )}

      {field.type === "text" && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Text
          </h3>
          <div className="space-y-4 pt-2">
            <Separator className="opacity-50" />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Font</Label>
                <GoogleFontSelect
                  value={field.fontFamily}
                  onChange={(fontFamily) => onChange({ fontFamily })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Size</Label>
                  <div className="group relative flex items-center gap-0 overflow-hidden rounded-md border transition-colors focus-within:border-primary">
                    <div className="flex h-8 w-9 shrink-0 items-center justify-center border-r bg-muted text-[10px] font-bold text-muted-foreground select-none group-focus-within:text-foreground transition-colors">
                      Px
                    </div>
                    <BareNumberInput
                      value={Math.round(field.fontSize)}
                      className="h-8 w-full bg-background px-2 text-xs font-medium text-foreground outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onChange={(fontSize) => onChange({ fontSize })}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-7 shrink-0 items-center justify-center border-l bg-muted/30 hover:bg-muted transition-colors">
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-20 min-w-0">
                        {[
                          10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48,
                          64, 96, 128,
                        ].map((size) => (
                          <DropdownMenuItem
                            key={size}
                            className={cn(
                              "text-xs",
                              field.fontSize === size && "bg-accent font-bold",
                            )}
                            onClick={() => onChange({ fontSize: size })}
                          >
                            {size}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="field-color-hex"
                        value={field.color}
                        className="h-8 pl-5 text-[11px] font-mono uppercase"
                        onChange={(event) =>
                          onChange({ color: event.target.value })
                        }
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        #
                      </span>
                    </div>
                    <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md border shadow-sm transition-colors hover:border-primary">
                      <Input
                        type="color"
                        value={field.color}
                        className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                        onChange={(event) =>
                          onChange({ color: event.target.value })
                        }
                      />
                      <div
                        className="h-full w-full"
                        style={{ backgroundColor: field.color }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="field-font-weight"
                    className="text-xs text-muted-foreground"
                  >
                    Weight
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="group relative flex w-full items-center gap-0 overflow-hidden rounded-md border text-left transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary outline-none">
                      <div className="flex h-8 flex-1 items-center px-2.5 text-xs font-medium text-foreground">
                        <span className="capitalize">{field.fontWeight}</span>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border-l bg-muted/30 group-hover:bg-muted transition-colors">
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 min-w-0">
                      {(["regular", "medium", "semibold", "bold"] as const).map(
                        (weight) => (
                          <DropdownMenuItem
                            key={weight}
                            className={cn(
                              "text-xs capitalize",
                              field.fontWeight === weight &&
                                "bg-accent font-bold",
                            )}
                            onClick={() => onChange({ fontWeight: weight })}
                          >
                            {weight}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Alignment
                  </Label>
                  <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
                    {[
                      ["left", AlignLeft],
                      ["center", AlignCenter],
                      ["right", AlignRight],
                    ].map(([value, Icon]) => (
                      <button
                        key={value as string}
                        type="button"
                        className={cn(
                          "flex items-center justify-center rounded px-1 py-1.5 transition-all",
                          field.alignment === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() =>
                          onChange({
                            alignment: value as CertificateFieldAlignment,
                          })
                        }
                      >
                        <Icon className="size-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Text Effects
                </Label>
                <div className="flex gap-1 rounded-md bg-muted/50 p-1">
                  {[
                    {
                      id: "bold",
                      icon: Bold,
                      active: field.fontWeight === "bold",
                      onClick: () =>
                        onChange({
                          fontWeight:
                            field.fontWeight === "bold" ? "regular" : "bold",
                        }),
                    },
                    {
                      id: "italic",
                      icon: Italic,
                      active: field.fontStyle === "italic",
                      onClick: () =>
                        onChange({
                          fontStyle:
                            field.fontStyle === "italic" ? "normal" : "italic",
                        }),
                    },
                    {
                      id: "underline",
                      icon: Underline,
                      active: field.textDecoration === "underline",
                      onClick: () =>
                        onChange({
                          textDecoration:
                            field.textDecoration === "underline"
                              ? "none"
                              : "underline",
                        }),
                    },
                    {
                      id: "strikethrough",
                      icon: Strikethrough,
                      active: field.textDecoration === "line-through",
                      onClick: () =>
                        onChange({
                          textDecoration:
                            field.textDecoration === "line-through"
                              ? "none"
                              : "line-through",
                        }),
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "flex flex-1 items-center justify-center rounded py-1.5 transition-all",
                        item.active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={item.onClick}
                    >
                      <item.icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Text Transform
                </Label>
                <div className="grid grid-cols-4 gap-1 rounded-md bg-muted/50 p-1">
                  {[
                    { value: "none", label: "Ab", title: "None" },
                    { value: "uppercase", label: "AA", title: "Uppercase" },
                    { value: "lowercase", label: "aa", title: "Lowercase" },
                    { value: "capitalize", label: "Aa", title: "Capitalize" },
                  ].map((item) => (
                    <Tooltip key={item.value}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              "flex h-7 items-center justify-center rounded px-1 transition-all",
                              (field.textTransform ?? "none") === item.value
                                ? "bg-background text-foreground shadow-sm font-bold"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() =>
                              onChange({
                                textTransform:
                                  item.value as CertificateField["textTransform"],
                              })
                            }
                          >
                            <span className="text-[11px] font-medium">
                              {item.label}
                            </span>
                          </button>
                        }
                      >
                        {item.title}
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Appearance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Auto Resize
                  </Label>
                  <div className="flex h-8 items-center justify-between rounded-md border bg-muted/20 px-2.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {field.autoResize ? "On" : "Off"}
                    </span>
                    <Switch
                      checked={field.autoResize ?? false}
                      onCheckedChange={(checked) =>
                        onChange({ autoResize: checked })
                      }
                      className="scale-75 origin-right"
                    />
                  </div>
                </div>

                {field.autoResize && (
                  <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-xs text-muted-foreground">
                      Min Size
                    </Label>
                    <NumberInput
                      label="Px"
                      value={field.minFontSize ?? 8}
                      onChange={(val) => onChange({ minFontSize: val })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid min-w-0 gap-2">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={field.opacity ?? 1}
                    className="h-4 min-w-0 flex-1 cursor-pointer accent-primary"
                    onChange={(e) =>
                      onChange({ opacity: Number(e.target.value) })
                    }
                  />
                  <span className="w-6 shrink-0 text-right text-[10px] font-mono">
                    {(field.opacity ?? 1).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 gap-2">
                <Label className="text-xs text-muted-foreground">
                  Rotation
                </Label>
                <div className="group relative flex items-center gap-0 overflow-hidden rounded-md border transition-colors focus-within:border-primary">
                  <div className="flex h-8 w-7 shrink-0 items-center justify-center border-r bg-muted text-[10px] font-bold text-muted-foreground select-none group-focus-within:text-foreground transition-colors">
                    <RotateCw className="size-3" />
                  </div>
                  <BareNumberInput
                    value={field.rotate ?? 0}
                    className="h-8 w-full bg-background px-2 text-xs font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                    onChange={(rotate) => onChange({ rotate })}
                  />
                  <div className="flex h-8 w-6 shrink-0 items-center justify-center text-[10px] text-muted-foreground">
                    °
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Letter Spacing
                </Label>
                <NumberInput
                  label="Px"
                  value={field.letterSpacing ?? 0}
                  onChange={(val) => onChange({ letterSpacing: val })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Line Height
                </Label>
                <NumberInput
                  label="Em"
                  value={field.lineHeight ?? 1.25}
                  onChange={(val) => onChange({ lineHeight: val })}
                />
              </div>
            </div>

            <Separator className="my-2 opacity-50" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Shadow</Label>
                <Switch
                  checked={!!field.shadowColor}
                  onCheckedChange={(checked) =>
                    onChange({ shadowColor: checked ? "#000000" : "" })
                  }
                />
              </div>

              {field.shadowColor !== undefined && field.shadowColor !== "" && (
                <div className="space-y-4 rounded-md border bg-muted/20 p-3 animate-in fade-in slide-in-from-top-2">
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Shadow Color
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={field.shadowColor}
                          className="h-8 pl-5 text-[11px] font-mono uppercase"
                          onChange={(event) =>
                            onChange({ shadowColor: event.target.value })
                          }
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                          #
                        </span>
                      </div>
                      <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md border">
                        <Input
                          type="color"
                          value={field.shadowColor}
                          className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                          onChange={(event) =>
                            onChange({ shadowColor: event.target.value })
                          }
                        />
                        <div
                          className="h-full w-full"
                          style={{ backgroundColor: field.shadowColor }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Offset X
                      </Label>
                      <NumberInput
                        label="X"
                        value={field.shadowOffsetX ?? 2}
                        onChange={(val) => onChange({ shadowOffsetX: val })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Offset Y
                      </Label>
                      <NumberInput
                        label="Y"
                        value={field.shadowOffsetY ?? 2}
                        onChange={(val) => onChange({ shadowOffsetY: val })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Shadow Opacity
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={field.shadowOpacity ?? 0.5}
                        className="h-4 flex-1 cursor-pointer accent-primary"
                        onChange={(e) =>
                          onChange({ shadowOpacity: Number(e.target.value) })
                        }
                      />
                      <span className="w-8 text-[10px] font-mono">
                        {(field.shadowOpacity ?? 0.5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
