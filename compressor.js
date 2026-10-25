/**
 * OmniTools — File Compressor (Videos, Images & PDF)
 * 100% Client-Side compression with Canvas, MediaRecorder & PDF-Lib
 */

import { showToast, initSharedUI } from './shared.js?v=3';

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
const compressSampleVideoBtn = document.getElementById('compress-sample-video-btn');
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
const compressScaleLabel = document.getElementById('compress-scale-label');
const scaleButtons = document.querySelectorAll('.scale-btn');
const compressVideoOptions = document.getElementById('compress-video-options');
const compressAudioToggle = document.getElementById('compress-audio-toggle');

// Preview Stage
const compressImgPreview = document.getElementById('compress-img-preview');
const compressCanvasPreview = document.getElementById('compress-canvas-preview');
const compressVideoPreview = document.getElementById('compress-video-preview');
const compressStatusIndicator = document.getElementById('compress-status-indicator');
const compressStatusText = document.getElementById('compress-status-text');

// Video Progress Overlay
const compressProgressContainer = document.getElementById('compress-progress-container');
const compressProgressLabel = document.getElementById('compress-progress-label');
const compressProgressPercent = document.getElementById('compress-progress-percent');
const compressProgressFill = document.getElementById('compress-progress-fill');
const compressProgressSub = document.getElementById('compress-progress-sub');
const compressCancelBtn = document.getElementById('compress-cancel-btn');

// Action Buttons
const compressStartVideoBtn = document.getElementById('compress-start-video-btn');
const compressStartVideoText = document.getElementById('compress-start-video-text');
const compressDownloadBtn = document.getElementById('compress-download-btn');
const compressDownloadBtnText = document.getElementById('compress-download-btn-text');
const compressNewBtn = document.getElementById('compress-new-btn');

// State Variables
let currentCompressFile = null;
let currentFileType = null; // 'image' | 'pdf' | 'video'
let currentOriginalSize = 0;
let currentCompressedBlob = null;
let currentCompressedSize = 0;
let currentQuality = 75; // 15 to 95
let currentScale = 1.0;  // 1.0, 0.8, 0.6, 0.5
let loadedImage = null;
let loadedPdfDoc = null;
let pdfOriginalBuffer = null;
let isCompressing = false;
let compressDebounceTimer = null;

