/**
 * OmniTools — PDF Studio (Organisateur & Fusion de PDF)
 * 100% Client-Side with PDF-Lib & PDF.js
 */

import { showToast, initSharedUI } from './shared.js?v=4';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// DOM Elements: Step 1
const pdfStep1 = document.getElementById('pdf-step-1');
const pdfStep2 = document.getElementById('pdf-step-2');
const pdfDropzone = document.getElementById('pdf-dropzone');
const pdfFileInput = document.getElementById('pdf-file-input');
const pdfBrowseBtn = document.getElementById('pdf-browse-btn');
const pdfSampleBtn = document.getElementById('pdf-sample-btn');

// PDF Workspace Elements
const pdfPagesGrid = document.getElementById('pdf-pages-grid');
const pdfPagesCount = document.getElementById('pdf-pages-count');
const pdfSelectedCount = document.getElementById('pdf-selected-count');
const pdfMultiSelectedBadge = document.getElementById('pdf-multi-selected-badge');
const pdfSelectAllBtn = document.getElementById('pdf-select-all-btn');
const pdfDeselectAllBtn = document.getElementById('pdf-deselect-all-btn');
const pdfAddMoreBtn = document.getElementById('pdf-add-more-btn');
const pdfAddMoreInput = document.getElementById('pdf-add-more-input');
const pdfBulkActions = document.getElementById('pdf-bulk-actions');
const pdfBulkCount = document.getElementById('pdf-bulk-count');
const pdfBulkRotateLeftBtn = document.getElementById('pdf-bulk-rotate-left-btn');
const pdfBulkRotateRightBtn = document.getElementById('pdf-bulk-rotate-right-btn');
const pdfBulkDeleteBtn = document.getElementById('pdf-bulk-delete-btn');
const pdfBulkClearBtn = document.getElementById('pdf-bulk-clear-btn');
const pdfLoadingIndicator = document.getElementById('pdf-loading-indicator');
const pdfLoadingText = document.getElementById('pdf-loading-text');

// PDF Export Elements
const pdfExportName = document.getElementById('pdf-export-name');
const pdfDownloadBtn = document.getElementById('pdf-download-btn');
const pdfDownloadBtnText = document.getElementById('pdf-download-btn-text');
const pdfNewBtn = document.getElementById('pdf-new-btn');

// PDF Order Section Elements
const pdfOrderSection = document.getElementById('pdf-order-section');
const pdfOrderToggleBtn = document.getElementById('pdf-order-toggle-btn');
const pdfOrderBody = document.getElementById('pdf-order-body');
const pdfOrderCount = document.getElementById('pdf-order-count');
const pdfOrderList = document.getElementById('pdf-order-list');

// PDF Reorder Confirmation Modal Elements
const pdfReorderConfirmModal = document.getElementById('pdf-reorder-confirm-modal');
const pdfReorderCloseBtn = document.getElementById('pdf-reorder-close-btn');
const pdfReorderCancelBtn = document.getElementById('pdf-reorder-cancel-btn');
const pdfReorderConfirmBtn = document.getElementById('pdf-reorder-confirm-btn');

// Distinct Color Palette for PDF Documents
const PDF_COLOR_PALETTE = [
  { bg: 'rgba(59, 130, 246, 0.22)', border: 'rgba(96, 165, 250, 0.55)', accent: '#60a5fa', badgeBg: 'rgba(59, 130, 246, 0.28)', badgeText: '#dbeafe' },   // Blue
  { bg: 'rgba(16, 185, 129, 0.22)', border: 'rgba(52, 211, 153, 0.55)', accent: '#34d399', badgeBg: 'rgba(16, 185, 129, 0.28)', badgeText: '#d1fae5' },   // Emerald
  { bg: 'rgba(245, 158, 11, 0.22)', border: 'rgba(251, 191, 36, 0.55)', accent: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.28)', badgeText: '#fef3c7' },   // Amber
  { bg: 'rgba(236, 72, 153, 0.22)', border: 'rgba(244, 114, 182, 0.55)', accent: '#f472b6', badgeBg: 'rgba(236, 72, 153, 0.28)', badgeText: '#fce7f3' },  // Pink
  { bg: 'rgba(139, 92, 246, 0.24)', border: 'rgba(167, 139, 250, 0.55)', accent: '#a78bfa', badgeBg: 'rgba(139, 92, 246, 0.3)', badgeText: '#ede9fe' },   // Violet
  { bg: 'rgba(6, 182, 212, 0.22)', border: 'rgba(34, 211, 238, 0.55)', accent: '#22d3ee', badgeBg: 'rgba(6, 182, 212, 0.28)', badgeText: '#cffafe' },     // Cyan
  { bg: 'rgba(249, 115, 22, 0.22)', border: 'rgba(251, 146, 60, 0.55)', accent: '#fb923c', badgeBg: 'rgba(249, 115, 22, 0.28)', badgeText: '#ffedd5' },   // Orange
  { bg: 'rgba(132, 204, 22, 0.20)', border: 'rgba(163, 230, 53, 0.55)', accent: '#a3e635', badgeBg: 'rgba(132, 204, 22, 0.28)', badgeText: '#ecfccb' },   // Lime
  { bg: 'rgba(244, 63, 94, 0.22)', border: 'rgba(251, 113, 133, 0.55)', accent: '#fb7185', badgeBg: 'rgba(244, 63, 94, 0.28)', badgeText: '#ffe4e6' },    // Rose
  { bg: 'rgba(20, 184, 166, 0.22)', border: 'rgba(45, 212, 191, 0.55)', accent: '#2dd4bf', badgeBg: 'rgba(20, 184, 166, 0.28)', badgeText: '#ccfbf1' }    // Teal
];

