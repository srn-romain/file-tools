/**
 * OmniTools — Shared UI Utilities
 * Dropdown navigation, Toast notifications, and Drag & Drop defaults.
 */

// Toast notification helper
const toastEl = document.getElementById('toast');
let toastTimeout;

export function showToast(message, duration = 3400) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// Interactive Header Tool Dropdown
export function initHeaderDropdown() {
  const toolDropdownBtn = document.getElementById('tool-dropdown-btn');
  const toolDropdownMenu = document.getElementById('tool-dropdown-menu');
  if (!toolDropdownBtn || !toolDropdownMenu) return;

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
      toolDropdownBtn.classList.remove('open');
      toolDropdownMenu.hidden = true;
      toolDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toolDropdownBtn.classList.remove('open');
      toolDropdownMenu.hidden = true;
      toolDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// Prevent default drag & drop events on window so dragged files don't navigate away
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, (e) => e.preventDefault(), false);
});