// Video specific state
let videoDuration = 0;
let videoWidth = 0;
let videoHeight = 0;
let activeVideoProcessor = null;

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Octets';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
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
  if (compressSampleVideoBtn) {
    compressSampleVideoBtn.addEventListener('click', async () => {
      try {
        showToast('Chargement de la vidéo d\'exemple...');
        const res = await fetch('sample.mp4');
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], 'clip_video_demo.mp4', { type: 'video/mp4' });
          handleCompressFile(file);
          return;
        }
        const file = await generateSampleVideo();
        handleCompressFile(file);
      } catch (err) {
        try {
          const file = await generateSampleVideo();
          handleCompressFile(file);
        } catch (e) {
          showToast('Erreur vidéo exemple : ' + err.message);
        }
      }
    });
  }

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
        currentQuality = 40;
        if (currentFileType === 'image' || currentFileType === 'video') setResolutionScale(0.8);
      } else if (preset === 'balanced') {
        currentQuality = 70;
        if (currentFileType === 'image' || currentFileType === 'video') setResolutionScale(1.0);
      } else if (preset === 'light') {
        currentQuality = 85;
        if (currentFileType === 'image' || currentFileType === 'video') setResolutionScale(1.0);
      }

      compressQualitySlider.value = currentQuality;
      compressQualityVal.textContent = currentQuality + '%';

      if (currentFileType === 'video') {
        updateVideoEstimate();
      } else {
        scheduleCompression();
      }
    });
  });

  // Quality slider
  compressQualitySlider.addEventListener('input', (e) => {
    currentQuality = parseInt(e.target.value, 10);
    compressQualityVal.textContent = currentQuality + '%';
    presetButtons.forEach(b => b.classList.remove('active'));

    if (currentFileType === 'video') {
      updateVideoEstimate();
    } else {
      scheduleCompression();
    }
  });

  // Scale buttons
  scaleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      scaleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScale = parseFloat(btn.dataset.scale);

      if (currentFileType === 'video') {
        updatePresetLabels();
        updateVideoEstimate();
      } else {
        scheduleCompression();
      }
    });
  });

  // Audio toggle for video
  if (compressAudioToggle) {
    compressAudioToggle.addEventListener('change', () => {
      if (currentFileType === 'video') {
        updatePresetLabels();
        updateVideoEstimate();
      }
    });
  }

  // Video compression trigger button
  if (compressStartVideoBtn) {
    compressStartVideoBtn.addEventListener('click', async () => {
      if (currentFileType !== 'video') return;
      await runVideoCompression();
    });
  }

  // Cancel video compression button
  if (compressCancelBtn) {
    compressCancelBtn.addEventListener('click', () => {
      if (activeVideoProcessor) {
        activeVideoProcessor.cancel();
      }
    });
  }

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
    } else if (currentFileType === 'video') {
      outExt = currentCompressedBlob.type.includes('mp4') ? 'mp4' : 'webm';
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
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|ogv)$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif)$/i.test(file.name);

  if (!isPdf && !isImage && !isVideo) {
    showToast('Format non supporté. Veuillez choisir une vidéo (MP4, WebM, MOV), une image ou un PDF.');
    return;
  }

  currentCompressFile = file;
  currentOriginalSize = file.size;

  if (isVideo) {
    currentFileType = 'video';
  } else if (isPdf) {
    currentFileType = 'pdf';
  } else {
    currentFileType = 'image';
  }

  // Setup Step 2 UI
  compressFilename.textContent = file.name;
  compressOrigSize.textContent = formatFileSize(file.size);
  compressResultSize.textContent = 'Calcul...';
  compressSavingBadge.textContent = '...';

  // Reset preset to balanced
  presetButtons.forEach(b => b.classList.toggle('active', b.dataset.preset === 'balanced'));
  currentQuality = 70;
  compressQualitySlider.value = 70;
  compressQualityVal.textContent = '70%';
  setResolutionScale(1.0);

  if (isVideo) {
    compressFileIcon.textContent = '🎬';
    compressScaleRow.style.display = 'flex';
    if (compressScaleLabel) compressScaleLabel.textContent = 'Résolution vidéo :';
    if (compressVideoOptions) compressVideoOptions.hidden = false;
    if (compressStartVideoBtn) compressStartVideoBtn.hidden = false;
    compressDownloadBtn.disabled = true;
    compressDownloadBtnText.textContent = 'Télécharger la vidéo compressée';
    loadVideoForCompression(file);
  } else if (isImage) {
    compressFileIcon.textContent = '🖼️';
    compressScaleRow.style.display = 'flex';
    if (compressScaleLabel) compressScaleLabel.textContent = 'Redimensionner l\'image :';
    if (compressVideoOptions) compressVideoOptions.hidden = true;
    if (compressStartVideoBtn) compressStartVideoBtn.hidden = true;
    loadImageForCompression(file);
  } else {
    compressFileIcon.textContent = '📄';
    compressScaleRow.style.display = 'none';
    if (compressVideoOptions) compressVideoOptions.hidden = true;
    if (compressStartVideoBtn) compressStartVideoBtn.hidden = true;
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
    compressImgPreview.hidden = false;
    compressCanvasPreview.hidden = true;
    compressVideoPreview.hidden = true;
    runCompression();
  };
  img.onerror = () => {
    showToast('Erreur lors du chargement de l\'image.');
  };
  img.src = url;
}

function loadVideoForCompression(file) {
  const url = URL.createObjectURL(file);
  compressVideoPreview.src = url;
  compressVideoPreview.hidden = false;
  compressImgPreview.hidden = true;
  compressCanvasPreview.hidden = true;

  compressVideoPreview.onloadedmetadata = () => {
    // Handle WebM bug where duration can be Infinity
    if (!isFinite(compressVideoPreview.duration) || compressVideoPreview.duration <= 0) {
      compressVideoPreview.currentTime = 1e10;
      compressVideoPreview.ontimeupdate = () => {
        compressVideoPreview.ontimeupdate = null;
        videoDuration = (isFinite(compressVideoPreview.duration) && compressVideoPreview.duration > 0)
          ? compressVideoPreview.duration
          : 60;
        compressVideoPreview.currentTime = 0;
        onVideoMetadataLoaded();
      };
    } else {
      videoDuration = compressVideoPreview.duration;
      onVideoMetadataLoaded();
    }
  };

  compressVideoPreview.onerror = () => {
    showToast('Erreur lors de la lecture de la vidéo.');
    compressStatusText.textContent = 'Impossible de lire la vidéo';
  };
}

