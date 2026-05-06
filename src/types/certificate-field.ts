export type CertificateFieldAlignment = "left" | "center" | "right";

export type CertificateFieldFont = string;

export type CertificateFieldFontWeight = "regular" | "medium" | "semibold" | "bold";

export type CertificateFieldType = "text" | "image" | "shape";

export type CertificateFieldShapeType = "rectangle" | "circle" | "line";

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
  opacity?: number;
  rotate?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shapeType?: CertificateFieldShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  autoResize?: boolean;
  minFontSize?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
};

export type PdfPageSize = {
  width: number;
  height: number;
};
