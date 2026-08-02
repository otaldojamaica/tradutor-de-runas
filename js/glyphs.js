/* ============================================================
   GLYPH DATA & MARKUP
   Default SVG path data for every letter and special symbol,
   plus the runtime customGlyphs store and the glyphMarkup helper
   used by the translator.
   ============================================================ */

export const DEFAULT_GLYPHS = {
  A: "M15,15 L50,50 L85,15 M50,50 L50,92",
  B: "M25,10 L25,90 M75,10 L75,90 M25,50 L75,50",
  C: "M25,10 L25,90 M75,10 L75,90 M25,50 L75,50 M75,90 L92,102",
  D: "M20,15 L80,15 M50,15 L50,85 M50,85 L70,98",
  E: "M25,10 L25,90 M25,10 L85,10",
  F: "M25,10 L25,90 M75,10 L75,90 M25,50 L75,50 M25,90 L8,102",
  G: "M15,15 L50,92 L85,15",
  H: "M30,20 Q82,20 82,45 Q82,70 30,70",
  I: "M25,15 Q88,8 55,40 Q22,55 75,75 Q92,86 60,98",
  J: "M65,12 L65,65 Q65,92 28,86",
  K: "M20,10 L20,90 M20,10 L75,90 M75,10 L75,90 M75,90 L92,102",
  L: "M25,12 L75,88 M60,88 L82,80",
  M: "M20,18 L80,18 M50,18 L50,92",
  N: "M20,10 L20,90 M20,10 L75,90 M75,10 L75,90",
  O: "M20,90 L20,15 L80,15 L80,90",
  P: "M35,15 L65,15 M50,15 L50,92",
  Q: "M35,10 L35,90 M35,50 L82,50",
  R: "M38,12 L38,88 M62,12 L62,88",
  S: "M25,10 L25,90 M75,10 L75,90 M25,50 L75,50 M25,90 L8,102 M75,90 L92,102",
  T: "M20,15 L50,50 L20,85 M50,50 L88,50",
  U: "M20,15 L20,55 Q20,80 50,80 Q80,80 80,55 L80,15 M50,15 L50,55 M50,80 L50,100",
  V: "M30,10 L30,90 M30,45 Q68,34 32,62 M32,62 Q70,58 40,92",
  W: "M28,12 L28,90 M28,50 Q68,40 65,58 Q62,88 38,90",
  X: "M78,15 L28,15 M28,15 L28,85 M28,85 L78,85",
  Y: "M28,22 Q82,14 72,42 Q64,64 28,58 Q14,56 22,76 Q30,96 62,88",
  Z: "M25,18 L65,18 M65,18 Q68,40 38,46"
};

export const DEFAULT_SPECIAL = {
  FINITO:      "M60,18 Q80,14 78,34 Q76,54 55,50 Q38,47 42,30 Q46,17 60,18 M54,50 Q50,72 33,78",
  CORTE:       "M50,8 Q30,8 30,24 Q30,40 55,45 Q78,50 78,66 Q78,88 56,88 Q34,88 34,72",
  DUVIDA:      "M15,15 L50,50 L85,15 M50,50 L50,92 M55,78 Q78,74 78,90 Q78,104 58,100 Q42,97 46,84 Q49,76 55,78",
  SOL:         "M50,32 A18,18 0 1,1 50,68 A18,18 0 1,1 50,32",
  SOL_TIL:     "M50,32 A18,18 0 1,1 50,68 A18,18 0 1,1 50,32 M20,50 L80,50",
  SOL_ACENTO:  "M50,32 A18,18 0 1,1 50,68 A18,18 0 1,1 50,32 M50,20 L50,80"
};

// customGlyphs[key] = { type:'raster', dataUrl:'data:image/png;base64,...' }
// (legacy format still supported to avoid losing existing drawings:
//  { strokes: [ {color, width, points:[{x,y},...]} , ... ] })
let customGlyphs = {};

export function getCustomGlyphs() { return customGlyphs; }

export function setCustomGlyphs(data) { customGlyphs = data; }

export function glyphMarkup(key, cls) {
  const custom = customGlyphs[key];
  if (custom) {
    if (custom.type === 'raster' && custom.dataUrl) {
      return `<image href="${custom.dataUrl}" xlink:href="${custom.dataUrl}" x="0" y="0" width="100" height="100" preserveAspectRatio="none" />`;
    }
    if (custom.strokes && custom.strokes.length) {
      return custom.strokes
        .filter(s => s.points && s.points.length > 1)
        .map(s => {
          const d = 'M' + s.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
          return `<path class="${cls}" d="${d}" style="stroke:${s.color}; stroke-width:${s.width};" />`;
        }).join('');
    }
  }
  const d = DEFAULT_GLYPHS[key] || DEFAULT_SPECIAL[key] || '';
  return `<path class="${cls}" d="${d}" />`;
}
