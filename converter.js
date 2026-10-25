/**
 * OmniTools — Transform & Convertisseur Universel de Fichiers
 * Conversion dynamique n'importe quelle extension vers n'importe quelle autre :
 * PDF ⇄ Word (.docx) ⇄ PNG ⇄ JPG ⇄ WebP
 * 100% Client-Side with PDF.js, PDF-Lib, Mammoth.js & Docx
 */

import { showToast, initSharedUI } from './shared.js?v=4';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Supported Formats Definition
const FORMATS = [
  {
    id: 'pdf',
    label: 'PDF (.pdf)',
    short: 'PDF',
    ext: '.pdf',
    icon: '📄',
    mime: 'application/pdf',
    accept: '.pdf,application/pdf',
    description: 'Documents PDF'
  },
  {
    id: 'docx',
    label: 'Word (.docx)',
    short: 'Word',
    ext: '.docx',
    icon: '📝',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Documents Microsoft Word (.docx)'
  },
  {
    id: 'png',
    label: 'Image PNG (.png)',
    short: 'PNG',
    ext: '.png',
    icon: '🎨',
    mime: 'image/png',
    accept: '.png,image/png',
    description: 'Images PNG avec transparence'
  },
  {
    id: 'jpg',
    label: 'Image JPG (.jpg)',
    short: 'JPG',
    ext: '.jpg',
    icon: '🌄',
    mime: 'image/jpeg',
    accept: '.jpg,.jpeg,image/jpeg',
    description: 'Photos et images JPG / JPEG'
  },
  {
    id: 'webp',
    label: 'Image WebP (.webp)',
    short: 'WebP',
    ext: '.webp',
    icon: '⚡',
    mime: 'image/webp',
    accept: '.webp,image/webp',
    description: 'Images WebP haute performance'
  }
];

function getFormat(id) {
  return FORMATS.find(f => f.id === id) || FORMATS[0];
}

// State
let sourceFormat = 'pdf';
let targetFormat = 'docx';
let convertedBlob = null;
let convertedFileName = '';

// DOM Elements: Formats & Flow Card
const sourceSelect = document.getElementById('source-format-select');
const targetSelect = document.getElementById('target-format-select');
const sourceFormatIcon = document.getElementById('source-format-icon');
const targetFormatIcon = document.getElementById('target-format-icon');
const btnSwap = document.getElementById('btn-swap-formats');

// DOM Elements: Steps & Dropzone
const step1 = document.getElementById('converter-step-1');
const step2 = document.getElementById('converter-step-2');
const dropzone = document.getElementById('converter-dropzone');
const fileInput = document.getElementById('converter-file-input');
const browseBtn = document.getElementById('converter-browse-btn');
const sampleBtn = document.getElementById('converter-sample-btn');
const sampleText = document.getElementById('converter-sample-text');

// DOM Elements: Header & Instructions
const heroSubtitle = document.getElementById('converter-hero-subtitle');
const dropzoneInstruction = document.getElementById('converter-dropzone-instruction');
const dropzoneTitle = document.getElementById('converter-dropzone-title');
const dropzoneSub = document.getElementById('converter-dropzone-sub');
const dropIcon = document.getElementById('converter-drop-icon');

// DOM Elements: Processing & Results
const processingBox = document.getElementById('converter-processing-box');
const processTitle = document.getElementById('converter-processing-title');
const processDetail = document.getElementById('converter-processing-detail');
const resultBox = document.getElementById('converter-result-box');

const resFromIcon = document.getElementById('res-from-icon');
const resFromName = document.getElementById('res-from-name');
const resToIcon = document.getElementById('res-to-icon');
const resToName = document.getElementById('res-to-name');
const statValElements = document.getElementById('stat-val-elements');
const statValSize = document.getElementById('stat-val-size');
const previewViewport = document.getElementById('converter-preview-viewport');
const downloadBtn = document.getElementById('converter-download-btn');
const downloadText = document.getElementById('converter-download-text');
const newBtn = document.getElementById('converter-new-btn');

/**
 * Initialize Converter
 */
export function initConverter() {
  detectInitialFormats();
  setupFormatDropdowns();
  setupInputs();
  setupActions();
}

