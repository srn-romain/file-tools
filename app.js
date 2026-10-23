/**
 * OmniTools — Multi-Tool Suite (100% Client-Side / GitHub Pages Ready)
 * 1. Détourage d'image par IA (ClearCut with ISNet FP32 & Retouch Engine)
 * 2. Organisateur & Fusion de PDF (pdf-lib & pdf.js)
 */

import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ==========================================================================
   GLOBAL APP & TOOL SWITCHER (DROPDOWN)
   ========================================================================== */

const toolDropdownBtn = document.getElementById('tool-dropdown-btn');
const toolDropdownMenu = document.getElementById('tool-dropdown-menu');
const headerToolIcon = document.getElementById('header-tool-icon');
const headerToolName = document.getElementById('header-tool-name');
const toolDropdownItems = document.querySelectorAll('.tool-dropdown-item[data-tool]');
const toolViews = {
  'bg-remover': document.getElementById('tool-view-bg-remover'),
  'pdf-organizer': document.getElementById('tool-view-pdf-organizer'),
  'compressor': document.getElementById('tool-view-compressor'),
  'photo-merger': document.getElementById('tool-view-photo-merger')
};

let currentActiveTool = 'bg-remover';

function initToolSwitcher() {
  // Toggle Dropdown Menu
  toolDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = toolDropdownBtn.classList.toggle('open');
    toolDropdownMenu.hidden = !isExpanded;
    toolDropdownBtn.setAttribute('aria-expanded', isExpanded);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.brand-dropdown-container')) {
      closeToolDropdown();
    }
  });

  // Select tool
  toolDropdownItems.forEach(item => {
    item.addEventListener('click', () => {
      const toolId = item.dataset.tool;
      switchTool(toolId);
      closeToolDropdown();
    });
  });

  // Check URL hash on load
  const hash = window.location.hash.replace('#', '');
  if (hash === 'pdf-organizer' || hash === 'bg-remover' || hash === 'compressor' || hash === 'photo-merger') {
    switchTool(hash);
  }
}

function closeToolDropdown() {
  toolDropdownBtn.classList.remove('open');
  toolDropdownMenu.hidden = true;
  toolDropdownBtn.setAttribute('aria-expanded', 'false');
}

function switchTool(toolId) {
  if (!toolViews[toolId]) return;

  currentActiveTool = toolId;
  window.location.hash = toolId;

  // Update active views
  Object.keys(toolViews).forEach(id => {
    const el = toolViews[id];
    if (!el) return;
    const isActive = id === toolId;
    el.classList.toggle('active', isActive);
    el.hidden = !isActive;
  });

  // Update dropdown items state
  toolDropdownItems.forEach(item => {
    item.classList.toggle('active', item.dataset.tool === toolId);
  });

  // Update Header Button display
  if (toolId === 'bg-remover') {
    headerToolIcon.textContent = '✂️';
    headerToolName.textContent = 'Détourage d\'image';
    document.title = 'ClearCut AI — Détourage d\'image & Retouche';
  } else if (toolId === 'pdf-organizer') {
    headerToolIcon.textContent = '📑';
    headerToolName.textContent = 'Organisateur de PDF';
    document.title = 'PDF Studio — Organiser, Réordonner & Fusionner PDF';
  } else if (toolId === 'compressor') {
    headerToolIcon.textContent = '🗜️';
    headerToolName.textContent = 'Compresseur de fichiers';
    document.title = 'OmniTools — Compresseur de fichiers (Images & PDF)';
  } else if (toolId === 'photo-merger') {
    headerToolIcon.textContent = '🖼️';
    headerToolName.textContent = 'Fusion Photo';
    document.title = 'OmniTools — Assembleur & Fusion Photo';
  }
}

/* ==========================================================================
   TOOL 1: BACKGROUND REMOVAL & RETOUCH ENGINE (CLEARCUT)
   ========================================================================== */

// DOM Elements: Step 1
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const sampleBtn = document.getElementById('sample-btn');
const qualityButtons = document.querySelectorAll('.quality-btn');

// Processing State Elements
const processingState = document.getElementById('processing-state');
const processTitle = document.getElementById('process-title');
const processDetail = document.getElementById('process-detail');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const progressStage = document.getElementById('progress-stage');

// Result State Elements
const resultState = document.getElementById('result-state');
const standardView = document.getElementById('standard-view');
const originalView = document.getElementById('original-view');
const comparisonView = document.getElementById('comparison-view');
const canvasContainer = document.getElementById('canvas-container');
const editorCanvas = document.getElementById('editor-canvas');
const brushCursor = document.getElementById('brush-cursor');
const retouchHint = document.getElementById('retouch-hint');
const originalPreviewImg = document.getElementById('original-preview-img');
const compareBeforeImg = document.getElementById('compare-before-img');
const compareAfterImg = document.getElementById('compare-after-img');
const comparisonSlider = document.getElementById('comparison-slider');
const comparisonDivider = document.getElementById('comparison-divider');
const comparisonAfter = document.getElementById('comparison-after');

// Tabs & Retouch Toolbar
const tabRemoved = document.getElementById('tab-removed');
const tabOriginal = document.getElementById('tab-original');
const tabCompare = document.getElementById('tab-compare');
const toggleEditorBtn = document.getElementById('toggle-editor-btn');
const editorToolbar = document.getElementById('editor-toolbar');
const toolErase = document.getElementById('tool-erase');
const toolRestore = document.getElementById('tool-restore');
const toolUndo = document.getElementById('tool-undo');
const toolResetEdits = document.getElementById('tool-reset-edits');
const brushSizeSlider = document.getElementById('brush-size-slider');
const brushSizeValue = document.getElementById('brush-size-value');
const brushPreviewDot = document.getElementById('brush-preview-dot');
const edgeThresholdSlider = document.getElementById('edge-threshold-slider');
const edgeThresholdValue = document.getElementById('edge-threshold-value');

// Action Buttons
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const copyBtnText = document.getElementById('copy-btn-text');
const newImageBtn = document.getElementById('new-image-btn');
const bgButtons = document.querySelectorAll('.bg-btn');

// Error State & Metadata
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const errorRetryBtn = document.getElementById('error-retry-btn');
const imageDimensions = document.getElementById('image-dimensions');
const imageFilesize = document.getElementById('image-filesize');
const toastEl = document.getElementById('toast');

// Application & Canvas State
let selectedModel = 'isnet'; // Studio-grade ISNet FP32
let originalBlob = null;
let originalUrl = null;
let originalFileName = 'image';
let imgWidth = 0;
let imgHeight = 0;

let originalCanvas = null;
let originalCtx = null;
let baseMaskCanvas = null;
let maskCanvas = null;
let maskCtx = null;
let editorCtx = null;

let isRetouchMode = false;
let currentTool = 'erase';
let brushSize = 28;
let edgeThreshold = 0;
let isPainting = false;
let lastPoint = null;
let undoStack = [];
const MAX_UNDO_STEPS = 12;

function initBgRemover() {
  setupQualitySelector();
  setupBgFileInputs();
  setupBgDragAndDrop();
  setupBgSampleButton();
  setupBgTabsAndRetouch();
  setupCanvasEvents();
  setupBgResultControls();
}

function setupQualitySelector() {
  qualityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      qualityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedModel = btn.dataset.model || 'isnet';
      const label = selectedModel === 'isnet' ? 'Haute Définition (ISNet FP32)' : 'Standard (Rapide)';
      showToast(`Modèle IA : ${label}`);
    });
  });
}

function setupBgFileInputs() {
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#sample-btn') || e.target.closest('.paste-badge')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelected(file);
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
}

