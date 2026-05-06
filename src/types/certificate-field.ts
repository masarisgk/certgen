export type CertificateFieldAlignment = "left" | "center" | "right";

export type CertificateFieldFont = string;

export type CertificateFieldFontWeight = "regular" | "medium" | "semibold" | "bold";

export type CertificateFieldType = "text" | "image";

export type CertificateField = {
  id: string;
  type: CertificateFieldType;
  label: string;
  value: string;
  imageDataUrl?: string;
  imageMimeType?: "image/png" | "image/jpeg";
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: CertificateFieldFont;
  fontWeight: CertificateFieldFontWeight;
  color: string;
  alignment: CertificateFieldAlignment;
  visible: boolean;
};

export type PdfPageSize = {
  width: number;
  height: number;
};