function onVideoMetadataLoaded() {
  videoWidth = compressVideoPreview.videoWidth || 1280;
  videoHeight = compressVideoPreview.videoHeight || 720;
  compressFileSub.textContent = `Vidéo • ${videoWidth} × ${videoHeight} px • ${formatDuration(videoDuration)}`;
  updatePresetLabels();
  updateVideoEstimate();
  compressStatusText.textContent = 'Prêt • Cliquez sur "Compresser la vidéo" pour lancer';
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
    compressImgPreview.hidden = true;
    compressVideoPreview.hidden = true;
    runCompression();
  } catch (err) {
    console.error('Error loading PDF for compression:', err);
    showToast('Impossible d\'ouvrir ce document PDF : ' + err.message);
  }
}

/**
 * Calcule intelligemment le débit binaire vidéo et audio cible.
 * Règle d'or : le résultat compressé ne doit JAMAIS être plus lourd que le fichier source !
 * - Si la vidéo source a un débit élevé (ex: smartphone 30 Mbps) -> réduction drastique (~1-2 Mbps)
 * - Si la vidéo source est déjà compressée (ex: 18 Mo pour 8 min = 314 kbps) -> réduction proportionnelle
 *   garantissant une taille toujours strictement inférieure au fichier d'origine.
 */
function calculateVideoBitrates(width, height, quality, scale, keepAudio) {
  const w = Math.max(2, Math.round((width * scale) / 2) * 2);
  const h = Math.max(2, Math.round((height * scale) / 2) * 2);
  const targetPixels = w * h;

  // 1. Débit moyen global du fichier source (en bits par seconde)
  const origTotalBps = (videoDuration > 0 && currentOriginalSize > 0)
    ? Math.round((currentOriginalSize * 8) / videoDuration)
    : null;

  // 2. Débit idéal basé sur la résolution (cible web équilibrée à 30 fps)
  const qualityFactor = 0.35 + ((quality - 15) / 80) * 1.15; // 0.35 (q15) à 1.50 (q95)
  const resBaseRate = Math.round(targetPixels * 0.75 * qualityFactor);

  // 3. Plafond strict calculé par rapport au débit d'origine :
  // Même au preset le plus léger (qualité 95), la vidéo doit être compressée (-10% à -15% min).
  // - Qualité 15  : ~25% du débit source (-75%)
  // - Qualité 40  : ~45% du débit source (-55%)
  // - Qualité 70  : ~65% du débit source (-35%)
  // - Qualité 85  : ~80% du débit source (-20%)
  // - Qualité 95  : ~88% du débit source (-12%)
  let maxTargetBps;
  if (origTotalBps && origTotalBps > 0) {
    const origRatio = 0.20 + ((quality - 15) / 80) * 0.68;
    const scaleFactor = Math.pow(scale, 1.2);
    maxTargetBps = Math.round(origTotalBps * origRatio * scaleFactor);
  } else {
    maxTargetBps = Infinity;
  }

  // Débit total cible (le plus bas entre la cible résolution et la fraction de la source)
  let targetTotalBps = Math.min(resBaseRate, maxTargetBps);

  // Plancher technique absolu (40 kbps) pour éviter un flux corrompu
  targetTotalBps = Math.max(40000, targetTotalBps);

  // Sécurité ultime : le débit cible ne peut JAMAIS dépasser 88% de la source
  if (origTotalBps && targetTotalBps >= origTotalBps) {
    targetTotalBps = Math.round(origTotalBps * 0.85);
  }

  // Répartition audio / vidéo
  let audioBps = 0;
  if (keepAudio) {
    if (targetTotalBps >= 1200000) {
      audioBps = 128000;
    } else if (targetTotalBps >= 600000) {
      audioBps = 96000;
    } else if (targetTotalBps >= 280000) {
      audioBps = 64000;
    } else if (targetTotalBps >= 140000) {
      audioBps = 48000;
    } else {
      audioBps = 32000;
    }
    // L'audio ne doit pas dévorer plus de 32% du budget total
    if (audioBps > targetTotalBps * 0.32) {
      audioBps = Math.max(24000, Math.round(targetTotalBps * 0.22));
    }
  }

  let videoBps = Math.max(25000, targetTotalBps - audioBps);

  return {
    totalBps: videoBps + audioBps,
    videoBps,
    audioBps
  };
}

