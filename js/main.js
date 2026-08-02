/* ============================================================
   MAIN — boot sequence
   Initialises each module in the correct order.
   ============================================================ */

import { initTranslator, renderTranslator } from './translator.js';
import { initSettings }                    from './settings.js';
import { initFonts }                       from './fonts.js';

(async function init() {
  // 1. Wire up font picker (registers bundled fonts, restores selection)
  await initFonts();

  // 2. Wire up settings modal
  await initSettings();

  // 3. Wire up translator input listeners and run the first render
  initTranslator();
  const wordInput = document.getElementById('wordInput');
  if (wordInput) wordInput.focus();
  renderTranslator();
})();