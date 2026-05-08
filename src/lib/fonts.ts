import { useState, useEffect } from "react";

export const previewFontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const certificateFonts = [
  "Alex Brush",
  "Allura",
  "Bitter",
  "Bodoni Moda",
  "Cinzel",
  "Cormorant Garamond",
  "Crimson Text",
  "Dancing Script",
  "DM Serif Display",
  "EB Garamond",
  "Forum",
  "Great Vibes",
  "Inter",
  "Libre Baskerville",
  "Lora",
  "Marcellus",
  "Merriweather",
  "Montserrat",
  "Open Sans",
  "Parisienne",
  "Playfair Display",
  "Poppins",
  "Prata",
  "Raleway",
  "Roboto",
  "Sacramento",
];

export const googleCertificateFontSet = new Set(certificateFonts);

export function getFontStack(fontFamily: string) {
  return `"${fontFamily}", Arial, Helvetica, sans-serif`;
}

// ── Recent & Favorite Fonts (localStorage) ──────────────────────────────────

const RECENT_FONTS_KEY = "certgen-recent-fonts";
const FAVORITE_FONTS_KEY = "certgen-favorite-fonts";
const MAX_RECENT_FONTS = 8;

export function getRecentFonts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_FONTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentFont(font: string) {
  const recent = getRecentFonts().filter((f) => f !== font);
  recent.unshift(font);
  try {
    localStorage.setItem(
      RECENT_FONTS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_FONTS)),
    );
  } catch {
    // ignore
  }
}

export function getFavoriteFonts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITE_FONTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteFont(font: string): string[] {
  const favs = getFavoriteFonts();
  const next = favs.includes(font)
    ? favs.filter((f) => f !== font)
    : [...favs, font];
  try {
    localStorage.setItem(FAVORITE_FONTS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// ── Failed fonts tracker (in-memory) ────────────────────────────────────────

export const failedFonts = new Set<string>();

export function googleFontUrl(fontFamilies: string[]) {
  const families = Array.from(
    new Set(
      fontFamilies.filter(
        (font) => googleCertificateFontSet.has(font) && !failedFonts.has(font),
      ),
    ),
  );

  if (!families.length) {
    return "";
  }

  const query = families
    .map(
      (font) =>
        `family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;600;700`,
    )
    .join("&");

  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

export function useGoogleFontLoader(fontFamilies: string[]) {
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
        fonts.map((font) =>
          document.fonts?.load(`400 20px "${font}"`).catch(() => {
            failedFonts.add(font);
          }),
        ),
      ).finally(() => setLoadVersion((version) => version + 1));
    };
    link.onerror = () => {
      fonts.forEach((font) => failedFonts.add(font));
      setLoadVersion((version) => version + 1);
    };
    document.head.appendChild(link);
  }, [fontKey]);

  return loadVersion;
}
