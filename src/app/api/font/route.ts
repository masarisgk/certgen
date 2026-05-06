import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function extractFontUrl(css: string) {
  const truetypeMatch = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('truetype'\)/);
  const woff2Match = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('woff2'\)/);
  const fallbackMatch = css.match(/url\((https:\/\/[^)]+)\)/);

  return truetypeMatch?.[1] ?? woff2Match?.[1] ?? fallbackMatch?.[1] ?? null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const family = searchParams.get("family");
  const weight = searchParams.get("weight") ?? "400";
  const italic = searchParams.get("italic") === "true" ? "1" : "0";

  if (!family) {
    return NextResponse.json({ error: "Missing font family" }, { status: 400 });
  }

  try {
    const familyQuery = family.trim().replace(/\s+/g, "+");
    const cssUrl = italic === "1"
      ? `https://fonts.googleapis.com/css2?family=${familyQuery}:ital,wght@1,${weight}&display=swap`
      : `https://fonts.googleapis.com/css2?family=${familyQuery}:wght@${weight}&display=swap`;
    const cssResponse = await fetch(cssUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "curl/8.0",
      },
    });

    if (!cssResponse.ok) {
      return NextResponse.json({ error: "Font CSS request failed" }, { status: 502 });
    }

    const fontUrl = extractFontUrl(await cssResponse.text());

    if (!fontUrl) {
      return NextResponse.json({ error: "Font URL not found" }, { status: 404 });
    }

    const fontResponse = await fetch(fontUrl, { cache: "no-store" });

    if (!fontResponse.ok) {
      return NextResponse.json({ error: "Font file request failed" }, { status: 502 });
    }

    const fontBytes = await fontResponse.arrayBuffer();
    const signature = Buffer.from(fontBytes).subarray(0, 4).toString("hex");
    const contentType = signature === "00010000" ? "font/ttf" : "font/woff2";

    return new NextResponse(fontBytes, {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: "Font proxy failed" }, { status: 500 });
  }
}
