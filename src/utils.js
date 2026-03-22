/**
 * Utility functions for the app.
 */

const MONTHS_TR = [
  '', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

/**
 * Format a date string nicely in Turkish.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  const d = new Date(isoString);
  const day = d.getDate();
  const month = MONTHS_TR[d.getMonth() + 1];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Get the status CSS class suffix.
 * @param {string} status
 * @returns {string}
 */
export function statusClass(status) {
  switch (status) {
    case 'Açık': return 'open';
    case 'İnceleniyor': return 'review';
    case 'Çözüldü': return 'resolved';
    default: return 'open';
  }
}

/**
 * Get the Material icon name for a status.
 * @param {string} status
 * @returns {string}
 */
export function statusIcon(status) {
  switch (status) {
    case 'Açık': return 'error_outline';
    case 'İnceleniyor': return 'search';
    case 'Çözüldü': return 'check_circle_outline';
    default: return 'help_outline';
  }
}

/**
 * Read a File as a data URL (base64).
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'info') {
  // Remove any existing toasts
  document.querySelectorAll('.toast').forEach((el) => el.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'info' ? `toast--${type}` : ''}`;

  const iconMap = { success: 'check_circle', error: 'error', info: 'info' };
  toast.innerHTML = `
    <span class="material-icons-round">${iconMap[type] || 'info'}</span>
    ${message}
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Show a confirm dialog.
 * @param {string} title
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export function showConfirm(title, text) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-dialog__title">${title}</div>
        <div class="confirm-dialog__text">${text}</div>
        <div class="confirm-dialog__actions">
          <button class="confirm-dialog__btn confirm-dialog__btn--cancel" id="confirm-cancel">İptal</button>
          <button class="confirm-dialog__btn confirm-dialog__btn--danger" id="confirm-ok">Sil</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-cancel').onclick = () => {
      overlay.remove();
      resolve(false);
    };

    overlay.querySelector('#confirm-ok').onclick = () => {
      overlay.remove();
      resolve(true);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    };
  });
}
