import type { PdfPageSize } from "@/types/certificate-field";

export function previewToPdfY(
  previewY: number,
  previewHeight: number,
  pageSize: PdfPageSize,
  fontSize: number,
) {
  return pageSize.height - (previewY / previewHeight) * pageSize.height - fontSize;
}

export function pdfToPreviewY(
  pdfY: number,
  previewHeight: number,
  pageSize: PdfPageSize,
  fontSize: number,
) {
  return ((pageSize.height - pdfY - fontSize) / pageSize.height) * previewHeight;
}

export function previewToPdfX(previewX: number, previewWidth: number, pageSize: PdfPageSize) {
  return (previewX / previewWidth) * pageSize.width;
}

export function pdfToPreviewX(pdfX: number, previewWidth: number, pageSize: PdfPageSize) {
  return (pdfX / pageSize.width) * previewWidth;
}

export function previewToPdfWidth(
  previewWidthValue: number,
  previewWidth: number,
  pageSize: PdfPageSize,
) {
  return (previewWidthValue / previewWidth) * pageSize.width;
}

export function pdfToPreviewWidth(
  pdfWidthValue: number,
  previewWidth: number,
  pageSize: PdfPageSize,
) {
  return (pdfWidthValue / pageSize.width) * previewWidth;
}