/**
 * Detect initial formats from URL params (e.g. ?source=pdf&target=docx or legacy ?mode=...)
 */
function detectInitialFormats() {
  const params = new URLSearchParams(window.location.search);
  const srcParam = params.get('source');
  const tgtParam = params.get('target');
  const modeParam = params.get('mode');

  if (srcParam && tgtParam && srcParam !== tgtParam && getFormat(srcParam) && getFormat(tgtParam)) {
    sourceFormat = srcParam;
    targetFormat = tgtParam;
  } else if (modeParam) {
    // Backward compatibility with legacy ?mode= query params
    switch (modeParam) {
      case 'pdf-to-word':
        sourceFormat = 'pdf'; targetFormat = 'docx'; break;
      case 'word-to-pdf':
        sourceFormat = 'docx'; targetFormat = 'pdf'; break;
      case 'img-to-pdf':
        sourceFormat = 'png'; targetFormat = 'pdf'; break;
      case 'pdf-to-img':
        sourceFormat = 'pdf'; targetFormat = 'png'; break;
      case 'img-to-jpg':
        sourceFormat = 'png'; targetFormat = 'jpg'; break;
      case 'img-to-png':
        sourceFormat = 'jpg'; targetFormat = 'png'; break;
      case 'img-to-webp':
        sourceFormat = 'jpg'; targetFormat = 'webp'; break;
      default:
        sourceFormat = 'pdf'; targetFormat = 'docx';
    }
  } else {
    sourceFormat = 'pdf';
    targetFormat = 'docx';
  }
}

/**
 * Setup synchronized dropdowns with dynamic exclusion
 */
function setupFormatDropdowns() {
  updateDropdownOptions();

  // Handle Source Selection Change
  sourceSelect.addEventListener('change', (e) => {
    sourceFormat = e.target.value;
    // Re-populate Target options excluding current sourceFormat
    const validTargets = FORMATS.filter(f => f.id !== sourceFormat);
    targetSelect.innerHTML = validTargets
      .map(f => `<option value="${f.id}">${f.label}</option>`)
      .join('');
    
    // If previous target is no longer available, shift to first valid target
    if (!validTargets.some(f => f.id === targetFormat)) {
      targetFormat = validTargets[0].id;
    }
    targetSelect.value = targetFormat;

    updateUIForFormats();
    if (!step2.hidden) resetConverter();
  });

  // Handle Target Selection Change
  targetSelect.addEventListener('change', (e) => {
    targetFormat = e.target.value;
    // Re-populate Source options excluding current targetFormat
    const validSources = FORMATS.filter(f => f.id !== targetFormat);
    sourceSelect.innerHTML = validSources
      .map(f => `<option value="${f.id}">${f.label}</option>`)
      .join('');
    
    // If previous source is no longer available, shift to first valid source
    if (!validSources.some(f => f.id === sourceFormat)) {
      sourceFormat = validSources[0].id;
    }
    sourceSelect.value = sourceFormat;

    updateUIForFormats();
    if (!step2.hidden) resetConverter();
  });

  // Handle Swap Button Click
  btnSwap.addEventListener('click', () => {
    const temp = sourceFormat;
    sourceFormat = targetFormat;
    targetFormat = temp;

    updateDropdownOptions();
    updateUIForFormats();
    if (!step2.hidden) resetConverter();

    showToast(`Conversion inversée : ${getFormat(sourceFormat).short} ➔ ${getFormat(targetFormat).short} ⇄`);
  });

  updateUIForFormats();
}

/**
 * Re-render options in both dropdowns ensuring neither can select the same format
 */
function updateDropdownOptions() {
  // Source options exclude targetFormat
  const validSources = FORMATS.filter(f => f.id !== targetFormat);
  sourceSelect.innerHTML = validSources
    .map(f => `<option value="${f.id}">${f.label}</option>`)
    .join('');
  if (!validSources.some(f => f.id === sourceFormat)) {
    sourceFormat = validSources[0].id;
  }
  sourceSelect.value = sourceFormat;

  // Target options exclude sourceFormat
  const validTargets = FORMATS.filter(f => f.id !== sourceFormat);
  targetSelect.innerHTML = validTargets
    .map(f => `<option value="${f.id}">${f.label}</option>`)
    .join('');
  if (!validTargets.some(f => f.id === targetFormat)) {
    targetFormat = validTargets[0].id;
  }
  targetSelect.value = targetFormat;
}

