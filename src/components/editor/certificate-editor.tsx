"use client";

import { PDFDocument, rgb } from "pdf-lib";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus,
  FileUp,
  FolderOpen,
  GripVertical,
  ImageIcon,
  Lock,
  Minus,
  MonitorOff,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Pencil,
  Trash2,
  Unlock,
  Moon,
  Sun,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  Undo,
  Redo,
  Shapes,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Square,
  Circle,
  RotateCw,
  Info,
  Star,
  Clock,
  Heart,
} from "lucide-react";
import Papa from "papaparse";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { GoogleFontSelect } from "./google-font-select";
import { LayersSidebar } from "./layers-sidebar";
import { BareNumberInput } from "./number-input";
import { PreviewField } from "./preview-field";
import { PropertiesSidebar } from "./properties-sidebar";
import { generateCertificatePdf } from "@/lib/pdf/generate-certificate";
import type {
  CertificateField,
  CertificateFieldAlignment,
  CertificateFieldFont,
  CertificateFieldFontWeight,
  PdfPageSize,
  BulkRow,
} from "@/types/certificate-field";
import {
  certificateFonts,
  getFontStack,
  addRecentFont,
  getRecentFonts,
  getFavoriteFonts,
  toggleFavoriteFont,
  failedFonts,
  useGoogleFontLoader,
  googleCertificateFontSet,
} from "@/lib/fonts";

const defaultField: Omit<CertificateField, "id" | "label"> = {
  type: "text",
  value: "Contoh Teks",
  x: 160,
  y: 330,
  width: 280,
  height: 36,
  fontSize: 24,
  fontFamily: "Playfair Display",
  fontWeight: "regular",
  color: "#111111",
  alignment: "center",
  visible: true,
  opacity: 1,
  rotate: 0,
  letterSpacing: 0,
  lineHeight: 1.25,
  textTransform: "none",
  shadowColor: "",
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  shadowOpacity: 0.5,
  fillColor: "#e2e8f0",
  strokeColor: "#64748b",
  strokeWidth: 1,
  borderRadius: 0,
};

type CanvasPreset = "a4" | "a5" | "f4" | "custom";
type CanvasOrientation = "portrait" | "landscape";
type CanvasUnit = "px" | "mm";
type BackgroundImage = {
  dataUrl: string;
  mimeType: "image/png" | "image/jpeg";
  fileName: string;
};

const canvasPresets: Record<CanvasPreset, { label: string; width: number; height: number }> = {
  a4: { label: "A4", width: 595.28, height: 841.89 },
  a5: { label: "A5", width: 419.53, height: 595.28 },
  f4: { label: "F4 / Folio", width: 595.28, height: 935.43 },
  custom: { label: "Custom", width: 0, height: 0 },
};

function mmToPdfPoints(value: number) {
  return (value / 25.4) * 72;
}

function canvasUnitToPdfPoints(value: number, unit: CanvasUnit) {
  const safeValue = Math.max(1, value);
  return unit === "mm" ? mmToPdfPoints(safeValue) : safeValue;
}

function hexToPdfRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value) || normalized.length !== 6) {
    return rgb(1, 1, 1);
  }

  return rgb(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  );
}

function getCanvasSize(
  preset: CanvasPreset,
  orientation: CanvasOrientation,
  customSize: { width: number; height: number; unit: CanvasUnit },
): PdfPageSize {
  const size =
    preset === "custom"
      ? {
          width: canvasUnitToPdfPoints(customSize.width, customSize.unit),
          height: canvasUnitToPdfPoints(customSize.height, customSize.unit),
        }
      : canvasPresets[preset];

  if (preset === "custom") {
    return size;
  }

  if (orientation === "landscape") {
    return { width: size.height, height: size.width };
  }

  return { width: size.width, height: size.height };
}

function createField(index: number): CertificateField {
  return {
    ...defaultField,
    id: crypto.randomUUID(),
    label: `Text ${index}`,
  };
}

function createShapeField(
  index: number,
  shapeType: "rectangle" | "circle" | "line",
): CertificateField {
  const label = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
  return {
    ...defaultField,
    type: "shape",
    id: crypto.randomUUID(),
    label: `${label} ${index}`,
    shapeType,
    width: shapeType === "line" ? 200 : 100,
    height: shapeType === "line" ? 2 : 100,
    fillColor: shapeType === "line" ? "" : "#e2e8f0",
    strokeColor: "#64748b",
    strokeWidth: shapeType === "line" ? 2 : 1,
  };
}

function createImageField(index: number): CertificateField {
  return {
    ...defaultField,
    type: "image",
    id: crypto.randomUUID(),
    label: `Image ${index}`,
    value: "",
    width: 160,
    height: 70,
  };
}

function createBackgroundImageField(
  image: BackgroundImage,
  size: PdfPageSize,
): CertificateField {
  return {
    ...defaultField,
    type: "image",
    id: crypto.randomUUID(),
    label: "Background Image",
    value: image.fileName,
    imageDataUrl: image.dataUrl,
    imageMimeType: image.mimeType,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    opacity: 1,
    rotate: 0,
    objectFit: "fill",
    isBackground: true,
  };
}

function normalizeLayerOrder(fields: CertificateField[]) {
  const regularFields = fields.filter((field) => !field.isBackground);
  const backgroundFields = fields.filter((field) => field.isBackground);
  return [...regularFields, ...backgroundFields];
}

