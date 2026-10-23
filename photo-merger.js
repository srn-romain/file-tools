/**
 * OmniTools — Photo Merger & Assembler (Studio Fusion Photo)
 * 100% Client-Side multi-photo arrangement & canvas rendering
 */

import { showToast, initSharedUI } from './shared.js?v=2';

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

export function initPhotoMerger() {
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

// Paste Event for Photo Merger
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        showToast('Photo collée depuis le presse-papier !');
        pmHandleFiles([file]);
        break;
      }
    }
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initSharedUI('photo-merger');
  initPhotoMerger();
});