function getPdfColor(index) {
  if (index < PDF_COLOR_PALETTE.length) {
    return PDF_COLOR_PALETTE[index];
  }
  const hue = (index * 137.508) % 360;
  return {
    bg: `hsla(${hue}, 70%, 45%, 0.22)`,
    border: `hsla(${hue}, 80%, 62%, 0.55)`,
    accent: `hsl(${hue}, 80%, 65%)`,
    badgeBg: `hsla(${hue}, 70%, 45%, 0.3)`,
    badgeText: `hsl(${hue}, 90%, 92%)`
  };
}

// PDF State
let pdfDocuments = []; // Array of { id, name, arrayBuffer, color }
let pdfPages = [];     // Array of page objects
let draggedPageIndex = null;
let draggedPageIds = []; // Supports single or multi-card drag
let multiSelectedPageIds = new Set();
let lastClickedPageIndex = null;
let draggedDocIndex = null;
let pendingDocReorder = null; // { fromIndex, toIndex }
let pageIdCounter = 1;

export function initPdfOrganizer() {
  setupPdfInputs();
  setupPdfBatchActions();
  setupPdfOrderControls();
  setupPdfExport();
}

function setupPdfInputs() {
  pdfBrowseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pdfFileInput.click();
  });

  pdfDropzone.addEventListener('click', (e) => {
    if (e.target.closest('#pdf-sample-btn') || e.target.closest('.paste-badge')) return;
    pdfFileInput.click();
  });

  pdfFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handlePdfFilesSelected(files);
  });

  pdfAddMoreBtn.addEventListener('click', () => {
    pdfAddMoreInput.click();
  });

  pdfAddMoreInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handlePdfFilesSelected(files, true);
  });

  // Drag & drop
  let dragCounter = 0;
  pdfDropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    pdfDropzone.classList.add('drag-active');
  });

  pdfDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!pdfDropzone.classList.contains('drag-active')) pdfDropzone.classList.add('drag-active');
  });

  pdfDropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      pdfDropzone.classList.remove('drag-active');
    }
  });

  pdfDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    pdfDropzone.classList.remove('drag-active');

    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (files.length > 0) {
      handlePdfFilesSelected(files);
    } else {
      showToast('Veuillez déposer des fichiers PDF valides.');
    }
  });

  // Sample PDF button
  pdfSampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    showToast('Chargement du document PDF de démonstration (3 pages)...');
    try {
      const response = await fetch('sample.pdf');
      if (!response.ok) throw new Error('Fichier sample.pdf indisponible');
      const blob = await response.blob();
      const sampleFile = new File([blob], 'document-exemple.pdf', { type: 'application/pdf' });
      handlePdfFilesSelected([sampleFile]);
    } catch (err) {
      console.warn('Fetch sample.pdf failed, generating in-memory:', err);
      try {
        const samplePdfBytes = await generateSamplePdf();
        const sampleFile = new File([samplePdfBytes], 'document-exemple.pdf', { type: 'application/pdf' });
        handlePdfFilesSelected([sampleFile]);
      } catch (genErr) {
        console.error(genErr);
        showToast('Erreur lors du chargement de l\'exemple PDF.');
      }
    }
  });
}

/**
 * Get safe reference to PDFLib
 */
function getPdfLib() {
  return window.PDFLib;
}

/**
 * Get safe reference to PDF.js
 */