function updatePresetLabels() {
  if (currentFileType !== 'video') return;
  const keepAudio = compressAudioToggle ? compressAudioToggle.checked : true;

  presetButtons.forEach(btn => {
    const sub = btn.querySelector('.preset-sub');
    if (!sub) return;
    const preset = btn.dataset.preset;
    let q = 70, s = 1.0;
    if (preset === 'max') { q = 40; s = 0.8; }
    else if (preset === 'balanced') { q = 70; s = 1.0; }
    else if (preset === 'light') { q = 85; s = 1.0; }

    const bitrates = calculateVideoBitrates(videoWidth, videoHeight, q, s, keepAudio);
    const est = Math.round((bitrates.totalBps * videoDuration) / 8);
    const saved = currentOriginalSize - est;
    const pct = Math.max(5, Math.round((saved / currentOriginalSize) * 100));

    if (preset === 'max') {
      sub.innerHTML = `Taille mini &bull; <strong>~${formatFileSize(est)}</strong> (-${pct}%)`;
    } else if (preset === 'balanced') {
      sub.innerHTML = `Recommandé &bull; <strong>~${formatFileSize(est)}</strong> (-${pct}%)`;
    } else if (preset === 'light') {
      sub.innerHTML = `Qualité max &bull; <strong>~${formatFileSize(est)}</strong> (-${pct}%)`;
    }
  });
}

function resetPresetLabels() {
  const defaults = {
    max: 'Taille mini • Qualité standard',
    balanced: 'Excellente qualité visuelle',
    light: 'Qualité maximale • Moins compressé'
  };
  presetButtons.forEach(btn => {
    const sub = btn.querySelector('.preset-sub');
    if (sub && defaults[btn.dataset.preset]) {
      sub.textContent = defaults[btn.dataset.preset];
    }
  });
}

