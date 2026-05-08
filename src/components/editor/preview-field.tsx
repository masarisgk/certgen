import React, { useState, useMemo } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFontStack, previewFontWeight } from "@/lib/fonts";
import type {
  CertificateField,
  PdfPageSize,
} from "@/types/certificate-field";

export function PreviewField({
  field,
  pageSize,
  previewSize,
  canvasZoom,
  selected,
  dragging,
  editing,
  onSelect,
  onEditStart,
  onEditEnd,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onMove,
  onValueChange,
  onImageChange,
  onResize,
  fields,
}: {
  field: CertificateField;
  pageSize: PdfPageSize | null;
  previewSize: PdfPageSize | null;
  canvasZoom: number;
  selected: boolean;
  dragging: boolean;
  editing: boolean;
  onSelect: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onResizeStart: () => void;
  onMove: (x: number, y: number) => void;
  onValueChange: (value: string) => void;
  onImageChange: (
    patch: Pick<CertificateField, "imageDataUrl" | "imageMimeType" | "value">,
  ) => void;
  onResize: (width: number, height: number) => void;
  fields: CertificateField[];
}) {
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number }>(
    {},
  );

  // Auto Resize Calculation
  const fontSize = useMemo(() => {
    if (!pageSize || !previewSize) {
      return field.fontSize;
    }

    const baseSize = (field.fontSize / pageSize.height) * previewSize.height;
    if (!field.autoResize || field.type !== "text" || !field.width)
      return baseSize;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return baseSize;

    const fontWeightValue = previewFontWeight[field.fontWeight];
    const previewWidth = (field.width / pageSize.width) * previewSize.width;
    const minSize =
      ((field.minFontSize ?? 8) / pageSize.height) * previewSize.height;

    let currentSize = baseSize;
    const lines = (field.value || field.label).split("\n");
    const getLongestLineWidth = (size: number) => {
      context.font = `${fontWeightValue} ${size}px ${getFontStack(field.fontFamily)}`;
      return Math.max(
        ...lines.map((line) => {
          const metrics = context.measureText(line);
          return (
            metrics.width +
            (line.length - 1) *
              ((field.letterSpacing ?? 0) / pageSize.width) *
              previewSize.width
          );
        }),
      );
    };

    let currentMaxWidth = getLongestLineWidth(currentSize);
    while (currentMaxWidth > previewWidth && currentSize > minSize) {
      currentSize -= 0.5;
      currentMaxWidth = getLongestLineWidth(currentSize);
    }

    return currentSize;
  }, [
    field.fontSize,
    field.autoResize,
    field.type,
    field.width,
    field.value,
    field.label,
    field.fontFamily,
    field.fontWeight,
    field.letterSpacing,
    field.minFontSize,
    pageSize,
    previewSize,
  ]);

  if (!field.visible || !pageSize || !previewSize) {
    return null;
  }

  const left = (field.x / pageSize.width) * previewSize.width;
  const yOffset = field.type === "image" ? field.height : field.fontSize;
  const top =
    ((pageSize.height - field.y - yOffset) / pageSize.height) *
    previewSize.height;
  const width = (field.width / pageSize.width) * previewSize.width;
  const height = (field.height / pageSize.height) * previewSize.height;

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!pageSize || !previewSize || field.locked) {
      return;
    }

    event.preventDefault();
    onSelect();
    onDragStart();

    const currentPageSize = pageSize;
    const currentPreviewSize = previewSize;
    const target = event.currentTarget;
    const parent = target.parentElement;

    if (!parent) {
      return;
    }

    target.setPointerCapture(event.pointerId);

    const parentRect = parent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offsetX = (event.clientX - targetRect.left) / canvasZoom;
    const offsetY = (event.clientY - targetRect.top) / canvasZoom;

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextLeft =
        (moveEvent.clientX - parentRect.left) / canvasZoom - offsetX;
      const nextTop =
        (moveEvent.clientY - parentRect.top) / canvasZoom - offsetY;
      const maxLeft = currentPreviewSize.width - width;
      const maxTop = currentPreviewSize.height - height;
      const clampedLeft = Math.min(Math.max(0, nextLeft), Math.max(0, maxLeft));
      const clampedTop = Math.min(Math.max(0, nextTop), Math.max(0, maxTop));
      const nextX =
        (clampedLeft / currentPreviewSize.width) * currentPageSize.width;
      const nextY =
        currentPageSize.height -
        (clampedTop / currentPreviewSize.height) * currentPageSize.height -
        yOffset;

      // Snapping Logic
      const SNAP_THRESHOLD = 6; // px in PDF units
      let finalX = nextX;
      let finalY = nextY;
      let guideX: number | undefined;
      let guideY: number | undefined;

      // Snapping candidates
      const xTargets = [
        { val: 0, guide: 0 },
        {
          val: currentPageSize.width / 2 - field.width / 2,
          guide: currentPageSize.width / 2,
        },
        {
          val: currentPageSize.width - field.width,
          guide: currentPageSize.width,
        },
      ];

      const yTargets = [
        { val: 0, guide: 0 },
        {
          val: currentPageSize.height / 2 - yOffset / 2,
          guide: currentPageSize.height / 2,
        },
        {
          val: currentPageSize.height - yOffset,
          guide: currentPageSize.height,
        },
      ];

      // Add other fields to targets
      fields
        .filter((f) => f.id !== field.id && f.visible)
        .forEach((f) => {
          const fYOffset = f.type === "image" ? f.height : f.fontSize;

          // X Snapping
          xTargets.push({ val: f.x, guide: f.x });
          xTargets.push({
            val: f.x + f.width - field.width,
            guide: f.x + f.width,
          });
          xTargets.push({
            val: f.x + f.width / 2 - field.width / 2,
            guide: f.x + f.width / 2,
          });

          // Y Snapping
          yTargets.push({ val: f.y, guide: f.y });
          yTargets.push({
            val: f.y + fYOffset - yOffset,
            guide: f.y + fYOffset,
          });
          yTargets.push({
            val: f.y + fYOffset / 2 - yOffset / 2,
            guide: f.y + fYOffset / 2,
          });
        });

      for (const target of xTargets) {
        if (Math.abs(nextX - target.val) < SNAP_THRESHOLD) {
          finalX = target.val;
          guideX = target.guide;
          break;
        }
      }

      for (const target of yTargets) {
        if (Math.abs(nextY - target.val) < SNAP_THRESHOLD) {
          finalY = target.val;
          guideY = target.guide;
          break;
        }
      }

      setActiveGuides({ x: guideX, y: guideY });
      onMove(Math.round(finalX), Math.round(finalY));
    }

    function handlePointerUp() {
      onDragEnd();
      setActiveGuides({});
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    if (!pageSize || !previewSize || field.locked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onResizeStart();

    const currentPageSize = pageSize;
    const currentPreviewSize = previewSize;
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startWidth = width;
    const startHeight = height;
    const minWidth = field.type === "image" ? 24 : Math.max(40, fontSize * 2);
    const minHeight =
      field.type === "image" ? 24 : Math.max(18, fontSize * 1.15);
    const maxWidth = currentPreviewSize.width - left;
    const maxHeight = currentPreviewSize.height - top;
    const aspectRatio = startWidth / Math.max(1, startHeight);

    function handlePointerMove(moveEvent: PointerEvent) {
      let nextPreviewWidth = Math.min(
        Math.max(
          minWidth,
          startWidth + (moveEvent.clientX - startClientX) / canvasZoom,
        ),
        maxWidth,
      );
      let nextPreviewHeight = Math.min(
        Math.max(
          minHeight,
          startHeight + (moveEvent.clientY - startClientY) / canvasZoom,
        ),
        maxHeight,
      );

      if (moveEvent.shiftKey) {
        const widthDelta = Math.abs(nextPreviewWidth - startWidth);
        const heightDelta = Math.abs(nextPreviewHeight - startHeight);

        if (widthDelta >= heightDelta) {
          nextPreviewHeight = nextPreviewWidth / aspectRatio;
        } else {
          nextPreviewWidth = nextPreviewHeight * aspectRatio;
        }

        if (nextPreviewWidth > maxWidth) {
          nextPreviewWidth = maxWidth;
          nextPreviewHeight = nextPreviewWidth / aspectRatio;
        }

        if (nextPreviewHeight > maxHeight) {
          nextPreviewHeight = maxHeight;
          nextPreviewWidth = nextPreviewHeight * aspectRatio;
        }

        if (nextPreviewWidth < minWidth) {
          nextPreviewWidth = minWidth;
          nextPreviewHeight = nextPreviewWidth / aspectRatio;
        }

        if (nextPreviewHeight < minHeight) {
          nextPreviewHeight = minHeight;
          nextPreviewWidth = nextPreviewHeight * aspectRatio;
        }
      }

      const nextWidth =
        (nextPreviewWidth / currentPreviewSize.width) * currentPageSize.width;
      const nextHeight =
        (nextPreviewHeight / currentPreviewSize.height) *
        currentPageSize.height;

      onResize(Math.round(nextWidth), Math.round(nextHeight));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  return (
    <button
      type="button"
      className={cn(
        "absolute touch-none select-none border border-transparent bg-transparent text-left cursor-move",
        field.type === "text" && "px-1",
        field.locked && "cursor-default",
        selected && "border-dashed border-primary bg-primary/10",
        dragging && "border-solid border-primary bg-primary/20",
      )}
      style={{
        left,
        top,
        width,
        minHeight: height,
        height: field.type === "text" ? "auto" : height,
        color: field.color,
        textAlign: field.alignment,
        lineHeight: field.lineHeight ?? 1.25,
        letterSpacing: field.letterSpacing
          ? `${field.letterSpacing}px`
          : "normal",
        opacity: field.opacity ?? 1,
        transform: field.rotate ? `rotate(${field.rotate}deg)` : "none",
        textTransform: field.textTransform ?? "none",
        textShadow: field.shadowColor
          ? `${field.shadowOffsetX ?? 2}px ${field.shadowOffsetY ?? 2}px 0px ${field.shadowColor}${Math.round(
              (field.shadowOpacity ?? 0.5) * 255,
            )
              .toString(16)
              .padStart(2, "0")}`
          : "none",
        whiteSpace: "pre",
        wordBreak: "normal",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(event) => {
        event.stopPropagation();

        if (field.type === "text" && !field.locked) {
          onEditStart();
        }
      }}
    >
      {editing && field.type === "text" ? (
        <input
          autoFocus
          className="h-full w-full bg-background/80 px-1 outline-none"
          value={field.value}
          style={{
            color: field.color,
            fontFamily: getFontStack(field.fontFamily),
            fontWeight: previewFontWeight[field.fontWeight],
            fontSize,
            textAlign: field.alignment,
            lineHeight: field.lineHeight ?? 1.25,
            letterSpacing: field.letterSpacing
              ? `${field.letterSpacing}px`
              : "normal",
            opacity: field.opacity ?? 1,
            textTransform: field.textTransform ?? "none",
            fontStyle: field.fontStyle ?? "normal",
            textDecoration: field.textDecoration ?? "none",
          }}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onEditEnd}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        />
      ) : field.type === "image" ? (
        field.imageDataUrl ? (
          <div
            className="h-full w-full"
            style={{
              borderRadius: field.imageBorderRadius
                ? `${(field.imageBorderRadius / pageSize.height) * previewSize.height}px`
                : undefined,
              border:
                field.imageBorderWidth && field.imageBorderColor
                  ? `${(field.imageBorderWidth / pageSize.height) * previewSize.height}px solid ${field.imageBorderColor}`
                  : undefined,
              overflow: "hidden",
              boxShadow:
                field.shadowColor
                  ? `${field.shadowOffsetX ?? 2}px ${field.shadowOffsetY ?? 2}px 4px ${field.shadowColor}${Math.round(
                      (field.shadowOpacity ?? 0.5) * 255,
                    )
                      .toString(16)
                      .padStart(2, "0")}`
                  : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={field.imageDataUrl}
              alt={field.label}
              className="h-full w-full"
              draggable={false}
              style={{
                objectFit: field.objectFit ?? "contain",
                filter: [
                  field.imageGrayscale ? "grayscale(1)" : "",
                  field.imageBrightness !== undefined && field.imageBrightness !== 100
                    ? `brightness(${field.imageBrightness / 100})`
                    : "",
                  field.imageContrast !== undefined && field.imageContrast !== 100
                    ? `contrast(${field.imageContrast / 100})`
                    : "",
                  field.imageBlur ? `blur(${field.imageBlur}px)` : "",
                ]
                  .filter(Boolean)
                  .join(" ") || "none",
              }}
            />
          </div>
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith("image/")) {
                const isPng =
                  file.type === "image/png" ||
                  file.name.toLowerCase().endsWith(".png");
                
                // Helper to convert file to data url
                const reader = new FileReader();
                reader.onload = (re) => {
                   onImageChange({
                    imageDataUrl: re.target?.result as string,
                    imageMimeType: isPng ? "image/png" : "image/jpeg",
                    value: file.name,
                  });
                };
                reader.readAsDataURL(file);
              }
            }}
          >
            <ImageIcon className="size-4 opacity-50" />
            <span className="font-medium opacity-70">Drop Image Here</span>
          </div>
        )
      ) : field.type === "shape" ? (
        <div
          className="h-full w-full"
          style={{
            backgroundColor:
              field.shapeType === "line"
                ? field.strokeColor
                : field.fillColor,
            borderStyle:
              field.strokeWidth &&
              field.strokeColor &&
              field.shapeType !== "line"
                ? "solid"
                : undefined,
            borderWidth:
              field.strokeWidth &&
              field.strokeColor &&
              field.shapeType !== "line"
                ? `${(field.strokeWidth / pageSize.height) * previewSize.height}px`
                : undefined,
            borderColor:
              field.strokeWidth &&
              field.strokeColor &&
              field.shapeType !== "line"
                ? field.strokeColor
                : undefined,
            borderRadius:
              field.shapeType === "circle"
                ? "50%"
                : `${((field.borderRadius ?? 0) / pageSize.height) * previewSize.height}px`,
            height:
              field.shapeType === "line"
                ? `${((field.strokeWidth ?? 2) / pageSize.height) * previewSize.height}px`
                : "100%",
          }}
        />
      ) : (
        <span
          className="block"
          style={{
            fontFamily: getFontStack(field.fontFamily),
            fontWeight: previewFontWeight[field.fontWeight],
            fontSize,
            textAlign: field.alignment,
            lineHeight: field.lineHeight ?? 1.25,
            letterSpacing: field.letterSpacing
              ? `${field.letterSpacing}px`
              : "normal",
            opacity: field.opacity ?? 1,
            textTransform: field.textTransform ?? "none",
            fontStyle: field.fontStyle ?? "normal",
            textDecoration: field.textDecoration ?? "none",
          }}
        >
          {field.value || field.label}
        </span>
      )}
      {selected && !field.locked ? (
        <>
          <div className="absolute -top-7 left-0 z-50 flex h-6 w-max whitespace-nowrap items-center gap-2 rounded-full bg-popover px-2.5 py-1 text-[10px] font-bold font-sans text-popover-foreground shadow-sm ring-1 ring-border transition-all duration-300">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
              W
            </span>
            <span className="tabular-nums">{Math.round(field.width)}</span>
            <div className="mx-0.5 h-2 w-px bg-border" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
              H
            </span>
            <span className="tabular-nums">{Math.round(field.height)}</span>
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 size-3 cursor-se-resize rounded-sm border border-background bg-primary shadow-sm"
            onPointerDown={handleResizePointerDown}
          />
        </>
      ) : null}

      {/* Visual Guidelines */}
      {dragging && activeGuides.x !== undefined && (
        <div
          className="pointer-events-none absolute z-50 border-l border-primary/50"
          style={{
            left: (activeGuides.x / pageSize.width) * previewSize.width - left,
            top: -top,
            height: previewSize.height,
            width: 0,
          }}
        />
      )}
      {dragging && activeGuides.y !== undefined && (
        <div
          className="pointer-events-none absolute z-50 border-t border-primary/50"
          style={{
            left: -left,
            top:
              ((pageSize.height - activeGuides.y) / pageSize.height) *
                previewSize.height -
              top,
            width: previewSize.width,
            height: 0,
          }}
        />
      )}
    </button>
  );
}