function getPdfJs() {
  const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
  if (lib && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return lib;
}

/**
 * Generate a clean 3-page sample PDF on the fly using PDFLib
 */
async function generateSamplePdf() {
  const PDFLibInstance = getPdfLib();
  if (!PDFLibInstance) throw new Error('PDFLib n\'est pas encore chargé.');
  const { PDFDocument, rgb, StandardFonts } = PDFLibInstance;
  const doc = await PDFDocument.create();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const colors = [rgb(0.92, 0.95, 1), rgb(1, 0.94, 0.92), rgb(0.92, 1, 0.94)];
  const titles = [
    'Page 1 : Rapport d Activite',
    'Page 2 : Analyse et Donnees Cles',
    'Page 3 : Recommandations et Conclusion'
  ];

  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: colors[i] });

    // Header title
    page.drawText(titles[i], { x: 50, y: 760, size: 26, font: fontBold, color: rgb(0.1, 0.15, 0.35) });
    page.drawText('Document de test interactif pour l organisateur de PDF.', { x: 50, y: 725, size: 13, font: fontRegular, color: rgb(0.35, 0.35, 0.45) });

    // White Card box
    page.drawRectangle({ x: 50, y: 480, width: 495, height: 210, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.85, 0.9), borderWidth: 1.5 });
    page.drawText(`Section Principale - Page ${i + 1}`, { x: 75, y: 645, size: 18, font: fontBold, color: rgb(0.2, 0.35, 0.85) });
    page.drawText('- Deplacez cette page avant ou apres avec la souris ou les fleches.', { x: 75, y: 605, size: 12, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    page.drawText('- Toutes les pages sont cochees par defaut pour etre telechargees.', { x: 75, y: 575, size: 12, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    page.drawText('- Decochez cette page pour l exclure du telechargement final.', { x: 75, y: 545, size: 12, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    page.drawText('- Bouton Pivoter pour ajuster l orientation de la page.', { x: 75, y: 515, size: 12, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });

    // Footer
    page.drawText(`Page ${i + 1} sur 3 - OmniTools PDF Studio`, { x: 200, y: 40, size: 11, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
  }

  return await doc.save();
}

/**
 * Handle newly uploaded or added PDF files
 */
async function handlePdfFilesSelected(files, isAddingMore = false) {
  if (!isAddingMore) {
    pdfDocuments = [];
    pdfPages = [];
    multiSelectedPageIds.clear();
    lastClickedPageIndex = null;
    pageIdCounter = 1;
    goToPdfStep(2);
  }

  pdfLoadingIndicator.hidden = false;
  pdfLoadingText.textContent = `Lecture de ${files.length} fichier(s) PDF...`;

  try {
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const docId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      const docColor = getPdfColor(pdfDocuments.length);

      pdfDocuments.push({
        id: docId,
        name: file.name,
        arrayBuffer: buffer,
        color: docColor
      });

      // Render thumbnails with PDF.js
      const pdfJs = getPdfJs();
      if (!pdfJs) throw new Error('PDF.js n\'est pas encore chargé.');
      const pdfJsDoc = await pdfJs.getDocument({ data: buffer.slice(0) }).promise;
      const numPages = pdfJsDoc.numPages;

      for (let pNum = 1; pNum <= numPages; pNum++) {
        pdfLoadingText.textContent = `Génération de la miniature ${pNum}/${numPages} de ${file.name}...`;
        const page = await pdfJsDoc.getPage(pNum);

        // Render thumbnail
        const viewport = page.getViewport({ scale: 0.45 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'page-thumbnail-canvas';
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        pdfPages.push({
          id: 'page-' + pageIdCounter++,
          docId,
          docName: file.name,
          pageIndex: pNum - 1, // 0-based for pdf-lib
          originalPageNum: pNum,
          rotation: 0,
          selected: true, // CHECKED BY DEFAULT as requested
          thumbnailCanvas: canvas
        });
      }
    }

    renderPdfOrderList();
    renderPdfGrid();
    updatePdfStats();
    showToast(`${pdfPages.length} page(s) chargée(s) avec succès !`);
  } catch (err) {
    console.error('Error loading PDF files:', err);
    showToast('Erreur lors de la lecture du fichier PDF : ' + err.message);
  } finally {
    pdfLoadingIndicator.hidden = true;
    pdfFileInput.value = '';
    pdfAddMoreInput.value = '';
  }
}

function goToPdfStep(stepNum) {
  if (stepNum === 1) {
    pdfStep1.hidden = false;
    pdfStep2.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (stepNum === 2) {
    pdfStep1.hidden = true;
    pdfStep2.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Render the interactive grid of PDF page cards
 */
function renderPdfGrid() {
  pdfPagesGrid.innerHTML = '';

  const docColorMap = new Map(pdfDocuments.map((doc, idx) => [doc.id, doc.color || getPdfColor(idx)]));

  pdfPages.forEach((page, index) => {
    const card = document.createElement('div');
    const isMultiSelected = multiSelectedPageIds.has(page.id);
    card.className = `pdf-page-card ${page.selected ? '' : 'excluded'} ${isMultiSelected ? 'multi-selected' : ''}`;
    card.draggable = true;
    card.dataset.index = index;
    card.dataset.id = page.id;

    const color = docColorMap.get(page.docId) || getPdfColor(0);
    card.style.setProperty('--pdf-card-bg', color.bg);
    card.style.setProperty('--pdf-card-border', color.border);
    card.style.setProperty('--pdf-card-accent', color.accent);
    card.style.setProperty('--pdf-badge-bg', color.badgeBg);
    card.style.setProperty('--pdf-badge-color', color.badgeText);

    // Header row
    const header = document.createElement('div');
    header.className = 'page-card-header';

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'page-checkbox-label';
    checkboxLabel.title = page.selected ? 'Page cochée : incluse dans le PDF' : 'Page décochée : exclue du PDF';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = page.selected;
    checkbox.className = 'page-checkbox';

    checkbox.addEventListener('change', () => {
      page.selected = checkbox.checked;
      card.classList.toggle('excluded', !page.selected);
      updatePdfStats();
      showToast(page.selected ? `Page #${index + 1} incluse dans l'export.` : `Page #${index + 1} exclue du téléchargement.`);
    });

    const pageNumText = document.createElement('span');
    pageNumText.textContent = `Page #${index + 1}`;

    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(pageNumText);

    const sourceBadge = document.createElement('span');
    sourceBadge.className = 'page-source-badge';
    sourceBadge.title = page.docName;
    sourceBadge.textContent = page.docName;

    header.appendChild(checkboxLabel);
    header.appendChild(sourceBadge);

    // Thumbnail Area
    const thumbArea = document.createElement('div');
    thumbArea.className = 'page-thumbnail-area';

    // Clone thumbnail canvas
    const clonedCanvas = document.createElement('canvas');
    clonedCanvas.width = page.thumbnailCanvas.width;
    clonedCanvas.height = page.thumbnailCanvas.height;
    clonedCanvas.className = 'page-thumbnail-canvas';
    clonedCanvas.style.transform = `rotate(${page.rotation}deg)`;
    clonedCanvas.getContext('2d').drawImage(page.thumbnailCanvas, 0, 0);

    thumbArea.appendChild(clonedCanvas);

    // Action Toolbar
    const actionsBar = document.createElement('div');
    actionsBar.className = 'page-card-actions';

    // Move Left Button
    const moveLeftBtn = document.createElement('button');
    moveLeftBtn.type = 'button';
    moveLeftBtn.className = 'page-action-btn';
    moveLeftBtn.innerHTML = '←';
    moveLeftBtn.title = 'Déplacer avant (vers la gauche)';
    moveLeftBtn.disabled = index === 0;
    moveLeftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      movePage(index, index - 1);
    });

    // Rotate 90deg Button
    const rotateBtn = document.createElement('button');
    rotateBtn.type = 'button';
    rotateBtn.className = 'page-action-btn';
    rotateBtn.innerHTML = '↻';
    rotateBtn.title = 'Pivoter de 90°';
    rotateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      page.rotation = (page.rotation + 90) % 360;
      clonedCanvas.style.transform = `rotate(${page.rotation}deg)`;
      showToast(`Page #${index + 1} pivotée à ${page.rotation}°`);
    });

    // Move Right Button
    const moveRightBtn = document.createElement('button');
    moveRightBtn.type = 'button';
    moveRightBtn.className = 'page-action-btn';
    moveRightBtn.innerHTML = '→';
    moveRightBtn.title = 'Déplacer après (vers la droite)';
    moveRightBtn.disabled = index === pdfPages.length - 1;
    moveRightBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      movePage(index, index + 1);
    });

    // Exclude / Toggle Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'page-action-btn';
    deleteBtn.innerHTML = page.selected ? '🗑️' : '✓';
    deleteBtn.title = page.selected ? 'Exclure cette page' : 'Réinclure cette page';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      page.selected = !page.selected;
      checkbox.checked = page.selected;
      card.classList.toggle('excluded', !page.selected);
      deleteBtn.innerHTML = page.selected ? '🗑️' : '✓';
      updatePdfStats();
    });

    actionsBar.appendChild(moveLeftBtn);
    actionsBar.appendChild(rotateBtn);
    actionsBar.appendChild(deleteBtn);
    actionsBar.appendChild(moveRightBtn);

    // Assemble Card
    card.appendChild(header);
    card.appendChild(thumbArea);
    card.appendChild(actionsBar);

    // Multi-selection click handler (Ctrl/Cmd+Click, Shift+Click, plain Click)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.page-checkbox-label') || e.target.closest('.page-action-btn')) return;
      handleCardSelectionClick(e, page.id, index);
    });

    // Drag and Drop Events for Card Reordering
    setupCardDragEvents(card, page, index);

    pdfPagesGrid.appendChild(card);
  });

  updateMultiSelectionUI();
}

