/**
 * OmniTools — Transform & Convertisseur Universel (PDF to Word, Word to PDF, Images)
 * 100% Client-Side with PDF.js, PDF-Lib, Mammoth.js & Docx
 */

import { showToast, initSharedUI } from './shared.js?v=2';

// Configure PDF.js Worker
const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// DOM Elements: Steps
const step1 = document.getElementById('converter-step-1');
const step2 = document.getElementById('converter-step-2');
const dropzone = document.getElementById('converter-dropzone');
const fileInput = document.getElementById('converter-file-input');
const browseBtn = document.getElementById('converter-browse-btn');
const sampleBtn = document.getElementById('converter-sample-btn');
const sampleText = document.getElementById('converter-sample-text');

// DOM Elements: Header & Instructions
const heroSubtitle = document.getElementById('converter-hero-subtitle');
const stepNum = document.getElementById('converter-step-num');
const dropzoneInstruction = document.getElementById('converter-dropzone-instruction');
const dropzoneTitle = document.getElementById('converter-dropzone-title');
const dropzoneSub = document.getElementById('converter-dropzone-sub');
const dropIcon = document.getElementById('converter-drop-icon');
const modeTabs = document.querySelectorAll('.mode-tab-btn');

// Target Extension Picker
const targetExtPicker = document.getElementById('target-ext-picker');
const targetExtButtons = document.getElementById('target-ext-buttons');

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

// State
let currentMode = 'pdf-to-word'; // 'pdf-to-word', 'word-to-pdf', 'img-to-pdf', 'pdf-to-img', 'img-convert'
let targetImageExt = 'image/jpeg';
let convertedBlob = null;
let convertedFileName = '';

const MODE_CONFIGS = {
  'pdf-to-word': {
    title: 'Glissez-déposez votre fichier PDF ici',
    sub: 'Documents PDF avec texte, tableaux ou formulaires à convertir en .docx',
    instruction: 'Glissez ou sélectionnez votre document PDF à convertir en Word (.docx)',
    accept: '.pdf,application/pdf',
    icon: '📝',
    sampleText: 'Tester avec un document PDF d\'exemple',
    targetExt: '.docx',
    targetName: 'Document Word (.docx)'
  },
  'word-to-pdf': {
    title: 'Glissez-déposez votre document Word (.docx) ici',
    sub: 'Fichiers Microsoft Word (.docx) à convertir en PDF haute qualité',
    instruction: 'Glissez ou sélectionnez votre document Word (.docx) à convertir en PDF',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: '📄',
    sampleText: 'Tester avec un document Word d\'exemple',
    targetExt: '.pdf',
    targetName: 'Document PDF (.pdf)'
  },
  'img-to-pdf': {
    title: 'Glissez-déposez vos images (JPG, PNG, WebP) ici',
    sub: 'Transformez une ou plusieurs images en document PDF complet',
    instruction: 'Glissez ou sélectionnez vos images à transformer en PDF',
    accept: 'image/png,image/jpeg,image/webp',
    icon: '📑',
    sampleText: 'Tester avec une image d\'exemple',
    targetExt: '.pdf',
    targetName: 'Document PDF (.pdf)'
  },
  'pdf-to-img': {
    title: 'Glissez-déposez votre fichier PDF ici',
    sub: 'Extrayez chaque page de votre PDF sous forme d\'image PNG haute résolution',
    instruction: 'Glissez ou sélectionnez un document PDF pour l\'extraire en image',
    accept: '.pdf,application/pdf',
    icon: '🖼️',
    sampleText: 'Tester avec un PDF d\'exemple',
    targetExt: '.png',
    targetName: 'Image PNG (.png)'
  },
  'img-convert': {
    title: 'Glissez-déposez votre image ici',
    sub: 'Convertissez entre les formats PNG, JPG et WebP sans perte de qualité',
    instruction: 'Choisissez l\'extension souhaitée puis déposez votre image',
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    icon: '🔄',
    sampleText: 'Tester avec une image d\'exemple',
    targetExt: '.jpg',
    targetName: 'Image convertie'
  }
};

export function initConverter() {
  detectInitialMode();
  setupModeTabs();
  setupInputs();
  setupActions();
}

/**
 * Detect mode from URL query parameters (e.g. ?mode=pdf-to-word)
 */
function detectInitialMode() {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  if (modeParam && MODE_CONFIGS[modeParam]) {
    setMode(modeParam);
  } else {
    setMode('pdf-to-word');
  }
}

