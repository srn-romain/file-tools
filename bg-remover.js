/**
 * OmniTools — ClearCut AI (Détourage d'image & Retouche)
 * 100% Client-Side with @imgly/background-removal & In-Browser Retouch Engine
 */

import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm';
import { showToast, initHeaderDropdown } from './shared.js';

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

export function initBgRemover() {
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
    if (step2.hidden || !isRetouchMode) return;
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

// Global Paste for Image
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!step1.hidden && item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        showToast('Image collée depuis le presse-papier !');
        handleImageSelected(file, 'image-presse-papier');
        break;
      }
    }
  }
});

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdown();
  initBgRemover();
});