/**
 * Handle Ctrl/Cmd+Click and Shift+Click multi-selection on page cards
 */
function handleCardSelectionClick(e, pageId, index) {
  if (e.shiftKey && lastClickedPageIndex !== null) {
    const start = Math.min(lastClickedPageIndex, index);
    const end = Math.max(lastClickedPageIndex, index);
    if (!e.ctrlKey && !e.metaKey) {
      multiSelectedPageIds.clear();
    }
    for (let i = start; i <= end; i++) {
      multiSelectedPageIds.add(pdfPages[i].id);
    }
  } else if (e.ctrlKey || e.metaKey) {
    if (multiSelectedPageIds.has(pageId)) {
      multiSelectedPageIds.delete(pageId);
    } else {
      multiSelectedPageIds.add(pageId);
    }
    lastClickedPageIndex = index;
  } else {
    if (multiSelectedPageIds.size === 1 && multiSelectedPageIds.has(pageId)) {
      multiSelectedPageIds.clear();
      lastClickedPageIndex = null;
    } else {
      multiSelectedPageIds = new Set([pageId]);
      lastClickedPageIndex = index;
    }
  }

  updateMultiSelectionUI();
}

function updateMultiSelectionUI() {
  const validIds = new Set(pdfPages.map(p => p.id));
  for (const id of Array.from(multiSelectedPageIds)) {
    if (!validIds.has(id)) multiSelectedPageIds.delete(id);
  }

  document.querySelectorAll('.pdf-page-card').forEach(cardEl => {
    cardEl.classList.toggle('multi-selected', multiSelectedPageIds.has(cardEl.dataset.id));
  });

  const count = multiSelectedPageIds.size;

  if (pdfMultiSelectedBadge) {
    pdfMultiSelectedBadge.hidden = count === 0;
    pdfMultiSelectedBadge.textContent = `${count} sélectionnée${count > 1 ? 's' : ''}`;
  }

  if (pdfBulkActions) {
    pdfBulkActions.hidden = count === 0;
  }

  if (pdfBulkCount) {
    pdfBulkCount.textContent = `${count} page${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;
  }
}

/**
 * Rotate all multi-selected pages by deltaDegrees (-90 or +90)
 */
function rotateSelectedPages(deltaDegrees) {
  if (multiSelectedPageIds.size === 0) return;

  let rotatedCount = 0;
  pdfPages.forEach(page => {
    if (!multiSelectedPageIds.has(page.id)) return;
    page.rotation = ((page.rotation + deltaDegrees) % 360 + 360) % 360;
    rotatedCount++;

    const cardEl = pdfPagesGrid.querySelector(`.pdf-page-card[data-id="${page.id}"]`);
    const canvas = cardEl?.querySelector('.page-thumbnail-canvas');
    if (canvas) {
      canvas.style.transform = `rotate(${page.rotation}deg)`;
    }
  });

  if (rotatedCount > 0) {
    const dirLabel = deltaDegrees > 0 ? '+90° (droite)' : '-90° (gauche)';
    showToast(`${rotatedCount} page${rotatedCount > 1 ? 's' : ''} pivotée${rotatedCount > 1 ? 's' : ''} de ${dirLabel}.`);
  }
}

/**
 * Permanently remove all multi-selected pages from the current workspace
 */
function deleteSelectedPages() {
  if (multiSelectedPageIds.size === 0) return;

  const beforeCount = pdfPages.length;
  pdfPages = pdfPages.filter(p => !multiSelectedPageIds.has(p.id));
  const deletedCount = beforeCount - pdfPages.length;

  if (deletedCount === 0) return;

  const remainingDocIds = new Set(pdfPages.map(p => p.docId));
  pdfDocuments = pdfDocuments.filter(doc => remainingDocIds.has(doc.id));

  multiSelectedPageIds.clear();
  lastClickedPageIndex = null;

  renderPdfOrderList();
  renderPdfGrid();
  updatePdfStats();
  showToast(`${deletedCount} page${deletedCount > 1 ? 's' : ''} supprimée${deletedCount > 1 ? 's' : ''}.`);
}

/**
 * Setup Drag & Drop Reordering on Page Cards (single or multi-selection)
 */
function setupCardDragEvents(card, page, index) {
  card.addEventListener('dragstart', (e) => {
    draggedPageIndex = index;
    if (multiSelectedPageIds.has(page.id) && multiSelectedPageIds.size > 1) {
      draggedPageIds = pdfPages.filter(p => multiSelectedPageIds.has(p.id)).map(p => p.id);
    } else {
      draggedPageIds = [page.id];
    }

    const draggedSet = new Set(draggedPageIds);
    document.querySelectorAll('.pdf-page-card').forEach(c => {
      if (draggedSet.has(c.dataset.id)) {
        c.classList.add('dragging');
      }
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  });

  card.addEventListener('dragend', () => {
    draggedPageIndex = null;
    draggedPageIds = [];
    document.querySelectorAll('.pdf-page-card').forEach(c => {
      c.classList.remove('dragging');
      c.classList.remove('drag-over-target');
    });
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPageIds.length > 0 && !draggedPageIds.includes(page.id)) {
      card.classList.add('drag-over-target');
    }
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over-target');
  });

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over-target');
    if (draggedPageIds.length > 0 && !draggedPageIds.includes(page.id)) {
      movePagesToTarget(draggedPageIds, index);
    }
  });
}

/**
 * Move one or more pages (preserving their relative order) to targetIndex
 */
function movePagesToTarget(pageIds, targetIndex) {
  if (!pageIds || pageIds.length === 0 || targetIndex < 0 || targetIndex >= pdfPages.length) return;

  if (pageIds.length === 1) {
    const fromIndex = pdfPages.findIndex(p => p.id === pageIds[0]);
    if (fromIndex !== -1) movePage(fromIndex, targetIndex);
    return;
  }

  const draggedSet = new Set(pageIds);
  const targetPage = pdfPages[targetIndex];
  if (!targetPage || draggedSet.has(targetPage.id)) return;

  const firstDraggedIndex = pdfPages.findIndex(p => draggedSet.has(p.id));
  const movingForward = targetIndex > firstDraggedIndex;

  const movedItems = pdfPages.filter(p => draggedSet.has(p.id));
  const remaining = pdfPages.filter(p => !draggedSet.has(p.id));
  const newTargetIdx = remaining.findIndex(p => p.id === targetPage.id);
  const insertAt = movingForward ? newTargetIdx + 1 : newTargetIdx;

  remaining.splice(insertAt, 0, ...movedItems);
  pdfPages = remaining;

  renderPdfGrid();
  updatePdfStats();
  showToast(`${movedItems.length} pages déplacées ensemble.`);
}

/**
 * Move page to a new index
 */
function movePage(fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= pdfPages.length || toIndex < 0 || toIndex >= pdfPages.length) return;

  const [movedPage] = pdfPages.splice(fromIndex, 1);
  pdfPages.splice(toIndex, 0, movedPage);

  renderPdfGrid();
  updatePdfStats();
  showToast(`Page déplacée en position #${toIndex + 1}`);
}

/**
 * Update stats counters (Total & Selected)
 */
function updatePdfStats() {
  const total = pdfPages.length;
  const selected = pdfPages.filter(p => p.selected).length;

  pdfPagesCount.textContent = `${total} page${total > 1 ? 's' : ''} au total`;
  pdfSelectedCount.textContent = `${selected} sélectionnée${selected > 1 ? 's' : ''}`;
  pdfDownloadBtnText.textContent = `Télécharger le PDF réorganisé (${selected} page${selected > 1 ? 's' : ''})`;

  pdfDownloadBtn.disabled = selected === 0;
}

/**
 * Setup PDF Batch Select Actions
 */
function setupPdfBatchActions() {
  pdfSelectAllBtn.addEventListener('click', () => {
    pdfPages.forEach(p => p.selected = true);
    renderPdfOrderList();
    renderPdfGrid();
    updatePdfStats();
    showToast('Toutes les pages ont été sélectionnées.');
  });

  pdfDeselectAllBtn.addEventListener('click', () => {
    pdfPages.forEach(p => p.selected = false);
    renderPdfOrderList();
    renderPdfGrid();
    updatePdfStats();
    showToast('Toutes les pages ont été désélectionnées.');
  });

  pdfNewBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser et insérer de nouveaux PDF ?')) {
      pdfDocuments = [];
      pdfPages = [];
      multiSelectedPageIds.clear();
      lastClickedPageIndex = null;
      renderPdfOrderList();
      goToPdfStep(1);
    }
  });

  if (pdfBulkRotateLeftBtn) {
    pdfBulkRotateLeftBtn.addEventListener('click', () => rotateSelectedPages(-90));
  }

  if (pdfBulkRotateRightBtn) {
    pdfBulkRotateRightBtn.addEventListener('click', () => rotateSelectedPages(90));
  }

  if (pdfBulkDeleteBtn) {
    pdfBulkDeleteBtn.addEventListener('click', () => deleteSelectedPages());
  }

  if (pdfBulkClearBtn) {
    pdfBulkClearBtn.addEventListener('click', () => {
      multiSelectedPageIds.clear();
      lastClickedPageIndex = null;
      updateMultiSelectionUI();
    });
  }
}

