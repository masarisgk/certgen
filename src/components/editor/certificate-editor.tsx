"use client";

import { PDFDocument } from "pdf-lib";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Check,
  ChevronDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus,
  FileUp,
  FolderOpen,
  ImageIcon,
  Minus,
  MonitorOff,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  Moon,
  Sun,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText
} from "lucide-react";
import Papa from "papaparse";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { generateCertificatePdf } from "@/lib/pdf/generate-certificate";
import type {
  CertificateField,
  CertificateFieldAlignment,
  CertificateFieldFont,
  CertificateFieldFontWeight,
  PdfPageSize,
} from "@/types/certificate-field";

const previewFontFamily: Record<string, string> = {
};

const previewFontWeight: Record<CertificateFieldFontWeight, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

const certificateFontGroups = [
  {
    label: "Formal Serif",
    fonts: [
      "Playfair Display",
      "Merriweather",
      "Cormorant Garamond",
      "Libre Baskerville",
      "Lora",
      "Crimson Text",
      "EB Garamond",
      "Bitter",
    ],
  },
  {
    label: "Elegant Display",
    fonts: ["Cinzel", "Prata", "Bodoni Moda", "Marcellus", "Forum", "DM Serif Display"],
  },
  {
    label: "Signature Script",
    fonts: [
      "Great Vibes",
      "Dancing Script",
      "Allura",
      "Parisienne",
      "Sacramento",
      "Alex Brush",
    ],
  },
  {
    label: "Modern Sans",
    fonts: ["Montserrat", "Poppins", "Raleway", "Inter", "Open Sans", "Roboto"],
  },
];

const googleCertificateFonts = certificateFontGroups
  .flatMap((group) => group.fonts);
const googleCertificateFontSet = new Set(googleCertificateFonts);

function getFontStack(fontFamily: string) {
  return previewFontFamily[fontFamily] ?? `"${fontFamily}", Arial, Helvetica, sans-serif`;
}

