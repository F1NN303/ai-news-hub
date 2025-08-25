import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/ow";

// optionales Mini‑Rate‑Limit (pro Lambda‑Instanz)
const hits = new Map<string, { c: number; t: number }>();
const WINDOW_MS = 10_000;
const MAX_HITS = 20;
function rateLimit(key: string) {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now - rec.t > WINDOW_MS) { hits.set(key, { c:1, t:now }); return false; }
  rec.c++; if (rec.c > MAX_HITS) return true; return false;
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anon";
    if (rateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const urlIn = new URL(req.url);
    const btag = urlIn.searchParams.get("btag") ?? "";
    const platform = (urlIn.searchParams.get("platform") ?? "pc").toLowerCase();
    const region = (urlIn.searchParams.get("region") ?? "eu").toLowerCase();

    if (!btag) return NextResponse.json({ error: "Missing ?btag=" }, { status: 400 });
    if (!["pc","xbl","psn","switch"].includes(platform))
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

    // —— Konfiguration aus Env:
    const base = process.env.OW_API_BASE || "https://overfast-api.tekrop.fr";
    // Default (OverFast): /players/{platform}/{btag_dash}
    const pathTpl = process.env.OW_API_PATH || "/players/{platform}/{btag_dash}";
    // Beispiel timomak‑API: z. B. "/player/{platform}/{region}/{btag_dash}" (bitte aus Doku übernehmen)

    const target = buildApiUrl(base, pathTpl, { platform, region, btagRaw: btag });

    const upstream = await fetch(target, {
      headers: { "Accept": "application/json" },
      // optional: kurzer Revalidate
      next: { revalidate: 15 }
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error", status: upstream.status, body: text, target },
        { status: 502 }
      );
    }
    const data = text ? JSON.parse(text) : null;

    const res = NextResponse.json({ ok: true, data });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500 });
  }
}