/**
 * Setup PDF Document Order Section & Confirmation Modal
 */
function setupPdfOrderControls() {
  if (pdfOrderToggleBtn && pdfOrderBody) {
    pdfOrderToggleBtn.addEventListener('click', () => {
      const isExpanded = pdfOrderToggleBtn.getAttribute('aria-expanded') === 'true';
      pdfOrderToggleBtn.setAttribute('aria-expanded', String(!isExpanded));
      pdfOrderBody.hidden = isExpanded;
    });
  }

  if (pdfReorderCloseBtn) {
    pdfReorderCloseBtn.addEventListener('click', closeReorderConfirmModal);
  }
  if (pdfReorderCancelBtn) {
    pdfReorderCancelBtn.addEventListener('click', closeReorderConfirmModal);
  }
  if (pdfReorderConfirmModal) {
    pdfReorderConfirmModal.addEventListener('click', (e) => {
      if (e.target === pdfReorderConfirmModal) closeReorderConfirmModal();
    });
  }
  if (pdfReorderConfirmBtn) {
    pdfReorderConfirmBtn.addEventListener('click', () => {
      if (pendingDocReorder) {
        const { fromIndex, toIndex } = pendingDocReorder;
        closeReorderConfirmModal();
        applyPdfDocReorder(fromIndex, toIndex);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (pdfReorderConfirmModal && !pdfReorderConfirmModal.hidden) {
        closeReorderConfirmModal();
      } else if (multiSelectedPageIds.size > 0) {
        multiSelectedPageIds.clear();
        lastClickedPageIndex = null;
        updateMultiSelectionUI();
      }
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && multiSelectedPageIds.size > 0) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (pdfReorderConfirmModal && !pdfReorderConfirmModal.hidden) return;
      e.preventDefault();
      deleteSelectedPages();
    }
  });
}

