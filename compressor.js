/**
 * OmniTools — File Compressor (Images & PDF)
 * 100% Client-Side compression with Canvas & PDF-Lib
 */

import { showToast, initHeaderDropdown } from './shared.js';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

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

export function initCompressor() {
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

// Paste Event for Compressor
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!compressStep1.hidden) {
      if (item.type.indexOf('image') !== -1 || item.type === 'application/pdf' || item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          showToast('Fichier collé depuis le presse-papier !');
          handleCompressFile(file);
          break;
        }
      }
    }
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdown();
  initCompressor();
});