/**
 * Update dropzone, icons, and hero subtitles based on active source and target formats
 */
function updateUIForFormats() {
  const src = getFormat(sourceFormat);
  const tgt = getFormat(targetFormat);

  // Update icons in dropdown card
  sourceFormatIcon.textContent = src.icon;
  targetFormatIcon.textContent = tgt.icon;

  // Update Hero Subtitle
  heroSubtitle.textContent = `Passez directement de ${src.label} à ${tgt.label} en toute confidentialité dans votre navigateur. 100% privé, sans serveur.`;

  // Update Dropzone texts and accept types
  dropzoneTitle.textContent = `Glissez-déposez votre fichier ${src.short} ici`;
  dropzoneSub.textContent = `${src.description} à convertir en format ${tgt.short} (${tgt.ext})`;
  dropzoneInstruction.textContent = `Glissez ou sélectionnez votre ${src.label} à convertir en ${tgt.label}`;
  dropIcon.textContent = src.icon;
  fileInput.accept = src.accept;

  // Update Sample Button label
  sampleText.textContent = `Tester avec un fichier ${src.short} d'exemple`;

  // Update URL parameters without reloading
  const url = new URL(window.location);
  url.searchParams.set('source', sourceFormat);
  url.searchParams.set('target', targetFormat);
  url.searchParams.delete('mode');
  window.history.replaceState({}, '', url);
}

/**
 * Setup user input handlers (Browse, Drag & drop, Sample)
 */
function setupInputs() {
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  });

  // Drag & drop events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-active');
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-active');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-active');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  // Sample File Action
  sampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    handleSampleFile();
  });
}

function setupActions() {
  newBtn.addEventListener('click', () => {
    resetConverter();
  });

  downloadBtn.addEventListener('click', () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`Téléchargement de ${convertedFileName} lancé ! 🎉`);
  });
}

function resetConverter() {
  convertedBlob = null;
  convertedFileName = '';
  fileInput.value = '';
  step2.hidden = true;
  step1.hidden = false;
  processingBox.hidden = false;
  resultBox.hidden = true;
}

/**
 * Handle Sample File testing based on current source format
 */
async function handleSampleFile() {
  try {
    if (sourceFormat === 'pdf') {
      showToast('Chargement du document PDF d\'exemple...');
      const res = await fetch('sample.pdf');
      if (!res.ok) throw new Error('sample.pdf non trouvé');
      const blob = await res.blob();
      const file = new File([blob], 'rapport-exemple.pdf', { type: 'application/pdf' });
      processFile(file);
    } else if (sourceFormat === 'docx') {
      showToast('Génération d\'un document Word d\'exemple...');
      const sampleDocxBlob = await generateSampleDocx();
      const file = new File([sampleDocxBlob], 'contrat-exemple.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      processFile(file);
    } else if (sourceFormat === 'jpg') {
      showToast('Chargement de la photo JPG d\'exemple...');
      const res = await fetch('sample.jpg');
      if (!res.ok) throw new Error('sample.jpg non trouvé');
      const blob = await res.blob();
      const file = new File([blob], 'photo-exemple.jpg', { type: 'image/jpeg' });
      processFile(file);
    } else if (sourceFormat === 'png') {
      showToast('Génération d\'une image PNG d\'exemple...');
      const file = await generateSampleImage('image/png', 'graphique-exemple.png');
      processFile(file);
    } else if (sourceFormat === 'webp') {
      showToast('Génération d\'une image WebP d\'exemple...');
      const file = await generateSampleImage('image/webp', 'photo-exemple.webp');
      processFile(file);
    }
  } catch (err) {
    console.warn('Sample file error:', err);
    showToast('Erreur lors du chargement de l\'exemple : ' + err.message);
  }
}

/**
 * Generate sample image in memory via Canvas
 */
async function generateSampleImage(mime, filename) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#10b981');
  grad.addColorStop(0.5, '#3b82f6');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(540, 320, 120, 0, Math.PI * 2);
  ctx.fill();

  // Text title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OmniTools — Image de test', canvas.width / 2, 190);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`Format natif : ${mime.split('/')[1].toUpperCase()} • 100% Client-Side`, canvas.width / 2, 230);

  const blob = await new Promise(res => canvas.toBlob(res, mime, 0.92));
  return new File([blob], filename, { type: mime });
}

