/* ============================================================
   SETTINGS MODAL — font import + background images
   ============================================================ */

import { storageGet, storageSet } from './storage.js';
import { addUploadedFont, clearUploadedFonts } from './fonts.js';

let siteSettings = { bgSite: null, bgTranslator: null };

async function persistSiteSettings() {
  await storageSet('siteSettingsV1', JSON.stringify(siteSettings));
}

/* ============================================================
   BACKGROUNDS
   ============================================================ */
function getBgTarget(key) {
  if (key === 'bgSite')       return document.documentElement;
  if (key === 'bgTranslator') return document.querySelector('.canvas-wrap');
  return null;
}

function applyBackgroundDirect(key, url) {
  const el = getBgTarget(key);
  if (!el) return;
  if (url) {
    el.style.backgroundImage = `url("${url}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat = 'no-repeat';
  } else {
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
    el.style.backgroundRepeat = '';
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function wireBackgroundField(key, fileInputId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      applyBackgroundDirect(key, dataUrl);
      siteSettings[key] = dataUrl;
      await persistSiteSettings();
    } catch (e) { /* ignore read failure */ }
  });
}

/* ============================================================
   INIT
   ============================================================ */
export async function initSettings() {
  // Modal open / close
  const gearBtn       = document.getElementById('gearBtn');
  const settingsModal = document.getElementById('settingsModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  gearBtn.addEventListener('click', () => settingsModal.classList.add('open'));
  modalCloseBtn.addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('open'); });

  // ----- Font import (adds to dropdown in fonts.js) -----
  const fontImportFile = document.getElementById('fontImportFile');
  if (fontImportFile) {
    fontImportFile.addEventListener('change', async () => {
      const file = fontImportFile.files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        const name = file.name.replace(/\.[^.]+$/, '');
        await addUploadedFont(name, dataUrl);
        settingsModal.classList.remove('open');
      } catch (e) {
        console.error('Font upload failed:', e);
        alert('Não foi possível carregar a fonte.');
      }
      fontImportFile.value = '';
    });
  }

  // ----- Clear uploaded fonts -----
  document.getElementById('clearFontsBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const original = btn.textContent;
    await clearUploadedFonts();
    btn.textContent = 'Limpo!';
    setTimeout(() => { btn.textContent = original; }, 1200);
  });

  // ----- Background file inputs -----
  wireBackgroundField('bgSite',       'bgSiteFile');
  wireBackgroundField('bgTranslator', 'bgTranslatorFile');

  // ----- Reset backgrounds -----
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    applyBackgroundDirect('bgSite',       null);
    applyBackgroundDirect('bgTranslator', null);
    siteSettings.bgSite       = null;
    siteSettings.bgTranslator = null;
    await persistSiteSettings();
  });

  // ----- Load saved preferences and apply -----
  try {
    const stored = await storageGet('siteSettingsV1');
    if (stored) {
      const parsed = JSON.parse(stored);
      siteSettings = {
        bgSite:       parsed.bgSite       ?? null,
        bgTranslator: parsed.bgTranslator ?? null,
      };
    }
  } catch (e) { /* keep defaults */ }

  if (siteSettings.bgSite)       applyBackgroundDirect('bgSite',       siteSettings.bgSite);
  if (siteSettings.bgTranslator) applyBackgroundDirect('bgTranslator', siteSettings.bgTranslator);
}