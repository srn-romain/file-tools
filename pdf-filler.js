/**
 * OmniTools — Remplir un PDF (Formulaire & Saisie de texte direct)
 * 100% Client-Side with PDF.js & PDF-Lib
 */

import { showToast, initSharedUI } from './shared.js?v=2';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// DOM Elements
const fillerStep1 = document.getElementById('filler-step-1');
const fillerStep2 = document.getElementById('filler-step-2');
const fillerDropzone = document.getElementById('filler-dropzone');
const fillerFileInput = document.getElementById('filler-file-input');
const fillerBrowseBtn = document.getElementById('filler-browse-btn');
const fillerSampleBtn = document.getElementById('filler-sample-btn');

const fillerSizeDec = document.getElementById('filler-size-dec');
const fillerSizeInc = document.getElementById('filler-size-inc');
const fillerSizeDisplay = document.getElementById('filler-size-display');
const fillerNewBtn = document.getElementById('filler-new-btn');
const fillerDownloadBtn = document.getElementById('filler-download-btn');
const fillerPagesViewport = document.getElementById('filler-pages-viewport');

// State
let currentPdfFile = null;
let currentPdfBuffer = null;
let defaultFontSize = 14; // pixels
let loadedPages = [];     // Array of { pageIndex, pageNum, canvas, overlay, textItems: [] }
let textItemCounter = 1;
let activeItemEl = null;

export function initPdfFiller() {
  setupInputs();
  setupToolbarControls();
  setupDownload();
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

  // Global click to deselect text fields
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filler-text-item') && !e.target.closest('.filler-size-selector')) {
      document.querySelectorAll('.filler-text-item.active').forEach(el => el.classList.remove('active'));
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
  if (activeItemEl) {
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
    showToast('Veuillez sélectionner un fichier PDF valide.');
    return;
  }

  currentPdfFile = file;
  try {
    showToast('Ouverture et préparation du PDF...');
    currentPdfBuffer = await file.arrayBuffer();

    const pdfJs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (!pdfJs) throw new Error('PDF.js non disponible');

    const pdfDoc = await pdfJs.getDocument({ data: new Uint8Array(currentPdfBuffer.slice(0)) }).promise;
    await renderPdfDocument(pdfDoc);

    fillerStep1.hidden = true;
    fillerStep2.hidden = false;
    showToast('PDF prêt ! Cliquez n\'importe où pour ajouter du texte ✍️');
  } catch (err) {
    console.error('Error rendering PDF:', err);
    showToast('Erreur lors de l\'ouverture du document : ' + err.message);
  }
}

async function renderPdfDocument(pdfDoc) {
  fillerPagesViewport.innerHTML = '';
  loadedPages = [];

  const numPages = pdfDoc.numPages;

  for (let pNum = 1; pNum <= numPages; pNum++) {
    const page = await pdfDoc.getPage(pNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Render at crisp high quality scale (1.5x)
    const renderScale = 1.5;
    const viewport = page.getViewport({ scale: renderScale });

    // Page wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'filler-page-wrapper';
    wrapper.dataset.pageIndex = pNum - 1;

    // Header label
    const header = document.createElement('div');
    header.className = 'filler-page-header';
    header.textContent = `Page ${pNum} sur ${numPages}`;
    wrapper.appendChild(header);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'filler-page-canvas';
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    // Set display width based on standard A4 / viewport width
    const displayWidth = Math.min(840, unscaledViewport.width * 1.15);
    const displayHeight = (unscaledViewport.height / unscaledViewport.width) * displayWidth;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    wrapper.appendChild(canvas);

    // Interactive Text Overlay
    const overlay = document.createElement('div');
    overlay.className = 'filler-page-overlay';
    overlay.style.width = `${displayWidth}px`;
    overlay.style.height = `${displayHeight}px`;

    // Click on overlay to add text field
    overlay.addEventListener('click', (e) => {
      // Only trigger if clicked on the overlay itself, not inside a text item
      if (e.target !== overlay) return;

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
  input.setAttribute('data-placeholder', 'Tapez votre texte...');
  input.style.fontSize = `${fontSize}px`;
  input.textContent = initialText;

  itemEl.appendChild(bar);
  itemEl.appendChild(input);

  // Activate on click
  itemEl.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.filler-text-item.active').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');
    activeItemEl = itemEl;
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

  // Smooth Dragging
  setupItemDragging(itemEl, dragHandle, overlay);

  overlay.appendChild(itemEl);

  // Focus input right away
  setTimeout(() => {
    input.focus();
    activeItemEl = itemEl;
  }, 10);
}

/**
 * Handle mouse dragging of text box across overlay
 */
function setupItemDragging(itemEl, handleEl, overlay) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handleEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;

    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(itemEl.style.left, 10) || 0;
    initialTop = parseInt(itemEl.style.top, 10) || 0;

    itemEl.classList.add('active');
    activeItemEl = itemEl;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const newLeft = Math.max(0, Math.min(overlay.clientWidth - 30, initialLeft + dx));
      const newTop = Math.max(0, Math.min(overlay.clientHeight - 20, initialTop + dy));

      itemEl.style.left = `${Math.round(newLeft)}px`;
      itemEl.style.top = `${Math.round(newTop)}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * Export and Download the PDF with embedded text
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

      // Load PDF Document
      const pdfDoc = await PDFDocument.load(currentPdfBuffer.slice(0));
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let textCount = 0;

      // Embed text for each page
      loadedPages.forEach((pageInfo) => {
        const page = pdfDoc.getPage(pageInfo.pageIndex);
        const { width: pdfWidth, height: pdfHeight } = page.getSize();

        const overlay = pageInfo.overlay;
        const displayWidth = overlay.clientWidth;
        const displayHeight = overlay.clientHeight;

        const scaleX = pdfWidth / displayWidth;
        const scaleY = pdfHeight / displayHeight;

        // Find all text items in this page's overlay
        const items = overlay.querySelectorAll('.filler-text-item');

        items.forEach((item) => {
          const input = item.querySelector('.filler-text-input');
          if (!input) return;

          const rawText = input.innerText.trim();
          if (!rawText) return; // Skip empty fields

          const fontSizePx = parseInt(item.dataset.fontSize, 10) || defaultFontSize;
          const pdfFontSize = fontSizePx * scaleX;

          const itemX = parseInt(item.style.left, 10) || 0;
          const itemY = parseInt(item.style.top, 10) || 0;

          // Convert to PDF coordinates (PDF-Lib (0,0) is bottom-left)
          // Input padding is 2px top, 5px left
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
      });

      // Save PDF to Uint8Array
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Clean file name
      let baseName = 'formulaire';
      if (currentPdfFile && currentPdfFile.name) {
        baseName = currentPdfFile.name.replace(/\.[^/.]+$/, '');
      }
      const outName = `${baseName}-rempli.pdf`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`PDF téléchargé avec ${textCount} champ(s) de texte intégré(s) ! 🎉`);
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
  loadedPages = [];
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
