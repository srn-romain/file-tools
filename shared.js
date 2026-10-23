/**
 * OmniTools — Shared UI Components & Utilities
 * Single Source of Truth for Tools, Dynamic Header/Dropdown, Footer & Toasts.
 */

// Single Source of Truth for all tools in OmniTools
export const TOOLS = [
  {
    id: 'bg-remover',
    name: "Détourage d'image",
    fullName: "Détourage d'image (ClearCut)",
    icon: '✂️',
    iconClass: 'bg-remover-icon',
    url: 'index.html',
    desc: "Supprimez et retouchez l'arrière-plan de vos photos avec précision."
  },
  {
    id: 'pdf-organizer',
    name: "Organisateur de PDF",
    fullName: "Organisateur de PDF (PDF Studio)",
    icon: '📑',
    iconClass: 'pdf-organizer-icon',
    url: 'pdf-organizer.html',
    desc: "Réorganisez, déplacez, pivotez et supprimez des pages de vos PDF."
  },
  {
    id: 'compressor',
    name: "Compresseur de fichiers",
    fullName: "Compresseur de fichiers",
    icon: '🗜️',
    iconClass: 'compressor-icon',
    url: 'compressor.html',
    desc: "Réduisez le poids de vos images et documents PDF sans perte visible."
  },
  {
    id: 'photo-merger',
    name: "Assembleur Photo",
    fullName: "Assembleur & Fusion Photo",
    icon: '🖼️',
    iconClass: 'photo-merger-icon',
    url: 'photo-merger.html',
    desc: "Combinez jusqu'à 100 photos en une seule image (grille, côte à côte, empilées)."
  },
  {
    id: 'pdf-filler',
    name: "Remplir un PDF",
    fullName: "Remplir un PDF (Formulaire & Texte)",
    icon: '✍️',
    iconClass: 'pdf-filler-icon',
    url: 'pdf-filler.html',
    desc: "Saisissez du texte directement sur vos documents PDF sans avoir à les imprimer."
  },

  {
    id: 'converter',
    name: "Conversion de fichiers",
    fullName: "Conversion de fichiers",
    icon: '🔄',
    iconClass: 'converter-icon',
    url: 'converter.html',
    desc: "Convertissez vos fichiers dans le format souhaité : PDF vers Word, Word vers PDF, JPG, PNG, WebP..."
  }
];

// Toast notification helper
let toastTimeout;
export function showToast(message, duration = 3400) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

/**
 * Render Header and Dropdown Navigation dynamically
 * Prevents duplicating 70+ lines of dropdown HTML across every page.
 */
export function initHeader(currentToolId) {
  // Auto-detect tool ID from page filename and query params if not provided
  if (!currentToolId) {
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.endsWith('converter.html')) {
      if (search.includes('mode=word-to-pdf')) currentToolId = 'word-to-pdf';
      else if (search.includes('mode=pdf-to-word')) currentToolId = 'pdf-to-word';
      else currentToolId = 'converter';
    } else {
      const match = TOOLS.find(t => t.url && path.endsWith(t.url.toLowerCase()));
      currentToolId = match ? match.id : 'bg-remover';
    }
  }

  const currentTool = TOOLS.find(t => t.id === currentToolId) || TOOLS[0];
  const headerEl = document.getElementById('app-header') || document.querySelector('.app-header');
  if (!headerEl) return;

  headerEl.innerHTML = `
    <div class="brand-dropdown-container">
      <!-- Dropdown Selector Button -->
      <button type="button" id="tool-dropdown-btn" class="tool-dropdown-btn" aria-haspopup="true" aria-expanded="false" title="Changer d'outil">
        <div class="tool-btn-icon" id="header-tool-icon">${currentTool.icon}</div>
        <div class="tool-btn-info">
          <span class="tool-btn-name" id="header-tool-name">${currentTool.name}</span>
          <span class="tool-btn-sub">Outils locaux &bull; Changer d'outil</span>
        </div>
        <svg class="chevron-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div id="tool-dropdown-menu" class="tool-dropdown-menu" role="menu" hidden>
        <div class="dropdown-header">Sélectionnez un outil :</div>
        ${TOOLS.map(tool => {
          if (tool.type === 'group-title') {
            return `
              <div class="tool-dropdown-group-title" role="presentation">
                <span>${tool.title}</span>
              </div>
            `;
          }
          const isActive = tool.id === currentTool.id;
          return `
            <a href="${tool.url}" class="tool-dropdown-item ${tool.isSubItem ? 'sub-item' : ''} ${isActive ? 'active' : ''}" role="menuitem">
              <div class="item-icon ${tool.iconClass}">${tool.icon}</div>
              <div class="item-content">
                <div class="item-title-row">
                  <span class="item-title">${tool.fullName}</span>
                </div>
                <p class="item-desc">${tool.desc}</p>
              </div>
              ${isActive ? '<div class="item-check">✓</div>' : ''}
            </a>
          `;
        }).join('')}
      </div>
    </div>

    <div class="header-badges">
      <div class="privacy-pill">
        <span class="status-dot"></span>
        <span>100% In-Browser &bull; Sans Serveur &bull; Privé</span>
      </div>
    </div>
  `;

  // Attach interactive dropdown behavior
  attachDropdownEvents();
}

function attachDropdownEvents() {
  const toolDropdownBtn = document.getElementById('tool-dropdown-btn');
  const toolDropdownMenu = document.getElementById('tool-dropdown-menu');
  if (!toolDropdownBtn || !toolDropdownMenu) return;

  toolDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = toolDropdownBtn.classList.toggle('open');
    toolDropdownMenu.hidden = !isExpanded;
    toolDropdownBtn.setAttribute('aria-expanded', isExpanded);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.brand-dropdown-container')) {
      toolDropdownBtn.classList.remove('open');
      toolDropdownMenu.hidden = true;
      toolDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toolDropdownBtn.classList.remove('open');
      toolDropdownMenu.hidden = true;
      toolDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Render standard footer dynamically
 */
export function initFooter() {
  const footerEl = document.getElementById('app-footer') || document.querySelector('.app-footer');
  if (!footerEl) return;

  footerEl.innerHTML = `
    <div class="footer-content">
      <p>OmniTools &bull; Suite d'outils 100% Client-Side conçus pour <strong>GitHub Pages</strong> &bull; Sans backend</p>
      <div class="footer-links">
        <span class="badge-tech">ISNet FP32 AI</span>
        <span class="badge-tech">PDF-Lib & PDF.js</span>
        <span class="badge-tech">0 Serveur / 100% Privé</span>
        <span class="badge-tech">GitHub Pages Ready</span>
      </div>
    </div>
  `;
}

/**
 * Initialize all shared UI (Header + Footer) in one clean call
 */
export function initSharedUI(toolId) {
  initHeader(toolId);
  initFooter();
}

// Backward-compatible alias
export const initHeaderDropdown = initHeader;

// Prevent default drag & drop navigation on window
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, (e) => e.preventDefault(), false);
});