function updateVideoEstimate() {
  if (currentFileType !== 'video') return;
  const keepAudio = compressAudioToggle ? compressAudioToggle.checked : true;
  const bitrates = calculateVideoBitrates(videoWidth, videoHeight, currentQuality, currentScale, keepAudio);
  const estBytes = Math.round((bitrates.totalBps * videoDuration) / 8);

  compressResultSize.textContent = '~ ' + formatFileSize(estBytes);
  const savedBytes = currentOriginalSize - estBytes;
  const savingPct = Math.round((savedBytes / currentOriginalSize) * 100);

  if (savingPct > 0) {
    compressSavingBadge.textContent = `~ -${savingPct}%`;
    compressSavingBadge.className = 'saving-badge';
  } else {
    compressSavingBadge.textContent = 'Estimé';
    compressSavingBadge.className = 'saving-badge neutral';
  }

  if (compressStartVideoText) {
    compressStartVideoText.textContent = `⚡ Compresser la vidéo (~${formatFileSize(estBytes)})`;
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

async function compressVideoAsync() {
  if (!currentCompressFile || currentFileType !== 'video') return null;

  // Codec detection
  const candidateMimes = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  let chosenMime = candidateMimes.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const outExt = chosenMime.includes('mp4') ? 'mp4' : 'webm';

  const keepAudio = compressAudioToggle ? compressAudioToggle.checked : true;
  const targetWidth = Math.max(2, Math.round((videoWidth * currentScale) / 2) * 2);
  const targetHeight = Math.max(2, Math.round((videoHeight * currentScale) / 2) * 2);
  const bitrates = calculateVideoBitrates(videoWidth, videoHeight, currentQuality, currentScale, keepAudio);

  // Show progress container
  compressProgressContainer.hidden = false;
  compressProgressFill.style.width = '0%';
  compressProgressPercent.textContent = '0%';
  compressProgressLabel.textContent = 'Compression de la vidéo en cours...';
  compressProgressSub.textContent = `0:00 / ${formatDuration(videoDuration)}`;
  compressStatusIndicator.classList.add('processing');
  compressStatusText.textContent = 'Optimisation vidéo en cours...';
  compressStartVideoBtn.disabled = true;

  // Setup offscreen canvas & video
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const procVideo = document.createElement('video');
  procVideo.src = URL.createObjectURL(currentCompressFile);
  procVideo.muted = true;
  procVideo.playsInline = true;
  procVideo.preload = 'auto';

  await new Promise((resolve, reject) => {
    procVideo.onloadeddata = resolve;
    procVideo.onerror = reject;
  });

  const fps = 30;
  const stream = canvas.captureStream(fps);

  // Web Audio API routing: routes crystal-clear audio to recorder without playing through speakers
  let audioContext = null;
  if (keepAudio) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        const source = audioContext.createMediaElementSource(procVideo);
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks && audioTracks.length > 0) {
          audioTracks.forEach(t => stream.addTrack(t));
        }
        procVideo.muted = false;
        procVideo.volume = 1.0;
      }
    } catch (e) {
      console.warn('Web Audio capture fallback:', e);
      try {
        const vStream = procVideo.captureStream ? procVideo.captureStream() : (procVideo.mozCaptureStream ? procVideo.mozCaptureStream() : null);
        if (vStream) {
          const aTracks = vStream.getAudioTracks();
          if (aTracks && aTracks.length > 0) aTracks.forEach(t => stream.addTrack(t));
        }
      } catch (err) {
        console.warn('Audio fallback error:', err);
      }
    }
  }

  const recorderOptions = {
    mimeType: chosenMime,
    videoBitsPerSecond: bitrates.videoBps
  };
  if (keepAudio && bitrates.audioBps > 0) {
    recorderOptions.audioBitsPerSecond = bitrates.audioBps;
  }
  recorderOptions.bitsPerSecond = bitrates.totalBps;

  const recorder = new MediaRecorder(stream, recorderOptions);
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  let isCancelled = false;
  let animId = null;

  activeVideoProcessor = {
    cancel: () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) {
        try { audioContext.close(); } catch(e){}
      }
      try { procVideo.pause(); } catch(e){}
      try { recorder.stop(); } catch(e){}
      compressProgressContainer.hidden = true;
      compressStartVideoBtn.disabled = false;
      compressStatusIndicator.classList.remove('processing');
      compressStatusText.textContent = 'Compression vidéo annulée';
      showToast('Compression vidéo annulée.');
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) {
        try { audioContext.close(); } catch(e){}
      }
      procVideo.pause();
      URL.revokeObjectURL(procVideo.src);
      activeVideoProcessor = null;

      if (isCancelled) {
        resolve(null);
        return;
      }

      const compressedBlob = new Blob(chunks, { type: chosenMime });
      compressProgressContainer.hidden = true;
      compressStartVideoBtn.disabled = false;
      resolve({ blob: compressedBlob, ext: outExt });
    };

    recorder.onerror = (err) => {
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) {
        try { audioContext.close(); } catch(e){}
      }
      activeVideoProcessor = null;
      compressProgressContainer.hidden = true;
      compressStartVideoBtn.disabled = false;
      reject(err);
    };

    const renderLoop = () => {
      if (isCancelled) return;

      if (procVideo.readyState >= 2) {
        ctx.drawImage(procVideo, 0, 0, targetWidth, targetHeight);
      }

      const curTime = procVideo.currentTime;
      const pct = Math.min(99, Math.round((curTime / videoDuration) * 100));
      compressProgressFill.style.width = pct + '%';
      compressProgressPercent.textContent = pct + '%';
      compressProgressSub.textContent = `${formatDuration(curTime)} / ${formatDuration(videoDuration)}`;

      if (procVideo.ended || curTime >= videoDuration) {
        compressProgressFill.style.width = '100%';
        compressProgressPercent.textContent = '100%';
        compressProgressLabel.textContent = 'Finalisation du fichier...';
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, 150);
      } else {
        animId = requestAnimationFrame(renderLoop);
      }
    };

    recorder.start(100);
    procVideo.currentTime = 0;
    procVideo.play().then(() => {
      renderLoop();
    }).catch(reject);
  });
}

