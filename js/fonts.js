/* ============================================================
   FONTS
   Manages the font picker dropdown (top-right).
   Bundled fonts are registered via URL references.
   Uploaded fonts are registered via base64 data URLs and
   persisted in storage so they survive page reloads.
   ============================================================ */

import { storageGet, storageSet } from './storage.js';

/* ---------- bundled fonts shipped with the project ---------- */
const BUNDLED_FONTS = [
  { name: 'Padrão (Arial)',        family: null,                  src: null,                              format: null         },
  { name: 'Bring Me A Helicopter', family: 'BringMeAHelicopter',  src: 'fonts/Bring Me A Helicopter.otf', format: 'truetype'   },
  { name: 'EB Garamond',           family: 'EBGaramond',          src: 'fonts/EBGaramond-Regular.otf',    format: 'opentype'   },
  { name: 'Super Bouncer',         family: 'SuperBouncer',         src: 'fonts/Super Bouncer.otf',         format: 'opentype'   },
];

/* ---------- runtime font list (bundled + uploaded) ---------- */
let fonts = [...BUNDLED_FONTS];    // { name, family, src } — src is URL or dataUrl
let activeFontFamily = null;       // currently applied CSS family name

/* ---------- style element that holds all @font-face rules ---------- */
function getFontStyleEl() {
  let el = document.getElementById('translator-font-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'translator-font-style';
    document.head.appendChild(el);
  }
  return el;
}

/* ---------- detect format for @font-face ---------- */
function fontFormat(f) {
  if (f.format) return f.format;
  // uploaded fonts: infer from data URL mime or fall back to opentype
  if (f.src && f.src.startsWith('data:font/ttf')) return 'truetype';
  if (f.src && f.src.startsWith('data:font/otf')) return 'opentype';
  return 'opentype';
}

/* ---------- rebuild @font-face declarations ---------- */
function rebuildFontFaces() {
  const rules = fonts
    .filter(f => f.family && f.src)
    .map(f => `@font-face { font-family: '${f.family}'; src: url("${f.src}") format("${fontFormat(f)}"); font-display: swap; }`)
    .join('\n');
  getFontStyleEl().textContent = rules;
}

/* ---------- apply a font by family name ---------- */
function applyFont(family) {
  activeFontFamily = family;
  if (family) {
    document.documentElement.style.setProperty('--translator-font', `'${family}'`);
  } else {
    document.documentElement.style.removeProperty('--translator-font');
  }
}

/* ---------- rebuild the <select> options ---------- */
function rebuildSelect() {
  const select = document.getElementById('fontSelect');
  if (!select) return;
  select.innerHTML = '';
  fonts.forEach((f, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = f.name;
    // preview the font in the option itself where supported
    if (f.family) opt.style.fontFamily = f.family;
    if (f.family === activeFontFamily || (!f.family && !activeFontFamily)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

/* ---------- select handler ---------- */
function onSelectChange(e) {
  const font = fonts[Number(e.target.value)];
  if (!font) return;
  applyFont(font.family);
  storageSet('activeFontFamily', font.family ?? '').catch(() => {});
}

/* ---------- add an uploaded font (called from settings.js) ---------- */
export async function addUploadedFont(name, dataUrl) {
  // Derive a safe CSS family name from the filename
  const family = 'UploadedFont_' + name.replace(/[^a-zA-Z0-9]/g, '_');

  // Replace existing upload with same name, or append
  const existing = fonts.findIndex(f => f.name === name);
  if (existing >= 0) {
    fonts[existing] = { name, family, src: dataUrl };
  } else {
    fonts.push({ name, family, src: dataUrl });
  }

  // Update UI immediately — do not block on storage
  rebuildFontFaces();
  rebuildSelect();
  applyFont(family);

  // Persist in background (silently ignore quota errors)
  const uploaded = fonts.filter(f => f.src && f.src.startsWith('data:'));
  storageSet('uploadedFontsV1', JSON.stringify(uploaded)).catch(() => {});
  storageSet('activeFontFamily', family).catch(() => {});
}

/* ---------- clear all fonts (bundled + uploaded), keep only default ---------- */
export async function clearUploadedFonts() {
  // Keep only the default "Padrão (Arial)" entry
  fonts = [BUNDLED_FONTS[0]];

  // Rebuild @font-face (none left) and dropdown
  rebuildFontFaces();
  rebuildSelect();

  // Revert to default (Arial)
  applyFont(null);

  // Clear persisted uploads and active selection, and remember
  // that bundled fonts were cleared so they don't come back on reload
  storageSet('uploadedFontsV1', JSON.stringify([])).catch(() => {});
  storageSet('activeFontFamily', '').catch(() => {});
  storageSet('fontsCleared', '1').catch(() => {});
}

/* ---------- bring back the fonts shipped with the project ---------- */
export async function restoreBundledFonts() {
  const uploaded = fonts.filter(f => f.src && f.src.startsWith('data:'));
  fonts = [...BUNDLED_FONTS, ...uploaded];

  rebuildFontFaces();
  rebuildSelect();
  applyFont(null);

  storageSet('fontsCleared', '0').catch(() => {});
  storageSet('activeFontFamily', '').catch(() => {});
}

/* ---------- init ---------- */
export async function initFonts() {
  // Check if the user previously cleared everything down to just "Padrão"
  let cleared = false;
  try { cleared = (await storageGet('fontsCleared')) === '1'; } catch (e) { /* ignore */ }

  if (cleared) {
    fonts = [BUNDLED_FONTS[0]];
  } else {
    // Register bundled @font-faces
    rebuildFontFaces();
  }

  // Load persisted uploaded fonts and merge into list
  try {
    const stored = await storageGet('uploadedFontsV1');
    if (stored) {
      const uploaded = JSON.parse(stored);
      uploaded.forEach(f => {
        if (!fonts.find(x => x.name === f.name)) fonts.push(f);
      });
      rebuildFontFaces();
    }
  } catch (e) { /* ignore */ }

  // Restore active font selection
  try {
    const saved = await storageGet('activeFontFamily');
    if (saved !== null) {
      activeFontFamily = saved || null;
      applyFont(activeFontFamily);
    }
  } catch (e) { /* ignore */ }

  // Build select and wire change event
  rebuildSelect();
  const select = document.getElementById('fontSelect');
  if (select) select.addEventListener('change', onSelectChange);
}