/**
 * Generate an on-the-fly Word (.docx) document using docx library for instant testing
 */
async function generateSampleDocx() {
  const docx = window.docx;
  if (!docx) throw new Error('Bibliothèque docx non disponible');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "CONTRAT DE PRESTATION DE SERVICES",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Ce document Word a été généré localement pour tester la conversion universelle.", bold: true }),
            new TextRun(" Il démontre l'extraction de paragraphes, de styles de titre et de structure sans passer par un serveur."),
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          text: "Article 1 : Objet du contrat",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Le présent contrat a pour objet d'assurer la transformation numérique 100% Client-Side de tous types de documents au format PDF, Word et Images en toute confidentialité.",
          spacing: { after: 150 }
        }),
        new Paragraph({
          text: "Article 2 : Confidentialité et Sécurité",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Toutes les opérations de conversion sont exécutées exclusivement dans le navigateur web de l'utilisateur. Aucune donnée n'est transmise sur internet.",
          spacing: { after: 150 }
        })
      ]
    }]
  });

  return await Packer.toBlob(doc);
}

/**
 * ============================================================================
 * MASTER FILE PROCESSOR: ROUTING ACROSS ALL 20 FORMAT PAIRS
 * ============================================================================
 */
async function processFile(file) {
  if (!file) return;

  step1.hidden = true;
  step2.hidden = false;
  processingBox.hidden = false;
  resultBox.hidden = true;

  const src = getFormat(sourceFormat);
  const tgt = getFormat(targetFormat);

  try {
    if (sourceFormat === 'pdf') {
      if (targetFormat === 'docx') {
        await convertPdfToWord(file);
      } else {
        // Target is an image format (png, jpg, webp)
        await convertPdfToImage(file, tgt.mime, tgt.ext);
      }
    } else if (sourceFormat === 'docx') {
      if (targetFormat === 'pdf') {
        await convertWordToPdf(file);
      } else {
        // Target is an image format (png, jpg, webp)
        await convertWordToImage(file, tgt.mime, tgt.ext);
      }
    } else {
      // Source format is an image (png, jpg, webp)
      if (targetFormat === 'pdf') {
        await convertImageToPdf(file);
      } else if (targetFormat === 'docx') {
        await convertImageToDocx(file);
      } else {
        // Target is another image format (png, jpg, webp)
        await convertImageFormat(file, tgt.mime, tgt.ext);
      }
    }
  } catch (err) {
    console.error('Conversion failed:', err);
    showToast('Erreur lors de la transformation : ' + err.message);
    resetConverter();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 1. PDF ➔ Word (.docx)
 * ----------------------------------------------------------------------------
 */
async function convertPdfToWord(file) {
  processTitle.textContent = 'Conversion PDF vers Word (.docx)...';
  processDetail.textContent = 'Extraction du texte et structuration des paragraphes...';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const docx = window.docx;
  if (!docx) throw new Error('Bibliothèque Word docx non disponible');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const docChildren = [];
  const previewHtmlParts = [];
  let totalParagraphs = 0;

  for (let pNum = 1; pNum <= numPages; pNum++) {
    const page = await pdf.getPage(pNum);
    const textContent = await page.getTextContent();

    // Group text items by vertical line (Y position)
    const linesMap = new Map();
    textContent.items.forEach(item => {
      const y = Math.round(item.transform[5] / 4) * 4;
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y).push(item);
    });

    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

    if (pNum > 1) {
      docChildren.push(new Paragraph({ text: `--- Page ${pNum} ---`, spacing: { before: 200, after: 150 } }));
      previewHtmlParts.push(`<hr class="preview-page-break"><div class="preview-page-badge">Page ${pNum}</div>`);
    }

    sortedY.forEach(y => {
      const items = linesMap.get(y);
      items.sort((a, b) => a.transform[4] - b.transform[4]);

      const lineText = items.map(it => it.str).join(' ').trim();
      if (!lineText) return;

      const avgHeight = items[0].height || 12;
      const isHeading = avgHeight > 16 || (lineText.length < 60 && avgHeight > 14);

      if (isHeading) {
        docChildren.push(new Paragraph({
          text: lineText,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 80 }
        }));
        previewHtmlParts.push(`<h3>${escapeHtml(lineText)}</h3>`);
      } else {
        docChildren.push(new Paragraph({
          children: [new TextRun(lineText)],
          spacing: { after: 100 }
        }));
        previewHtmlParts.push(`<p>${escapeHtml(lineText)}</p>`);
      }
      totalParagraphs++;
    });
  }

  if (docChildren.length === 0) {
    docChildren.push(new Paragraph({ text: "Document PDF sans couche texte détectée." }));
    previewHtmlParts.push("<p>Aucun texte extractible trouvé dans ce PDF.</p>");
  }

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }]
  });

  convertedBlob = await Packer.toBlob(doc);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}.docx`;

  displayConversionResults({
    fromIcon: '📄',
    fromName: file.name,
    toIcon: '📝',
    toName: convertedFileName,
    elements: `${numPages} page(s), ${totalParagraphs} paragraphe(s)`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: previewHtmlParts.join(''),
    downloadLabel: 'Télécharger le document Word (.docx)'
  });
}

/**
 * ----------------------------------------------------------------------------
 * 2. Helper: Word (.docx) ➔ Structure & Vector PDF Document
 * ----------------------------------------------------------------------------
 */
async function generatePdfDocFromWord(file) {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = window.mammoth;
  if (!mammoth) throw new Error('Bibliothèque mammoth.js non disponible');

  const result = await mammoth.convertToHtml({ arrayBuffer });
  const rawHtml = result.value || '<p>Document Word vide.</p>';

  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const lines = textResult.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const PDFLib = window.PDFLib;
  if (!PDFLib) throw new Error('PDF-Lib non chargé');
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;
  let pageCount = 1;

  // Title header in PDF
  currentPage.drawText(file.name.replace(/\.docx$/i, ''), {
    x: margin,
    y: currentY,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });
  currentY -= 30;

  // Render lines with word wrap & pagination
  lines.forEach((line) => {
    const isHeading = line.length < 70 && (line.startsWith('Article') || line.startsWith('Chapitre') || line === line.toUpperCase());
    const fontSize = isHeading ? 13 : 10.5;
    const font = isHeading ? fontBold : fontRegular;
    const lineHeight = fontSize * 1.35;

    const words = line.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > contentWidth) {
        if (currentY < margin + 30) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
          pageCount++;
        }
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: font,
          color: isHeading ? rgb(0.12, 0.2, 0.35) : rgb(0.15, 0.15, 0.15)
        });
        currentY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      if (currentY < margin + 30) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
        pageCount++;
      }
      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: font,
        color: isHeading ? rgb(0.12, 0.2, 0.35) : rgb(0.15, 0.15, 0.15)
      });
      currentY -= (lineHeight + (isHeading ? 6 : 4));
    }
  });

  return { pdfDoc, lines, rawHtml, pageCount };
}

/**
 * ----------------------------------------------------------------------------
 * 3. Word (.docx) ➔ PDF (.pdf)
 * ----------------------------------------------------------------------------
 */
async function convertWordToPdf(file) {
  processTitle.textContent = 'Conversion Word (.docx) vers PDF...';
  processDetail.textContent = 'Interprétation du document Word et mise en page PDF...';

  const { pdfDoc, lines, rawHtml, pageCount } = await generatePdfDocFromWord(file);
  const pdfBytes = await pdfDoc.save();

  convertedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}.pdf`;

  displayConversionResults({
    fromIcon: '📝',
    fromName: file.name,
    toIcon: '📄',
    toName: convertedFileName,
    elements: `${pageCount} page(s) PDF, ${lines.length} paragraphe(s)`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div class="mammoth-preview">${rawHtml}</div>`,
    downloadLabel: 'Télécharger le document PDF (.pdf)'
  });
}

/**
 * ----------------------------------------------------------------------------
 * 4. Word (.docx) ➔ Images (PNG / JPG / WebP)
 * ----------------------------------------------------------------------------
 */
async function convertWordToImage(file, targetMime, targetExt) {
  processTitle.textContent = `Conversion Word (.docx) vers ${targetExt.toUpperCase()}...`;
  processDetail.textContent = 'Génération de la page et rendu haute résolution...';

  const { pdfDoc } = await generatePdfDocFromWord(file);
  const pdfBytes = await pdfDoc.save();

  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');

  // Fill white page background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, targetMime, 0.92));
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}-page1${targetExt}`;

  displayConversionResults({
    fromIcon: '📝',
    fromName: file.name,
    toIcon: getFormat(targetFormat).icon,
    toName: convertedFileName,
    elements: `${canvas.width} x ${canvas.height} px`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${canvas.toDataURL(targetMime, 0.92)}" style="max-width:100%; max-height:350px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.25);"></div>`,
    downloadLabel: `Télécharger l'image (${targetExt})`
  });
}