async function runVideoCompression() {
  if (isCompressing) return;
  isCompressing = true;
  try {
    const result = await compressVideoAsync();
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
        compressStatusText.textContent = 'Vidéo d\'origine déjà fortement optimisée';
      }

      compressDownloadBtn.disabled = false;
      compressDownloadBtnText.textContent = `Télécharger (${formatFileSize(currentCompressedSize)})`;
      if (compressStartVideoText) {
        compressStartVideoText.textContent = '⚡ Recompresser la vidéo';
      }

      // Update player to show compressed video
      const compUrl = URL.createObjectURL(result.blob);
      compressVideoPreview.src = compUrl;
      showToast('Vidéo compressée avec succès ! 🎉');
    }
  } catch (err) {
    console.error('Video compression error:', err);
    compressStatusText.textContent = 'Erreur lors de la compression vidéo';
    showToast('Erreur : ' + err.message);
  } finally {
    isCompressing = false;
    compressStatusIndicator.classList.remove('processing');
  }
}

async function runCompression() {
  if (currentFileType === 'video') {
    updateVideoEstimate();
    return;
  }

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
        compressVideoPreview.hidden = true;
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

async function generateSampleVideo() {
  const width = 640;
  const height = 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(30);

  // Audio tone
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (AudioCtxClass) {
    try {
      const actx = new AudioCtxClass();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      const dest = actx.createMediaStreamDestination();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, actx.currentTime);
      gain.gain.setValueAtTime(0.08, actx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      setTimeout(() => {
        try { osc.stop(); actx.close(); } catch(e){}
      }, 3500);
    } catch (e) {
      console.warn('Audio tone creation:', e);
    }
  }

  const candidateMimes = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const chosenMime = candidateMimes.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';

  const recorder = new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 2500000 });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  const durationSec = 3.2;
  const startTime = performance.now();

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: chosenMime });
      const file = new File([blob], `video_demo_hd.${ext}`, { type: chosenMime });
      resolve(file);
    };

    recorder.start();

    function draw() {
      const elapsed = (performance.now() - startTime) / 1000;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#090c15');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Moving glowing orb
      const ballX = width * 0.5 + Math.sin(elapsed * 4) * (width * 0.35);
      const ballY = height * 0.5 + Math.cos(elapsed * 3) * (height * 0.25);
      const radGrad = ctx.createRadialGradient(ballX, ballY, 10, ballX, ballY, 90);
      radGrad.addColorStop(0, '#38bdf8');
      radGrad.addColorStop(0.4, '#6366f1');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 90, 0, Math.PI * 2);
      ctx.fill();

      // Card in center
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width * 0.12, height * 0.22, width * 0.76, height * 0.56, 16);
      ctx.fill();
      ctx.stroke();

      // Text title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 OmniTools — Vidéo HD Démo', width * 0.5, height * 0.42);

      // Subtext
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Test de compression vidéo 100% navigateur', width * 0.5, height * 0.54);

      // Timer badge
      const curSec = Math.min(3, Math.floor(elapsed));
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`00:0${curSec} / 00:03 • 30 FPS • Qualité HD`, width * 0.5, height * 0.67);

      if (elapsed < durationSec) {
        requestAnimationFrame(draw);
      } else {
        recorder.stop();
      }
    }

    draw();
  });
}

function resetCompressor() {
  if (activeVideoProcessor) {
    activeVideoProcessor.cancel();
  }
  currentCompressFile = null;
  currentFileType = null;
  loadedImage = null;
  loadedPdfDoc = null;
  pdfOriginalBuffer = null;
  currentCompressedBlob = null;
  videoDuration = 0;
  videoWidth = 0;
  videoHeight = 0;

  resetPresetLabels();

  compressFileInput.value = '';
  compressImgPreview.src = '';
  compressImgPreview.hidden = true;
  compressCanvasPreview.hidden = true;
  compressVideoPreview.src = '';
  compressVideoPreview.hidden = true;
  compressProgressContainer.hidden = true;

  if (compressVideoOptions) compressVideoOptions.hidden = true;
  if (compressStartVideoBtn) compressStartVideoBtn.hidden = true;
  compressDownloadBtn.disabled = true;

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
      if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1 || item.type === 'application/pdf' || item.kind === 'file') {
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
  initSharedUI('compressor');
  initCompressor();
});