function setupBgDragAndDrop() {
  let dragCounter = 0;

  dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropzone.classList.add('drag-active');
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dropzone.classList.contains('drag-active')) dropzone.classList.add('drag-active');
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzone.classList.remove('drag-active');
    }
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropzone.classList.remove('drag-active');

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        handleImageSelected(file);
      } else {
        showToast('Veuillez déposer un fichier image valide.');
      }
    }
  });
}

function setupBgSampleButton() {
  sampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      showToast('Chargement de l\'image d\'exemple...');
      const response = await fetch('sample.jpg');
      const blob = await response.blob();
      handleImageSelected(blob, 'chat-exemple.jpg');
    } catch (err) {
      console.error(err);
      showToast('Impossible de charger l\'image d\'exemple.');
    }
  });
}

async function handleImageSelected(fileOrBlob, defaultName = null) {
  originalBlob = fileOrBlob;
  originalFileName = defaultName || (fileOrBlob.name ? fileOrBlob.name.replace(/\.[^/.]+$/, "") : 'image');

  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = URL.createObjectURL(originalBlob);

  goToBgStep(2);
  resetBgStep2UI();

  await loadOriginalImage(originalUrl);
  await runBackgroundRemoval(originalBlob);
}

function goToBgStep(stepNum) {
  if (stepNum === 1) {
    step1.hidden = false;
    step2.hidden = true;
    fileInput.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (stepNum === 2) {
    step1.hidden = true;
    step2.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function resetBgStep2UI() {
  processingState.hidden = false;
  resultState.hidden = true;
  errorState.hidden = true;

  processTitle.textContent = 'Détourage automatique en cours...';
  processDetail.textContent = selectedModel === 'isnet' 
    ? 'Calcul neuronal haute précision (ISNet FP32)...' 
    : 'Préparation du modèle standard...';
  progressBar.style.width = '12%';
  progressPercent.textContent = '12%';
  progressStage.textContent = 'Initialisation...';
}

function loadOriginalImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imgWidth = img.naturalWidth;
      imgHeight = img.naturalHeight;
      imageDimensions.innerHTML = `${imgWidth} &times; ${imgHeight} px`;

      originalPreviewImg.src = url;
      compareBeforeImg.src = url;
      document.documentElement.style.setProperty('--original-bg-image', `url(${url})`);

      originalCanvas = document.createElement('canvas');
      originalCanvas.width = imgWidth;
      originalCanvas.height = imgHeight;
      originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
      originalCtx.drawImage(img, 0, 0);

      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function runBackgroundRemoval(blob) {
  try {
    const config = {
      debug: false,
      model: selectedModel,
      publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.8/dist/',
      progress: (key, current, total) => handleBgProgress(key, current, total)
    };

    const outputBlob = await removeBackground(blob, config);
    await setupCutoutCanvases(outputBlob);
    displayBgResult();
  } catch (err) {
    console.error('Error in background removal:', err);
    displayBgError(err);
  }
}

function handleBgProgress(key, current, total) {
  let percent = 0;
  if (total && total > 0) percent = Math.min(100, Math.round((current / total) * 100));
  else if (current > 0) percent = Math.min(95, Math.round(current * 10));

  if (key.includes('fetch')) {
    processTitle.textContent = 'Téléchargement de l\'IA haute précision...';
    processDetail.textContent = 'Réseau neuronal ISNet en cours de chargement.';
    progressStage.textContent = 'Modèle IA';
  } else if (key.includes('decode')) {
    processTitle.textContent = 'Analyse de l\'image...';
    processDetail.textContent = 'Détection de la silhouette et des contours.';
    progressStage.textContent = 'Prétraitement';
  } else if (key.includes('inference')) {
    processTitle.textContent = 'Détourage haute précision...';
    processDetail.textContent = 'Séparation intelligente du sujet et de l\'arrière-plan.';
    progressStage.textContent = 'Calcul neuronal';
  } else if (key.includes('encode')) {
    processTitle.textContent = 'Finalisation du rendu...';
    processDetail.textContent = 'Génération du PNG transparent.';
    progressStage.textContent = 'Génération PNG';
  }

  progressBar.style.width = `${Math.max(15, percent)}%`;
  progressPercent.textContent = `${percent}%`;
}

async function setupCutoutCanvases(cutoutBlob) {
  const cutoutImg = new Image();
  const cutoutUrl = URL.createObjectURL(cutoutBlob);

  await new Promise(r => { cutoutImg.onload = r; cutoutImg.src = cutoutUrl; });

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imgWidth;
  tempCanvas.height = imgHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(cutoutImg, 0, 0, imgWidth, imgHeight);

  const cutoutData = tempCtx.getImageData(0, 0, imgWidth, imgHeight);

  maskCanvas = document.createElement('canvas');
  maskCanvas.width = imgWidth;
  maskCanvas.height = imgHeight;
  maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

  baseMaskCanvas = document.createElement('canvas');
  baseMaskCanvas.width = imgWidth;
  baseMaskCanvas.height = imgHeight;
  const baseMaskCtx = baseMaskCanvas.getContext('2d');

  const maskImgData = maskCtx.createImageData(imgWidth, imgHeight);
  for (let i = 0; i < cutoutData.data.length; i += 4) {
    const alpha = cutoutData.data[i + 3];
    maskImgData.data[i] = 255;
    maskImgData.data[i + 1] = 255;
    maskImgData.data[i + 2] = 255;
    maskImgData.data[i + 3] = alpha;
  }

  maskCtx.putImageData(maskImgData, 0, 0);
  baseMaskCtx.putImageData(maskImgData, 0, 0);

  editorCanvas.width = imgWidth;
  editorCanvas.height = imgHeight;
  editorCtx = editorCanvas.getContext('2d');

  undoStack = [];
  edgeThreshold = 0;
  edgeThresholdSlider.value = 0;
  edgeThresholdValue.textContent = '0';

  renderComposite();
  URL.revokeObjectURL(cutoutUrl);
}

function renderComposite() {
  if (!editorCtx || !originalCanvas || !maskCanvas) return;

  editorCtx.clearRect(0, 0, imgWidth, imgHeight);

  if (edgeThreshold !== 0) {
    renderWithThreshold();
  } else {
    editorCtx.globalCompositeOperation = 'source-over';
    editorCtx.drawImage(originalCanvas, 0, 0);
    editorCtx.globalCompositeOperation = 'destination-in';
    editorCtx.drawImage(maskCanvas, 0, 0);
    editorCtx.globalCompositeOperation = 'source-over';
  }

  compareAfterImg.src = editorCanvas.toDataURL('image/png');
}

function renderWithThreshold() {
  const origData = originalCtx.getImageData(0, 0, imgWidth, imgHeight);
  const maskData = maskCtx.getImageData(0, 0, imgWidth, imgHeight);
  const outData = editorCtx.createImageData(imgWidth, imgHeight);
  const shift = edgeThreshold * 2.5;

  for (let i = 0; i < origData.data.length; i += 4) {
    outData.data[i] = origData.data[i];
    outData.data[i + 1] = origData.data[i + 1];
    outData.data[i + 2] = origData.data[i + 2];

    let a = maskData.data[i + 3];
    if (a > 0) {
      if (shift > 0) a = Math.max(0, Math.min(255, (a - shift) * (255 / (255 - shift))));
      else a = Math.max(0, Math.min(255, a + Math.abs(shift)));
    }
    outData.data[i + 3] = a;
  }

  editorCtx.putImageData(outData, 0, 0);
}

function displayBgResult() {
  processingState.hidden = true;
  resultState.hidden = false;
  errorState.hidden = true;

  switchViewTab('removed');

  editorCanvas.toBlob((blob) => {
    if (blob) {
      const sizeKb = (blob.size / 1024).toFixed(0);
      imageFilesize.textContent = `PNG Transparent (${sizeKb} Ko)`;
    }
  }, 'image/png');

  showToast('Détourage terminé ! Vous pouvez ajuster au besoin avec la gomme ✏️');
}

function displayBgError(err) {
  processingState.hidden = true;
  resultState.hidden = true;
  errorState.hidden = false;
  errorMessage.textContent = `Détails : ${err?.message || 'Erreur inconnue'}. Assurez-vous que l'image est valide.`;
}

function setupBgTabsAndRetouch() {
  tabRemoved.addEventListener('click', () => switchViewTab('removed'));
  tabOriginal.addEventListener('click', () => switchViewTab('original'));
  tabCompare.addEventListener('click', () => switchViewTab('compare'));

  toggleEditorBtn.addEventListener('click', () => setRetouchMode(!isRetouchMode));
  toolErase.addEventListener('click', () => setRetouchTool('erase'));
  toolRestore.addEventListener('click', () => setRetouchTool('restore'));
  toolUndo.addEventListener('click', () => undoLastEdit());

  toolResetEdits.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser toutes vos retouches manuelles ?')) resetAllEdits();
  });

  brushSizeSlider.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value, 10);
    brushSizeValue.textContent = `${brushSize} px`;
    brushPreviewDot.style.width = `${brushSize}px`;
    brushPreviewDot.style.height = `${brushSize}px`;
    updateBrushCursorSize();
  });

  edgeThresholdSlider.addEventListener('input', (e) => {
    edgeThreshold = parseInt(e.target.value, 10);
    edgeThresholdValue.textContent = `${edgeThreshold > 0 ? '+' : ''}${edgeThreshold}`;
    renderComposite();
  });

  window.addEventListener('keydown', (e) => {
    if (currentActiveTool !== 'bg-remover' || step2.hidden || !isRetouchMode) return;
    if (e.key === 'e' || e.key === 'E') setRetouchTool('erase');
    else if (e.key === 'r' || e.key === 'R') setRetouchTool('restore');
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastEdit(); }
  });
}