function getFieldsForRendering(fields: CertificateField[]) {
  return normalizeLayerOrder(fields).slice().reverse();
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const pdfBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  let binary = "";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function detectImageMimeType(bytes: ArrayBuffer | Uint8Array) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const isPng =
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a;
  const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;

  if (isPng) {
    return "image/png";
  }

  if (isJpeg) {
    return "image/jpeg";
  }

  return null;
}

function normalizeFilenameTemplate(value: string) {
  return value.replace(/\.(pdf|jpg|jpeg|png)$/i, "");
}

// IndexedDB Helpers for PDF Persistence
const DB_NAME = "CertGenDB";
const STORE_NAME = "templates";

async function initDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveTemplateToDB(bytes: ArrayBuffer, fileName: string) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ bytes, fileName, updatedAt: Date.now() }, "current");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function loadTemplateFromDB() {
  const db = await initDB();
  return new Promise<{ bytes: ArrayBuffer; fileName: string } | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("current");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    },
  );
}

async function clearTemplateFromDB() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete("current");
}

type SaveFilePickerHandle = {
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};
type SaveFilePickerWindow = Window & {
  showSaveFilePicker: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFilePickerHandle>;
};

export function CertificateEditor() {
  const [fileName, setFileName] = useState<string>("");
  const [templateBytes, setTemplateBytes] = useState<Uint8Array | null>(null);

  // History State
  const [past, setPast] = useState<CertificateField[][]>([]);
  const [future, setFuture] = useState<CertificateField[][]>([]);
  const [pageSize, setPageSize] = useState<PdfPageSize | null>(null);
  const [previewSize, setPreviewSize] = useState<PdfPageSize | null>(null);
  const [fields, setFields] = useState<CertificateField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [isGenerating, setIsGenerating] = useState<"pdf" | "jpg" | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [isPdfDragOver, setIsPdfDragOver] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState(0);
  const [filenameTemplate, setFilenameTemplate] = useState(
    "certificate-{row}",
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBlankProjectDialogOpen, setIsBlankProjectDialogOpen] =
    useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [blankCanvasPreset, setBlankCanvasPreset] =
    useState<CanvasPreset>("a4");
  const [blankCanvasOrientation, setBlankCanvasOrientation] =
    useState<CanvasOrientation>("landscape");
  const [customCanvasWidth, setCustomCanvasWidth] = useState(595);
  const [customCanvasHeight, setCustomCanvasHeight] = useState(842);
  const [customCanvasUnit, setCustomCanvasUnit] = useState<CanvasUnit>("px");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(
    null,
  );
  const [isTooSmall, setIsTooSmall] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [layersSidebarWidth, setLayersSidebarWidth] = useState(280);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  // Load state on mount
  useEffect(() => {
    async function loadState() {
      try {
        // Load configurations
        const savedState = localStorage.getItem("certgen-config");
        if (savedState) {
          const {
            fields: f,
            filenameTemplate: ft,
            bulkRows: br,
          } = JSON.parse(savedState);
          setFields(normalizeLayerOrder(f));
          setFilenameTemplate(normalizeFilenameTemplate(ft));
          setBulkRows(br);
          if (f[0]) setSelectedFieldId(f[0].id);
        }

        // Load PDF from IndexedDB
        const savedPdf = await loadTemplateFromDB();
        if (savedPdf) {
          setFileName(savedPdf.fileName);
          setTemplateBytes(new Uint8Array(savedPdf.bytes));
        }
      } catch (error) {
        console.error("Failed to load state:", error);
      } finally {
        setIsLoaded(true);
      }
    }

    const checkSize = () => {
      setViewportWidth(window.innerWidth);
      setIsTooSmall(window.innerWidth < 1200);
    };

    checkSize();
    window.addEventListener("resize", checkSize);
    void loadState();

    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Auto-save configurations
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(
      "certgen-config",
      JSON.stringify({ fields, filenameTemplate, bulkRows }),
    );
  }, [fields, filenameTemplate, bulkRows, isLoaded]);

  // Render PDF to canvas when template or zoom changes
  useEffect(() => {
    if (!templateBytes || !canvasRef.current || !isLoaded || isTooSmall) return;

    let cancelled = false;
    const sourceBytes = templateBytes.slice(0);

    async function renderPdf() {
      setIsRendering(true);
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const loadingTask = pdfjs.getDocument({ data: sourceBytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const containerWidth = Math.max(240, window.innerWidth - 390 - 160);
      const containerHeight = Math.max(240, window.innerHeight - 160);
      const widthScale = containerWidth / baseViewport.width;
      const heightScale = containerHeight / baseViewport.height;
      const scale = Math.min(widthScale, heightScale) * 0.9; // Scale down to 90% of the container for breathing room
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;

      if (!canvas || cancelled) {
        return;
      }

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      if (!cancelled) {
        setPageSize({ width: baseViewport.width, height: baseViewport.height });
        setPreviewSize({ width: viewport.width, height: viewport.height });
        setIsRendering(false);
      }
    }

    renderPdf().catch(() => setIsRendering(false));

    return () => {
      cancelled = true;
    };
  }, [templateBytes, viewportWidth, isLoaded, isTooSmall]);

  function saveHistory() {
    setPast((prev) => {
      const next = [fields, ...prev];
      return next.slice(0, 50); // Limit to 50 steps
    });
    setFuture([]);
  }

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[0];
    const newPast = past.slice(1);
    setFuture((prev) => [fields, ...prev]);
    setPast(newPast);
    setFields(previous);
  }, [fields, past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast((prev) => [fields, ...prev]);
    setFuture(newFuture);
    setFields(next);
  }, [fields, future]);

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isZ = event.key.toLowerCase() === "z";
      const isY = event.key.toLowerCase() === "y";
      const isCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      if (isCmd && isZ) {
        event.preventDefault();
        if (isShift) {
          redo();
        } else {
          undo();
        }
      } else if (isCmd && isY) {
        event.preventDefault();
        redo();
      } else if (isCmd && (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_" || event.key === "0")) {
        // Disable browser zoom shortcuts
        event.preventDefault();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedFieldId) {
        // Only delete if not typing in an input or textarea
        const activeElement = document.activeElement;
        const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
        
        if (!isTyping) {
          event.preventDefault();
          removeField(selectedFieldId);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    // Disable Ctrl + Wheel zoom
    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [undo, redo]);

  function addField() {
    saveHistory();
    const next = createField(fields.length + 1);
    setFields((current) => normalizeLayerOrder([next, ...current]));
    setSelectedFieldId(next.id);
  }

  function addImageField() {
    saveHistory();
    const next = createImageField(fields.length + 1);
    setFields((current) => normalizeLayerOrder([next, ...current]));
    setSelectedFieldId(next.id);
  }

  function addShapeField(shapeType: "rectangle" | "circle" | "line") {
    saveHistory();
    const next = createShapeField(fields.length + 1, shapeType);
    setFields((current) => normalizeLayerOrder([next, ...current]));
    setSelectedFieldId(next.id);
  }

  function removeField(id: string) {
    saveHistory();
    setFields((current) => {
      const next = current.filter((field) => field.id !== id);
      return normalizeLayerOrder(next);
    });
    setSelectedFieldId("");
  }

  function duplicateField(id: string) {
    saveHistory();
    const field = fields.find((f) => f.id === id);
    if (field && !field.isBackground) {
      const next = {
        ...field,
        id: crypto.randomUUID(),
        label: `${field.label} (Copy)`,
        x: field.x + 20,
        y: field.y - 20,
      };
      setFields((current) => normalizeLayerOrder([next, ...current]));
      setSelectedFieldId(next.id);
    }
  }

  function reorderField(draggedId: string, targetId: string) {
    if (draggedId === targetId) {
      return;
    }

    const draggedField = fields.find((field) => field.id === draggedId);
    const targetField = fields.find((field) => field.id === targetId);

    if (draggedField?.isBackground || targetField?.isBackground) {
      return;
    }

    const draggedIndex = fields.findIndex((field) => field.id === draggedId);
    const targetIndex = fields.findIndex((field) => field.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    saveHistory();
    setFields((current) => {
      const next = current.slice();
      const [draggedField] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedField);
      return normalizeLayerOrder(next);
    });
  }

  function moveFieldLayer(
    id: string,
    direction: "front" | "back" | "up" | "down",
  ) {
    const index = fields.findIndex((field) => field.id === id);

    if (index === -1) {
      return;
    }

    if (fields[index].isBackground) {
      return;
    }

    let targetIndex = index;
    if (direction === "front") {
      targetIndex = 0;
    } else if (direction === "back") {
      targetIndex = fields.length - 1;
    } else if (direction === "up") {
      targetIndex = Math.max(0, index - 1);
    } else {
      targetIndex = Math.min(fields.length - 1, index + 1);
    }

    if (targetIndex === index) {
      return;
    }

    saveHistory();
    setFields((current) => {
      const next = current.slice();
      const [field] = next.splice(index, 1);
      next.splice(targetIndex, 0, field);
      return normalizeLayerOrder(next);
    });
  }

  function updateField(id: string, patch: Partial<CertificateField>) {
    setFields((current) =>
      normalizeLayerOrder(
        current.map((field) =>
          field.id === id ? { ...field, ...patch } : field,
        ),
      ),
    );
  }

  function openBackgroundDialog() {
    const existingBackground = fields.find(
      (field) =>
        field.isBackground && field.imageDataUrl && field.imageMimeType,
    );

    if (existingBackground?.imageDataUrl && existingBackground.imageMimeType) {
      setBackgroundImage({
        dataUrl: existingBackground.imageDataUrl,
        mimeType: existingBackground.imageMimeType,
        fileName: existingBackground.value || existingBackground.label,
      });
    } else {
      setBackgroundImage(null);
    }

    setIsBackgroundDialogOpen(true);
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(
      await file.arrayBuffer(),
    );
    let finalFileName = file.name;

    // If image, convert to PDF
    if (file.type.startsWith("image/") || file.name.match(/\.(png|jpe?g)$/i)) {
      try {
        const pdfDoc = await PDFDocument.create();
        const image =
          file.type === "image/png"
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
        bytes = await pdfDoc.save();
        finalFileName = finalFileName.replace(/\.(png|jpe?g)$/i, ".pdf");
        if (!finalFileName.endsWith(".pdf")) finalFileName += ".pdf";
        toast.success("Image converted to PDF.");
      } catch (error) {
        console.error("Image to PDF conversion error:", error);
        toast.error("Failed to convert image to PDF.");
        return;
      }
    }

    setFileName(finalFileName);
    setTemplateBytes(bytes);
    void saveTemplateToDB(uint8ArrayToArrayBuffer(bytes), finalFileName);
  }

  async function exportProject() {
    const projectData = {
      version: "1.1",
      fileName,
      fields,
      filenameTemplate,
      bulkRows,
      pdfBase64: templateBytes ? arrayBufferToBase64(templateBytes) : null,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(projectData, null, 2);

    // Try to use File System Access API for "Save As" functionality
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (
          window as SaveFilePickerWindow
        ).showSaveFilePicker({
          suggestedName: `certgen-project-${fileName?.replace(".pdf", "") || "new"}.json`,
          types: [
            {
              description: "CertGen Project File",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err: unknown) {
        // If user cancels, we just exit
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn(
          "File System Access API failed, falling back to download:",
          err,
        );
      }
    }

    // Fallback: standard download
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(
      blob,
      `certgen-project-${fileName?.replace(".pdf", "") || "new"}.json`,
    );
  }

  async function importProjectFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (data.fields) setFields(normalizeLayerOrder(data.fields));
      if (data.filenameTemplate) {
        setFilenameTemplate(normalizeFilenameTemplate(data.filenameTemplate));
      }
      if (data.bulkRows) setBulkRows(data.bulkRows);
      setFileName(data.fileName || "");

      // Restore PDF if included in project file
      if (data.pdfBase64) {
        const bytes = base64ToArrayBuffer(data.pdfBase64);
        setTemplateBytes(new Uint8Array(bytes));
        void saveTemplateToDB(bytes, data.fileName || "project.pdf");
      } else {
        setTemplateBytes(null);
        setPageSize(null);
        setPreviewSize(null);
        void clearTemplateFromDB();
      }

      setSelectedFieldId(data.fields?.[0]?.id || "");
      toast.success("Project loaded.");
    } catch (err) {
      console.error("Import error:", err);
      toast.error(
        "Failed to load project file. Check that the file format is valid.",
      );
    }
  }

  function importProject(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void importProjectFile(file);
    }
    event.target.value = ""; // Reset input
  }

  async function handleBackgroundImage(file: File | null) {
    if (!file) {
      return;
    }

    const bytes = await file.arrayBuffer();
    const mimeType = detectImageMimeType(bytes);

    if (!mimeType) {
      toast.error("Use a PNG or JPG image for the background.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(new Blob([bytes], { type: mimeType }));
    });

    setBackgroundImage({
      dataUrl,
      mimeType,
      fileName: file.name,
    });
  }

  async function createBackgroundPdf(size: PdfPageSize, color = backgroundColor) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([size.width, size.height]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      color: hexToPdfRgb(color),
    });

    return pdfDoc.save();
  }

  function upsertBackgroundImageLayer(size: PdfPageSize) {
    if (!backgroundImage) {
      setFields((current) =>
        normalizeLayerOrder(current.filter((field) => !field.isBackground)),
      );
      return "";
    }

    const existingBackground = fields.find((field) => field.isBackground);
    const nextBackground = existingBackground
      ? {
          ...existingBackground,
          value: backgroundImage.fileName,
          imageDataUrl: backgroundImage.dataUrl,
          imageMimeType: backgroundImage.mimeType,
          width: existingBackground.width || size.width,
          height: existingBackground.height || size.height,
          visible: true,
          isBackground: true,
        }
      : createBackgroundImageField(backgroundImage, size);

    setFields((current) =>
      normalizeLayerOrder([
        nextBackground,
        ...current.filter((field) => field.id !== nextBackground.id),
      ]),
    );

    return nextBackground.id;
  }

  async function applyBackgroundToCurrentProject() {
    if (!pageSize) {
      return;
    }

    try {
      saveHistory();
      const bytes = await createBackgroundPdf(pageSize);
      const buffer = uint8ArrayToArrayBuffer(bytes);
      const backgroundFieldId = upsertBackgroundImageLayer(pageSize);
      setTemplateBytes(bytes);
      setPageSize(null);
      setPreviewSize(null);
      if (backgroundFieldId) {
        setSelectedFieldId(backgroundFieldId);
      }
      await saveTemplateToDB(buffer, fileName || "background.pdf");
      setIsBackgroundDialogOpen(false);
      toast.success("Background updated.");
    } catch (error) {
      console.error("Background update error:", error);
      toast.error("Failed to update background. Use a valid PNG or JPG image.");
    }
  }

  async function createBlankProject() {
    try {
      const size = getCanvasSize(blankCanvasPreset, blankCanvasOrientation, {
        width: customCanvasWidth,
        height: customCanvasHeight,
        unit: customCanvasUnit,
      });
      const bytes = await createBackgroundPdf(size, "#ffffff");
      const blankBuffer = uint8ArrayToArrayBuffer(bytes);
      const nextFileName = `blank-${blankCanvasPreset}-${blankCanvasOrientation}.pdf`;

      localStorage.removeItem("certgen-config");
      setPast([]);
      setFuture([]);
      setFields([]);
      setSelectedFieldId("");
      setBulkRows([]);
      setBulkPreviewIndex(0);
      setFilenameTemplate("certificate-{row}");
      setFileName(nextFileName);
      setTemplateBytes(bytes);
      setPageSize(null);
      setPreviewSize(null);
      resetCanvasView();
      await saveTemplateToDB(blankBuffer, nextFileName);
      setIsBlankProjectDialogOpen(false);
      toast.success("Blank project created.");
    } catch (error) {
      console.error("Blank project background error:", error);
      toast.error("Failed to create project. Use a valid PNG or JPG image.");
    }
  }

  function returnToStartPage() {
    localStorage.removeItem("certgen-config");
    void clearTemplateFromDB();
    setPast([]);
    setFuture([]);
    setFileName("");
    setTemplateBytes(null);
    setPageSize(null);
    setPreviewSize(null);
    setFields([]);
    setSelectedFieldId("");
    setBulkRows([]);
    setBulkPreviewIndex(0);
    setFilenameTemplate("certificate-{row}");
    setEditingFieldId(null);
    setDraggingFieldId(null);
    resetCanvasView();
    setIsNewProjectDialogOpen(false);
    toast.message("Ready for a new project.");
  }

  async function generatePdf() {
    if (!templateBytes) {
      return;
    }

    setIsGenerating("pdf");
    const bytes = await generateCertificatePdf(
      templateBytes.slice(0),
      getFieldsForRendering(fields),
    );
    const safeName = fileName.replace(/\.pdf$/i, "") || "certificate";
    downloadBytes(bytes, `${safeName}-generated.pdf`);
    setIsGenerating(null);
  }

  async function printPdf() {
    if (!templateBytes) {
      return;
    }

    setIsGenerating("pdf");

    try {
      const bytes = await generateCertificatePdf(
        templateBytes.slice(0),
        getFieldsForRendering(fields),
      );
      const pdfBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");

      if (!printWindow) {
        URL.revokeObjectURL(url);
        toast.error("Allow pop-ups to print the certificate.");
        return;
      }

      printWindow.addEventListener(
        "load",
        () => {
          printWindow.focus();
          printWindow.print();
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        { once: true },
      );
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to prepare the certificate for printing.");
    } finally {
      setIsGenerating(null);
    }
  }

  async function generateJpg() {
    if (!templateBytes) return;
    setIsGenerating("jpg");

    try {
      // 1. Generate the final PDF with fields
      const pdfBytes = await generateCertificatePdf(
        templateBytes.slice(0),
        getFieldsForRendering(fields),
      );

      // 2. Load the generated PDF with pdfjs
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const loadingTask = pdfjs.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      // 3. Render at high scale (e.g. 2.0) for better quality
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Could not get canvas context");

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      // 4. Convert to JPG and download
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const safeName = fileName.replace(/\.pdf$/i, "") || "certificate";
      link.href = dataUrl;
      link.download = `${safeName}.jpg`;
      link.click();

      toast.success("JPG downloaded.");
    } catch (error) {
      console.error("JPG generation error:", error);
      toast.error("Failed to create JPG.");
    } finally {
      setIsGenerating(null);
    }
  }

  function applyBulkRow(row: BulkRow) {
    return fields.map((field) => {
      if (field.type !== "text") {
        return field;
      }

      return {
        ...field,
        value: row[field.label] ?? field.value,
      };
    });
  }

  function getBulkPreviewFields() {
    const row = bulkRows[bulkPreviewIndex];
    return row ? applyBulkRow(row) : fields;
  }

  const previewFields = getFieldsForRendering(getBulkPreviewFields());

  function buildBulkFilename(row: BulkRow, rowIndex: number) {
    const missingFilenameHeader = Array.from(
      normalizeFilenameTemplate(filenameTemplate).matchAll(/\{([^{}]+)\}/g),
    )
      .map((match) => match[1].trim())
      .find((header) => header && header !== "row" && !(header in row));

    if (missingFilenameHeader) {
      throw new Error(`Missing filename header: ${missingFilenameHeader}`);
    }

    const name = normalizeFilenameTemplate(filenameTemplate).replace(
      /\{row\}/g,
      String(rowIndex + 1),
    );
    const filled = Object.entries(row).reduce(
      (current, [key, value]) => current.replaceAll(`{${key}}`, value),
      name,
    );
    const safe = filled
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    // Strip extension if user accidentally typed it
    return safe.replace(/\.(pdf|jpg|jpeg|png)$/i, "") || `certificate-${rowIndex + 1}`;
  }

  async function generateBulkZip(type: "pdf" | "jpg" = "pdf") {
    if (!templateBytes || !bulkRows.length) {
      return;
    }

    setIsGenerating(type);
    const zip = new JSZip();

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      for (const [index, row] of bulkRows.entries()) {
        const fieldsForRow = applyBulkRow(row);
        const pdfBytes = await generateCertificatePdf(
          templateBytes.slice(0),
          getFieldsForRendering(fieldsForRow),
        );
        const filename = buildBulkFilename(row, index);

        if (type === "pdf") {
          zip.file(`${filename}.pdf`, pdfBytes);
        } else {
          // Convert to JPG
          const loadingTask = pdfjs.getDocument({ data: pdfBytes });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (context) {
            await page.render({ canvas, canvasContext: context, viewport })
              .promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const base64Data = dataUrl.split(",")[1];
            zip.file(`${filename}.jpg`, base64Data, {
              base64: true,
            });
          }
        }
      }

      downloadBlob(
        await zip.generateAsync({ type: "blob" }),
        `certgen-bulk-${type}.zip`,
      );
      toast.success(`Bulk ${type.toUpperCase()} created.`);
    } catch (error) {
      console.error("Bulk generation error:", error);
      toast.error(`Failed to create bulk ${type.toUpperCase()}.`);
    } finally {
      setIsGenerating(null);
    }
  }

  function zoomCanvas(delta: number) {
    setCanvasZoom((current) => {
      const nextZoom = Math.min(3, Math.max(0.4, current + delta));
      return Number(nextZoom.toFixed(2));
    });
  }

  function handleWorkspacePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button === 1) {
      handleCanvasPanStart(event);
      return;
    }

    if (event.button === 0 && (event.target === event.currentTarget || (canvasRef.current && event.target === canvasRef.current))) {
      setSelectedFieldId("");
    }
  }

  function handleCanvasPanStart(event: React.PointerEvent<HTMLElement>) {
    if (!templateBytes || event.button !== 1) {
      return;
    }

    event.preventDefault();
    setIsCanvasPanning(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = canvasPan;

    function handlePointerMove(moveEvent: PointerEvent) {
      setCanvasPan({
        x: startPan.x + moveEvent.clientX - startX,
        y: startPan.y + moveEvent.clientY - startY,
      });
    }

    function handlePointerUp() {
      setIsCanvasPanning(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function resetCanvasView() {
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsPdfDragOver(false);
    const file = event.dataTransfer.files[0];

    if (
      file?.type === "application/json" ||
      file?.name.toLowerCase().endsWith(".json")
    ) {
      void importProjectFile(file);
      return;
    }

    if (
      file?.type === "application/pdf" ||
      file?.type.startsWith("image/") ||
      file?.name.toLowerCase().match(/\.(pdf|png|jpe?g)$/)
    ) {
      void handleFile(file);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();

    if (!templateBytes) {
      setIsPdfDragOver(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsPdfDragOver(false);
    }
  }

  const canPreviewFields = Boolean(pageSize && previewSize);
  useGoogleFontLoader(fields.map((field) => field.fontFamily));

  function handleSidebarResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = layersSidebarWidth;

    function onMouseMove(moveEvent: MouseEvent) {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(200, startWidth + deltaX), 600);
      setLayersSidebarWidth(newWidth);
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isLoaded) {
    return <div className="h-dvh bg-background" />;
  }

  // Handle responsive limitation
  if (isTooSmall) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-background p-8 text-center text-foreground">
        <div className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-muted text-muted-foreground shadow-sm">
          <MonitorOff className="size-12" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Screen Too Small</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          CertGen requires a minimum screen width of <strong>1200px</strong> for
          an optimal editing experience. Use a desktop device or make your
          browser window wider.
        </p>
        <div className="mt-10 h-1 w-24 rounded-full bg-border" />
      </div>
    );
  }

  return (
    <main
      className="h-dvh overflow-hidden bg-background text-foreground transition-colors duration-300"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative flex h-full min-h-0 flex-col">


        <input
          ref={projectInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={importProject}
        />

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div
          className="flex min-h-0 flex-1 overflow-hidden"
        >
          {templateBytes ? (
            <>
              <div style={{ width: layersSidebarWidth }} className="shrink-0 h-full">
                <LayersSidebar
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onAddField={addField}
                  onAddImageField={addImageField}
                  onAddShapeField={addShapeField}
                  onReorderField={reorderField}
                  onSelectField={setSelectedFieldId}
                  onUpdateField={updateField}
                  onDuplicateField={duplicateField}
                  onRemoveField={removeField}
                  onMoveLayer={moveFieldLayer}
                />
              </div>
              <div
                className="relative z-50 w-px cursor-col-resize bg-border transition-colors"
                onMouseDown={handleSidebarResize}
              >
                <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
              </div>
            </>
          ) : null}

          <section
            className={cn(
              "relative flex-1 overflow-hidden p-12 bg-muted/20",
              isCanvasPanning ? "cursor-grabbing" : "cursor-default",
            )}
            onPointerDown={handleWorkspacePointerDown}
            onAuxClick={(event) => event.preventDefault()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {templateBytes ? (
              <>
                <div className="absolute left-4 top-4 z-50">
                  <Menubar className="bg-background/80 backdrop-blur-md">
                    <MenubarMenu>
                      <MenubarTrigger>File</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem onClick={() => setIsNewProjectDialogOpen(true)}>
                          <FilePlus className="size-3 text-muted-foreground" />
                          New Project
                        </MenubarItem>
                        <MenubarItem onClick={() => projectInputRef.current?.click()}>
                          <FolderOpen className="size-3 text-muted-foreground" />
                          Open Project
                        </MenubarItem>
                        <MenubarItem
                          onClick={() => pdfInputRef.current?.click()}
                          disabled={!templateBytes}
                        >
                          <FileUp className="size-3 text-muted-foreground" />
                          Change PDF / Image
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem
                          onClick={exportProject}
                          disabled={!templateBytes}
                        >
                          <Save className="size-3 text-muted-foreground" />
                          Save Project
                        </MenubarItem>
                        <MenubarItem
                          onClick={printPdf}
                          disabled={!templateBytes || !!isGenerating}
                        >
                          <Printer className="size-3 text-muted-foreground" />
                          Print
                        </MenubarItem>
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <Download className="size-3 text-muted-foreground" />
                            Download
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem
                              onClick={generatePdf}
                              disabled={!templateBytes || !!isGenerating}
                            >
                              <FileText className="size-3 text-muted-foreground" />
                              PDF
                            </MenubarItem>
                            <MenubarItem
                              onClick={generateJpg}
                              disabled={!templateBytes || !!isGenerating}
                            >
                              <ImageIcon className="size-3 text-muted-foreground" />
                              JPG
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                      </MenubarContent>
                    </MenubarMenu>

                    <MenubarMenu>
                      <MenubarTrigger>Edit</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem onClick={undo} disabled={past.length === 0}>
                          <Undo className="size-3 text-muted-foreground" />
                          Undo
                          <MenubarShortcut>⌘Z</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem onClick={redo} disabled={future.length === 0}>
                          <Redo className="size-3 text-muted-foreground" />
                          Redo
                          <MenubarShortcut>⌘⇧Z</MenubarShortcut>
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem
                          onClick={() => duplicateField(selectedFieldId)}
                          disabled={
                            !selectedFieldId ||
                            fields.find((field) => field.id === selectedFieldId)
                              ?.isBackground
                          }
                        >
                          <Copy className="size-3 text-muted-foreground" />
                          Duplicate
                        </MenubarItem>
                        <MenubarItem
                          onClick={openBackgroundDialog}
                          disabled={!templateBytes}
                        >
                          <ImageIcon className="size-3 text-muted-foreground" />
                          Change Background
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>

                    <MenubarMenu>
                      <MenubarTrigger>View</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem
                          onClick={() =>
                            setTheme(theme === "dark" ? "light" : "dark")
                          }
                        >
                          {theme === "dark" ? (
                            <Sun className="size-3 text-muted-foreground" />
                          ) : (
                            <Moon className="size-3 text-muted-foreground" />
                          )}
                          {theme === "dark"
                            ? "Switch to Light Mode"
                            : "Switch to Dark Mode"}
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem onClick={resetCanvasView}>
                          <RotateCcw className="size-3 text-muted-foreground" />
                          Reset Zoom
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>

                    <MenubarMenu>
                      <MenubarTrigger>Help</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem onClick={() => setIsAboutDialogOpen(true)}>
                          <Info className="size-3 text-muted-foreground" />
                          About CertGen
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                </div>

                <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-md border bg-background/80 backdrop-blur-md px-1 py-0.5 text-[10px] font-medium transition-colors duration-300">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Zoom out"
                        onClick={() => zoomCanvas(-0.1)}
                      >
                        <Minus className="size-3 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">Zoom out</TooltipContent>
                </Tooltip>

                <span className="min-w-8 text-center">
                  {Math.round(canvasZoom * 100)}%
                </span>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Zoom in"
                        onClick={() => zoomCanvas(0.1)}
                      >
                        <Plus className="size-3 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">Zoom in</TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : null}
            <div 
              className="flex h-full min-h-full items-center justify-center"
              onPointerDown={handleWorkspacePointerDown}
            >
              <div
                className="relative rounded-lg border bg-background shadow-2xl transition-colors duration-300 overflow-hidden"
                onPointerDown={handleWorkspacePointerDown}
                style={{
                  transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                  transformOrigin: "center center",
                }}
              >
                {!templateBytes ? (
                  <div
                    className={cn(
                      "flex h-[560px] w-[860px] max-w-full flex-col items-center justify-center gap-8 rounded-xl border-2 border-dashed transition-all duration-300",
                      isPdfDragOver
                        ? "border-primary bg-primary/5 ring-4 ring-primary/5"
                        : "border-muted-foreground/20 bg-muted/30 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <div className="mb-8 flex flex-col items-center">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                          CertGen
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                          Efficient bulk PDF certificate tools
                        </p>
                      </div>

                      <div className="relative z-20 flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="pdf-upload-empty"
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "default",
                            }),
                            "",
                          )}
                        >
                          <FileUp className="size-4" />
                          Start with PDF / Image
                        </label>

                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => setIsBlankProjectDialogOpen(true)}
                        >
                          <FilePlus className="size-4" />
                          Blank Project
                        </Button>

                        <label
                          htmlFor="project-import-empty"
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "default",
                            }),
                            "",
                          )}
                        >
                          <FolderOpen className="size-4" />
                          Open Project
                        </label>
                      </div>

                      <input
                        id="pdf-upload-empty"
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        className="hidden"
                        onChange={(event) =>
                          handleFile(event.target.files?.[0] ?? null)
                        }
                      />
                      <input
                        id="project-import-empty"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={importProject}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <canvas ref={canvasRef} className="block rounded-md" />
                    {isRendering ? (
                      <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm backdrop-blur-sm transition-colors duration-300">
                        Rendering PDF
                      </div>
                    ) : null}
                    {canPreviewFields
                      ? previewFields.map((field) => (
                          <PreviewField
                            key={field.id}
                            field={field}
                            fields={fields}
                            pageSize={pageSize}
                            previewSize={previewSize}
                            canvasZoom={canvasZoom}
                            selected={field.id === selectedFieldId}
                            dragging={field.id === draggingFieldId}
                            editing={field.id === editingFieldId}
                            onSelect={() => setSelectedFieldId(field.id)}
                            onEditStart={() => {
                              saveHistory();
                              setSelectedFieldId(field.id);
                              setEditingFieldId(field.id);
                            }}
                            onEditEnd={() => setEditingFieldId(null)}
                            onDragStart={() => {
                              saveHistory();
                              setDraggingFieldId(field.id);
                            }}
                            onDragEnd={() => setDraggingFieldId(null)}
                            onResizeStart={() => saveHistory()}
                            onMove={(x, y) => updateField(field.id, { x, y })}
                            onValueChange={(value) =>
                              updateField(field.id, { value })
                            }
                            onImageChange={(patch) =>
                              updateField(field.id, patch)
                            }
                            onResize={(width, height) =>
                              updateField(field.id, { width, height })
                            }
                          />
                        ))
                      : null}
                  </div>
                )}
              </div>
            </div>
          </section>

          {templateBytes ? (
            <div className="w-[300px] shrink-0 h-full border-l">
              <PropertiesSidebar
                fields={fields}
                selectedFieldId={selectedFieldId}
                bulkRows={bulkRows}
                bulkPreviewIndex={bulkPreviewIndex}
                filenameTemplate={filenameTemplate}
                onUpdateField={updateField}
                onBulkRowsChange={(rows) => {
                  setBulkRows(rows);
                  setBulkPreviewIndex(0);
                }}
                onBulkPreviewIndexChange={setBulkPreviewIndex}
                onFilenameTemplateChange={(value) =>
                  setFilenameTemplate(normalizeFilenameTemplate(value))
                }
                onGenerateBulk={generateBulkZip}
                isGenerating={isGenerating}
              />
            </div>
          ) : null}
        </div>

        <Dialog
          open={isNewProjectDialogOpen}
          onOpenChange={setIsNewProjectDialogOpen}
        >
          <DialogContent className="w-[calc(100vw-2rem)] max-w-xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>Start a New Project?</DialogTitle>
              <DialogDescription>
                The current project will be closed and you will return to the
                start page. Save the project first if you still need it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsNewProjectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={returnToStartPage}>
                Yes, New Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isBlankProjectDialogOpen}
          onOpenChange={setIsBlankProjectDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Blank Project</DialogTitle>
              <DialogDescription>
                Start from a white canvas without a PDF or image template. The
                current project will be replaced.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Canvas Size
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(canvasPresets) as CanvasPreset[]).map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={cn(
                          "rounded-md border p-3 text-left transition-colors",
                          blankCanvasPreset === preset
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted/30 hover:bg-muted/50",
                        )}
                        onClick={() => setBlankCanvasPreset(preset)}
                      >
                        <span className="block text-sm font-semibold">
                          {canvasPresets[preset].label}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {preset === "custom"
                            ? `${customCanvasWidth} x ${customCanvasHeight} ${customCanvasUnit}`
                            : `${Math.round(canvasPresets[preset].width)} x ${Math.round(canvasPresets[preset].height)} px`}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {blankCanvasPreset === "custom" && (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px] items-end gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Width
                      </Label>
                      <BareNumberInput
                        min={1}
                        value={customCanvasWidth}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={setCustomCanvasWidth}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Height
                      </Label>
                      <BareNumberInput
                        min={1}
                        value={customCanvasHeight}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={setCustomCanvasHeight}
                      />
                    </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Unit
                    </Label>
                    <div className="grid h-9 grid-cols-2 gap-1 rounded-md bg-muted/40 p-1">
                      {(["px", "mm"] as CanvasUnit[]).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          className={cn(
                            "rounded px-2 text-xs font-medium uppercase transition-colors",
                            customCanvasUnit === unit
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => setCustomCanvasUnit(unit)}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {blankCanvasPreset !== "custom" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Orientation
                  </Label>
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-1">
                    {(["portrait", "landscape"] as CanvasOrientation[]).map(
                      (orientation) => (
                        <button
                          key={orientation}
                          type="button"
                          className={cn(
                            "rounded px-3 py-2 text-xs font-medium capitalize transition-colors",
                            blankCanvasOrientation === orientation
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => setBlankCanvasOrientation(orientation)}
                        >
                          {orientation}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

            </div>
            <DialogFooter className="mx-0 mb-0 flex flex-wrap gap-2 rounded-md border bg-muted/40 p-3 sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsBlankProjectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => void createBlankProject()}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isBackgroundDialogOpen}
          onOpenChange={setIsBackgroundDialogOpen}
        >
          <DialogContent className="!w-[calc(100vw-2rem)] !max-w-xl overflow-hidden">
            <DialogHeader className="min-w-0 pr-8">
              <DialogTitle>Change Background</DialogTitle>
              <DialogDescription className="break-words">
                Set the base color and add a PNG/JPG background image as a
                resizable layer. Existing layers stay in place.
              </DialogDescription>
            </DialogHeader>
            <div className="min-w-0 space-y-3 py-2">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-2">
                <Input
                  value={backgroundColor}
                  className="h-9 text-xs font-mono uppercase"
                  onChange={(event) => setBackgroundColor(event.target.value)}
                />
                <div className="relative h-9 overflow-hidden rounded-md border bg-background">
                  <Input
                    type="color"
                    value={backgroundColor}
                    className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                    onChange={(event) =>
                      setBackgroundColor(event.target.value)
                    }
                  />
                  <div className="h-full w-full" style={{ backgroundColor }} />
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label
                  htmlFor="active-background-upload"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 max-w-full cursor-pointer text-xs",
                  )}
                >
                  <ImageIcon className="size-3.5" />
                  <span className="truncate">Upload Background</span>
                </label>
                <input
                  id="active-background-upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) =>
                    void handleBackgroundImage(event.target.files?.[0] ?? null)
                  }
                />
                {backgroundImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setBackgroundImage(null)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>

              {backgroundImage ? (
                <div className="flex min-w-0 items-center gap-3 rounded-md border bg-muted/20 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={backgroundImage.dataUrl}
                    alt=""
                    className="h-14 w-20 rounded border object-cover"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="max-w-full truncate text-xs font-medium">
                      {backgroundImage.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      The image will fill the full canvas.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter className="mx-0 mb-0 flex flex-wrap gap-2 rounded-md border bg-muted/40 p-3 sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsBackgroundDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!pageSize}
                onClick={() => void applyBackgroundToCurrentProject()}
              >
                Apply Background
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>About CertGen</DialogTitle>
              <DialogDescription>
                CertGen is a powerful and efficient bulk PDF certificate generator.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 text-sm font-semibold">Features</h4>
                <ul className="list-inside list-disc text-xs space-y-1 text-muted-foreground">
                  <li>Visual PDF/Image template editor</li>
                  <li>Dynamic text, image, and shape layers</li>
                  <li>Bulk generation from CSV data</li>
                  <li>Real-time preview and snapping guides</li>
                  <li>Project save/load functionality</li>
                </ul>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-4">
                Version 1.0 &copy; 2026 masarisgk
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsAboutDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </main>
  );
}
