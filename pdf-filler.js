/**
 * OmniTools — Remplir un PDF (Formulaire, Texte Direct & Signature Manuscrite)
 * 100% Client-Side with PDF.js & PDF-Lib
 */

import { showToast, initSharedUI } from './shared.js?v=4';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Storage Key for Saved Signatures
const SIG_STORAGE_KEY = 'omnitools_signatures_v1';

// DOM Elements: Step 1
const fillerStep1 = document.getElementById('filler-step-1');
const fillerStep2 = document.getElementById('filler-step-2');
const fillerDropzone = document.getElementById('filler-dropzone');
const fillerFileInput = document.getElementById('filler-file-input');
const fillerBrowseBtn = document.getElementById('filler-browse-btn');
const fillerSampleBtn = document.getElementById('filler-sample-btn');

// DOM Elements: Toolbar
const fillerSizeDec = document.getElementById('filler-size-dec');
const fillerSizeInc = document.getElementById('filler-size-inc');
const fillerSizeDisplay = document.getElementById('filler-size-display');
const fillerSignatureBtn = document.getElementById('filler-signature-btn');
const fillerNewBtn = document.getElementById('filler-new-btn');
const fillerDownloadBtn = document.getElementById('filler-download-btn');
const fillerPagesViewport = document.getElementById('filler-pages-viewport');

// DOM Elements: Signature Modal
const sigModal = document.getElementById('sig-modal');
const sigModalCloseBtn = document.getElementById('sig-modal-close-btn');
const sigCancelBtn = document.getElementById('sig-cancel-btn');
const sigInsertBtn = document.getElementById('sig-insert-btn');
const sigInsertBtnText = document.getElementById('sig-insert-btn-text');
const sigSavedSection = document.getElementById('sig-saved-section');
const sigSavedList = document.getElementById('sig-saved-list');
const sigCreateNewBtn = document.getElementById('sig-create-new-btn');
const sigDrawHeading = document.getElementById('sig-draw-heading');
const sigCanvas = document.getElementById('sig-canvas');
const sigClearBtn = document.getElementById('sig-clear-btn');
const sigMetaCheckbox = document.getElementById('sig-meta-checkbox');
const sigMetaPreview = document.getElementById('sig-meta-preview');
const sigColorBtns = document.querySelectorAll('.sig-color-btn');

// State
let currentPdfFile = null;
let currentPdfBuffer = null;
let currentPdfBytes = null;
let defaultFontSize = 14; // pixels
let loadedPages = [];     // Array of { pageIndex, pageNum, canvas, overlay }
let textItemCounter = 1;
let activeItemEl = null;
let lastActivePageIndex = 0;

// Signature State
let savedSignatures = [];
let sigCtx = null;
let isDrawingSig = false;
let hasSigStrokes = false;
let currentSigColor = '#0f172a';
let editingSigId = null;

export function initPdfFiller() {
  loadSavedSignatures();
  setupInputs();
  setupToolbarControls();
  setupSignatureModal();
  setupDownload();
}

/**
 * Load saved signatures from localStorage
 */
function loadSavedSignatures() {
  try {
    const raw = localStorage.getItem(SIG_STORAGE_KEY);
    if (raw) {
      savedSignatures = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read saved signatures:', err);
    savedSignatures = [];
  }
}

/**
 * Persist saved signatures to localStorage
 */
function persistSavedSignatures() {
  try {
    localStorage.setItem(SIG_STORAGE_KEY, JSON.stringify(savedSignatures));
  } catch (err) {
    console.warn('Could not persist signatures:', err);
  }
}

/**
 * Generate formatted timestamp string for electronic signature
 */
function getSignatureTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `Signé électroniquement le ${day}/${month}/${year} à ${hours}:${minutes}`;
}

function setupInputs() {
  if (!fillerDropzone) return;

  fillerBrowseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fillerFileInput.click();
  });

  fillerDropzone.addEventListener('click', () => {
    fillerFileInput.click();
  });

  fillerFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePdfFile(e.target.files[0]);
    }
  });

  // Drag & drop
  fillerDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fillerDropzone.classList.add('drag-active');
  });

  fillerDropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fillerDropzone.classList.remove('drag-active');
  });

  fillerDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    fillerDropzone.classList.remove('drag-active');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfFile(e.dataTransfer.files[0]);
    }
  });

  // Sample PDF Button
  fillerSampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      showToast('Chargement du formulaire de test...');
      const response = await fetch('sample.pdf');
      if (!response.ok) throw new Error('sample.pdf non trouvé');
      const blob = await response.blob();
      const file = new File([blob], 'formulaire-exemple.pdf', { type: 'application/pdf' });
      handlePdfFile(file);
    } catch (err) {
      console.warn('Fallback on sample.pdf fetch:', err);
      showToast('Erreur lors du chargement de l\'exemple.');
    }
  });

  // Global click to deselect text fields or clean up empty ones
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filler-text-item') && !e.target.closest('.filler-signature-item') && !e.target.closest('.filler-size-selector')) {
      document.querySelectorAll('.filler-text-item').forEach(el => {
        const inp = el.querySelector('.filler-text-input');
        const age = Date.now() - (parseInt(el.dataset.createdAt, 10) || 0);
        if (age > 400 && inp && !inp.innerText.trim()) {
          el.remove();
          if (activeItemEl === el) activeItemEl = null;
        } else {
          el.classList.remove('active');
        }
      });
      document.querySelectorAll('.filler-signature-item.active').forEach(el => el.classList.remove('active'));
      activeItemEl = null;
    }
  });
}