function switchViewTab(tabName) {
  tabRemoved.classList.toggle('active', tabName === 'removed');
  tabOriginal.classList.toggle('active', tabName === 'original');
  tabCompare.classList.toggle('active', tabName === 'compare');

  standardView.hidden = tabName !== 'removed';
  originalView.hidden = tabName !== 'original';
  comparisonView.hidden = tabName !== 'compare';

  if (tabName !== 'removed' && isRetouchMode) setRetouchMode(false);
}

function setRetouchMode(active) {
  isRetouchMode = active;
  toggleEditorBtn.classList.toggle('active', isRetouchMode);
  editorToolbar.hidden = !isRetouchMode;
  canvasContainer.classList.toggle('retouch-mode', isRetouchMode);
  brushCursor.hidden = !isRetouchMode;
  retouchHint.hidden = !isRetouchMode;

  if (isRetouchMode) {
    switchViewTab('removed');
    showToast('Mode retouche actif : cliquez et glissez sur l\'image.');
    updateBrushCursorSize();
  }
}

function setRetouchTool(tool) {
  currentTool = tool;
  toolErase.classList.toggle('active', tool === 'erase');
  toolRestore.classList.toggle('active', tool === 'restore');
  brushCursor.className = `brush-cursor ${tool}-mode`;
  showToast(tool === 'erase' ? 'Gomme active' : 'Pinceau de restauration actif');
}

function updateBrushCursorSize() {
  const rect = editorCanvas.getBoundingClientRect();
  const scale = rect.width / imgWidth;
  const displayBrushSize = Math.max(12, brushSize * scale);

  brushCursor.style.width = `${displayBrushSize}px`;
  brushCursor.style.height = `${displayBrushSize}px`;
  brushCursor.className = `brush-cursor ${currentTool}-mode`;
}

function setupCanvasEvents() {
  canvasContainer.addEventListener('pointermove', (e) => {
    if (!isRetouchMode) return;
    const containerRect = canvasContainer.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    brushCursor.style.left = `${x}px`;
    brushCursor.style.top = `${y}px`;

    if (isPainting) paintToCanvas(e);
  });

  canvasContainer.addEventListener('pointerenter', () => {
    if (isRetouchMode) brushCursor.hidden = false;
  });

  canvasContainer.addEventListener('pointerleave', () => {
    brushCursor.hidden = true;
    if (isPainting) isPainting = false;
  });

  canvasContainer.addEventListener('pointerdown', (e) => {
    if (!isRetouchMode || e.button !== 0) return;
    e.preventDefault();

    saveUndoState();
    isPainting = true;
    lastPoint = getCanvasCoordinates(e);
    paintStroke(lastPoint.x, lastPoint.y);
  });

  window.addEventListener('pointerup', () => { isPainting = false; lastPoint = null; });
}

function getCanvasCoordinates(e) {
  const rect = editorCanvas.getBoundingClientRect();
  const scaleX = imgWidth / rect.width;
  const scaleY = imgHeight / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function paintToCanvas(e) {
  if (!isPainting || !lastPoint) return;
  const currentPoint = getCanvasCoordinates(e);
  paintLine(lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y);
  lastPoint = currentPoint;
}

function paintStroke(x, y) {
  if (!maskCtx) return;
  maskCtx.save();
  if (currentTool === 'erase') {
    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  } else {
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  }
  maskCtx.restore();
  renderComposite();
}

function paintLine(x1, y1, x2, y2) {
  if (!maskCtx) return;
  maskCtx.save();
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  maskCtx.lineWidth = brushSize;

  if (currentTool === 'erase') {
    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.beginPath();
    maskCtx.moveTo(x1, y1);
    maskCtx.lineTo(x2, y2);
    maskCtx.stroke();
  } else {
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.strokeStyle = '#ffffff';
    maskCtx.beginPath();
    maskCtx.moveTo(x1, y1);
    maskCtx.lineTo(x2, y2);
    maskCtx.stroke();
  }
  maskCtx.restore();
  renderComposite();
}

function saveUndoState() {
  if (!maskCanvas) return;
  const snapshot = document.createElement('canvas');
  snapshot.width = imgWidth;
  snapshot.height = imgHeight;
  snapshot.getContext('2d').drawImage(maskCanvas, 0, 0);

  undoStack.push(snapshot);
  if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
}

function undoLastEdit() {
  if (undoStack.length === 0) {
    showToast('Aucune retouche à annuler.');
    return;
  }
  const previousSnapshot = undoStack.pop();
  maskCtx.clearRect(0, 0, imgWidth, imgHeight);
  maskCtx.drawImage(previousSnapshot, 0, 0);
  renderComposite();
  showToast('Dernière retouche annulée.');
}

function resetAllEdits() {
  if (!baseMaskCanvas || !maskCtx) return;
  saveUndoState();
  maskCtx.clearRect(0, 0, imgWidth, imgHeight);
  maskCtx.drawImage(baseMaskCanvas, 0, 0);

  edgeThreshold = 0;
  edgeThresholdSlider.value = 0;
  edgeThresholdValue.textContent = '0';

  renderComposite();
  showToast('Retouches réinitialisées.');
}

function setupBgResultControls() {
  bgButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      bgButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const bgType = btn.dataset.bg;
      standardView.className = 'preview-stage';
      comparisonView.className = 'comparison-container';

      const themeClass = `bg-theme-${bgType}`;
      standardView.classList.add(themeClass);
      comparisonView.classList.add(themeClass);
    });
  });

  comparisonSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    comparisonAfter.style.width = `${val}%`;
    comparisonDivider.style.left = `${val}%`;
  });

  downloadBtn.addEventListener('click', () => downloadProcessedImage());

  copyBtn.addEventListener('click', async () => {
    if (!editorCanvas) return;
    try {
      copyBtnText.textContent = 'Copie...';
      editorCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Erreur blob PNG');
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        copyBtnText.textContent = 'Copié !';
        showToast('Image copiée dans le presse-papier !');
        setTimeout(() => { copyBtnText.textContent = 'Copier'; }, 2000);
      }, 'image/png');
    } catch (err) {
      console.warn(err);
      showToast('Votre navigateur ne supporte pas la copie directe.');
      copyBtnText.textContent = 'Copier';
    }
  });

  newImageBtn.addEventListener('click', () => resetBgToStep1());
  errorRetryBtn.addEventListener('click', () => resetBgToStep1());
}

