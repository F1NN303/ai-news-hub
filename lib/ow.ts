// lib/ow.ts
export type Platform = "pc" | "xbl" | "psn" | "switch";

export function normalizeBattleTag(raw: string) {
  const s = raw.trim();
  if (!s || s.length > 32) throw new Error("Invalid BattleTag format.");
  const dash = s.replace("#", "-");
  const encoded = encodeURIComponent(s);
  return { dash, encoded };
}

/**
 * Ersetzt Platzhalter im Pfad:
 * {platform}, {region}, {btag}, {btag_dash}, {btag_encoded}
 * Beispiel: "/players/{platform}/{btag_dash}"
 */
export function buildApiUrl(base: string, pathTpl: string, opt: {
  platform: string; region?: string; btagRaw: string;
}) {
  const { dash, encoded } = normalizeBattleTag(opt.btagRaw);
  const region = opt.region ?? "eu";
  const platform = opt.platform ?? "pc";

  const path = pathTpl
    .replaceAll("{platform}", platform)
    .replaceAll("{region}", region)
    .replaceAll("{btag}", opt.btagRaw)
    .replaceAll("{btag_dash}", dash)
    .replaceAll("{btag_encoded}", encoded);

  const baseTrim = base.replace(/\/+$/,"");
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  return `${baseTrim}${pathNorm}`;
}