function setupToolbarControls() {
  // Global size selector
  fillerSizeDec.addEventListener('click', () => {
    updateDefaultFontSize(Math.max(8, defaultFontSize - 2));
  });

  fillerSizeInc.addEventListener('click', () => {
    updateDefaultFontSize(Math.min(48, defaultFontSize + 2));
  });

  // Signature action button
  if (fillerSignatureBtn) {
    fillerSignatureBtn.addEventListener('click', () => {
      openSignatureModal();
    });
  }

  fillerNewBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous ouvrir un autre document PDF ? Les modifications non enregistrées seront perdues.')) {
      resetFiller();
    }
  });
}

function updateDefaultFontSize(newSize) {
  defaultFontSize = newSize;
  fillerSizeDisplay.textContent = `${defaultFontSize} px`;

  // If a text item is currently active, update its font size as well
  if (activeItemEl && activeItemEl.classList.contains('filler-text-item')) {
    const input = activeItemEl.querySelector('.filler-text-input');
    const tag = activeItemEl.querySelector('.filler-size-tag');
    if (input) {
      input.style.fontSize = `${defaultFontSize}px`;
      activeItemEl.dataset.fontSize = defaultFontSize;
    }
    if (tag) tag.textContent = `${defaultFontSize}px`;
  }
}

async function handlePdfFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Veuillez sélectionner un fichier au format PDF.');
    return;
  }

  try {
    currentPdfFile = file;
    showToast(`Lecture de ${file.name}...`);

    const rawBuffer = await file.arrayBuffer();
    // Keep an intact Uint8Array copy so PDF.js Web Worker never detaches it
    currentPdfBytes = new Uint8Array(rawBuffer);
    currentPdfBuffer = currentPdfBytes.buffer;

    await renderPdfPages(currentPdfBytes.slice());

    fillerStep1.hidden = true;
    fillerStep2.hidden = false;
    showToast('Document prêt ! Cliquez n\'importe où pour écrire ou insérer votre signature.');
  } catch (err) {
    console.error('Error opening PDF:', err);
    showToast('Impossible d\'ouvrir ce fichier PDF.');
  }
}

/**
 * Render all pages of the PDF on canvas with clickable overlays
 */
async function renderPdfPages(pdfData) {
  fillerPagesViewport.innerHTML = '';
  loadedPages = [];
  lastActivePageIndex = 0;

  const dataCopy = pdfData instanceof Uint8Array ? pdfData.slice() : new Uint8Array(pdfData);
  const pdf = await pdfjs.getDocument({ data: dataCopy }).promise;
  const numPages = pdf.numPages;

  for (let pNum = 1; pNum <= numPages; pNum++) {
    const page = await pdf.getPage(pNum);
    const viewport = page.getViewport({ scale: 1.5 }); // High-DPI display scale

    const wrapper = document.createElement('div');
    wrapper.className = 'filler-page-card filler-page-wrapper';
    wrapper.dataset.pageIndex = pNum - 1;

    // Header label
    const pageHeader = document.createElement('div');
    pageHeader.className = 'filler-page-header';
    pageHeader.textContent = `Page ${pNum} sur ${numPages}`;
    wrapper.appendChild(pageHeader);

    // Canvas rendering
    const canvas = document.createElement('canvas');
    canvas.className = 'filler-page-canvas';
    const displayWidth = Math.round(viewport.width);
    const displayHeight = Math.round(viewport.height);
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    wrapper.appendChild(canvas);

    // Interactive Text & Signature Overlay
    const overlay = document.createElement('div');
    overlay.className = 'filler-page-overlay';
    overlay.style.width = `${displayWidth}px`;
    overlay.style.height = `${displayHeight}px`;

    // Click on overlay to add text field
    overlay.addEventListener('click', (e) => {
      lastActivePageIndex = pNum - 1;

      // Only trigger if clicked on the overlay itself, not inside an existing item
      if (e.target !== overlay) return;
      e.stopPropagation();

      // Clean up previous text fields that were left empty
      document.querySelectorAll('.filler-text-item').forEach(el => {
        const inp = el.querySelector('.filler-text-input');
        const age = Date.now() - (parseInt(el.dataset.createdAt, 10) || 0);
        if (age > 400 && inp && !inp.innerText.trim()) {
          el.remove();
          if (activeItemEl === el) activeItemEl = null;
        }
      });

      const rect = overlay.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      createTextField(pNum - 1, overlay, clickX, clickY, '', defaultFontSize);
    });

    wrapper.appendChild(overlay);
    fillerPagesViewport.appendChild(wrapper);

    loadedPages.push({
      pageIndex: pNum - 1,
      pageNum: pNum,
      canvas,
      overlay,
      displayWidth,
      displayHeight
    });
  }
}