/**
 * Render the list of loaded PDF documents with color indicators and reorder controls
 */
function renderPdfOrderList() {
  if (!pdfOrderSection || !pdfOrderList) return;

  if (pdfDocuments.length === 0) {
    pdfOrderSection.hidden = true;
    pdfOrderList.innerHTML = '';
    return;
  }

  pdfOrderSection.hidden = false;
  pdfOrderCount.textContent = `${pdfDocuments.length} fichier${pdfDocuments.length > 1 ? 's' : ''}`;
  pdfOrderList.innerHTML = '';

  pdfDocuments.forEach((doc, index) => {
    const color = doc.color || getPdfColor(index);
    const docPageCount = pdfPages.filter(p => p.docId === doc.id).length;

    const item = document.createElement('div');
    item.className = 'pdf-order-item';
    item.draggable = pdfDocuments.length > 1;
    item.dataset.docIndex = index;
    item.style.setProperty('--pdf-doc-bg', color.bg);
    item.style.setProperty('--pdf-doc-border', color.border);
    item.style.setProperty('--pdf-doc-accent', color.accent);

    const left = document.createElement('div');
    left.className = 'pdf-order-item-left';

    const handle = document.createElement('span');
    handle.className = 'pdf-order-drag-handle';
    handle.textContent = '⋮⋮';
    handle.title = 'Glisser pour réordonner';

    const colorDot = document.createElement('span');
    colorDot.className = 'pdf-order-color-dot';

    const indexSpan = document.createElement('span');
    indexSpan.className = 'pdf-order-index';
    indexSpan.textContent = `${index + 1}.`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pdf-order-name';
    nameSpan.textContent = doc.name;
    nameSpan.title = doc.name;

    const pagesBadge = document.createElement('span');
    pagesBadge.className = 'pdf-order-pages-badge';
    pagesBadge.textContent = `${docPageCount} page${docPageCount > 1 ? 's' : ''}`;

    left.appendChild(handle);
    left.appendChild(colorDot);
    left.appendChild(indexSpan);
    left.appendChild(nameSpan);
    left.appendChild(pagesBadge);

    const actions = document.createElement('div');
    actions.className = 'pdf-order-actions';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'page-action-btn';
    upBtn.textContent = '↑';
    upBtn.title = 'Monter ce PDF';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      requestPdfDocReorder(index, index - 1);
    });

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'page-action-btn';
    downBtn.textContent = '↓';
    downBtn.title = 'Descendre ce PDF';
    downBtn.disabled = index === pdfDocuments.length - 1;
    downBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      requestPdfDocReorder(index, index + 1);
    });

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);

    item.appendChild(left);
    item.appendChild(actions);

    setupDocOrderDragEvents(item, index);
    pdfOrderList.appendChild(item);
  });
}