/**
 * ----------------------------------------------------------------------------
 * 5. PDF ➔ Images (PNG / JPG / WebP)
 * ----------------------------------------------------------------------------
 */
async function convertPdfToImage(file, targetMime, targetExt) {
  processTitle.textContent = `Extraction PDF vers ${targetExt.toUpperCase()}...`;
  processDetail.textContent = 'Rendu de la première page en haute résolution...';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');

  // Fill white background for clean rendering
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvasContext: ctx, viewport }).promise;

  convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, targetMime, 0.92));
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}-page1${targetExt}`;

  displayConversionResults({
    fromIcon: '📄',
    fromName: file.name,
    toIcon: getFormat(targetFormat).icon,
    toName: convertedFileName,
    elements: `${canvas.width} x ${canvas.height} px`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${canvas.toDataURL(targetMime, 0.92)}" style="max-width:100%; max-height:350px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.3);"></div>`,
    downloadLabel: `Télécharger l'image (${targetExt})`
  });
}

/**
 * ----------------------------------------------------------------------------
 * 6. Images (PNG / JPG / WebP) ➔ PDF
 * ----------------------------------------------------------------------------
 */
async function convertImageToPdf(file) {
  processTitle.textContent = 'Conversion Image vers PDF...';
  processDetail.textContent = 'Intégration et ajustement de l\'image dans un document PDF...';

  const PDFLib = window.PDFLib;
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.create();

  let pdfImage;
  const isJpg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
  const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

  if (isJpg) {
    const arrayBuffer = await file.arrayBuffer();
    pdfImage = await pdfDoc.embedJpg(arrayBuffer);
  } else if (isWebp) {
    // WebP needs canvas conversion to PNG buffer for PDF-Lib embedding
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const pngBuf = await pngBlob.arrayBuffer();
    pdfImage = await pdfDoc.embedPng(pngBuf);
  } else {
    const arrayBuffer = await file.arrayBuffer();
    pdfImage = await pdfDoc.embedPng(arrayBuffer);
  }

  const imgDims = pdfImage.scale(1);
  const page = pdfDoc.addPage([imgDims.width, imgDims.height]);
  page.drawImage(pdfImage, {
    x: 0,
    y: 0,
    width: imgDims.width,
    height: imgDims.height
  });

  const pdfBytes = await pdfDoc.save();
  convertedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}.pdf`;

  displayConversionResults({
    fromIcon: getFormat(sourceFormat).icon,
    fromName: file.name,
    toIcon: '📄',
    toName: convertedFileName,
    elements: `1 page PDF (${Math.round(imgDims.width)} x ${Math.round(imgDims.height)} pt)`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${URL.createObjectURL(file)}" style="max-width:100%; max-height:350px; border-radius:8px;"></div>`,
    downloadLabel: 'Télécharger le document PDF (.pdf)'
  });
}