function setMode(modeKey) {
  if (!MODE_CONFIGS[modeKey]) return;
  currentMode = modeKey;

  // Update tabs
  modeTabs.forEach(tab => {
    const isCurrent = tab.dataset.mode === modeKey;
    tab.classList.toggle('active', isCurrent);
    tab.setAttribute('aria-selected', isCurrent);
  });

  // Update labels and inputs
  const config = MODE_CONFIGS[modeKey];
  dropzoneTitle.textContent = config.title;
  dropzoneSub.textContent = config.sub;
  dropzoneInstruction.textContent = config.instruction;
  dropIcon.textContent = config.icon;
  sampleText.textContent = config.sampleText;
  fileInput.accept = config.accept;

  // Show/hide format options
  if (modeKey === 'img-convert') {
    targetExtPicker.hidden = false;
    renderImageFormatButtons();
  } else {
    targetExtPicker.hidden = true;
  }
}

function renderImageFormatButtons() {
  targetExtButtons.innerHTML = `
    <button type="button" class="btn-ext-choice active" data-format="image/jpeg" data-ext=".jpg">JPG / JPEG</button>
    <button type="button" class="btn-ext-choice" data-format="image/png" data-ext=".png">PNG</button>
    <button type="button" class="btn-ext-choice" data-format="image/webp" data-ext=".webp">WebP</button>
  `;

  targetExtButtons.querySelectorAll('.btn-ext-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      targetExtButtons.querySelectorAll('.btn-ext-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      targetImageExt = btn.dataset.format;
      MODE_CONFIGS['img-convert'].targetExt = btn.dataset.ext;
    });
  });
}

function setupModeTabs() {
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      setMode(mode);
      if (!step2.hidden) {
        resetConverter();
      }
      // Update history state without page refresh
      const url = new URL(window.location);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url);
    });
  });
}

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

  // Drag & drop
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
 * Handle Sample File testing based on current mode
 */