function setupDocOrderDragEvents(item, index) {
  item.addEventListener('dragstart', (e) => {
    draggedDocIndex = index;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    draggedDocIndex = null;
    document.querySelectorAll('.pdf-order-item').forEach(el => el.classList.remove('drag-over-target'));
  });

  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedDocIndex !== null && draggedDocIndex !== index) {
      item.classList.add('drag-over-target');
    }
  });

  item.addEventListener('dragleave', () => {
    item.classList.remove('drag-over-target');
  });

  item.addEventListener('drop', (e) => {
    e.preventDefault();
    item.classList.remove('drag-over-target');
    if (draggedDocIndex !== null && draggedDocIndex !== index) {
      requestPdfDocReorder(draggedDocIndex, index);
    }
  });
}

/**
 * Check whether pages have been mixed or manually reordered away from clean per-document grouping
 */
function arePagesMixed() {
  const expectedIds = [];
  for (const doc of pdfDocuments) {
    const docPages = pdfPages
      .filter(p => p.docId === doc.id)
      .sort((a, b) => a.pageIndex - b.pageIndex);
    for (const p of docPages) {
      expectedIds.push(p.id);
    }
  }

  if (expectedIds.length !== pdfPages.length) return true;
  return pdfPages.some((p, idx) => p.id !== expectedIds[idx]);
}