/**
 * ----------------------------------------------------------------------------
 * 7. Images (PNG / JPG / WebP) ➔ Word (.docx)
 * ----------------------------------------------------------------------------
 */
async function convertImageToDocx(file) {
  processTitle.textContent = 'Conversion Image vers Word (.docx)...';
  processDetail.textContent = 'Intégration de l\'image dans un document Word standardisé...';

  const docx = window.docx;
  if (!docx) throw new Error('Bibliothèque Word docx non disponible');
  const { Document, Packer, Paragraph, ImageRun, AlignmentType } = docx;

  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width || 600;
  const origH = img.naturalHeight || img.height || 400;

  // Scale image to fit within typical Word page margin (max 520 pt width, 680 pt height)
  const maxW = 520;
  const maxH = 680;
  let targetW = origW;
  let targetH = origH;
  if (targetW > maxW) {
    targetH = Math.round((targetH * maxW) / targetW);
    targetW = maxW;
  }
  if (targetH > maxH) {
    targetW = Math.round((targetW * maxH) / targetH);
    targetH = maxH;
  }

  // Get image buffer as Uint8Array (convert WebP to PNG buffer for Word compatibility)
  let imgBuffer;
  if (file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp')) {
    const canvas = document.createElement('canvas');
    canvas.width = origW;
    canvas.height = origH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    imgBuffer = await pngBlob.arrayBuffer();
  } else {
    imgBuffer = await file.arrayBuffer();
  }

  const imageRun = new ImageRun({
    data: new Uint8Array(imgBuffer),
    transformation: {
      width: targetW,
      height: targetH
    }
  });

  const alignCenter = AlignmentType?.CENTER || 'center';

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [imageRun],
          alignment: alignCenter,
          spacing: { after: 120 }
        })
      ]
    }]
  });

  convertedBlob = await Packer.toBlob(doc);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}.docx`;

  displayConversionResults({
    fromIcon: getFormat(sourceFormat).icon,
    fromName: file.name,
    toIcon: '📝',
    toName: convertedFileName,
    elements: `Image intégrée (${origW}x${origH} px)`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${URL.createObjectURL(file)}" style="max-width:100%; max-height:350px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.2);"></div>`,
    downloadLabel: 'Télécharger le document Word (.docx)'
  });
}