function downloadProcessedImage() {
  if (!editorCanvas) return;
  editorCanvas.toBlob((blob) => {
    if (!blob) return;
    const cleanName = `${originalFileName}-sans-fond.png`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Téléchargement de ${cleanName} lancé ! 💾`);
  }, 'image/png');
}

function resetBgToStep1() {
  if (originalUrl) {
    URL.revokeObjectURL(originalUrl);
    originalUrl = null;
  }
  originalBlob = null;
  undoStack = [];
  isRetouchMode = false;
  setRetouchMode(false);

  if (editorCtx) editorCtx.clearRect(0, 0, imgWidth, imgHeight);
  originalCanvas = null;
  maskCanvas = null;
  baseMaskCanvas = null;

  goToBgStep(1);
}

/* ==========================================================================
   TOOL 2: PDF ORGANIZER (REORGANIZE, REORDER, EXCLUDE & MERGE PDFS)
   ========================================================================== */

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

function initPdfOrganizer() {
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

/* ==========================================================================
   TOOL 3: FILE COMPRESSOR (IMAGES & PDF)
   ========================================================================== */

// DOM Elements: Step 1
const compressStep1 = document.getElementById('compress-step-1');
const compressStep2 = document.getElementById('compress-step-2');
const compressDropzone = document.getElementById('compress-dropzone');
const compressFileInput = document.getElementById('compress-file-input');
const compressBrowseBtn = document.getElementById('compress-browse-btn');
const compressSampleImgBtn = document.getElementById('compress-sample-img-btn');
const compressSamplePdfBtn = document.getElementById('compress-sample-pdf-btn');

// Size Comparison & Info Card
const compressFileIcon = document.getElementById('compress-file-icon');
const compressFilename = document.getElementById('compress-filename');
const compressFileSub = document.getElementById('compress-file-sub');
const compressSavingBadge = document.getElementById('compress-saving-badge');
const compressOrigSize = document.getElementById('compress-orig-size');
const compressResultSize = document.getElementById('compress-result-size');

// Toolbar Controls
const presetButtons = document.querySelectorAll('.preset-btn');
const compressQualitySlider = document.getElementById('compress-quality-slider');
const compressQualityVal = document.getElementById('compress-quality-val');
const compressScaleRow = document.getElementById('compress-scale-row');
const scaleButtons = document.querySelectorAll('.scale-btn');

// Preview Stage
const compressImgPreview = document.getElementById('compress-img-preview');
const compressCanvasPreview = document.getElementById('compress-canvas-preview');
const compressStatusIndicator = document.getElementById('compress-status-indicator');
const compressStatusText = document.getElementById('compress-status-text');

// Action Buttons
const compressDownloadBtn = document.getElementById('compress-download-btn');
const compressDownloadBtnText = document.getElementById('compress-download-btn-text');
const compressNewBtn = document.getElementById('compress-new-btn');

// State Variables
let currentCompressFile = null;
let currentFileType = null; // 'image' | 'pdf'
let currentOriginalSize = 0;
let currentCompressedBlob = null;
let currentCompressedSize = 0;
let currentQuality = 75; // 10 to 95
let currentScale = 1.0;  // 1.0, 0.8, 0.6
let loadedImage = null;
let loadedPdfDoc = null;
let pdfOriginalBuffer = null;
let isCompressing = false;
let compressDebounceTimer = null;

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Octets';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function initCompressor() {
  if (!compressDropzone) return;

  // Browse button
  compressBrowseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    compressFileInput.click();
  });

  // Dropzone click
  compressDropzone.addEventListener('click', () => {
    compressFileInput.click();
  });

  // File Input change
  compressFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleCompressFile(e.target.files[0]);
    }
  });

  // Drag & drop
  compressDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    compressDropzone.classList.add('drag-over');
  });

  compressDropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    compressDropzone.classList.remove('drag-over');
  });

  compressDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    compressDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCompressFile(e.dataTransfer.files[0]);
    }
  });

  // Sample Buttons
  if (compressSampleImgBtn) {
    compressSampleImgBtn.addEventListener('click', async () => {
      try {
        showToast('Chargement de la photo d\'exemple...');
        const res = await fetch('sample.jpg');
        const blob = await res.blob();
        const file = new File([blob], 'photo_paysage_hd.jpg', { type: 'image/jpeg' });
        handleCompressFile(file);
      } catch (err) {
        showToast('Erreur chargement exemple : ' + err.message);
      }
    });
  }

  if (compressSamplePdfBtn) {
    compressSamplePdfBtn.addEventListener('click', async () => {
      try {
        showToast('Chargement du document PDF d\'exemple...');
        const res = await fetch('sample.pdf');
        const blob = await res.blob();
        const file = new File([blob], 'document_rapport.pdf', { type: 'application/pdf' });
        handleCompressFile(file);
      } catch (err) {
        showToast('Erreur chargement exemple : ' + err.message);
      }
    });
  }

  // Presets
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      if (preset === 'max') {
        currentQuality = 45;
        if (currentFileType === 'image') setResolutionScale(0.8);
      } else if (preset === 'balanced') {
        currentQuality = 75;
        if (currentFileType === 'image') setResolutionScale(1.0);
      } else if (preset === 'light') {
        currentQuality = 90;
        if (currentFileType === 'image') setResolutionScale(1.0);
      }

      compressQualitySlider.value = currentQuality;
      compressQualityVal.textContent = currentQuality + '%';
      scheduleCompression();
    });
  });

  // Quality slider
  compressQualitySlider.addEventListener('input', (e) => {
    currentQuality = parseInt(e.target.value, 10);
    compressQualityVal.textContent = currentQuality + '%';
    presetButtons.forEach(b => b.classList.remove('active'));
    scheduleCompression();
  });

  // Scale buttons
  scaleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      scaleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScale = parseFloat(btn.dataset.scale);
      scheduleCompression();
    });
  });

  // Download compressed file
  compressDownloadBtn.addEventListener('click', () => {
    if (!currentCompressedBlob || !currentCompressFile) return;

    const rawName = currentCompressFile.name;
    const lastDot = rawName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? rawName.slice(0, lastDot) : rawName;
    const origExt = lastDot !== -1 ? rawName.slice(lastDot + 1).toLowerCase() : '';

    let outExt = origExt;
    if (currentFileType === 'pdf') {
      outExt = 'pdf';
    } else if (origExt === 'png' && currentCompressedBlob.type === 'image/webp') {
      outExt = 'webp';
    } else if (origExt === 'jpg' || origExt === 'jpeg') {
      outExt = 'jpg';
    } else if (origExt === 'webp') {
      outExt = 'webp';
    } else {
      outExt = currentCompressedBlob.type.split('/')[1] || 'jpg';
    }

    const downloadName = `${baseName}_compressed.${outExt}`;
    const url = URL.createObjectURL(currentCompressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast(`Téléchargement de ${downloadName} réussi ! 🎉`);
  });

  // Reset to Step 1
  compressNewBtn.addEventListener('click', () => {
    resetCompressor();
  });
}

function setResolutionScale(scale) {
  currentScale = scale;
  scaleButtons.forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.scale) === scale);
  });
}

function handleCompressFile(file) {
  if (!file) return;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif)$/i.test(file.name);

  if (!isPdf && !isImage) {
    showToast('Format non supporté. Veuillez choisir une image (JPG, PNG, WebP) ou un PDF.');
    return;
  }

  currentCompressFile = file;
  currentOriginalSize = file.size;
  currentFileType = isPdf ? 'pdf' : 'image';

  // Setup Step 2 UI
  compressFilename.textContent = file.name;
  compressOrigSize.textContent = formatFileSize(file.size);
  compressResultSize.textContent = 'Calcul...';
  compressSavingBadge.textContent = '...';

  // Reset preset to balanced
  presetButtons.forEach(b => b.classList.toggle('active', b.dataset.preset === 'balanced'));
  currentQuality = 75;
  compressQualitySlider.value = 75;
  compressQualityVal.textContent = '75%';
  setResolutionScale(1.0);

  if (isImage) {
    compressFileIcon.textContent = '🖼️';
    compressScaleRow.style.display = 'flex';
    loadImageForCompression(file);
  } else {
    compressFileIcon.textContent = '📄';
    compressScaleRow.style.display = 'none';
    loadPdfForCompression(file);
  }

  compressStep1.hidden = true;
  compressStep2.hidden = false;
}

function loadImageForCompression(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    loadedImage = img;
    compressFileSub.textContent = `Image • ${img.naturalWidth} × ${img.naturalHeight} px`;
    runCompression();
  };
  img.onerror = () => {
    showToast('Erreur lors du chargement de l\'image.');
  };
  img.src = url;
}

async function loadPdfForCompression(file) {
  try {
    compressStatusText.textContent = 'Analyse du document PDF...';
    compressStatusIndicator.classList.add('processing');
    const buffer = await file.arrayBuffer();
    pdfOriginalBuffer = buffer;

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    loadedPdfDoc = await loadingTask.promise;

    compressFileSub.textContent = `Document PDF • ${loadedPdfDoc.numPages} ${loadedPdfDoc.numPages > 1 ? 'pages' : 'page'}`;
    runCompression();
  } catch (err) {
    console.error('Error loading PDF for compression:', err);
    showToast('Impossible d\'ouvrir ce document PDF : ' + err.message);
  }
}

function scheduleCompression() {
  clearTimeout(compressDebounceTimer);
  compressDebounceTimer = setTimeout(() => {
    runCompression();
  }, 220);
}

async function compressImageAsync() {
  if (!loadedImage) return null;

  const targetWidth = Math.max(1, Math.round(loadedImage.naturalWidth * currentScale));
  const targetHeight = Math.max(1, Math.round(loadedImage.naturalHeight * currentScale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let mimeType = 'image/jpeg';
  let ext = 'jpg';

  const origName = currentCompressFile.name.toLowerCase();
  if (origName.endsWith('.webp')) {
    mimeType = 'image/webp';
    ext = 'webp';
  } else if (origName.endsWith('.png')) {
    mimeType = 'image/webp';
    ext = 'webp';
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    mimeType = 'image/jpeg';
    ext = 'jpg';
  }

  ctx.drawImage(loadedImage, 0, 0, targetWidth, targetHeight);

  const qualityRatio = currentQuality / 100;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob, ext });
    }, mimeType, qualityRatio);
  });
}

async function compressPdfAsync() {
  if (!loadedPdfDoc || !window.PDFLib) return null;

  const PDFDocument = window.PDFLib.PDFDocument;
  const newPdf = await PDFDocument.create();

  const qualityRatio = currentQuality / 100;
  let renderScale = 1.0;
  if (currentQuality < 55) {
    renderScale = 0.85;
  } else if (currentQuality > 80) {
    renderScale = 1.35;
  } else {
    renderScale = 1.1;
  }

  const numPages = loadedPdfDoc.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    compressStatusText.textContent = `Optimisation page ${pageNum}/${numPages}...`;
    const page = await loadedPdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const jpegDataUrl = canvas.toDataURL('image/jpeg', qualityRatio);
    const embeddedImg = await newPdf.embedJpg(jpegDataUrl);

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const pdfPage = newPdf.addPage([unscaledViewport.width, unscaledViewport.height]);
    pdfPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: unscaledViewport.width,
      height: unscaledViewport.height
    });

    if (pageNum === 1) {
      compressCanvasPreview.width = canvas.width;
      compressCanvasPreview.height = canvas.height;
      const pctx = compressCanvasPreview.getContext('2d');
      pctx.drawImage(canvas, 0, 0);
      compressCanvasPreview.hidden = false;
      compressImgPreview.hidden = true;
    }
  }

  const pdfBytes = await newPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return { blob, ext: 'pdf' };
}

async function runCompression() {
  if (isCompressing) return;
  isCompressing = true;
  compressStatusIndicator.classList.add('processing');
  compressStatusText.textContent = 'Optimisation en cours...';
  compressDownloadBtn.disabled = true;

  try {
    let result = null;
    if (currentFileType === 'image') {
      result = await compressImageAsync();
      if (result && result.blob) {
        compressImgPreview.src = URL.createObjectURL(result.blob);
        compressImgPreview.hidden = false;
        compressCanvasPreview.hidden = true;
      }
    } else if (currentFileType === 'pdf') {
      result = await compressPdfAsync();
    }

    if (result && result.blob) {
      currentCompressedBlob = result.blob;
      currentCompressedSize = result.blob.size;

      compressResultSize.textContent = formatFileSize(currentCompressedSize);

      const savedBytes = currentOriginalSize - currentCompressedSize;
      const savingPercent = Math.round((savedBytes / currentOriginalSize) * 100);

      if (savingPercent > 0) {
        compressSavingBadge.textContent = `-${savingPercent}%`;
        compressSavingBadge.className = 'saving-badge';
        compressStatusText.textContent = `Prêt • Gain de ${savingPercent}% (${formatFileSize(savedBytes)} économisés)`;
      } else {
        compressSavingBadge.textContent = 'Déjà compact';
        compressSavingBadge.className = 'saving-badge neutral';
        compressStatusText.textContent = 'Fichier d\'origine déjà fortement optimisé';
      }

      compressDownloadBtn.disabled = false;
      compressDownloadBtnText.textContent = `Télécharger (${formatFileSize(currentCompressedSize)})`;
    }
  } catch (err) {
    console.error('Compression error:', err);
    compressStatusText.textContent = 'Erreur lors de la compression';
    showToast('Erreur : ' + err.message);
  } finally {
    isCompressing = false;
    compressStatusIndicator.classList.remove('processing');
  }
}

function resetCompressor() {
  currentCompressFile = null;
  loadedImage = null;
  loadedPdfDoc = null;
  pdfOriginalBuffer = null;
  currentCompressedBlob = null;
  compressFileInput.value = '';
  compressImgPreview.src = '';
  compressImgPreview.hidden = true;
  compressCanvasPreview.hidden = true;
  compressStep2.hidden = true;
  compressStep1.hidden = false;
}

/* ==========================================================================
   TOOL 4: PHOTO MERGER & ASSEMBLER (FUSION PHOTO)
   ========================================================================== */

const pmState = {
  photos: [], // Array of { id, file, name, img, width, height, aspect, url }
  maxPhotos: 100,
  layout: 'horizontal', // 'horizontal', 'grid', 'vertical'
  columns: 4,
  spacing: 10,
  padding: 15,
  radius: 6,
  fitMode: 'contain', // 'contain' or 'crop'
  bgColor: '#0b0f19',
  quality: 0.85,
  maxRes: 6144,
  format: 'image/jpeg',
  zoom: 1,
  renderedBlob: null
};

let pmDropzone, pmFileInput, pmBrowseTrigger, pmSampleBtn;
let pmCountNum, pmClearBtn, pmDownloadBtn;
let pmThumbnailList, pmEmptyNotice, pmSortNameBtn, pmReverseBtn;
let pmLayoutBtns, pmColumnsGroup, pmColsInput, pmColsRange, pmColsVal;
let pmSpacingRange, pmSpacingVal, pmPaddingRange, pmPaddingVal;
let pmRadiusRange, pmRadiusVal, pmFitMode;
let pmColorPresets, pmCustomColor;
let pmQualityRange, pmQualityVal, pmMaxRes, pmFormatSelect;
let pmOutputCanvas, pmPlaceholder, pmLoadingOverlay;
let pmMetrics, pmDimPill, pmSizePill;
let pmZoomOutBtn, pmZoomInBtn, pmResetZoomBtn, pmZoomLevel, pmCopyBtn;
let pmRenderDebounceTimer = null;

function initPhotoMerger() {
  pmDropzone = document.getElementById('pm-dropzone');
  if (!pmDropzone) return;

  pmFileInput = document.getElementById('pm-file-input');
  pmBrowseTrigger = document.getElementById('pm-browse-trigger');
  pmSampleBtn = document.getElementById('pm-sample-btn');
  pmCountNum = document.getElementById('pm-count-num');
  pmClearBtn = document.getElementById('pm-clear-btn');
  pmDownloadBtn = document.getElementById('pm-download-btn');
  pmThumbnailList = document.getElementById('pm-thumbnail-list');
  pmEmptyNotice = document.getElementById('pm-empty-notice');
  pmSortNameBtn = document.getElementById('pm-sort-name-btn');
  pmReverseBtn = document.getElementById('pm-reverse-btn');

  pmLayoutBtns = document.querySelectorAll('#pm-layout-control .segmented-btn');
  pmColumnsGroup = document.getElementById('pm-columns-group');
  pmColsInput = document.getElementById('pm-cols-input');
  pmColsRange = document.getElementById('pm-cols-range');
  pmColsVal = document.getElementById('pm-cols-val');

  pmSpacingRange = document.getElementById('pm-spacing-range');
  pmSpacingVal = document.getElementById('pm-spacing-val');
  pmPaddingRange = document.getElementById('pm-padding-range');
  pmPaddingVal = document.getElementById('pm-padding-val');
  pmRadiusRange = document.getElementById('pm-radius-range');
  pmRadiusVal = document.getElementById('pm-radius-val');
  pmFitMode = document.getElementById('pm-fit-mode');

  pmColorPresets = document.querySelectorAll('.pm-color-presets .color-preset');
  pmCustomColor = document.getElementById('pm-custom-color');

  pmQualityRange = document.getElementById('pm-quality-range');
  pmQualityVal = document.getElementById('pm-quality-val');
  pmMaxRes = document.getElementById('pm-max-res');
  pmFormatSelect = document.getElementById('pm-format-select');

  pmOutputCanvas = document.getElementById('pm-output-canvas');
  pmPlaceholder = document.getElementById('pm-placeholder');
  pmLoadingOverlay = document.getElementById('pm-loading-overlay');
  pmMetrics = document.getElementById('pm-metrics');
  pmDimPill = document.getElementById('pm-dim-pill');
  pmSizePill = document.getElementById('pm-size-pill');

  pmZoomOutBtn = document.getElementById('pm-zoom-out-btn');
  pmZoomInBtn = document.getElementById('pm-zoom-in-btn');
  pmResetZoomBtn = document.getElementById('pm-reset-zoom-btn');
  pmZoomLevel = document.getElementById('pm-zoom-level');
  pmCopyBtn = document.getElementById('pm-copy-btn');

  // Bind Events
  pmDropzone.addEventListener('click', () => pmFileInput.click());
  if (pmBrowseTrigger) {
    pmBrowseTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      pmFileInput.click();
    });
  }

  pmFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      pmHandleFiles(Array.from(e.target.files));
      pmFileInput.value = '';
    }
  });

  pmDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    pmDropzone.classList.add('dragover');
  });

  pmDropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    pmDropzone.classList.remove('dragover');
  });

  pmDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    pmDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      pmHandleFiles(Array.from(e.dataTransfer.files));
    }
  });

  if (pmSampleBtn) {
    pmSampleBtn.addEventListener('click', () => pmLoadSamplePhotos());
  }

  pmClearBtn.addEventListener('click', pmClearAllPhotos);
  pmDownloadBtn.addEventListener('click', pmDownloadCanvasImage);
  pmSortNameBtn.addEventListener('click', pmSortByName);
  pmReverseBtn.addEventListener('click', pmReversePhotos);
  pmCopyBtn.addEventListener('click', pmCopyImageToClipboard);

  pmLayoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pmLayoutBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pmState.layout = btn.dataset.layout;
      pmColumnsGroup.style.display = pmState.layout === 'grid' ? 'flex' : 'none';
      pmRenderCanvasAsync();
    });
  });

  const updateCols = (rawVal) => {
    const val = Math.max(1, Math.min(50, parseInt(rawVal) || 4));
    pmState.columns = val;
    if (pmColsInput) pmColsInput.value = val;
    if (pmColsRange) pmColsRange.value = val;
    if (pmColsVal) pmColsVal.textContent = val;
    pmRenderCanvasAsync();
  };

  if (pmColsInput) {
    pmColsInput.addEventListener('change', () => updateCols(pmColsInput.value));
    pmColsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') updateCols(pmColsInput.value);
    });
  }

  if (pmColsRange) {
    pmColsRange.addEventListener('input', (e) => {
      const val = e.target.value;
      if (pmColsVal) pmColsVal.textContent = val;
      if (pmColsInput) pmColsInput.value = val;
      pmDebouncedRender(250);
    });
    pmColsRange.addEventListener('change', (e) => updateCols(e.target.value));
  }

  pmSpacingRange.addEventListener('input', (e) => {
    pmState.spacing = parseInt(e.target.value);
    pmSpacingVal.textContent = `${pmState.spacing} px`;
    pmDebouncedRender();
  });

  pmPaddingRange.addEventListener('input', (e) => {
    pmState.padding = parseInt(e.target.value);
    pmPaddingVal.textContent = `${pmState.padding} px`;
    pmDebouncedRender();
  });

  pmRadiusRange.addEventListener('input', (e) => {
    pmState.radius = parseInt(e.target.value);
    pmRadiusVal.textContent = `${pmState.radius} px`;
    pmDebouncedRender();
  });

  pmFitMode.addEventListener('change', (e) => {
    pmState.fitMode = e.target.value;
    pmRenderCanvasAsync();
  });

  pmColorPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      pmColorPresets.forEach(p => p.classList.remove('active'));
      preset.classList.add('active');
      pmState.bgColor = preset.dataset.color;
      pmRenderCanvasAsync();
    });
  });

  if (pmCustomColor) {
    pmCustomColor.addEventListener('input', (e) => {
      pmColorPresets.forEach(p => p.classList.remove('active'));
      pmState.bgColor = e.target.value;
      pmDebouncedRender();
    });
  }

  pmQualityRange.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    pmState.quality = val / 100;
    pmQualityVal.textContent = `${val} %`;
    pmDebouncedRender();
  });

  pmMaxRes.addEventListener('change', (e) => {
    pmState.maxRes = parseInt(e.target.value);
    pmRenderCanvasAsync();
  });

  pmFormatSelect.addEventListener('change', (e) => {
    pmState.format = e.target.value;
    pmRenderCanvasAsync();
  });

  pmZoomInBtn.addEventListener('click', () => pmAdjustZoom(0.15));
  pmZoomOutBtn.addEventListener('click', () => pmAdjustZoom(-0.15));
  pmResetZoomBtn.addEventListener('click', () => {
    pmState.zoom = 1;
    pmApplyZoom();
  });

  pmUpdateUIState();
}

function pmAdjustZoom(delta) {
  pmState.zoom = Math.max(0.2, Math.min(3, pmState.zoom + delta));
  pmApplyZoom();
}

function pmApplyZoom() {
  pmOutputCanvas.style.transform = `scale(${pmState.zoom})`;
  pmZoomLevel.textContent = `${Math.round(pmState.zoom * 100)}%`;
}

async function pmHandleFiles(files) {
  const imageFiles = files.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f.name));
  if (imageFiles.length === 0) {
    showToast('Veuillez sélectionner des images (JPG, PNG, WebP...).');
    return;
  }

  const remaining = pmState.maxPhotos - pmState.photos.length;
  if (remaining <= 0) {
    showToast(`Limite atteinte ! Vous avez déjà ${pmState.maxPhotos} photos.`);
    return;
  }

  const toProcess = imageFiles.slice(0, remaining);
  if (imageFiles.length > remaining) {
    showToast(`Seules ${remaining} photos ont été ajoutées (limite de ${pmState.maxPhotos}).`);
  }

  showToast('Chargement des photos...');

  const loadPromises = toProcess.map(file => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          url,
          img,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          aspect: (img.naturalWidth || 800) / (img.naturalHeight || 600)
        });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  });

  const loaded = (await Promise.all(loadPromises)).filter(p => p !== null);
  pmState.photos.push(...loaded);

  pmUpdateUIState();
  pmRenderThumbnailList();
  pmRenderCanvasAsync();
  showToast(`${loaded.length} photo(s) ajoutée(s) !`);
}

function pmRenderThumbnailList() {
  pmThumbnailList.innerHTML = '';
  if (pmState.photos.length === 0) {
    pmEmptyNotice.style.display = 'flex';
    return;
  }
  pmEmptyNotice.style.display = 'none';

  pmState.photos.forEach((photo, index) => {
    const li = document.createElement('li');
    li.className = 'thumb-item';

    li.innerHTML = `
      <div class="thumb-info">
        <span class="thumb-idx">#${index + 1}</span>
        <img src="${photo.url}" alt="${photo.name}" class="thumb-img" />
        <span class="thumb-name" title="${photo.name}">${photo.name}</span>
      </div>
      <div class="thumb-actions">
        <button type="button" class="thumb-btn move-up" title="Monter" ${index === 0 ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <button type="button" class="thumb-btn move-down" title="Descendre" ${index === pmState.photos.length - 1 ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button type="button" class="thumb-btn delete-btn" title="Supprimer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;

    li.querySelector('.move-up').addEventListener('click', () => pmMovePhoto(index, -1));
    li.querySelector('.move-down').addEventListener('click', () => pmMovePhoto(index, 1));
    li.querySelector('.delete-btn').addEventListener('click', () => pmDeletePhoto(index));

    pmThumbnailList.appendChild(li);
  });
}

function pmMovePhoto(index, delta) {
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= pmState.photos.length) return;
  const temp = pmState.photos[index];
  pmState.photos[index] = pmState.photos[newIndex];
  pmState.photos[newIndex] = temp;
  pmRenderThumbnailList();
  pmRenderCanvasAsync();
}

function pmDeletePhoto(index) {
  URL.revokeObjectURL(pmState.photos[index].url);
  pmState.photos.splice(index, 1);
  pmUpdateUIState();
  pmRenderThumbnailList();
  pmRenderCanvasAsync();
}

function pmClearAllPhotos() {
  pmState.photos.forEach(p => URL.revokeObjectURL(p.url));
  pmState.photos = [];
  pmUpdateUIState();
  pmRenderThumbnailList();
  pmRenderCanvasAsync();
  showToast('Toutes les photos ont été effacées.');
}

function pmSortByName() {
  pmState.photos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  pmRenderThumbnailList();
  pmRenderCanvasAsync();
}

function pmReversePhotos() {
  pmState.photos.reverse();
  pmRenderThumbnailList();
  pmRenderCanvasAsync();
}

function pmUpdateUIState() {
  const count = pmState.photos.length;
  if (pmCountNum) pmCountNum.textContent = count;
  if (pmClearBtn) pmClearBtn.disabled = count === 0;
  if (pmDownloadBtn) pmDownloadBtn.disabled = count === 0;
  if (pmCopyBtn) pmCopyBtn.disabled = count === 0;

  if (count === 0) {
    if (pmPlaceholder) pmPlaceholder.style.display = 'flex';
    if (pmOutputCanvas) pmOutputCanvas.style.display = 'none';
    if (pmMetrics) pmMetrics.style.display = 'none';
  } else {
    if (pmPlaceholder) pmPlaceholder.style.display = 'none';
    if (pmOutputCanvas) pmOutputCanvas.style.display = 'block';
    if (pmMetrics) pmMetrics.style.display = 'flex';
  }
}

function pmDebouncedRender(delay = 180) {
  if (pmLoadingOverlay) pmLoadingOverlay.style.display = 'flex';
  clearTimeout(pmRenderDebounceTimer);
  pmRenderDebounceTimer = setTimeout(() => {
    pmRenderCanvasAsync();
  }, delay);
}

function pmRenderCanvasAsync() {
  if (pmState.photos.length === 0) {
    if (pmLoadingOverlay) pmLoadingOverlay.style.display = 'none';
    return;
  }
  if (pmLoadingOverlay) pmLoadingOverlay.style.display = 'flex';

  setTimeout(() => {
    try {
      pmRenderCanvas();
    } finally {
      if (pmLoadingOverlay) pmLoadingOverlay.style.display = 'none';
    }
  }, 25);
}

function pmRenderCanvas() {
  if (pmState.photos.length === 0) return;

  const canvas = pmOutputCanvas;
  const ctx = canvas.getContext('2d');
  const N = pmState.photos.length;
  const spacing = pmState.spacing;
  const padding = pmState.padding;

  let layoutGrid = [];
  let rawTotalWidth = 0;
  let rawTotalHeight = 0;

  if (pmState.layout === 'horizontal') {
    const targetH = 1000;
    let currentX = padding;
    pmState.photos.forEach(photo => {
      const cellW = targetH * photo.aspect;
      layoutGrid.push({
        img: photo.img,
        x: currentX,
        y: padding,
        width: cellW,
        height: targetH,
        aspect: photo.aspect
      });
      currentX += cellW + spacing;
    });
    rawTotalWidth = currentX - spacing + padding;
    rawTotalHeight = targetH + padding * 2;
  } else if (pmState.layout === 'vertical') {
    const targetW = 1200;
    let currentY = padding;
    pmState.photos.forEach(photo => {
      const cellH = targetW / photo.aspect;
      layoutGrid.push({
        img: photo.img,
        x: padding,
        y: currentY,
        width: targetW,
        height: cellH,
        aspect: photo.aspect
      });
      currentY += cellH + spacing;
    });
    rawTotalWidth = targetW + padding * 2;
    rawTotalHeight = currentY - spacing + padding;
  } else {
    // Grid Layout
    const cols = Math.min(pmState.columns, N);
    const rows = Math.ceil(N / cols);
    const cellW = 800;
    const cellH = 800;

    for (let i = 0; i < N; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cellW + spacing);
      const y = padding + row * (cellH + spacing);

      layoutGrid.push({
        img: pmState.photos[i].img,
        x,
        y,
        width: cellW,
        height: cellH,
        aspect: pmState.photos[i].aspect
      });
    }

    rawTotalWidth = padding * 2 + cols * cellW + (cols - 1) * spacing;
    rawTotalHeight = padding * 2 + rows * cellH + (rows - 1) * spacing;
  }

  // Downscale scale factor to respect maxRes
  const maxDim = Math.max(rawTotalWidth, rawTotalHeight);
  const scale = maxDim > pmState.maxRes ? pmState.maxRes / maxDim : 1;

  canvas.width = Math.round(rawTotalWidth * scale);
  canvas.height = Math.round(rawTotalHeight * scale);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill Background
  if (pmState.bgColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = pmState.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw Photos
  const radius = pmState.radius * scale;

  layoutGrid.forEach(cell => {
    const cx = cell.x * scale;
    const cy = cell.y * scale;
    const cw = cell.width * scale;
    const ch = cell.height * scale;

    ctx.save();

    if (radius > 0) {
      ctx.beginPath();
      ctx.moveTo(cx + radius, cy);
      ctx.arcTo(cx + cw, cy, cx + cw, cy + ch, radius);
      ctx.arcTo(cx + cw, cy + ch, cx, cy + ch, radius);
      ctx.arcTo(cx, cy + ch, cx, cy, radius);
      ctx.arcTo(cx, cy, cx + cw, cy, radius);
      ctx.closePath();
      ctx.clip();
    }

    if (pmState.fitMode === 'crop') {
      const cellAspect = cw / ch;
      let sx, sy, sw, sh;
      if (cell.aspect > cellAspect) {
        sh = cell.img.naturalHeight;
        sw = sh * cellAspect;
        sx = (cell.img.naturalWidth - sw) / 2;
        sy = 0;
      } else {
        sw = cell.img.naturalWidth;
        sh = sw / cellAspect;
        sx = 0;
        sy = (cell.img.naturalHeight - sh) / 2;
      }
      ctx.drawImage(cell.img, sx, sy, sw, sh, cx, cy, cw, ch);
    } else {
      const imgAspect = cell.aspect;
      const cellAspect = cw / ch;
      let drawW, drawH, drawX, drawY;

      if (imgAspect > cellAspect) {
        drawW = cw;
        drawH = cw / imgAspect;
        drawX = cx;
        drawY = cy + (ch - drawH) / 2;
      } else {
        drawH = ch;
        drawW = ch * imgAspect;
        drawX = cx + (cw - drawW) / 2;
        drawY = cy;
      }

      ctx.drawImage(cell.img, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  });

  if (pmDimPill) pmDimPill.textContent = `${canvas.width} × ${canvas.height} px`;

  canvas.toBlob((blob) => {
    pmState.renderedBlob = blob;
    if (blob && pmSizePill) {
      const mb = (blob.size / (1024 * 1024)).toFixed(2);
      pmSizePill.textContent = `~${mb} MB`;
    }
  }, pmState.format, pmState.quality);
}

function pmDownloadCanvasImage() {
  if (!pmState.renderedBlob) return;
  const ext = pmState.format === 'image/jpeg' ? 'jpg' : pmState.format === 'image/png' ? 'png' : 'webp';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  const filename = `photos_fusion_${timestamp}.${ext}`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(pmState.renderedBlob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  showToast(`Téléchargement de ${filename} réussi ! 🎉`);
}

async function pmCopyImageToClipboard() {
  if (pmState.photos.length === 0) return;
  const canvas = pmOutputCanvas;
  try {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Image copiée dans le presse-papier ! 📋');
      } catch (err) {
        showToast('Impossible de copier. Utilisez le bouton Télécharger.');
      }
    }, 'image/png');
  } catch (err) {
    showToast('Option non supportée par votre navigateur.');
  }
}

async function pmLoadSamplePhotos() {
  try {
    showToast('Chargement des photos d\'exemple...');
    const samples = [];

    // Sample 1: sample.jpg
    const res1 = await fetch('sample.jpg');
    const blob1 = await res1.blob();
    samples.push(new File([blob1], 'photo_chat_hd.jpg', { type: 'image/jpeg' }));

    // Generate 3 colorful artistic photo cards
    const createArtBlob = (title, gradientColors) => {
      return new Promise(resolve => {
        const c = document.createElement('canvas');
        c.width = 800;
        c.height = 800;
        const ctx = c.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 800, 800);
        grad.addColorStop(0, gradientColors[0]);
        grad.addColorStop(1, gradientColors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 800);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(400, 400, 260, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, 400, 420);

        c.toBlob(b => resolve(new File([b], `${title.toLowerCase().replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.9);
      });
    };

    const file2 = await createArtBlob('Coucher de Soleil', ['#f97316', '#ec4899']);
    const file3 = await createArtBlob('Aurore Boreale', ['#06b6d4', '#8b5cf6']);
    const file4 = await createArtBlob('Nature Emeraude', ['#10b981', '#3b82f6']);

    samples.push(file2, file3, file4);
    pmHandleFiles(samples);
  } catch (err) {
    showToast('Erreur chargement exemples : ' + err.message);
  }
}

/* ==========================================================================
   GLOBAL UTILITIES
   ========================================================================== */

// Prevent default drag events on window
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, (e) => e.preventDefault(), false);
});

// Toast notification helper
let toastTimeout;
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3400);
}

// Global Paste (Image or PDF)
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Image paste (for bg remover)
    if (currentActiveTool === 'bg-remover' && !step1.hidden && item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        showToast('Image collée depuis le presse-papier !');
        handleImageSelected(file, 'image-presse-papier');
        break;
      }
    }

    // PDF paste (for PDF organizer)
    if (currentActiveTool === 'pdf-organizer' && !pdfStep1.hidden && (item.type === 'application/pdf' || item.kind === 'file')) {
      const file = item.getAsFile();
      if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
        showToast('Fichier PDF collé depuis le presse-papier !');
        handlePdfFilesSelected([file]);
        break;
      }
    }

    // File compression paste (Image or PDF)
    if (currentActiveTool === 'compressor' && !compressStep1.hidden) {
      if (item.type.indexOf('image') !== -1 || item.type === 'application/pdf' || item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          showToast('Fichier collé depuis le presse-papier !');
          handleCompressFile(file);
          break;
        }
      }
    }

    // Photo merger paste (Images)
    if (currentActiveTool === 'photo-merger') {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          showToast('Photo collée depuis le presse-papier !');
          pmHandleFiles([file]);
          break;
        }
      }
    }
  }
});

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initToolSwitcher();
  initBgRemover();
  initPdfOrganizer();
  initCompressor();
  initPhotoMerger();
});
