import {
  degrees,
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CertificateField } from "@/types/certificate-field";

const googleFontCache = new Map<string, ArrayBuffer>();

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value) || normalized.length !== 6) {
    return rgb(0, 0, 0);
  }

  return rgb(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  );
}

function getFallbackFontName(field: CertificateField) {
  const isBold = field.fontWeight === "semibold" || field.fontWeight === "bold";
  const fontMap: Record<string, StandardFonts> = {
    Helvetica: isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
    Arial: isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
    Verdana: isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
    Trebuchet: isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
    TimesRoman: isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
    Georgia: isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
    Garamond: isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
    Courier: isBold ? StandardFonts.CourierBold : StandardFonts.Courier,
    Monaco: isBold ? StandardFonts.CourierBold : StandardFonts.Courier,
  };

  return fontMap[field.fontFamily] ?? fontMap.Helvetica;
}

function getGoogleFontWeight(field: CertificateField) {
  const weightMap: Record<CertificateField["fontWeight"], number> = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  };

  return weightMap[field.fontWeight];
}

function buildGoogleFontsCssUrl(field: CertificateField) {
  const params = new URLSearchParams({
    family: field.fontFamily,
    weight: String(getGoogleFontWeight(field)),
  });

  return `/api/font?${params.toString()}`;
}

async function fetchGoogleFontBytes(field: CertificateField) {
  const cacheKey = `${field.fontFamily}:${field.fontWeight}`;
  const cached = googleFontCache.get(cacheKey);

  if (cached) {
    return cached.slice(0);
  }

  const fontResponse = await fetch(buildGoogleFontsCssUrl(field));

  if (!fontResponse.ok) {
    throw new Error(`Failed to load font bytes for ${field.fontFamily}`);
  }

  const bytes = await fontResponse.arrayBuffer();
  googleFontCache.set(cacheKey, bytes.slice(0));

  return bytes;
}

async function getFont(pdfDoc: PDFDocument, field: CertificateField) {
  try {
    const fontBytes = await fetchGoogleFontBytes(field);
    const embeddedFont = await pdfDoc.embedFont(fontBytes, { subset: false });
    embeddedFont.encodeText(field.value);
    return embeddedFont;
  } catch {
    return pdfDoc.embedFont(getFallbackFontName(field));
  }
}

function getAlignedX(line: string, field: CertificateField, font: PDFFont) {
  const textWidth = font.widthOfTextAtSize(line, field.fontSize);

  if (field.alignment === "center") {
    return field.x + (field.width - textWidth) / 2;
  }

  if (field.alignment === "right") {
    return field.x + (field.width - textWidth);
  }

  return field.x;
}

async function embedImage(pdfDoc: PDFDocument, field: CertificateField) {
  if (!field.imageDataUrl || !field.imageMimeType) {
    return null;
  }

  const response = await fetch(field.imageDataUrl);
  const bytes = await response.arrayBuffer();

  if (field.imageMimeType === "image/png") {
    return pdfDoc.embedPng(bytes);
  }

  if (field.imageMimeType === "image/jpeg") {
    return pdfDoc.embedJpg(bytes);
  }

  return null;
}

export async function generateCertificatePdf(
  templateBytes: ArrayBuffer,
  fields: CertificateField[],
) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const [page] = pdfDoc.getPages();

  for (const field of fields) {
    if (!field.visible) {
      continue;
    }

    if (field.type === "image") {
      const image = await embedImage(pdfDoc, field);

      if (!image) {
        continue;
      }

      page.drawImage(image, {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      });
      continue;
    }

    if (!field.value.trim()) {
      continue;
    }

    const font = await getFont(pdfDoc, field);
    const lines = field.value.split("\n");
    const lineHeight = field.fontSize * 1.25;

    lines.forEach((line, index) => {
      if (!line.trim()) {
        return;
      }

      const x = getAlignedX(line, field, font);
      const y = field.y - index * lineHeight;

      page.drawText(line, {
        x,
        y,
        size: field.fontSize,
        font,
        color: hexToRgb(field.color),
        rotate: degrees(0),
      });
    });
  }

  return pdfDoc.save();
}
