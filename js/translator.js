/* ============================================================
   TRANSLATOR
   Converts typed text into rune fractions (stacked glyph pairs)
   and renders them into #output.

   RULES
   ─────
   • Spaces are stripped; the whole input is one continuous letter stream.
   • Words (runs between cortes/dúvidas) are paired left-to-right.
   • Placement within a pair:
       V + C  or  C + V  →  vowel on TOP,  consonant on BOTTOM
       V + V              →  1st on TOP,    2nd on BOTTOM
       C + C              →  alphabetically LATER on TOP,
                              alphabetically EARLIER on BOTTOM
   • Odd run → last letter pairs with finito '#' on the BOTTOM,
     UNLESS the next token is a corte '-', which then fills that
     bottom slot instead (consuming the corte).
   • '-' (corte) not consumed by finito logic renders as a lone centered symbol.
   • '?' (dúvida) is an inline full-fraction, centered on the Y axis.
   ============================================================ */

/* ============================================================
   ACCENT DECOMPOSITION
   ============================================================ */

/* Returns { letter, display, accent }
     letter  — base A-Z letter (used for placement rules)
     display — the character to actually render (preserves accent marks)
     accent  — 'til' | 'acento' | 'none'                               */
function getBaseAndAccent(rawChar) {
  const c = rawChar.toUpperCase();
  const map = {
    'Á': ['A', 'acento'], 'À': ['A', 'acento'], 'Â': ['A', 'acento'], 'Ã': ['A', 'til'],
    'É': ['E', 'acento'], 'Ê': ['E', 'acento'],
    'Í': ['I', 'acento'],
    'Ó': ['O', 'acento'], 'Ô': ['O', 'acento'], 'Õ': ['O', 'til'],
    'Ú': ['U', 'acento'], 'Ü': ['U', 'none'],
    'Ç': ['C', 'none']
  };
  if (map[c]) return { letter: map[c][0], display: c, accent: map[c][1] };
  if (/[A-Z]/.test(c)) return { letter: c, display: c, accent: 'none' };
  return null;
}

/* ============================================================
   VOWEL / PLACEMENT HELPERS
   ============================================================ */
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function isVowel(letterObj) { return VOWELS.has(letterObj.letter); }

/* Finito and corte sentinel letter objects */
const FINITO = { letter: '#', display: '#', accent: 'none', special: 'finito' };
const CORTE  = { letter: '-', display: '-', accent: 'none', special: 'corte'  };

/* Given two letter objects in reading order, return { top, bottom }
   applying the placement rules.
   Special (finito/corte) always goes on the bottom.               */
function placePair(a, b) {
  // Special sentinels always go on the bottom
  if (b.special) return { top: a, bottom: b };

  const aVowel = isVowel(a), bVowel = isVowel(b);

  if (aVowel && !bVowel) return { top: a, bottom: b };   // V+C → vowel top
  if (!aVowel && bVowel) return { top: b, bottom: a };   // C+V → vowel top
  if (aVowel && bVowel)  return { top: a, bottom: b };   // V+V → 1st top

  // C+C → alphabetically earlier on BOTTOM, later on TOP
  if (a.letter <= b.letter) return { top: b, bottom: a };
  return { top: a, bottom: b };
}

/* ============================================================
   TOKENISE
   Produces a flat list of tokens:
     { type: 'letter', ...letterObj }
     { type: 'corte' }
     { type: 'duvida' }
   Spaces are ignored entirely.
   ============================================================ */
function tokenize(text) {
  const tokens = [];
  for (const ch of text) {
    if (ch === ' ') continue;                              // strip spaces
    if (ch === '-') { tokens.push({ type: 'corte' });  continue; }
    if (ch === '?') { tokens.push({ type: 'duvida' }); continue; }
    const ba = getBaseAndAccent(ch);
    if (ba) tokens.push({ type: 'letter', ...ba });
  }
  return tokens;
}

/* ============================================================
   BUILD FRACTIONS
   Converts the token stream into render items:
     { kind: 'fraction', top, bottom, special: bool }
     { kind: 'duvida' }
     { kind: 'corte' }          ← standalone corte (not consumed as finito)
   ============================================================ */
function buildFractions(tokens) {
  const items = [];
  let run = [];   // accumulated letter tokens

  function flushRun(nextToken) {
    if (run.length === 0) return;

    let i = 0;
    while (i < run.length) {
      if (i === run.length - 1) {
        // Odd leftover — needs a partner
        const last = run[i];
        if (nextToken && nextToken.type === 'corte') {
          // Corte fills the finito slot; consume it (signal via return value)
          const pair = placePair(last, CORTE);
          items.push({ kind: 'fraction', top: pair.top, bottom: pair.bottom, special: true });
          run = [];
          return true; // corte was consumed
        } else {
          // Finito fills the slot
          const pair = placePair(last, FINITO);
          items.push({ kind: 'fraction', top: pair.top, bottom: pair.bottom, special: true });
        }
        i += 1;
      } else {
        const a = run[i], b = run[i + 1];
        const pair = placePair(a, b);
        items.push({ kind: 'fraction', top: pair.top, bottom: pair.bottom, special: false });
        i += 2;
      }
    }
    run = [];
    return false; // corte not consumed
  }

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.type === 'letter') {
      run.push(tok);
    } else if (tok.type === 'corte') {
      const consumed = flushRun(tok);
      if (!consumed) {
        // Standalone corte
        items.push({ kind: 'corte' });
      }
    } else if (tok.type === 'duvida') {
      flushRun(null);
      items.push({ kind: 'duvida' });
    }
  }
  flushRun(null); // flush any remaining letters
  return items;
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */
function letterText(display, y) {
  return `<text class="glyph-text" x="50" y="${y}" text-anchor="middle" dominant-baseline="central">${display}</text>`;
}