/**
 * Create a new interactive editable text box
 */
function createTextField(pageIndex, overlay, x, y, initialText = '', fontSize = defaultFontSize) {
  const itemId = `text-item-${textItemCounter++}`;

  const itemEl = document.createElement('div');
  itemEl.className = 'filler-text-item active';
  itemEl.id = itemId;
  itemEl.dataset.pageIndex = pageIndex;
  itemEl.dataset.fontSize = fontSize;
  itemEl.dataset.createdAt = Date.now().toString();
  itemEl.style.left = `${Math.max(4, Math.round(x))}px`;
  itemEl.style.top = `${Math.max(4, Math.round(y))}px`;

  // Item Toolbar (A-, size, A+, delete, drag handle)
  const bar = document.createElement('div');
  bar.className = 'filler-item-bar';

  const dragHandle = document.createElement('span');
  dragHandle.className = 'filler-drag-handle';
  dragHandle.innerHTML = '⠿';
  dragHandle.title = 'Glisser pour déplacer';

  const btnDec = document.createElement('button');
  btnDec.type = 'button';
  btnDec.className = 'filler-btn-micro';
  btnDec.textContent = 'A-';
  btnDec.title = 'Diminuer la taille';

  const sizeTag = document.createElement('span');
  sizeTag.className = 'filler-size-tag';
  sizeTag.textContent = `${fontSize}px`;

  const btnInc = document.createElement('button');
  btnInc.type = 'button';
  btnInc.className = 'filler-btn-micro';
  btnInc.textContent = 'A+';
  btnInc.title = 'Agrandir la taille';

  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'filler-btn-micro filler-btn-delete';
  btnDel.innerHTML = '&times;';
  btnDel.title = 'Supprimer ce champ';

  bar.appendChild(dragHandle);
  bar.appendChild(btnDec);
  bar.appendChild(sizeTag);
  bar.appendChild(btnInc);
  bar.appendChild(btnDel);

  // Editable Input
  const input = document.createElement('div');
  input.className = 'filler-text-input';
  input.contentEditable = 'true';
  input.style.fontSize = `${fontSize}px`;
  input.textContent = initialText;

  itemEl.appendChild(bar);
  itemEl.appendChild(input);

  // Prevent button clicks from unfocusing input
  btnDec.addEventListener('mousedown', (e) => e.preventDefault());
  btnInc.addEventListener('mousedown', (e) => e.preventDefault());
  btnDel.addEventListener('mousedown', (e) => e.preventDefault());

  // Activate on click
  itemEl.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.filler-text-item.active, .filler-signature-item.active').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');
    activeItemEl = itemEl;
    lastActivePageIndex = pageIndex;
    if (e.target !== input && !e.target.closest('.filler-item-bar')) {
      input.focus();
    }
  });

  // Size Controls
  btnDec.addEventListener('click', (e) => {
    e.stopPropagation();
    let cur = parseInt(itemEl.dataset.fontSize, 10) || defaultFontSize;
    cur = Math.max(8, cur - 2);
    itemEl.dataset.fontSize = cur;
    input.style.fontSize = `${cur}px`;
    sizeTag.textContent = `${cur}px`;
  });

  btnInc.addEventListener('click', (e) => {
    e.stopPropagation();
    let cur = parseInt(itemEl.dataset.fontSize, 10) || defaultFontSize;
    cur = Math.min(48, cur + 2);
    itemEl.dataset.fontSize = cur;
    input.style.fontSize = `${cur}px`;
    sizeTag.textContent = `${cur}px`;
  });

  btnDel.addEventListener('click', (e) => {
    e.stopPropagation();
    itemEl.remove();
    if (activeItemEl === itemEl) activeItemEl = null;
  });

  // If left empty on blur or click away, remove automatically after grace period
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!itemEl.isConnected) return;
      if (itemEl.contains(document.activeElement)) return;
      const age = Date.now() - (parseInt(itemEl.dataset.createdAt, 10) || 0);
      if (age > 500 && !input.innerText.trim()) {
        itemEl.remove();
        if (activeItemEl === itemEl) activeItemEl = null;
      }
    }, 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!input.innerText.trim()) {
        itemEl.remove();
        if (activeItemEl === itemEl) activeItemEl = null;
      } else {
        itemEl.classList.remove('active');
        input.blur();
      }
    }
  });

  // Smooth Dragging
  setupItemDragging(itemEl, dragHandle, overlay);

  overlay.appendChild(itemEl);

  // Focus input right away
  setTimeout(() => {
    input.focus();
    activeItemEl = itemEl;
  }, 20);
}

