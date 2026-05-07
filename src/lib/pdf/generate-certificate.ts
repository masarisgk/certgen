import {
  degrees,
  PDFDocument,
  type PDFPage,
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
  const isItalic = field.fontStyle === "italic";
  const fontMap: Record<string, StandardFonts> = {
    Helvetica: isBold 
      ? (isItalic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold)
      : (isItalic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica),
    Arial: isBold 
      ? (isItalic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold)
      : (isItalic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica),
    Verdana: isBold 
      ? (isItalic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold)
      : (isItalic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica),
    Trebuchet: isBold 
      ? (isItalic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold)
      : (isItalic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica),
    TimesRoman: isBold 
      ? (isItalic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold)
      : (isItalic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman),
    Georgia: isBold 
      ? (isItalic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold)
      : (isItalic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman),
    Garamond: isBold 
      ? (isItalic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold)
      : (isItalic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman),
    Courier: isBold 
      ? (isItalic ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold)
      : (isItalic ? StandardFonts.CourierOblique : StandardFonts.Courier),
    Monaco: isBold 
      ? (isItalic ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold)
      : (isItalic ? StandardFonts.CourierOblique : StandardFonts.Courier),
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
    italic: field.fontStyle === "italic" ? "true" : "false",
  });

  return `/api/font?${params.toString()}`;
}

async function fetchGoogleFontBytes(field: CertificateField) {
  const cacheKey = `${field.fontFamily}:${field.fontWeight}:${field.fontStyle || "normal"}`;
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

function getAlignedX(line: string, field: CertificateField, font: PDFFont, fontSize?: number) {
  const size = fontSize ?? field.fontSize;
  const textWidth = font.widthOfTextAtSize(line, size) + (line.length - 1) * (field.letterSpacing ?? 0);

  if (field.alignment === "center") {
    return field.x + (field.width - textWidth) / 2;
  }

  if (field.alignment === "right") {
    return field.x + (field.width - textWidth);
  }

  return field.x;
}

type DrawTextOptions = NonNullable<Parameters<PDFPage["drawText"]>[1]> & {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
};

function drawTextWithLetterSpacing(
  page: PDFPage,
  text: string,
  options: DrawTextOptions,
  letterSpacing: number,
) {
  if (!letterSpacing) {
    page.drawText(text, options);
    return;
  }

  let currentX = options.x;

  for (const character of Array.from(text)) {
    page.drawText(character, { ...options, x: currentX });
    currentX += options.font.widthOfTextAtSize(character, options.size) + letterSpacing;
  }
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
  templateBytes: ArrayBuffer | Uint8Array,
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
        opacity: field.opacity ?? 1,
        rotate: degrees(field.rotate ?? 0),
      });
      continue;
    }

    if (field.type === "shape") {
      const opacity = field.opacity ?? 1;
      const rotate = degrees(field.rotate ?? 0);
      const color = field.fillColor ? hexToRgb(field.fillColor) : undefined;
      const borderColor = field.strokeColor ? hexToRgb(field.strokeColor) : undefined;
      const borderWidth = field.strokeWidth ?? 0;

      if (field.shapeType === "rectangle") {
        page.drawRectangle({
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          color,
          borderColor,
          borderWidth,
          opacity,
          rotate,
        });
      } else if (field.shapeType === "circle") {
        page.drawEllipse({
          x: field.x + field.width / 2,
          y: field.y + field.height / 2,
          xScale: field.width / 2,
          yScale: field.height / 2,
          color,
          borderColor,
          borderWidth,
          opacity,
          rotate,
        });
      } else if (field.shapeType === "line") {
        page.drawLine({
          start: { x: field.x, y: field.y },
          end: { x: field.x + field.width, y: field.y },
          color: borderColor || hexToRgb("#000000"),
          thickness: borderWidth || 1,
          opacity,
        });
      }
      continue;
    }

    if (!field.value.trim()) {
      continue;
    }

    const font = await getFont(pdfDoc, field);
    let textValue = field.value;
    if (field.textTransform === "uppercase") {
      textValue = textValue.toUpperCase();
    } else if (field.textTransform === "lowercase") {
      textValue = textValue.toLowerCase();
    } else if (field.textTransform === "capitalize") {
      textValue = textValue.replace(/\b\w/g, (l) => l.toUpperCase());
    }

    const lines = textValue.split("\n");
    
    let fontSize = field.fontSize;
    if (field.autoResize && field.width > 0) {
      const minSize = field.minFontSize ?? 8;
      const getLongestLineWidth = (size: number) => {
        return Math.max(...lines.map(line => font.widthOfTextAtSize(line, size) + (line.length - 1) * (field.letterSpacing ?? 0)));
      };
      
      let maxWidth = getLongestLineWidth(fontSize);
      while (maxWidth > field.width && fontSize > minSize) {
        fontSize -= 0.5;
        maxWidth = getLongestLineWidth(fontSize);
      }
    }

    const lineHeight = fontSize * (field.lineHeight ?? 1.25);

    lines.forEach((line, index) => {
      if (!line.trim()) {
        return;
      }

      const x = getAlignedX(line, field, font, fontSize); // Pass fontSize to getAlignedX
      const y = field.y - index * lineHeight;

      // Draw Shadow if exists
      if (field.shadowColor) {
        drawTextWithLetterSpacing(page, line, {
          x: x + (field.shadowOffsetX ?? 2),
          y: y - (field.shadowOffsetY ?? 2),
          size: fontSize,
          font,
          color: hexToRgb(field.shadowColor),
          opacity: field.shadowOpacity ?? 0.5,
          rotate: degrees(field.rotate ?? 0),
        }, field.letterSpacing ?? 0);
      }

      drawTextWithLetterSpacing(page, line, {
        x,
        y,
        size: fontSize,
        font,
        color: hexToRgb(field.color),
        opacity: field.opacity ?? 1,
        rotate: degrees(field.rotate ?? 0),
      }, field.letterSpacing ?? 0);

      // Draw Decorations (Underline/Strikethrough)
      if (field.textDecoration && field.textDecoration !== "none") {
        const textWidth = font.widthOfTextAtSize(line, fontSize) + (line.length - 1) * (field.letterSpacing ?? 0);
        const thickness = fontSize / 15;
        let lineY = y;
        
        if (field.textDecoration === "underline") {
          lineY = y - thickness * 2;
        } else if (field.textDecoration === "line-through") {
          lineY = y + fontSize / 3.5;
        }

        page.drawLine({
          start: { x, y: lineY },
          end: { x: x + textWidth, y: lineY },
          thickness,
          color: hexToRgb(field.color),
          opacity: field.opacity ?? 1,
        });
      }
    });
  }

  return pdfDoc.save();
}
