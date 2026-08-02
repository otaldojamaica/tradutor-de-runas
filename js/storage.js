/* ============================================================
   STORAGE ABSTRACTION
   Works when served over http/https (GitHub Pages, local server).
   Falls back to localStorage when window.storage is not present.
   ============================================================ */

export async function storageGet(key) {
  if (window.storage) {
    try { const r = await window.storage.get(key); return r ? r.value : null; } catch (e) { return null; }
  }
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export async function storageSet(key, value) {
  if (window.storage) {
    try { await window.storage.set(key, value); return; } catch (e) { /* fall through */ }
  }
  try { localStorage.setItem(key, value); } catch (e) {}
}