async function handleSampleFile() {
  try {
    if (currentMode === 'pdf-to-word' || currentMode === 'pdf-to-img') {
      showToast('Chargement du document PDF d\'exemple...');
      const res = await fetch('sample.pdf');
      if (!res.ok) throw new Error('sample.pdf non trouvé');
      const blob = await res.blob();
      const file = new File([blob], 'rapport-exemple.pdf', { type: 'application/pdf' });
      processFile(file);
    } else if (currentMode === 'word-to-pdf') {
      showToast('Génération d\'un document Word d\'exemple...');
      const sampleDocxBlob = await generateSampleDocx();
      const file = new File([sampleDocxBlob], 'contrat-exemple.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      processFile(file);
    } else {
      showToast('Chargement de l\'image d\'exemple...');
      const res = await fetch('sample.jpg');
      if (!res.ok) throw new Error('sample.jpg non trouvé');
      const blob = await res.blob();
      const file = new File([blob], 'photo-exemple.jpg', { type: 'image/jpeg' });
      processFile(file);
    }
  } catch (err) {
    console.warn('Sample file error:', err);
    showToast('Erreur lors du chargement de l\'exemple.');
  }
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
            new TextRun({ text: "Ce document Word a été généré localement pour tester la conversion vers PDF.", bold: true }),
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
          text: "Le présent contrat a pour objet d'assurer la transformation numérique 100% Client-Side de tous types de documents au format PDF et Word en toute confidentialité.",
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
 * Master file processor: routes to appropriate conversion engine
 */
async function processFile(file) {
  if (!file) return;

  step1.hidden = true;
  step2.hidden = false;
  processingBox.hidden = false;
  resultBox.hidden = true;

  try {
    if (currentMode === 'pdf-to-word') {
      await convertPdfToWord(file);
    } else if (currentMode === 'word-to-pdf') {
      await convertWordToPdf(file);
    } else if (currentMode === 'img-to-pdf') {
      await convertImageToPdf(file);
    } else if (currentMode === 'pdf-to-img') {
      await convertPdfToImage(file);
    } else if (currentMode === 'img-convert') {
      await convertImageFormat(file);
    }
  } catch (err) {
    console.error('Conversion failed:', err);
    showToast('Erreur lors de la transformation : ' + err.message);
    resetConverter();
  }
}

/**
 * CONVERSION 1: PDF ➔ Word (.docx)
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
      const y = Math.round(item.transform[5] / 4) * 4; // Tolerance grouping
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y).push(item);
    });

    // Sort descending by Y (top of page first)
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

    if (pNum > 1) {
      docChildren.push(new Paragraph({ text: `--- Page ${pNum} ---`, spacing: { before: 200, after: 150 } }));
      previewHtmlParts.push(`<hr class="preview-page-break"><div class="preview-page-badge">Page ${pNum}</div>`);
    }

    sortedY.forEach(y => {
      const items = linesMap.get(y);
      // Sort left to right
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

  // Fallback if empty document
  if (docChildren.length === 0) {
    docChildren.push(new Paragraph({ text: "Document PDF sans couche texte détectée." }));
    previewHtmlParts.push("<p>Aucun texte extractible trouvé dans ce PDF.</p>");
  }

  // Pack into DOCX Blob
  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }]
  });

  convertedBlob = await Packer.toBlob(doc);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}.docx`;

  // Display results
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
 * CONVERSION 2: Word (.docx) ➔ PDF (.pdf)
 */
async function convertWordToPdf(file) {
  processTitle.textContent = 'Conversion Word (.docx) vers PDF...';
  processDetail.textContent = 'Interprétation du document Word et mise en page PDF...';

  const arrayBuffer = await file.arrayBuffer();

  const mammoth = window.mammoth;
  if (!mammoth) throw new Error('Bibliothèque mammoth.js non disponible');

  // Extract HTML & raw text
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const rawHtml = result.value || '<p>Document Word vide.</p>';

  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const lines = textResult.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Generate vector PDF using PDF-Lib
  const PDFLib = window.PDFLib;
  if (!PDFLib) throw new Error('PDF-Lib non chargé');
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 points
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

  // Render paragraphs with automatic page breaks
  lines.forEach((line) => {
    const isHeading = line.length < 70 && (line.startsWith('Article') || line.startsWith('Chapitre') || line === line.toUpperCase());
    const fontSize = isHeading ? 13 : 10.5;
    const font = isHeading ? fontBold : fontRegular;
    const lineHeight = fontSize * 1.35;

    // Word wrap
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
 * CONVERSION 3: Images ➔ PDF
 */
async function convertImageToPdf(file) {
  processTitle.textContent = 'Conversion Image vers PDF...';
  processDetail.textContent = 'Intégration de l\'image dans un document PDF...';

  const arrayBuffer = await file.arrayBuffer();
  const PDFLib = window.PDFLib;
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.create();

  let pdfImage;
  if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
    pdfImage = await pdfDoc.embedJpg(arrayBuffer);
  } else {
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
    fromIcon: '🖼️',
    fromName: file.name,
    toIcon: '📄',
    toName: convertedFileName,
    elements: `1 page PDF (${Math.round(imgDims.width)} x ${Math.round(imgDims.height)} pt)`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${URL.createObjectURL(file)}" style="max-width:100%; max-height:350px; border-radius:8px;"></div>`,
    downloadLabel: 'Télécharger le PDF (.pdf)'
  });
}

/**
 * CONVERSION 4: PDF ➔ Image (PNG)
 */
async function convertPdfToImage(file) {
  processTitle.textContent = 'Extraction PDF vers Image...';
  processDetail.textContent = 'Rendu de la première page en haute résolution...';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}-page1.png`;

  displayConversionResults({
    fromIcon: '📄',
    fromName: file.name,
    toIcon: '🖼️',
    toName: convertedFileName,
    elements: `${canvas.width} x ${canvas.height} px`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${canvas.toDataURL('image/png')}" style="max-width:100%; max-height:350px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.3);"></div>`,
    downloadLabel: 'Télécharger l\'image PNG (.png)'
  });
}

/**
 * CONVERSION 5: Image ➔ Other Image Format (JPG / PNG / WebP)
 */
async function convertImageFormat(file) {
  processTitle.textContent = 'Transformation de l\'image...';
  processDetail.textContent = `Conversion vers ${MODE_CONFIGS['img-convert'].targetExt}...`;

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');

  // Fill white background for JPEG
  if (targetImageExt === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, targetImageExt, 0.92));
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  convertedFileName = `${baseName}${MODE_CONFIGS['img-convert'].targetExt}`;

  displayConversionResults({
    fromIcon: '🖼️',
    fromName: file.name,
    toIcon: '🔄',
    toName: convertedFileName,
    elements: `${canvas.width} x ${canvas.height} px`,
    size: formatFileSize(convertedBlob.size),
    previewHtml: `<div style="text-align:center;"><img src="${canvas.toDataURL(targetImageExt, 0.92)}" style="max-width:100%; max-height:350px; border-radius:8px;"></div>`,
    downloadLabel: `Télécharger l'image (${MODE_CONFIGS['img-convert'].targetExt})`
  });
}

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

// Paste event support
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
