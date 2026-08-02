# Tradutor de Runas

A browser-based translator that converts Portuguese text into a constructed written language using stacked letter fractions. Hosted as a static site on GitHub Pages — no build step, no dependencies, no installation required.

---

## How to run

ES modules require `http://` or `https://` — opening `index.html` directly via `file://` will not work due to browser CORS restrictions.

### macOS / Linux

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Windows

**Option 1 — Python (recommended, works if Python is installed):**

Open Command Prompt or PowerShell in the project folder and run:

```cmd
python -m http.server 8000
```

If `python` is not recognised, try `python3` instead. Then open `http://localhost:8000` in your browser.

**Option 2 — Node.js (`npx`):**

If you have Node.js installed:

```cmd
npx serve .
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

**Option 3 — VS Code Live Server:**

Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code, right-click `index.html` in the explorer, and select **Open with Live Server**. It opens the page automatically in your browser.

---

## Project structure

```
tradutor-de-runas/
├── index.html          # markup — translator view + settings modal
├── style.css           # all styling
├── fonts/              # bundled .otf font files
│   ├── Bring Me A Helicopter.otf
│   ├── EBGaramond-Regular.otf
│   └── Super Bouncer.otf
└── js/
    ├── main.js         # boot sequence — loads state, wires modules
    ├── translator.js   # language rules, tokeniser, fraction renderer
    ├── fonts.js        # font picker dropdown and @font-face management
    ├── settings.js     # settings modal (font upload, backgrounds, reset)
    ├── glyphs.js       # glyph data store (used by settings JSON import)
    ├── storage.js      # localStorage abstraction
    └── tabs.js         # tab switching
```

---

## The written language — rules

### Core concept

Text is written as a series of **fractions**: pairs of letters stacked vertically, separated by a horizontal bar. One letter sits above the bar (top), one below (bottom). There are no spaces between words — the whole input is one continuous stream of fractions.

```
  A        ← top letter
 ───       ← bar
  B        ← bottom letter
```

### Letter placement rules

Given any two consecutive letters, the following rules determine which goes on top and which on the bottom:

| Pair type | Top | Bottom |
|---|---|---|
| Vowel + Consonant | Vowel | Consonant |
| Consonant + Vowel | Vowel | Consonant |
| Vowel + Vowel | 1st letter | 2nd letter |
| Consonant + Consonant | Alphabetically later | Alphabetically earlier |

The vowels are: **A, E, I, O, U** (including their accented forms: Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ü).

Accented characters display with their accent mark in the chosen font (e.g. `Á` renders as `Á`, not `A`).

#### Examples

| Input pair | Type | Top | Bottom |
|---|---|---|---|
| `á` + `r` | V + C | Á | R |
| `v` + `o` | C + V | O | V |
| `a` + `e` | V + V | A | E |
| `s` + `t` | C + C | T | S (s comes before t) |
| `h` + `m` | C + C | M | H (h comes before m) |

### Words and spacing

Spaces are **ignored**. The entire input — regardless of how many words — is treated as one continuous letter stream and paired left-to-right.

```
"te amo"  →  stream: T E A M O  →  [E/T] [A/M] [O/#]
```

### Special symbols

#### Finito — `#`

Used when a run of letters has an **odd count**. The last letter cannot form a complete pair, so `#` fills the bottom slot as a stand-in second letter.

```
"sol"  →  S O L  →  [O/S] [L/#]
          (3 letters — L pairs with finito)
```

#### Corte — `-`

Acts as a word separator, similar to a hyphen. It **delimits runs** of letters for the purpose of counting odd/even pairs.

If a run ends with an **odd number of letters** and is immediately followed by a `-`, the corte fills the finito slot instead of `#` — serving double duty as both separator and pair-closer:

```
"abc-"  →  A B C -  →  [A/B] [C/-]
           (C pairs with corte instead of #)
```

If the run before `-` has an **even** count, the corte renders as a standalone centered symbol:

```
"hm-"  →  H M -  →  [M/H] [-]
           (HM is even, corte is standalone)
```

#### Dúvida — `?`

The question mark. Occupies a **full fraction space by itself**, centered on the Y axis, with no bar. It appears inline at whichever position it is typed.

```
"olá?"  →  O L Á ?  →  [O/L] [Á/#] [?]
            (olá is 3 letters → Á pairs with finito, then dúvida)
```

### Full examples

#### "árvore"

Letters: Á R V O R E (6 — even)

| Pair | Type | Result |
|---|---|---|
| Á + R | V + C | Á top, R bottom |
| V + O | C + V | O top, V bottom |
| R + E | C + V | E top, R bottom |

Output: `[Á/R] [O/V] [E/R]`

#### "olá?"

Letters: O L Á (3 — odd) + dúvida

| Pair | Type | Result |
|---|---|---|
| O + L | V + C | O top, L bottom |
| Á + # | finito | Á top, # bottom |
| ? | dúvida | ? centered alone |

Output: `[O/L] [Á/#] [?]`

#### "bom dia"

Spaces stripped → Letters: B O M D I A (6 — even)

| Pair | Type | Result |
|---|---|---|
| B + O | C + V | O top, B bottom |
| M + D | C + C | M top, D bottom (d < m) |
| I + A | V + V | I top, A bottom |

Output: `[O/B] [M/D] [I/A]`

#### "te amo"

Spaces stripped → Letters: T E A M O (5 — odd)

| Pair | Type | Result |
|---|---|---|
| T + E | C + V | E top, T bottom |
| A + M | V + C | A top, M bottom |
| O + # | finito | O top, # bottom |

Output: `[E/T] [A/M] [O/#]`

---

## Fonts

Three fonts are bundled in the `fonts/` directory and appear in the dropdown picker at the top-right corner of the page:

- **Bring Me A Helicopter** — decorative display font
- **EB Garamond** — classic old-style serif
- **Super Bouncer** — rounded, playful

Additional `.otf` fonts can be uploaded via the settings modal (⚙️ → Adicionar fonte). Uploaded fonts are added to the dropdown and persist across page reloads via localStorage. The "Limpar Fontes" button in the settings modal removes all uploaded fonts and reverts the dropdown to the three bundled options.

---

## Settings (⚙️)

| Setting | Description |
|---|---|
| Adicionar fonte (.otf) | Upload a custom .otf font — adds it to the dropdown picker |
| Limpar Fontes | Removes all uploaded fonts, reverts to bundled set |
| Plano de fundo geral do site | Custom background image for the whole page |
| Fundo da área onde as runas aparecem | Custom background for the translation output area |
| Redefinir ao padrão | Clears all background images |

All settings persist in localStorage and are restored on the next page load.

---

## Interaction

- **Click a fraction** to flip its top and bottom letters (swap their positions). Click again to revert. Fractions containing finito (`#`) or corte (`-`) cannot be flipped.
- **Limpar button** (under the text input) resets all flips.
- The input panel fades out after 5 seconds of inactivity and reappears on any interaction.
