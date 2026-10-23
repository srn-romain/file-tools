/**
 * OmniTools — PDF Studio (Organisateur & Fusion de PDF)
 * 100% Client-Side with PDF-Lib & PDF.js
 */

import { showToast, initSharedUI } from './shared.js?v=2';

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
const pdfSelectAllBtn = document.getElementById('pdf-select-all-btn');
const pdfDeselectAllBtn = document.getElementById('pdf-deselect-all-btn');
const pdfAddMoreBtn = document.getElementById('pdf-add-more-btn');
const pdfAddMoreInput = document.getElementById('pdf-add-more-input');
const pdfLoadingIndicator = document.getElementById('pdf-loading-indicator');
const pdfLoadingText = document.getElementById('pdf-loading-text');

// PDF Export Elements
const pdfExportName = document.getElementById('pdf-export-name');
const pdfDownloadBtn = document.getElementById('pdf-download-btn');
const pdfDownloadBtnText = document.getElementById('pdf-download-btn-text');
const pdfNewBtn = document.getElementById('pdf-new-btn');

// PDF State
let pdfDocuments = []; // Array of { id, name, arrayBuffer }
let pdfPages = [];     // Array of page objects
let draggedPageIndex = null;
let pageIdCounter = 1;

export function initPdfOrganizer() {
  setupPdfInputs();
  setupPdfBatchActions();
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
    pageIdCounter = 1;
    goToPdfStep(2);
  }

  pdfLoadingIndicator.hidden = false;
  pdfLoadingText.textContent = `Lecture de ${files.length} fichier(s) PDF...`;

  try {
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const docId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

      pdfDocuments.push({
        id: docId,
        name: file.name,
        arrayBuffer: buffer
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

  pdfPages.forEach((page, index) => {
    const card = document.createElement('div');
    card.className = `pdf-page-card ${page.selected ? '' : 'excluded'}`;
    card.draggable = true;
    card.dataset.index = index;
    card.dataset.id = page.id;

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

    // Drag and Drop Events for Card Reordering
    setupCardDragEvents(card, index);

    pdfPagesGrid.appendChild(card);
  });
}

/**
 * Setup Drag & Drop Reordering on Page Cards
 */
function setupCardDragEvents(card, index) {
  card.addEventListener('dragstart', (e) => {
    draggedPageIndex = index;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedPageIndex = null;
    document.querySelectorAll('.pdf-page-card').forEach(c => c.classList.remove('drag-over-target'));
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPageIndex !== null && draggedPageIndex !== index) {
      card.classList.add('drag-over-target');
    }
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over-target');
  });

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over-target');
    if (draggedPageIndex !== null && draggedPageIndex !== index) {
      movePage(draggedPageIndex, index);
    }
  });
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
    renderPdfGrid();
    updatePdfStats();
    showToast('Toutes les pages ont été sélectionnées.');
  });

  pdfDeselectAllBtn.addEventListener('click', () => {
    pdfPages.forEach(p => p.selected = false);
    renderPdfGrid();
    updatePdfStats();
    showToast('Toutes les pages ont été désélectionnées.');
  });

  pdfNewBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser et insérer de nouveaux PDF ?')) {
      pdfDocuments = [];
      pdfPages = [];
      goToPdfStep(1);
    }
  });
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
