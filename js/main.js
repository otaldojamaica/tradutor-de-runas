/* ============================================================
   MAIN — boot sequence
   Loads persisted state from storage, then initialises each
   module in the correct order.
   ============================================================ */

import { storageGet }                      from './storage.js';
import { setCustomGlyphs }                 from './glyphs.js';
import { initTranslator, renderTranslator } from './translator.js';
import { initTabs }                        from './tabs.js';
import { initSettings }                    from './settings.js';
import { initFonts }                       from './fonts.js';

(async function init() {
  // 1. Load persisted custom glyphs
  try {
    const stored = await storageGet('customGlyphsV2');
    if (stored) { setCustomGlyphs(JSON.parse(stored)); }
  } catch (e) { /* start fresh */ }

  // 2. Wire up tabs
  initTabs();

  // 3. Wire up font picker (registers bundled fonts, restores selection)
  await initFonts();

  // 4. Wire up settings modal
  await initSettings();

  // 5. Wire up translator input listeners and run the first render
  initTranslator();
  const wordInput = document.getElementById('wordInput');
  if (wordInput) wordInput.focus();
  renderTranslator();
})();