/**
 * ----------------------------------------------------------------------------
 * 8. Image ➔ Image (PNG ⇄ JPG ⇄ WebP)
 * ----------------------------------------------------------------------------
 */
async function convertImageFormat(file, targetMime, targetExt) {
  processTitle.textContent = 'Transformation de l\'image...';
  processDetail.textContent = `Conversion vers ${targetExt}...`;

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');

  // Fill white background for JPEG
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, targetMime, 0.92));
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}${targetExt}`;

  displayConversionResults({
    fromIcon: getFormat(sourceFormat).icon,
    fromName: file.name,
    toIcon: getFormat(targetFormat).icon,
    toName: convertedFileName,
    elements: `${canvas.width} x ${canvas.height} px`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${canvas.toDataURL(targetMime, 0.92)}" style="max-width:100%; max-height:350px; border-radius:8px;"></div>`,
    downloadLabel: `Télécharger l'image (${targetExt})`
  });
}

/**
 * Display unified results & update preview card
 */
function displayConversionResults({ fromIcon, fromName, toIcon, toName, elements, size, previewHtml, downloadLabel }) {
  processingBox.hidden = true;
  resultBox.hidden = false;

  resFromIcon.textContent = fromIcon;
  resFromName.textContent = fromName;
  resToIcon.textContent = toIcon;
  resToName.textContent = toName;
  statValElements.textContent = elements;
  statValSize.textContent = size;
  previewViewport.innerHTML = previewHtml;
  downloadText.textContent = downloadLabel;

  showToast(`Conversion réussie vers ${toName} ! 🎉`);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Global Paste event support
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!step1.hidden && item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        showToast(`Fichier ${file.name} collé depuis le presse-papier !`);
        processFile(file);
        break;
      }
    }
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initSharedUI('converter');
  initConverter();
});