/**
 * Create a new interactive floating signature item
 */
function createSignatureItem(pageIndex, overlay, x, y, dataUrl, includeMeta = true, metaText = '') {
  const sigItemId = `sig-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const itemEl = document.createElement('div');
  itemEl.className = 'filler-signature-item active';
  itemEl.id = sigItemId;
  itemEl.dataset.pageIndex = pageIndex;
  itemEl.style.left = `${Math.max(4, Math.round(x))}px`;
  itemEl.style.top = `${Math.max(4, Math.round(y))}px`;
  itemEl.style.width = '170px'; // default signature display width

  // Mini Toolbar (Drag, -, size, +, delete)
  const bar = document.createElement('div');
  bar.className = 'filler-sig-bar';

  const dragHandle = document.createElement('span');
  dragHandle.className = 'filler-drag-handle';
  dragHandle.innerHTML = '⠿';
  dragHandle.title = 'Glisser pour déplacer la signature';

  const btnDec = document.createElement('button');
  btnDec.type = 'button';
  btnDec.className = 'filler-btn-micro';
  btnDec.textContent = '-';
  btnDec.title = 'Réduire la signature';

  const sizeTag = document.createElement('span');
  sizeTag.className = 'filler-size-tag';
  sizeTag.textContent = '170px';

  const btnInc = document.createElement('button');
  btnInc.type = 'button';
  btnInc.className = 'filler-btn-micro';
  btnInc.textContent = '+';
  btnInc.title = 'Agrandir la signature';

  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'filler-btn-micro filler-btn-delete';
  btnDel.innerHTML = '&times;';
  btnDel.title = 'Supprimer cette signature';

  bar.appendChild(dragHandle);
  bar.appendChild(btnDec);
  bar.appendChild(sizeTag);
  bar.appendChild(btnInc);
  bar.appendChild(btnDel);

  // Signature Image element
  const img = document.createElement('img');
  img.className = 'filler-sig-img';
  img.src = dataUrl;
  img.alt = 'Signature manuscrite';

  itemEl.appendChild(bar);
  itemEl.appendChild(img);

  // Optional Metadata text caption
  if (includeMeta && metaText) {
    const caption = document.createElement('div');
    caption.className = 'filler-sig-caption';
    caption.textContent = metaText;
    itemEl.appendChild(caption);
  }

  // Size Controls
  btnDec.addEventListener('click', (e) => {
    e.stopPropagation();
    let cur = parseInt(itemEl.style.width, 10) || 170;
    cur = Math.max(70, cur - 20);
    itemEl.style.width = `${cur}px`;
    sizeTag.textContent = `${cur}px`;
  });

  btnInc.addEventListener('click', (e) => {
    e.stopPropagation();
    let cur = parseInt(itemEl.style.width, 10) || 170;
    cur = Math.min(420, cur + 20);
    itemEl.style.width = `${cur}px`;
    sizeTag.textContent = `${cur}px`;
  });

  btnDel.addEventListener('click', (e) => {
    e.stopPropagation();
    itemEl.remove();
    if (activeItemEl === itemEl) activeItemEl = null;
  });

  // Activate on click
  itemEl.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.filler-text-item.active, .filler-signature-item.active').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');
    activeItemEl = itemEl;
    lastActivePageIndex = pageIndex;
  });

  // Smooth Dragging from ANYWHERE on the signature item (image, caption, handle, bar)
  setupSignatureDragging(itemEl, overlay);

  overlay.appendChild(itemEl);
  activeItemEl = itemEl;
  return itemEl;
}

/**
 * Handle mouse / touch / pen dragging for signature items
 * Allows dragging from ANYWHERE on the signature card (image, caption, handle, bar)
 */
function setupSignatureDragging(itemEl, overlay) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  itemEl.addEventListener('pointerdown', (e) => {
    // Left-click only (or touch/pen)
    if (e.button !== 0 && e.button !== undefined) return;
    // Don't drag if clicking mini toolbar buttons (+, -, delete)
    if (e.target.closest('.filler-btn-micro')) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(itemEl.style.left, 10) || 0;
    initialTop = parseInt(itemEl.style.top, 10) || 0;

    itemEl.classList.add('is-dragging');
    document.querySelectorAll('.filler-text-item.active, .filler-signature-item.active').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');
    activeItemEl = itemEl;
    if (itemEl.dataset.pageIndex !== undefined) {
      lastActivePageIndex = parseInt(itemEl.dataset.pageIndex, 10) || 0;
    }

    try {
      itemEl.setPointerCapture(e.pointerId);
    } catch (err) {}

    const onPointerMove = (moveEvent) => {
      if (!isDragging) return;
      moveEvent.preventDefault();

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const itemW = itemEl.offsetWidth || 170;
      const itemH = itemEl.offsetHeight || 60;
      const maxLeft = Math.max(0, overlay.clientWidth - itemW);
      const maxTop = Math.max(0, overlay.clientHeight - itemH);

      const newLeft = Math.max(0, Math.min(maxLeft, initialLeft + dx));
      const newTop = Math.max(0, Math.min(maxTop, initialTop + dy));

      itemEl.style.left = `${Math.round(newLeft)}px`;
      itemEl.style.top = `${Math.round(newTop)}px`;
    };

    const onPointerUp = (upEvent) => {
      if (!isDragging) return;
      isDragging = false;
      itemEl.classList.remove('is-dragging');

      try {
        if (itemEl.hasPointerCapture(upEvent.pointerId)) {
          itemEl.releasePointerCapture(upEvent.pointerId);
        }
      } catch (err) {}

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  });
}

/**
 * Handle mouse / touch / pen dragging of text boxes across overlay
 */
function setupItemDragging(itemEl, handleEl, overlay) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const barEl = itemEl.querySelector('.filler-item-bar');

  const startDrag = (e) => {
    if (e.button !== 0 && e.button !== undefined) return;
    if (e.target.closest('.filler-btn-micro')) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(itemEl.style.left, 10) || 0;
    initialTop = parseInt(itemEl.style.top, 10) || 0;

    itemEl.classList.add('is-dragging');
    document.querySelectorAll('.filler-text-item.active, .filler-signature-item.active').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');
    activeItemEl = itemEl;

    const dragTarget = e.currentTarget;
    try {
      dragTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const onPointerMove = (moveEvent) => {
      if (!isDragging) return;
      moveEvent.preventDefault();

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const itemW = itemEl.offsetWidth || 60;
      const itemH = itemEl.offsetHeight || 30;
      const maxLeft = Math.max(0, overlay.clientWidth - itemW);
      const maxTop = Math.max(0, overlay.clientHeight - itemH);

      const newLeft = Math.max(0, Math.min(maxLeft, initialLeft + dx));
      const newTop = Math.max(0, Math.min(maxTop, initialTop + dy));

      itemEl.style.left = `${Math.round(newLeft)}px`;
      itemEl.style.top = `${Math.round(newTop)}px`;
    };

    const onPointerUp = (upEvent) => {
      if (!isDragging) return;
      isDragging = false;
      itemEl.classList.remove('is-dragging');

      try {
        if (dragTarget.hasPointerCapture(upEvent.pointerId)) {
          dragTarget.releasePointerCapture(upEvent.pointerId);
        }
      } catch (err) {}

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  handleEl.addEventListener('pointerdown', startDrag);
  if (barEl) {
    barEl.addEventListener('pointerdown', startDrag);
  }
}

/* ==========================================================================
   SIGNATURE MODAL & DRAWING PAD
   ========================================================================== */

function setupSignatureModal() {
  if (!sigModal || !sigCanvas) return;

  sigCtx = sigCanvas.getContext('2d');

  // Resize canvas for crisp Retina rendering
  function initSigCanvasResolution() {
    const dpr = window.devicePixelRatio || 1;
    const rect = sigCanvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 560;
    const h = rect.height > 0 ? rect.height : 180;

    sigCanvas.width = Math.round(w * dpr);
    sigCanvas.height = Math.round(h * dpr);

    sigCtx.scale(dpr, dpr);
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.lineWidth = 2.6;
    sigCtx.strokeStyle = currentSigColor;
  }

  // Pointer drawing events
  function getPos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  let lastPt = null;

  sigCanvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { sigCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    isDrawingSig = true;
    hasSigStrokes = true;
    lastPt = getPos(e);

    sigCtx.beginPath();
    sigCtx.strokeStyle = currentSigColor;
    sigCtx.moveTo(lastPt.x, lastPt.y);
    sigCtx.lineTo(lastPt.x + 0.1, lastPt.y + 0.1);
    sigCtx.stroke();
  });

  sigCanvas.addEventListener('pointermove', (e) => {
    if (!isDrawingSig || !lastPt) return;
    e.preventDefault();
    const cur = getPos(e);

    sigCtx.beginPath();
    sigCtx.strokeStyle = currentSigColor;
    sigCtx.moveTo(lastPt.x, lastPt.y);
    sigCtx.lineTo(cur.x, cur.y);
    sigCtx.stroke();
    lastPt = cur;
  });

  const stopDrawing = () => {
    isDrawingSig = false;
    lastPt = null;
  };

  sigCanvas.addEventListener('pointerup', stopDrawing);
  sigCanvas.addEventListener('pointercancel', stopDrawing);

  // Clear button
  sigClearBtn.addEventListener('click', () => {
    clearSignatureCanvas();
  });

  // Color selection
  sigColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sigColorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSigColor = btn.dataset.color || '#0f172a';
      if (sigCtx) sigCtx.strokeStyle = currentSigColor;
    });
  });

  // Modal open/close controls
  sigModalCloseBtn.addEventListener('click', closeSignatureModal);
  sigCancelBtn.addEventListener('click', closeSignatureModal);

  sigModal.addEventListener('click', (e) => {
    if (e.target === sigModal) closeSignatureModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sigModal.hidden) {
      closeSignatureModal();
    }
  });

  // "+ Nouvelle signature" button in saved list
  if (sigCreateNewBtn) {
    sigCreateNewBtn.addEventListener('click', () => {
      editingSigId = null;
      clearSignatureCanvas();
      if (sigDrawHeading) sigDrawHeading.textContent = 'Zone de dessin :';
      if (sigInsertBtnText) sigInsertBtnText.textContent = 'Valider et insérer sur le document';
      sigCanvas.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Insert button action
  sigInsertBtn.addEventListener('click', () => {
    handleConfirmSignature();
  });
}

function clearSignatureCanvas() {
  if (!sigCanvas || !sigCtx) return;
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasSigStrokes = false;
}

/**
 * Open the Signature Modal and initialize states
 */
function openSignatureModal() {
  if (!sigModal) return;

  // Refresh metadata preview string
  if (sigMetaPreview) {
    sigMetaPreview.textContent = getSignatureTimestamp();
  }

  sigModal.hidden = false;

  // Render list of saved signatures
  renderSavedSignaturesList();

  // Reset or prepare drawing canvas
  setTimeout(() => {
    const dpr = window.devicePixelRatio || 1;
    const rect = sigCanvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 560;
    const h = rect.height > 0 ? rect.height : 180;

    sigCanvas.width = Math.round(w * dpr);
    sigCanvas.height = Math.round(h * dpr);

    sigCtx.scale(dpr, dpr);
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.lineWidth = 2.6;
    sigCtx.strokeStyle = currentSigColor;

    if (!editingSigId) {
      clearSignatureCanvas();
      if (sigDrawHeading) sigDrawHeading.textContent = 'Zone de dessin :';
      if (sigInsertBtnText) sigInsertBtnText.textContent = 'Valider et insérer sur le document';
    }
  }, 50);
}

function closeSignatureModal() {
  if (!sigModal) return;
  sigModal.hidden = true;
  editingSigId = null;
}

/**
 * Render the gallery of saved signatures
 */
function renderSavedSignaturesList() {
  if (!sigSavedSection || !sigSavedList) return;

  if (savedSignatures.length === 0) {
    sigSavedSection.hidden = true;
    return;
  }

  sigSavedSection.hidden = false;
  sigSavedList.innerHTML = '';

  savedSignatures.forEach((sig, index) => {
    const card = document.createElement('div');
    card.className = 'sig-card';

    const preview = document.createElement('div');
    preview.className = 'sig-card-preview';
    const img = document.createElement('img');
    img.src = sig.dataUrl;
    img.alt = sig.name;
    preview.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'sig-card-meta';
    meta.innerHTML = `<span>${sig.name}</span><span style="color:#94a3b8; font-size: 0.65rem;">#${index + 1}</span>`;

    const actions = document.createElement('div');
    actions.className = 'sig-card-actions';

    const btnUse = document.createElement('button');
    btnUse.type = 'button';
    btnUse.className = 'sig-card-btn sig-card-btn-use';
    btnUse.textContent = 'Insérer';
    btnUse.title = 'Apposer cette signature sur le document';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'sig-card-btn sig-card-btn-edit';
    btnEdit.textContent = 'Modifier';
    btnEdit.title = 'Charger cette signature sur le tracé pour la retoucher';

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'sig-card-btn sig-card-btn-del';
    btnDel.innerHTML = '&times;';
    btnDel.title = 'Supprimer cette signature enregistrée';

    actions.appendChild(btnUse);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    card.appendChild(preview);
    card.appendChild(meta);
    card.appendChild(actions);

    // Direct insertion of saved signature
    btnUse.addEventListener('click', () => {
      insertSignatureOnPdf(sig.dataUrl);
      closeSignatureModal();
    });

    // Load signature into canvas to edit
    btnEdit.addEventListener('click', () => {
      loadSignatureIntoCanvas(sig);
    });

    // Delete signature
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Supprimer la ${sig.name} ?`)) {
        savedSignatures = savedSignatures.filter(s => s.id !== sig.id);
        persistSavedSignatures();
        renderSavedSignaturesList();
        showToast('Signature supprimée.');
      }
    });

    sigSavedList.appendChild(card);
  });
}

/**
 * Load an existing signature onto the canvas for editing
 */
function loadSignatureIntoCanvas(sig) {
  editingSigId = sig.id;
  if (sigDrawHeading) sigDrawHeading.textContent = `Modification de : ${sig.name}`;
  if (sigInsertBtnText) sigInsertBtnText.textContent = 'Enregistrer & Insérer';

  const img = new Image();
  img.onload = () => {
    clearSignatureCanvas();
    const dpr = window.devicePixelRatio || 1;
    const w = sigCanvas.width / dpr;
    const h = sigCanvas.height / dpr;

    // Draw centered on canvas
    const scale = Math.min((w * 0.7) / img.width, (h * 0.7) / img.height, 1);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (w - drawW) / 2;
    const drawY = (h - drawH) / 2;

    sigCtx.drawImage(img, drawX, drawY, drawW, drawH);
    hasSigStrokes = true;
    sigCanvas.scrollIntoView({ behavior: 'smooth' });
    showToast(`Signature chargée sur la zone de dessin.`);
  };
  img.src = sig.dataUrl;
}

/**
 * Extract cropped PNG from signature canvas, trimming transparent margins
 */
function getTrimmedSignatureDataUrl() {
  if (!sigCanvas || !hasSigStrokes) return null;

  const dpr = window.devicePixelRatio || 1;
  const width = sigCanvas.width;
  const height = sigCanvas.height;
  const imgData = sigCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 12) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) return null;

  // Add 12px padding
  const pad = Math.round(12 * dpr);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');

  cropCtx.drawImage(
    sigCanvas,
    minX, minY, cropW, cropH,
    0, 0, cropW, cropH
  );

  return cropCanvas.toDataURL('image/png');
}

/**
 * Confirm drawn signature: save it, insert onto PDF, close modal
 */
function handleConfirmSignature() {
  const trimmedUrl = getTrimmedSignatureDataUrl();

  if (!trimmedUrl) {
    showToast('Veuillez tracer votre signature avant de valider.');
    return;
  }

  if (editingSigId) {
    // Update existing
    const existing = savedSignatures.find(s => s.id === editingSigId);
    if (existing) {
      existing.dataUrl = trimmedUrl;
      existing.updatedAt = new Date().toISOString();
    }
    showToast('Signature mise à jour.');
  } else {
    // Create new saved signature
    const newSig = {
      id: `sig_${Date.now()}`,
      name: `Signature ${savedSignatures.length + 1}`,
      dataUrl: trimmedUrl,
      createdAt: new Date().toISOString()
    };
    savedSignatures.push(newSig);
    showToast('Nouvelle signature enregistrée !');
  }

  persistSavedSignatures();

  // Insert on current PDF page
  insertSignatureOnPdf(trimmedUrl);
  closeSignatureModal();
}

/**
 * Insert signature image onto active PDF page
 */
function insertSignatureOnPdf(dataUrl) {
  if (loadedPages.length === 0) {
    showToast('Veuillez d\'abord importer un fichier PDF.');
    return;
  }

  // Target active page or first page
  const pageIndex = Math.min(lastActivePageIndex, loadedPages.length - 1);
  const targetPage = loadedPages[pageIndex] || loadedPages[0];
  const overlay = targetPage.overlay;

  // Position relative to current viewport scroll or center of visible page
  const viewportScroll = fillerPagesViewport ? fillerPagesViewport.scrollTop : 0;
  const overlayCard = overlay.closest('.filler-page-card');
  const cardOffsetTop = overlayCard ? overlayCard.offsetTop : 0;
  let posY = Math.max(40, viewportScroll - cardOffsetTop + 130);
  if (posY > overlay.clientHeight - 100 || posY < 20) {
    posY = Math.round(overlay.clientHeight * 0.4);
  }
  const posX = Math.max(30, Math.round((overlay.clientWidth - 190) / 2));

  const includeMeta = sigMetaCheckbox ? sigMetaCheckbox.checked : true;
  const metaText = includeMeta ? getSignatureTimestamp() : '';

  const sigEl = createSignatureItem(targetPage.pageIndex, overlay, posX, posY, dataUrl, includeMeta, metaText);
  if (sigEl) {
    sigEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  showToast('Signature apposée sur le document ! Vous pouvez la déplacer ou ajuster sa taille.');
}

/**
 * Export and Download the PDF with embedded text & signatures
 */
function setupDownload() {
  fillerDownloadBtn.addEventListener('click', async () => {
    if (!currentPdfBuffer) return;

    try {
      showToast('Génération du PDF complété...');
      fillerDownloadBtn.disabled = true;

      const PDFLib = window.PDFLib;
      if (!PDFLib) throw new Error('PDF-Lib non chargé');
      const { PDFDocument, StandardFonts, rgb } = PDFLib;

      // Load PDF Document safely from Uint8Array slice
      const pdfBytesToLoad = currentPdfBytes ? currentPdfBytes.slice() : new Uint8Array(currentPdfBuffer).slice();
      const pdfDoc = await PDFDocument.load(pdfBytesToLoad);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let textCount = 0;
      let sigCount = 0;

      // Process each page
      for (const pageInfo of loadedPages) {
        const page = pdfDoc.getPage(pageInfo.pageIndex);
        const { width: pdfWidth, height: pdfHeight } = page.getSize();

        const overlay = pageInfo.overlay;
        const displayWidth = overlay.clientWidth;
        const displayHeight = overlay.clientHeight;

        const scaleX = pdfWidth / displayWidth;
        const scaleY = pdfHeight / displayHeight;

        // 1. Process Text Items
        const textItems = overlay.querySelectorAll('.filler-text-item');
        textItems.forEach((item) => {
          const input = item.querySelector('.filler-text-input');
          if (!input) return;

          const rawText = input.innerText.trim();
          if (!rawText) return; // Skip empty fields

          const fontSizePx = parseInt(item.dataset.fontSize, 10) || defaultFontSize;
          const pdfFontSize = fontSizePx * scaleX;

          const itemX = parseInt(item.style.left, 10) || 0;
          const itemY = parseInt(item.style.top, 10) || 0;

          // Convert to PDF coordinates (PDF-Lib (0,0) is bottom-left)
          const pdfX = (itemX + 5) * scaleX;
          const pdfY = pdfHeight - ((itemY + 2) * scaleY) - (pdfFontSize * 0.82);

          // Handle multi-line
          const lines = rawText.split('\n');
          const lineHeight = pdfFontSize * 1.25;

          lines.forEach((line, lineIndex) => {
            const cleanLine = line.trimEnd();
            if (cleanLine.length > 0) {
              page.drawText(cleanLine, {
                x: pdfX,
                y: pdfY - (lineIndex * lineHeight),
                size: pdfFontSize,
                font: helveticaFont,
                color: rgb(0, 0, 0)
              });
              textCount++;
            }
          });
        });

        // 2. Process Signature Items
        const sigItems = overlay.querySelectorAll('.filler-signature-item');
        for (const sigItem of sigItems) {
          const imgEl = sigItem.querySelector('.filler-sig-img');
          if (!imgEl || !imgEl.src) continue;

          try {
            const pngImage = await pdfDoc.embedPng(imgEl.src);
            const itemX = parseInt(sigItem.style.left, 10) || 0;
            const itemY = parseInt(sigItem.style.top, 10) || 0;
            const itemWidth = sigItem.offsetWidth;
            const itemHeight = imgEl.offsetHeight || Math.round(itemWidth * 0.35);

            const pdfSigX = itemX * scaleX;
            const pdfSigWidth = itemWidth * scaleX;
            const pdfSigHeight = itemHeight * scaleY;
            const pdfSigY = pdfHeight - (itemY * scaleY) - pdfSigHeight;

            // Draw signature image
            page.drawImage(pngImage, {
              x: pdfSigX,
              y: pdfSigY,
              width: pdfSigWidth,
              height: pdfSigHeight
            });
            sigCount++;

            // Draw electronic metadata caption if present
            const captionEl = sigItem.querySelector('.filler-sig-caption');
            if (captionEl && captionEl.textContent) {
              const metaText = captionEl.textContent.trim();
              const metaFontSize = Math.max(5.5, Math.min(9, 7.5 * scaleX));
              page.drawText(metaText, {
                x: pdfSigX,
                y: Math.max(4, pdfSigY - (metaFontSize * 1.35)),
                size: metaFontSize,
                font: helveticaFont,
                color: rgb(0.2, 0.25, 0.35)
              });
            }
          } catch (sigErr) {
            console.error('Error embedding signature image:', sigErr);
          }
        }
      }

      // Save PDF to Uint8Array
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Clean file name
      let baseName = 'document';
      if (currentPdfFile && currentPdfFile.name) {
        baseName = currentPdfFile.name.replace(/\.[^/.]+$/, '');
      }
      const outName = `${baseName}-signe.pdf`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`PDF téléchargé avec succès (${textCount} texte(s), ${sigCount} signature(s)) ! 🎉`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Erreur lors de la création du PDF : ' + err.message);
    } finally {
      fillerDownloadBtn.disabled = false;
    }
  });
}

function resetFiller() {
  currentPdfFile = null;
  currentPdfBuffer = null;
  currentPdfBytes = null;
  loadedPages = [];
  lastActivePageIndex = 0;
  fillerPagesViewport.innerHTML = '';
  fillerFileInput.value = '';
  fillerStep2.hidden = true;
  fillerStep1.hidden = false;
}

// Paste Event for PDF
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!fillerStep1.hidden && (item.type === 'application/pdf' || item.kind === 'file')) {
      const file = item.getAsFile();
      if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
        showToast('Fichier PDF collé depuis le presse-papier !');
        handlePdfFile(file);
        break;
      }
    }
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initSharedUI('pdf-filler');
  initPdfFiller();
});