function googleFontUrl(fontFamilies: string[]) {
  const families = Array.from(
    new Set(fontFamilies.filter((font) => googleCertificateFontSet.has(font))),
  );

  if (!families.length) {
    return "";
  }

  const query = families
    .map((font) => `family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;600;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

function useGoogleFontLoader(fontFamilies: string[]) {
  const [loadVersion, setLoadVersion] = useState(0);
  const fontKey = Array.from(
    new Set(fontFamilies.filter((font) => googleCertificateFontSet.has(font))),
  )
    .sort()
    .join("|");

  useEffect(() => {
    const fonts = fontKey ? fontKey.split("|") : [];
    const href = googleFontUrl(fonts);

    if (!href || document.querySelector(`link[href="${href}"]`)) {
      void Promise.all(
        fonts.map((font) => document.fonts?.load(`400 20px "${font}"`)),
      ).finally(() => setLoadVersion((version) => version + 1));
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      void Promise.all(
        fonts.map((font) => document.fonts?.load(`400 20px "${font}"`)),
      ).finally(() => setLoadVersion((version) => version + 1));
    };
    document.head.appendChild(link);
  }, [fontKey]);

  return loadVersion;
}

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
};

function createField(index: number): CertificateField {
  return {
    ...defaultField,
    id: crypto.randomUUID(),
    label: `Field ${index}`,
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

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
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

// IndexedDB Helpers for PDF Persistence
const DB_NAME = "CertGenDB";
const STORE_NAME = "templates";

async function initDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
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
  return new Promise<{ bytes: ArrayBuffer; fileName: string } | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("current");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearTemplateFromDB() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete("current");
}

type BulkRow = Record<string, string>;

export function CertificateEditor() {
  const [fileName, setFileName] = useState("");
  const [templateBytes, setTemplateBytes] = useState<ArrayBuffer | null>(null);
  const [pageSize, setPageSize] = useState<PdfPageSize | null>(null);
  const [previewSize, setPreviewSize] = useState<PdfPageSize | null>(null);
  const [fields, setFields] = useState<CertificateField[]>([createField(1)]);
  const [selectedFieldId, setSelectedFieldId] = useState(fields[0]?.id ?? "");
  const [isRendering, setIsRendering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [isPdfDragOver, setIsPdfDragOver] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState(0);
  const [filenameTemplate, setFilenameTemplate] = useState("sertifikat-{row}.pdf");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isTooSmall, setIsTooSmall] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? fields[0],
    [fields, selectedFieldId],
  );

  // Load state on mount
  useEffect(() => {
    async function loadState() {
      try {
        // Load configurations
        const savedState = localStorage.getItem("certgen-config");
        if (savedState) {
          const { fields: f, filenameTemplate: ft, bulkRows: br } = JSON.parse(savedState);
          setFields(f);
          setFilenameTemplate(ft);
          setBulkRows(br);
          if (f[0]) setSelectedFieldId(f[0].id);
        }

        // Load PDF from IndexedDB
        const savedPdf = await loadTemplateFromDB();
        if (savedPdf) {
          setFileName(savedPdf.fileName);
          setTemplateBytes(savedPdf.bytes);
        }
      } catch (error) {
        console.error("Failed to load state:", error);
      } finally {
        setIsLoaded(true);
      }
    }

    const checkSize = () => {
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
      const containerWidth = Math.min(860, window.innerWidth - 520);
      const scale = (Math.max(0.55, Math.min(1.35, containerWidth / baseViewport.width))) * canvasZoom;
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
  }, [templateBytes, canvasZoom, isLoaded, isTooSmall]);

  function updateField(id: string, patch: Partial<CertificateField>) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  }

  function addField() {
    const next = createField(fields.length + 1);
    setFields((current) => [next, ...current]);
    setSelectedFieldId(next.id);
  }

  function addImageField() {
    const next = createImageField(fields.length + 1);
    setFields((current) => [next, ...current]);
    setSelectedFieldId(next.id);
  }

  function removeField(id: string) {
    setFields((current) => {
      const next = current.filter((field) => field.id !== id);
      if (selectedFieldId === id) {
        setSelectedFieldId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  function duplicateField(id: string) {
    const source = fields.find((field) => field.id === id);

    if (!source) {
      return;
    }

    const next: CertificateField = {
      ...source,
      id: crypto.randomUUID(),
      label: `${source.label} Copy`,
      x: source.x + 20,
      y: Math.max(0, source.y - 20),
    };

    setFields((current) => [next, ...current]);
    setSelectedFieldId(next.id);
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    let bytes = await file.arrayBuffer();
    let finalFileName = file.name;

    // If image, convert to PDF
    if (file.type.startsWith("image/") || file.name.match(/\.(png|jpe?g)$/i)) {
      try {
        const pdfDoc = await PDFDocument.create();
        const image = file.type === "image/png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        bytes = await pdfDoc.save();
        finalFileName = finalFileName.replace(/\.(png|jpe?g)$/i, ".pdf");
        if (!finalFileName.endsWith(".pdf")) finalFileName += ".pdf";
        toast.success("Gambar berhasil dikonversi ke PDF!");
      } catch (error) {
        console.error("Image to PDF conversion error:", error);
        toast.error("Gagal mengonversi gambar ke PDF.");
        return;
      }
    }

    setFileName(finalFileName);
    setTemplateBytes(bytes);
    void saveTemplateToDB(bytes, finalFileName);
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
        const handle = await (window as any).showSaveFilePicker({
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
      } catch (err: any) {
        // If user cancels, we just exit
        if (err.name === "AbortError") return;
        console.warn("File System Access API failed, falling back to download:", err);
      }
    }

    // Fallback: standard download
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, `certgen-project-${fileName?.replace(".pdf", "") || "new"}.json`);
  }

  function importProject(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.fields) setFields(data.fields);
        if (data.filenameTemplate) setFilenameTemplate(data.filenameTemplate);
        if (data.bulkRows) setBulkRows(data.bulkRows);
        if (data.fileName) setFileName(data.fileName);

        // Restore PDF if included in project file
        if (data.pdfBase64) {
          const bytes = base64ToArrayBuffer(data.pdfBase64);
          setTemplateBytes(bytes);
          void saveTemplateToDB(bytes, data.fileName || "project.pdf");
        }

        if (data.fields?.[0]) setSelectedFieldId(data.fields[0].id);
        toast.success("Proyek berhasil dimuat!");
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Gagal memuat file proyek. Pastikan format file benar.");
      }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset input
  }

  function handleResetConfirm() {
    localStorage.removeItem("certgen-config");
    void clearTemplateFromDB();
    window.location.reload();
  }

  async function generatePdf() {
    if (!templateBytes) {
      return;
    }

    setIsGenerating(true);
    const bytes = await generateCertificatePdf(templateBytes.slice(0), fields);
    const safeName = fileName.replace(/\.pdf$/i, "") || "sertifikat";
    downloadBytes(bytes, `${safeName}-generated.pdf`);
    setIsGenerating(false);
  }

  async function generateJpg() {
    if (!templateBytes) return;
    setIsGenerating(true);

    try {
      // 1. Generate the final PDF with fields
      const pdfBytes = await generateCertificatePdf(templateBytes.slice(0), fields);

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
      const safeName = fileName.replace(/\.pdf$/i, "") || "sertifikat";
      link.href = dataUrl;
      link.download = `${safeName}.jpg`;
      link.click();

      toast.success("JPG berhasil diunduh!");
    } catch (error) {
      console.error("JPG generation error:", error);
      toast.error("Gagal membuat JPG.");
    } finally {
      setIsGenerating(false);
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

  function buildBulkFilename(row: BulkRow, rowIndex: number) {
    const name = filenameTemplate.replace(/\{row\}/g, String(rowIndex + 1));
    const filled = Object.entries(row).reduce(
      (current, [key, value]) => current.replaceAll(`{${key}}`, value),
      name,
    );
    const safe = filled
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe || `sertifikat-${rowIndex + 1}`}.pdf`;
  }

  async function generateBulkZip(type: 'pdf' | 'jpg' = 'pdf') {
    if (!templateBytes || !bulkRows.length) {
      return;
    }

    setIsGenerating(true);
    const zip = new JSZip();

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      for (const [index, row] of bulkRows.entries()) {
        const fieldsForRow = applyBulkRow(row);
        const pdfBytes = await generateCertificatePdf(templateBytes.slice(0), fieldsForRow);
        const filename = buildBulkFilename(row, index);

        if (type === 'pdf') {
          zip.file(filename, pdfBytes);
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
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const base64Data = dataUrl.split(',')[1];
            zip.file(filename.replace(/\.pdf$/i, ".jpg"), base64Data, { base64: true });
          }
        }
      }

      downloadBlob(await zip.generateAsync({ type: "blob" }), `certgen-bulk-${type}.zip`);
      toast.success(`Bulk ${type.toUpperCase()} berhasil dibuat!`);
    } catch (error) {
      console.error("Bulk generation error:", error);
      toast.error(`Gagal membuat bulk ${type.toUpperCase()}.`);
    } finally {
      setIsGenerating(false);
    }
  }


  function zoomCanvas(delta: number) {
    setCanvasZoom((current) => {
      const nextZoom = Math.min(3, Math.max(0.4, current + delta));
      return Number(nextZoom.toFixed(2));
    });
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

    if (file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) {
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
  const previewFields = getBulkPreviewFields();
  useGoogleFontLoader(fields.map((field) => field.fontFamily));

  // Prevent hydration mismatch by not rendering until mounted
  if (!isLoaded) {
    return <div className="h-dvh bg-zinc-100" />;
  }

  // Handle responsive limitation
  if (isTooSmall) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-zinc-950 p-8 text-center text-white">
        <div className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-white/10 text-white shadow-2xl">
          <MonitorOff className="size-12" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Layar Terlalu Kecil</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
          CertGen memerlukan lebar layar minimal <strong>1200px</strong> untuk pengalaman pengeditan yang optimal.
          Mohon gunakan perangkat desktop atau perbesar jendela browser Anda.
        </p>
        <div className="mt-10 h-1 w-24 rounded-full bg-zinc-800" />
      </div>
    );
  }

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="relative flex h-full min-h-0 flex-col">
        {templateBytes && (
          <div className="absolute left-6 top-6 z-50">
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setIsResetDialogOpen(true)}>
                    <FilePlus className="mr-2 size-4 text-muted-foreground" />
                    New Project
                  </MenubarItem>
                  <MenubarItem onClick={() => projectInputRef.current?.click()}>
                    <FolderOpen className="mr-2 size-4 text-muted-foreground" />
                    Open Project
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onClick={exportProject} disabled={!templateBytes}>
                    <Save className="mr-2 size-4 text-muted-foreground" />
                    Save Project
                  </MenubarItem>
                  <MenubarSub>
                    <MenubarSubTrigger>
                      <Download className="mr-2 size-4 text-muted-foreground" />
                      Download
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarItem onClick={generatePdf} disabled={!templateBytes || isGenerating}>
                        <FileText className={cn("mr-2 size-4 text-muted-foreground", isGenerating && "animate-bounce")} />
                        PDF
                      </MenubarItem>
                      <MenubarItem onClick={generateJpg} disabled={!templateBytes || isGenerating}>
                        <ImageIcon className="mr-2 size-4 text-muted-foreground" />
                        JPG
                      </MenubarItem>
                    </MenubarSubContent>
                  </MenubarSub>
                </MenubarContent>
              </MenubarMenu>

              <MenubarMenu>
                <MenubarTrigger>Edit</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => pdfInputRef.current?.click()} disabled={!templateBytes}>
                    <FileUp className="mr-2 size-4 text-muted-foreground" />
                    Change PDF / Image
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? (
                      <Sun className="mr-2 size-4 text-muted-foreground" />
                    ) : (
                      <Moon className="mr-2 size-4 text-muted-foreground" />
                    )}
                    Toggle Theme
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onClick={() => setCanvasZoom(1)}>
                    <RotateCcw className="mr-2 size-4 text-muted-foreground" />
                    Reset Zoom
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>
        )}

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
          className={cn(
            "grid min-h-0 flex-1 overflow-hidden",
            templateBytes
              ? "grid-cols-[minmax(0,1fr)_390px]"
              : "grid-cols-[minmax(0,1fr)]",
          )}
        >
          <section
            className={cn(
              "relative overflow-hidden p-6",
              isCanvasPanning ? "cursor-grabbing" : "cursor-default",
            )}
            onPointerDown={handleCanvasPanStart}
            onAuxClick={(event) => event.preventDefault()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {templateBytes ? (
              <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-md border bg-background/80 backdrop-blur-md px-1 py-0.5 text-[10px] font-medium shadow-sm transition-colors duration-300">
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
                      />
                    }
                  >
                    <Minus className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom out</TooltipContent>
                </Tooltip>

                <span className="min-w-8 text-center">{Math.round(canvasZoom * 100)}%</span>

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
                      />
                    }
                  >
                    <Plus className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom in</TooltipContent>
                </Tooltip>
              </div>
            ) : null}
            <div className="flex h-full min-h-full items-center justify-center">
              <div
                className="relative rounded-md border bg-card p-3 shadow-sm transition-colors duration-300"
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
                          Tools bikin sertifikat PDF masal yang efisien
                        </p>
                      </div>

                      <div className="relative z-20 flex flex-col items-center gap-4">
                        <label
                          htmlFor="pdf-upload-empty"
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "flex cursor-pointer items-center gap-2 px-10 h-12 rounded-full shadow-lg shadow-zinc-200"
                          )}
                        >
                          <FileUp className="size-4" />
                          Mulai dengan PDF / Gambar
                        </label>

                        <label
                          htmlFor="project-import-empty"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "flex cursor-pointer items-center gap-2 px-10 h-12 rounded-full border-border bg-card hover:bg-accent transition-all"
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
                        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
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
                          pageSize={pageSize}
                          previewSize={previewSize}
                          canvasZoom={canvasZoom}
                          selected={field.id === selectedFieldId}
                          dragging={field.id === draggingFieldId}
                          editing={field.id === editingFieldId}
                          onSelect={() => setSelectedFieldId(field.id)}
                          onEditStart={() => {
                            setSelectedFieldId(field.id);
                            setEditingFieldId(field.id);
                          }}
                          onEditEnd={() => setEditingFieldId(null)}
                          onDragStart={() => setDraggingFieldId(field.id)}
                          onDragEnd={() => setDraggingFieldId(null)}
                          onMove={(x, y) => updateField(field.id, { x, y })}
                          onValueChange={(value) => updateField(field.id, { value })}
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
            <SidebarEditor
              fields={fields}
              selectedField={selectedField}
              selectedFieldId={selectedFieldId}
              bulkRows={bulkRows}
              bulkPreviewIndex={bulkPreviewIndex}
              filenameTemplate={filenameTemplate}
              onAddField={addField}
              onAddImageField={addImageField}
              onRemoveField={removeField}
              onDuplicateField={duplicateField}
              onSelectField={setSelectedFieldId}
              onUpdateField={updateField}
              onBulkRowsChange={(rows) => {
                setBulkRows(rows);
                setBulkPreviewIndex(0);
              }}
              onBulkPreviewIndexChange={setBulkPreviewIndex}
              onFilenameTemplateChange={setFilenameTemplate}
              onGenerateBulk={generateBulkZip}
              isGenerating={isGenerating}
              fileName={fileName}
            />
          ) : null}
        </div>

        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Proyek Baru?</DialogTitle>
              <DialogDescription>
                Tindakan ini akan menghapus semua field, data bulk, dan template PDF yang sedang
                dikerjakan untuk memulai dari awal. Proyek yang belum disimpan akan hilang.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleResetConfirm}>
                Ya, Proyek Baru
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function SidebarEditor({
  fields,
  selectedField,
  selectedFieldId,
  bulkRows,
  bulkPreviewIndex,
  filenameTemplate,
  onAddField,
  onAddImageField,
  onRemoveField,
  onDuplicateField,
  onSelectField,
  onUpdateField,
  onBulkRowsChange,
  onBulkPreviewIndexChange,
  onFilenameTemplateChange,
  onGenerateBulk,
  isGenerating,
  fileName,
}: {
  fields: CertificateField[];
  selectedField: CertificateField | undefined;
  selectedFieldId: string;
  bulkRows: BulkRow[];
  bulkPreviewIndex: number;
  filenameTemplate: string;
  onAddField: () => void;
  onAddImageField: () => void;
  onRemoveField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onSelectField: (id: string) => void;
  onUpdateField: (id: string, patch: Partial<CertificateField>) => void;
  onBulkRowsChange: (rows: BulkRow[]) => void;
  onBulkPreviewIndexChange: (index: number) => void;
  onFilenameTemplateChange: (value: string) => void;
  onGenerateBulk: (type: 'pdf' | 'jpg') => void;
  isGenerating: boolean;
  fileName: string;
}) {
  const [activeSidebarTab, setActiveSidebarTab] = useState("fields");
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<CertificateField | null>(null);

  // Sync expanded state with selection
  useEffect(() => {
    if (selectedFieldId) {
      setExpandedFieldId(selectedFieldId);
    }
  }, [selectedFieldId]);

  function handleAddField() {
    onAddField();
    // No longer switching tabs, we'll let the selection/expansion handle it
    setActiveSidebarTab("fields");
  }

  function handleAddImageField() {
    onAddImageField();
    setActiveSidebarTab("fields");
  }

  // Sync expanded state with selection if needed, or just let manual toggle work.
  // The user specifically mentioned "pressing the edit button".

  return (
    <aside className="h-full min-h-0 overflow-hidden border-l text-sidebar-foreground transition-colors duration-300">
      <Tabs
        value={activeSidebarTab}
        onValueChange={(value) => setActiveSidebarTab(String(value))}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <div className="border-b px-4 py-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">CertGen</h2>
            <p className="max-w-[180px] truncate text-[10px] text-muted-foreground" title={fileName}>
             File : {fileName || "Editor Sertifikat"}
            </p>
          </div>
          <TabsList className="h-9 w-full bg-input/50 p-1">
            <TabsTrigger value="fields" className="flex-1 transition-all">Fields</TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1 transition-all">Bulk</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <TabsContent value="fields" keepMounted className="m-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Layers</h3>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {fields.length} Layers
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="outline" onClick={handleAddField}>
                  <Plus className="mr-1.5 size-3" />
                  Text
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddImageField}>
                  <ImageIcon className="mr-1.5 size-3" />
                  Image
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
                  <div className="mb-2 rounded-full bg-zinc-50 p-3">
                    <Plus className="size-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium">Belum ada field</p>
                  <p className="max-w-[200px] text-xs text-muted-foreground">
                    Tambah field teks atau gambar untuk mulai mengedit sertifikat.
                  </p>
                </div>
              ) : (
                fields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      "w-full overflow-hidden rounded-md border text-sm transition-colors",
                      field.id === selectedFieldId ? "border-primary/50 bg-input/50" : "bg-input/30 border-border hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 p-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => onSelectField(field.id)}
                      >
                        <span className="block truncate font-medium text-foreground">{field.label}</span>
                        <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                          {field.type === "image"
                            ? field.imageDataUrl
                              ? `Image Layer • ${Math.round(field.width)}x${Math.round(field.height)}px`
                              : "No image"
                            : field.value}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                aria-label={`Duplikasi ${field.label}`}
                                onClick={() => {
                                  onDuplicateField(field.id);
                                }}
                              />
                            }
                          >
                            <Copy className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Duplikasi field</TooltipContent>
                        </Tooltip>



                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                aria-label={
                                  field.visible
                                    ? `Sembunyikan ${field.label}`
                                    : `Tampilkan ${field.label}`
                                }
                                onClick={() => {
                                  onSelectField(field.id);
                                  onUpdateField(field.id, { visible: !field.visible });
                                }}
                              />
                            }
                          >
                            {field.visible ? (
                              <Eye className="size-4" />
                            ) : (
                              <EyeOff className="size-4" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            {field.visible ? "Sembunyikan field" : "Tampilkan field"}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                size="icon"
                                variant={expandedFieldId === field.id ? "default" : "ghost"}
                                className="size-8"
                                aria-label={`Edit styling ${field.label}`}
                                onClick={() => {
                                  onSelectField(field.id);
                                  setExpandedFieldId(expandedFieldId === field.id ? null : field.id);
                                }}
                              />
                            }
                          >
                            <Settings2 className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Edit styling</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {expandedFieldId === field.id && (
                      <div className="border-t bg-white dark:bg-muted p-4">
                        <FieldSettings
                          field={field}
                          onChange={(patch) => onUpdateField(field.id, patch)}
                        />
                        <div className="mt-6 flex justify-between gap-2 border-t pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFieldToDelete(field)}
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="mr-1.5 size-3" />
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedFieldId(null)}
                            className="h-8 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            Collapse
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="bulk" keepMounted className="m-0 p-4">
            <BulkPanel
              fields={fields}
              rows={bulkRows}
              previewIndex={bulkPreviewIndex}
              filenameTemplate={filenameTemplate}
              isGenerating={isGenerating}
              onRowsChange={onBulkRowsChange}
              onPreviewIndexChange={onBulkPreviewIndexChange}
              onFilenameTemplateChange={onFilenameTemplateChange}
              onGenerate={onGenerateBulk}
            />
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Field</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus field <strong>{fieldToDelete?.label}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldToDelete(null)}>
              Batal
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
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function PreviewField({
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
  onMove,
  onValueChange,
  onResize,
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
  onMove: (x: number, y: number) => void;
  onValueChange: (value: string) => void;
  onResize: (width: number, height: number) => void;
}) {
  if (!field.visible || !pageSize || !previewSize) {
    return null;
  }

  const left = (field.x / pageSize.width) * previewSize.width;
  const yOffset = field.type === "image" ? field.height : field.fontSize;
  const top = ((pageSize.height - field.y - yOffset) / pageSize.height) * previewSize.height;
  const width = (field.width / pageSize.width) * previewSize.width;
  const height = (field.height / pageSize.height) * previewSize.height;
  const fontSize = (field.fontSize / pageSize.height) * previewSize.height;

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!pageSize || !previewSize) {
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
      const nextLeft = (moveEvent.clientX - parentRect.left) / canvasZoom - offsetX;
      const nextTop = (moveEvent.clientY - parentRect.top) / canvasZoom - offsetY;
      const maxLeft = currentPreviewSize.width - width;
      const maxTop = currentPreviewSize.height - height;
      const clampedLeft = Math.min(Math.max(0, nextLeft), Math.max(0, maxLeft));
      const clampedTop = Math.min(Math.max(0, nextTop), Math.max(0, maxTop));
      const nextX = (clampedLeft / currentPreviewSize.width) * currentPageSize.width;
      const nextY =
        currentPageSize.height -
        (clampedTop / currentPreviewSize.height) * currentPageSize.height -
        yOffset;

      onMove(Math.round(nextX), Math.round(nextY));
    }

    function handlePointerUp() {
      onDragEnd();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    if (!pageSize || !previewSize) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect();

    const currentPageSize = pageSize;
    const currentPreviewSize = previewSize;
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startWidth = width;
    const startHeight = height;
    const minWidth = field.type === "image" ? 24 : Math.max(40, fontSize * 2);
    const minHeight = field.type === "image" ? 24 : Math.max(18, fontSize * 1.15);
    const maxWidth = currentPreviewSize.width - left;
    const maxHeight = currentPreviewSize.height - top;

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextPreviewWidth = Math.min(
        Math.max(minWidth, startWidth + (moveEvent.clientX - startClientX) / canvasZoom),
        maxWidth,
      );
      const nextPreviewHeight = Math.min(
        Math.max(minHeight, startHeight + (moveEvent.clientY - startClientY) / canvasZoom),
        maxHeight,
      );
      const nextWidth =
        (nextPreviewWidth / currentPreviewSize.width) * currentPageSize.width;
      const nextHeight =
        (nextPreviewHeight / currentPreviewSize.height) * currentPageSize.height;

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
        "absolute touch-none select-none border border-transparent bg-transparent px-1 text-left cursor-move",
        field.type === "image" && "overflow-hidden",
        selected && "border-dashed border-sky-600 bg-sky-100/20",
        dragging && "border-solid border-sky-700 bg-sky-100/40",
      )}
      style={{
        left,
        top,
        width,
        minHeight: height,
        height: field.type === "text" ? "auto" : height,
        color: field.color,
        textAlign: field.alignment,
        lineHeight: 1.25,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={(event) => {
        event.stopPropagation();

        if (field.type === "text") {
          onEditStart();
        }
      }}
    >
      {editing && field.type === "text" ? (
        <input
          autoFocus
          className="h-full w-full bg-white/80 px-1 outline-none"
          value={field.value}
          style={{
            color: field.color,
            fontFamily: getFontStack(field.fontFamily),
            fontWeight: previewFontWeight[field.fontWeight],
            fontSize,
            textAlign: field.alignment,
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={field.imageDataUrl}
            alt={field.label}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="flex h-full items-center justify-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="size-4" />
            Upload image
          </span>
        )
      ) : (
        <span
          className="block"
          style={{
            fontFamily: getFontStack(field.fontFamily),
            fontWeight: previewFontWeight[field.fontWeight],
            fontSize,
          }}
        >
          {field.value || field.label}
        </span>
      )}
      {selected ? (
        <>
          <div className="absolute -top-7 left-0 z-50 flex h-5 items-center gap-1.5 rounded-md bg-primary px-2 py-1 text-[10px] font-bold font-sans text-primary-foreground shadow-xl ring-1 ring-white/10 transition-colors duration-300">
            <span className="opacity-70">W</span>
            <span>{Math.round(field.width)}</span>
            <span className="ml-1 opacity-70">H</span>
            <span>{Math.round(field.height)}</span>
          </div>
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 size-3 cursor-se-resize border-b-2 border-r-2 border-primary bg-background"
            onPointerDown={handleResizePointerDown}
          />
        </>
      ) : null}
    </button>
  );
}

function GoogleFontSelect({
  value,
  onChange,
}: {
  value: CertificateFieldFont;
  onChange: (fontFamily: CertificateFieldFont) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return certificateFontGroups
      .map((group) => ({
        ...group,
        fonts: normalizedQuery
          ? group.fonts.filter((font) => font.toLowerCase().includes(normalizedQuery))
          : group.fonts,
      }))
      .filter((group) => group.fonts.length > 0);
  }, [query]);

  const visibleFonts = filteredGroups.flatMap((group) => group.fonts);
  const fontLoadVersion = useGoogleFontLoader([value, ...visibleFonts]);

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="group relative flex w-full items-center gap-0 overflow-hidden rounded-md border text-left transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary outline-none"
        >
          <div className="flex h-10 flex-1 items-center px-3 py-2">
            <span
              className="truncate text-sm"
              style={{ fontFamily: getFontStack(value) }}
            >
              {value}
            </span>
          </div>
          <div className="flex h-10 w-8 shrink-0 items-center justify-center border-l bg-muted/30 group-hover:bg-muted transition-colors">
            <ChevronDown className="size-3 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-2 shadow-2xl"
          align="start"
          sideOffset={4}
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="field-font-search"
              value={query}
              placeholder="Search font..."
              className="h-8 pl-7 text-xs"
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-auto pr-1">
            {filteredGroups.map((group) => (
              <div key={`${group.label}-${fontLoadVersion}`} className="mb-3 last:mb-0">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                {group.fonts.map((font) => (
                  <button
                    key={font}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-accent",
                      font === value && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      onChange(font);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span
                      className="truncate text-base"
                      style={{ fontFamily: getFontStack(font) }}
                    >
                      {font}
                    </span>
                    {font === value ? <Check className="size-3" /> : null}
                  </button>
                ))}
              </div>
            ))}
            {!filteredGroups.length ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                No fonts found.
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ImageUploadInput({
  id,
  onChange,
}: {
  id: string;
  onChange: (patch: Partial<CertificateField>) => void;
}) {
  async function handleImage(file: File | null) {
    if (!file) {
      return;
    }

    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    const isJpeg =
      file.type === "image/jpeg" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg");

    if (!isPng && !isJpeg) {
      return;
    }

    onChange({
      imageDataUrl: await fileToDataUrl(file),
      imageMimeType: isPng ? "image/png" : "image/jpeg",
      value: file.name,
    });
  }

  return (
    <Input
      id={id}
      type="file"
      accept="image/png,image/jpeg"
      className="h-9 text-xs"
      onChange={(event) => void handleImage(event.target.files?.[0] ?? null)}
    />
  );
}

function BulkPanel({
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
  isGenerating: boolean;
  onRowsChange: (rows: BulkRow[]) => void;
  onPreviewIndexChange: (index: number) => void;
  onFilenameTemplateChange: (value: string) => void;
  onGenerate: (type: 'pdf' | 'jpg') => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const textFields = fields.filter((field) => field.type === "text");
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const mappedCount = textFields.filter((field) => headers.includes(field.label)).length;
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

    if (file?.type === "text/csv" || file?.name.toLowerCase().endsWith(".csv")) {
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
                ? "border-green-500/30 bg-green-500/5"
                : "border-border bg-muted/30",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploaded && !isDragOver ? (
            <CheckCircle2 className="size-8 text-green-600" />
          ) : (
            <FileUp
              className={cn(
                "size-8 transition-colors",
                isDragOver ? "text-zinc-950" : "text-zinc-400",
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
          <Label className="text-xs text-muted-foreground">Detected Headers</Label>
          <div className="flex flex-wrap gap-1">
            {headers.map((header) => (
              <span key={header} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border">
                {header}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="bulk-preview-row" className="text-xs text-muted-foreground">Preview Row</Label>
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
                    onPreviewIndexChange(Math.min(Math.max(0, val - 1), rows.length - 1));
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
            <Label htmlFor="bulk-filename" className="text-xs text-muted-foreground">Filename Pattern</Label>
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

          <div className="grid gap-2">
            <Button variant="outline" className="w-full" onClick={() => onGenerate('pdf')} disabled={isGenerating}>
              <FileText className="size-4" />
              {isGenerating ? "ZIP..." : "Download as PDF"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onGenerate('jpg')} disabled={isGenerating}>
              <ImageIcon className="size-4" />
              {isGenerating ? "ZIP..." : "Download as JPG"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FieldSettings({
  field,
  onChange,
}: {
  field: CertificateField;
  onChange: (patch: Partial<CertificateField>) => void;
}) {
  useGoogleFontLoader([field.fontFamily]);
  const isImageField = field.type === "image";

  return (
    <section className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="field-label" className="text-xs text-muted-foreground">Label</Label>
        <Input
          id="field-label"
          value={field.label}
          className="h-8 text-xs"
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </div>

      {isImageField ? (
        <div className="grid gap-2">
          <Label htmlFor="field-image" className="text-xs text-muted-foreground">Image</Label>
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
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="field-value" className="text-xs text-muted-foreground">Content</Label>
          <Textarea
            id="field-value"
            value={field.value}
            className="min-h-20 text-xs resize-none"
            placeholder="Ketik konten di sini... (Shift+Enter untuk baris baru)"
            onChange={(event) => onChange({ value: event.target.value })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <NumberInput label="X" value={field.x} onChange={(x) => onChange({ x })} />
        <NumberInput label="Y" value={field.y} onChange={(y) => onChange({ y })} />
        <NumberInput label="W" value={field.width} onChange={(width) => onChange({ width })} />
        <NumberInput label="H" value={field.height} onChange={(height) => onChange({ height })} />
      </div>

      {!isImageField && (
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
                  <input
                    type="number"
                    value={Math.round(field.fontSize)}
                    className="h-8 w-full bg-background px-2 text-xs font-medium text-foreground outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-8 w-7 shrink-0 items-center justify-center border-l bg-muted/30 hover:bg-muted transition-colors">
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-20 min-w-0">
                      {[10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128].map((size) => (
                        <DropdownMenuItem
                          key={size}
                          className={cn("text-xs", field.fontSize === size && "bg-accent font-bold")}
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
                      onChange={(event) => onChange({ color: event.target.value })}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">#</span>
                  </div>
                  <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-md border shadow-sm transition-colors hover:border-primary">
                    <Input
                      type="color"
                      value={field.color}
                      className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent p-0 opacity-0"
                      onChange={(event) => onChange({ color: event.target.value })}
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
                <Label htmlFor="field-font-weight" className="text-xs text-muted-foreground">Weight</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="group relative flex w-full items-center gap-0 overflow-hidden rounded-md border text-left transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary outline-none"
                  >
                    <div className="flex h-8 flex-1 items-center px-2.5 text-xs font-medium text-foreground">
                      <span className="capitalize">{field.fontWeight}</span>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-l bg-muted/30 group-hover:bg-muted transition-colors">
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 min-w-0">
                    {(["regular", "medium", "semibold", "bold"] as const).map((weight) => (
                      <DropdownMenuItem
                        key={weight}
                        className={cn("text-xs capitalize", field.fontWeight === weight && "bg-accent font-bold")}
                        onClick={() => onChange({ fontWeight: weight })}
                      >
                        {weight}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Alignment</Label>
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
                        field.alignment === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() =>
                        onChange({ alignment: value as CertificateFieldAlignment })
                      }
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}


    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="group relative flex items-center gap-0 overflow-hidden rounded-md border transition-colors focus-within:border-primary">
      <div className="flex h-8 w-7 shrink-0 items-center justify-center border-r bg-muted text-[10px] font-bold text-muted-foreground select-none group-focus-within:text-foreground transition-colors">
        {label}
      </div>
      <input
        type="number"
        value={Math.round(value)}
        className="h-8 w-full bg-background px-2 text-xs font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
