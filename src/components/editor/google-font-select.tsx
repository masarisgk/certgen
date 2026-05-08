import React, { useState, useMemo } from "react";
import { Check, ChevronDown, Clock, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
import type { CertificateFieldFont } from "@/types/certificate-field";

export function GoogleFontSelect({
  value,
  onChange,
}: {
  value: CertificateFieldFont;
  onChange: (fontFamily: CertificateFieldFont) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentFonts, setRecentFonts] = useState<string[]>(getRecentFonts);
  const [favoriteFonts, setFavoriteFonts] =
    useState<string[]>(getFavoriteFonts);

  const filteredFonts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const list = normalizedQuery
      ? certificateFonts.filter((font) =>
          font.toLowerCase().includes(normalizedQuery),
        )
      : certificateFonts;
    return list;
  }, [query]);

  const fontLoadVersion = useGoogleFontLoader([
    value,
    ...filteredFonts,
    ...recentFonts,
    ...favoriteFonts,
  ]);

  const isFailed = failedFonts.has(value);

  // Build filtered recent/favorite lists (only when not searching)
  const isSearching = query.trim().length > 0;
  const filteredRecent = isSearching
    ? []
    : recentFonts.filter((f) => googleCertificateFontSet.has(f));
  const filteredFavorites = isSearching
    ? []
    : favoriteFonts.filter((f) => googleCertificateFontSet.has(f));

  function handleSelect(font: CertificateFieldFont) {
    addRecentFont(font);
    onChange(font);
    setOpen(false);
    setQuery("");
  }

  function handleToggleFavorite(e: React.MouseEvent, font: string) {
    e.stopPropagation();
    const next = toggleFavoriteFont(font);
    setFavoriteFonts(next);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setRecentFonts(getRecentFonts());
      setFavoriteFonts(getFavoriteFonts());
    }
  }

  function renderFontItem(font: string) {
    const isFav = favoriteFonts.includes(font);
    const failed = failedFonts.has(font);

    return (
      <div
        key={font}
        className={cn(
          "group/font flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-accent",
          font === value && "bg-accent text-accent-foreground",
          failed && "opacity-50",
        )}
      >
        <button
          type="button"
          className="flex-1 truncate text-left outline-none"
          onClick={() => handleSelect(font)}
        >
          <span
            className="truncate text-sm"
            style={{
              fontFamily: failed ? "Arial, sans-serif" : getFontStack(font),
            }}
          >
            {font}
            {failed && (
              <span className="ml-1.5 text-[9px] font-normal text-destructive">
                (fallback)
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded transition-all outline-none",
            isFav
              ? "text-amber-500"
              : "text-muted-foreground/30 opacity-0 group-hover/font:opacity-100",
          )}
          onClick={(e) => handleToggleFavorite(e, font)}
        >
          <Star
            className={cn(
              "size-3 transition-transform",
              isFav && "fill-amber-500 scale-110",
            )}
          />
        </button>
        {font === value ? <Check className="size-3 shrink-0" /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger className="group relative flex w-full items-center gap-0 overflow-hidden rounded-md border text-left transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary outline-none">
          <div className="flex h-10 flex-1 items-center px-3 py-2">
            <span
              className={cn("truncate text-sm", isFailed && "text-destructive")}
              style={{
                fontFamily: isFailed ? "Arial, sans-serif" : getFontStack(value),
              }}
            >
              {value}
              {isFailed && (
                <span className="ml-1.5 text-[9px] font-normal opacity-60">
                  (fallback)
                </span>
              )}
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
          <div className="max-h-64 overflow-auto pr-1 custom-scrollbar">
            {/* Favorites section */}
            {filteredFavorites.length > 0 && (
              <div className="mb-3" key={`favs-${fontLoadVersion}`}>
                <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  <Star className="size-2.5 fill-amber-500" />
                  Favorites
                </p>
                {filteredFavorites.map((font) => renderFontItem(font))}
              </div>
            )}

            {/* Recent section */}
            {filteredRecent.length > 0 && (
              <div className="mb-3" key={`recent-${fontLoadVersion}`}>
                <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="size-2.5" />
                  Recent
                </p>
                {filteredRecent.map((font) => renderFontItem(font))}
              </div>
            )}

            {/* Separator if we showed favorites or recents */}
            {(filteredFavorites.length > 0 || filteredRecent.length > 0) && (
              <Separator className="my-2 opacity-30" />
            )}

            {/* All fonts – flat alphabetical */}
            {filteredFonts.length > 0 && (
              <div key={`all-${fontLoadVersion}`}>
                {!isSearching && (
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    All Fonts
                  </p>
                )}
                {filteredFonts.map((font) => renderFontItem(font))}
              </div>
            )}
            {!filteredFonts.length &&
            !filteredFavorites.length &&
            !filteredRecent.length ? (
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