function requestPdfDocReorder(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  if (fromIndex < 0 || fromIndex >= pdfDocuments.length || toIndex < 0 || toIndex >= pdfDocuments.length) return;

  if (arePagesMixed()) {
    pendingDocReorder = { fromIndex, toIndex };
    openReorderConfirmModal();
    return;
  }

  applyPdfDocReorder(fromIndex, toIndex);
}

function openReorderConfirmModal() {
  if (!pdfReorderConfirmModal) return;
  pdfReorderConfirmModal.hidden = false;
}

function closeReorderConfirmModal() {
  if (!pdfReorderConfirmModal) return;
  pdfReorderConfirmModal.hidden = true;
  pendingDocReorder = null;
}

function applyPdfDocReorder(fromIndex, toIndex) {
  const [movedDoc] = pdfDocuments.splice(fromIndex, 1);
  pdfDocuments.splice(toIndex, 0, movedDoc);

  // Rebuild pdfPages grouped by the new pdfDocuments order
  const reorderedPages = [];
  for (const doc of pdfDocuments) {
    const docPages = pdfPages
      .filter(p => p.docId === doc.id)
      .sort((a, b) => a.pageIndex - b.pageIndex);
    reorderedPages.push(...docPages);
  }
  pdfPages = reorderedPages;
  multiSelectedPageIds.clear();
  lastClickedPageIndex = null;

  renderPdfOrderList();
  renderPdfGrid();
  updatePdfStats();
  showToast(`"${movedDoc.name}" déplacé en position #${toIndex + 1}.`);
}

/**
 * PDF Export Execution via PDFLib
 */
function setupPdfExport() {
  pdfDownloadBtn.addEventListener('click', async () => {
    const selectedPages = pdfPages.filter(p => p.selected);

    if (selectedPages.length === 0) {
      showToast('Veuillez cocher au moins une page pour créer le PDF !');
      return;
    }

    try {
      showToast('Génération du nouveau document PDF en cours...');
      pdfDownloadBtn.disabled = true;

      const PDFLibInstance = getPdfLib();
      if (!PDFLibInstance) throw new Error('PDFLib n\'est pas encore chargé.');
      const { PDFDocument, degrees } = PDFLibInstance;
      const newPdfDoc = await PDFDocument.create();

      // Load source documents into memory
      const loadedDocsMap = {};
      for (const docInfo of pdfDocuments) {
        loadedDocsMap[docInfo.id] = await PDFDocument.load(docInfo.arrayBuffer);
      }

      // Append selected pages in user-arranged order
      for (const pageItem of selectedPages) {
        const sourceDoc = loadedDocsMap[pageItem.docId];
        if (!sourceDoc) continue;

        const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageItem.pageIndex]);

        // Apply rotation if any
        if (pageItem.rotation !== 0) {
          const currentRotation = copiedPage.getRotation().angle || 0;
          copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
        }

        newPdfDoc.addPage(copiedPage);
      }

      // Save PDF to Uint8Array
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Trigger download
      let rawName = pdfExportName.value.trim() || 'document-organise.pdf';
      if (!rawName.toLowerCase().endsWith('.pdf')) rawName += '.pdf';

      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = rawName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Téléchargement de ${rawName} réussi ! 🎉`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Erreur lors de la création du PDF : ' + err.message);
    } finally {
      pdfDownloadBtn.disabled = false;
    }
  });
}

// PDF Paste Event
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!pdfStep1.hidden && (item.type === 'application/pdf' || item.kind === 'file')) {
      const file = item.getAsFile();
      if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
        showToast('Fichier PDF collé depuis le presse-papier !');
        handlePdfFilesSelected([file]);
        break;
      }
    }
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initSharedUI('pdf-organizer');
  initPdfOrganizer();
});