let flipOverrides = {};

/* Fraction: top letter (y=68), bar (y=90), bottom letter (y=112).
   Flip is disabled for special fractions (finito/corte in the slot). */
function renderFraction(item, idx) {
  const flipped = !item.special && !!flipOverrides[idx];
  const top    = flipped ? item.bottom : item.top;
  const bottom = flipped ? item.top    : item.bottom;

  return `<div class="frac${item.special ? ' no-flip' : ''}" data-idx="${idx}">
    <svg width="76" height="130" viewBox="0 0 100 180">
      ${letterText(top.display,    68)}
      <line class="bar" x1="8" y1="90" x2="92" y2="90" />
      ${letterText(bottom.display, 112)}
    </svg>
  </div>`;
}

/* Dúvida: full-fraction, single '?' centered at y=90. No bar. */
function renderDuvida() {
  return `<div class="frac duvida" style="cursor:default">
    <svg width="76" height="130" viewBox="0 0 100 180">
      ${letterText('?', 90)}
    </svg>
  </div>`;
}

/* Standalone corte: lone '-' centered. */
function renderCorteStandalone() {
  return `<div class="frac corte-solo" style="cursor:default">
    <svg width="76" height="130" viewBox="0 0 100 180">
      ${letterText('-', 90)}
    </svg>
  </div>`;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
export function renderTranslator() {
  const raw = document.getElementById('wordInput').value;
  const out = document.getElementById('output');
  out.innerHTML = '';
  flipOverrides = Object.assign({}, flipOverrides); // keep existing flips

  if (!raw.trim()) {
    out.innerHTML = '';
    return;
  }

  const tokens  = tokenize(raw);
  const items   = buildFractions(tokens);
  const wrap    = document.createElement('div');
  wrap.className = 'word-group';

  items.forEach((item, idx) => {
    const div = document.createElement('div');

    if (item.kind === 'fraction') {
      div.innerHTML = renderFraction(item, idx);
      const el = div.firstElementChild;
      if (!item.special) {
        el.addEventListener('click', () => {
          flipOverrides[idx] = !flipOverrides[idx];
          renderTranslator();
        });
      }
      wrap.appendChild(el);

    } else if (item.kind === 'duvida') {
      div.innerHTML = renderDuvida();
      wrap.appendChild(div.firstElementChild);

    } else if (item.kind === 'corte') {
      div.innerHTML = renderCorteStandalone();
      wrap.appendChild(div.firstElementChild);
    }
  });

  out.appendChild(wrap);
}

/* ============================================================
   SCROLL — follow translation area growth
   ============================================================ */
function followTranslatorGrowth() {
  const wrap = document.querySelector('.canvas-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const overflow = rect.bottom - window.innerHeight;
  if (overflow > 40) window.scrollBy({ top: overflow + 40, behavior: 'smooth' });
}

/* ============================================================
   IDLE PANEL — fades after 5s of inactivity
   ============================================================ */
let idleTimer = null;
const SCROLL_THRESHOLD = 24; // px — abaixo disso, considera-se "topo" (não rolado)

function resetIdlePanel() {
  const panel = document.querySelector('.panel');
  if (!panel) return;

  panel.classList.remove('idle');
  clearTimeout(idleTimer);

  // Só agenda o fade se a página estiver rolada para baixo.
  // Na posição normal (topo), o painel nunca fica invisível por AFK.
  if (window.scrollY <= SCROLL_THRESHOLD) return;

  idleTimer = setTimeout(() => {
    if (window.scrollY > SCROLL_THRESHOLD) panel.classList.add('idle');
  }, 3000);
}

/* ============================================================
   INIT
   ============================================================ */
export function initTranslator() {
  document.getElementById('wordInput').addEventListener('input', () => {
    renderTranslator();
    requestAnimationFrame(followTranslatorGrowth);
  });

  document.getElementById('resetFlips').addEventListener('click', () => {
    flipOverrides = {};
    document.getElementById('wordInput').value = '';
    renderTranslator();
    document.getElementById('wordInput').focus();
  });

  ['keydown', 'scroll'].forEach(evt => {
    document.addEventListener(evt, resetIdlePanel, { passive: true });
  });
  resetIdlePanel();
}