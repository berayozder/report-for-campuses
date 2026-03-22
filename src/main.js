/**
 * Main application — Tehlike İhbar (Hazard Reporting)
 * Renders 3 views: Home (report list), Create Report, Admin Panel
 */

import {
  getReports,
  getReportsByStatus,
  getReportById,
  createReport,
  updateReportStatus,
  deleteReport,
  getStatusCounts,
  subscribe,
  ReportStatus,
  ALL_STATUSES,
  HAZARD_CATEGORIES,
} from './store.js';

import { getCurrentPosition, getAddressFromCoords } from './location.js';
import { formatDate, statusClass, statusIcon, readFileAsDataUrl, showToast, showConfirm } from './utils.js';
import { signInWithGoogle, signOut, getCurrentUser, onAuthChange } from './auth.js';

const app = document.getElementById('app');

// Current view state
let currentView = 'home'; // 'home' | 'create' | 'admin'
let adminFilter = 'Tümü';
let currentAuthUser = null;

// ─── Render Router ───
function render() {
  switch (currentView) {
    case 'home':
      renderHome();
      break;
    case 'create':
      renderCreate();
      break;
    case 'admin':
      renderAdmin();
      break;
  }
}

// ─── HOME VIEW ───
function renderHome() {
  const reports = getReports();
  const openCount = reports.filter((r) => r.status === ReportStatus.OPEN).length;

  app.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <div class="app-header__title">
        <div class="app-header__icon">
          <span class="material-icons-round">warning_amber</span>
        </div>
        Tehlike İhbar
      </div>
      <div class="app-header__actions">
        ${currentAuthUser
          ? `
            <button class="icon-btn" id="btn-admin" title="Yönetim Paneli">
              <span class="material-icons-round">admin_panel_settings</span>
            </button>
            <button class="icon-btn" id="btn-logout" title="Çıkış Yap (${escapeHtml(currentAuthUser.displayName)})">
              ${currentAuthUser.photoURL
                ? `<img src="${currentAuthUser.photoURL}" alt="" style="width:28px;height:28px;border-radius:50%" />`
                : `<span class="material-icons-round">account_circle</span>`
              }
            </button>
          `
          : `
            <button class="icon-btn" id="btn-admin" title="Yönetim Paneli">
              <span class="material-icons-round">admin_panel_settings</span>
            </button>
            <button class="icon-btn" id="btn-login" title="Giriş Yap">
              <span class="material-icons-round">login</span>
            </button>
          `
        }
      </div>
    </header>

    <!-- Content -->
    <div class="scroll-content" id="home-content">
      ${reports.length === 0
        ? `
          <div class="empty-state">
            <div class="empty-state__icon">
              <span class="material-icons-round">shield</span>
            </div>
            <div class="empty-state__title">Henüz ihbar yok</div>
            <div class="empty-state__text">
              Çevrenizdeki tehlikeleri bildirmek için<br/>aşağıdaki butona tıklayın.
            </div>
          </div>
        `
        : `
          <div class="section-header">
            <span class="section-header__title">Son İhbarlar</span>
            ${openCount > 0 ? `<span class="section-header__badge">${openCount} açık</span>` : ''}
          </div>
          ${reports.map((report) => renderReportCard(report)).join('')}
        `
      }
    </div>

    <!-- FAB -->
    <button class="fab" id="btn-create">
      <span class="material-icons-round">add_a_photo</span>
      İhbar Et
    </button>

    <!-- Footer -->
    <footer class="app-footer">
      <span>Tehlike İhbar v1.0.0</span>
      <span class="app-footer__dot">·</span>
      <span>Built for YGA</span>
    </footer>
  `;

  // Bind events
  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) {
    adminBtn.onclick = () => {
      currentView = 'admin';
      render();
    };
  }

  const loginBtn = document.getElementById('btn-login');
  if (loginBtn) {
    loginBtn.onclick = async () => {
      try {
        await signInWithGoogle();
        showToast('Giriş başarılı!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut();
      showToast('Çıkış yapıldı.', 'info');
    };
  }

  document.getElementById('btn-create').onclick = () => {
    currentView = 'create';
    render();
  };

  // Card clicks — open detail modal
  document.querySelectorAll('.report-card').forEach((card) => {
    card.onclick = () => {
      const id = card.dataset.id;
      const report = getReportById(id);
      if (report) showDetailModal(report, false);
    };
  });
}

function renderReportCard(report) {
  return `
    <div class="report-card" data-id="${report.id}">
      ${report.imageDataUrl
        ? `<img class="report-card__image" src="${report.imageDataUrl}" alt="İhbar fotoğrafı" loading="lazy" />`
        : `<div class="report-card__image-placeholder"><span class="material-icons-round" style="font-size:48px">image</span></div>`
      }
      <div class="report-card__body">
        <div class="report-card__meta">
          <span class="status-badge status-badge--${statusClass(report.status)}">
            <span class="material-icons-round">${statusIcon(report.status)}</span>
            ${report.status}
          </span>
          <span class="report-card__date">${formatDate(report.timestamp)}</span>
        </div>
        <div class="report-card__desc">${escapeHtml(report.description)}</div>
        ${report.category
          ? `<div class="category-badge">
              <span class="material-icons-round">${getCategoryIcon(report.category)}</span>
              ${getCategoryLabel(report.category)}
            </div>`
          : ''
        }
        ${report.address
          ? `<div class="report-card__location">
              <span class="material-icons-round">location_on</span>
              ${escapeHtml(report.address)}
            </div>`
          : ''
        }
      </div>
    </div>
  `;
}

// ─── CREATE REPORT VIEW ───
function renderCreate() {
  app.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <button class="icon-btn" id="btn-back">
        <span class="material-icons-round">arrow_back</span>
      </button>
      <div class="app-header__title">Yeni İhbar</div>
      <div style="width:40px"></div>
    </header>

    <!-- Form -->
    <div class="form-screen">
      <!-- Category -->
      <div class="form-section">
        <div class="form-section__label">
          <span class="material-icons-round">category</span>
          Tehlike Türü
        </div>
        <div class="category-chips" id="category-chips">
          ${HAZARD_CATEGORIES.map((cat) => `
            <button class="category-chip" data-category="${cat.id}">
              <span class="material-icons-round">${cat.icon}</span>
              ${cat.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Photo -->
      <div class="form-section">
        <div class="form-section__label">
          <span class="material-icons-round">camera_alt</span>
          Fotoğraf
        </div>
        <div class="image-picker" id="image-picker">
          <div class="image-picker__icon">
            <span class="material-icons-round">add_a_photo</span>
          </div>
          <div class="image-picker__text">Fotoğraf seçmek için tıklayın</div>
        </div>
        <input type="file" id="file-input" accept="image/*" capture="environment" style="display:none" />
      </div>

      <!-- Description -->
      <div class="form-section">
        <div class="form-section__label">
          <span class="material-icons-round">edit</span>
          Açıklama
        </div>
        <textarea
          class="form-textarea"
          id="description-input"
          placeholder="Tehlike hakkında detaylı bilgi verin...&#10;Örn: Kütüphane 2. katta kırık cam var, dikkat!"
          maxlength="500"
        ></textarea>
        <div class="form-char-count"><span id="char-count">0</span>/500</div>
      </div>

      <!-- Location -->
      <div class="form-section">
        <div class="form-section__label">
          <span class="material-icons-round">location_on</span>
          Konum
        </div>
        <div class="location-card" id="location-card">
          <div class="location-card__icon location-card__icon--loading">
            <span class="material-icons-round">my_location</span>
          </div>
          <div class="location-card__info">
            <div class="location-card__address">Konum alınıyor...</div>
          </div>
          <div class="spinner spinner--dark"></div>
        </div>
      </div>

      <!-- Submit -->
      <button class="submit-btn" id="btn-submit">
        <span class="material-icons-round">send</span>
        İhbarı Gönder
      </button>
    </div>
  `;

  // State
  let selectedCategory = null;
  let selectedImageDataUrl = null;
  let latitude = null;
  let longitude = null;
  let address = null;
  let isSubmitting = false;

  // Category chip selection
  document.querySelectorAll('.category-chip').forEach((chip) => {
    chip.onclick = () => {
      const catId = chip.dataset.category;
      if (selectedCategory === catId) {
        // Deselect
        selectedCategory = null;
        chip.classList.remove('category-chip--active');
      } else {
        // Select
        selectedCategory = catId;
        document.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('category-chip--active'));
        chip.classList.add('category-chip--active');
      }
    };
  });

  // Back button
  document.getElementById('btn-back').onclick = () => {
    currentView = 'home';
    render();
  };

  // Image picker
  const fileInput = document.getElementById('file-input');
  const imagePicker = document.getElementById('image-picker');

  imagePicker.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      selectedImageDataUrl = await readFileAsDataUrl(file);
      imagePicker.innerHTML = `
        <img class="image-picker__preview" src="${selectedImageDataUrl}" alt="Seçilen fotoğraf" />
        <button class="image-picker__edit-btn" id="btn-change-image">
          <span class="material-icons-round">edit</span>
        </button>
      `;
      imagePicker.classList.add('image-picker--has-image');

      document.getElementById('btn-change-image').onclick = (ev) => {
        ev.stopPropagation();
        fileInput.click();
      };
    } catch {
      showToast('Fotoğraf yüklenemedi.', 'error');
    }
  };

  // Description char count
  const descInput = document.getElementById('description-input');
  const charCount = document.getElementById('char-count');
  descInput.oninput = () => {
    charCount.textContent = descInput.value.length;
  };

  // Fetch location
  fetchLocation();

  async function fetchLocation() {
    const locationCard = document.getElementById('location-card');
    try {
      const pos = await getCurrentPosition();
      latitude = pos.latitude;
      longitude = pos.longitude;

      address = await getAddressFromCoords(latitude, longitude);

      locationCard.innerHTML = `
        <div class="location-card__icon location-card__icon--success">
          <span class="material-icons-round">location_on</span>
        </div>
        <div class="location-card__info">
          <div class="location-card__address">${escapeHtml(address)}</div>
          <div class="location-card__coords">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
        </div>
        <button class="icon-btn" id="btn-refresh-location" title="Konumu Yenile">
          <span class="material-icons-round">refresh</span>
        </button>
      `;

      document.getElementById('btn-refresh-location').onclick = () => {
        locationCard.innerHTML = `
          <div class="location-card__icon location-card__icon--loading">
            <span class="material-icons-round">my_location</span>
          </div>
          <div class="location-card__info">
            <div class="location-card__address">Konum alınıyor...</div>
          </div>
          <div class="spinner spinner--dark"></div>
        `;
        fetchLocation();
      };
    } catch (err) {
      locationCard.innerHTML = `
        <div class="location-card__icon location-card__icon--error">
          <span class="material-icons-round">location_off</span>
        </div>
        <div class="location-card__info">
          <div class="location-card__error">${escapeHtml(err.message)}</div>
        </div>
        <button class="location-card__retry" id="btn-retry-location">Tekrar Dene</button>
      `;

      document.getElementById('btn-retry-location').onclick = () => {
        locationCard.innerHTML = `
          <div class="location-card__icon location-card__icon--loading">
            <span class="material-icons-round">my_location</span>
          </div>
          <div class="location-card__info">
            <div class="location-card__address">Konum alınıyor...</div>
          </div>
          <div class="spinner spinner--dark"></div>
        `;
        fetchLocation();
      };
    }
  }

  // Submit
  document.getElementById('btn-submit').onclick = async () => {
    if (isSubmitting) return;

    // Validate
    if (!selectedCategory) {
      showToast('Lütfen bir tehlike türü seçin.', 'error');
      return;
    }
    if (!selectedImageDataUrl) {
      showToast('Lütfen bir fotoğraf ekleyin.', 'error');
      return;
    }
    if (!descInput.value.trim()) {
      showToast('Lütfen bir açıklama yazın.', 'error');
      return;
    }
    if (latitude === null || longitude === null) {
      showToast('Konum bilgisi alınamadı. Tekrar deneyin.', 'error');
      return;
    }

    isSubmitting = true;
    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div>';

    try {
      await createReport({
        imageDataUrl: selectedImageDataUrl,
        description: descInput.value.trim(),
        category: selectedCategory,
        latitude,
        longitude,
        address,
        userId: currentAuthUser?.uid || null,
        userName: currentAuthUser?.displayName || null,
      });

      showToast('İhbar başarıyla gönderildi!', 'success');
      currentView = 'home';
      render();
    } catch (err) {
      showToast('Gönderim başarısız: ' + err.message, 'error');
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-icons-round">send</span> İhbarı Gönder';
    }
  };
}

// ─── ADMIN VIEW ───
function renderAdmin() {
  const counts = getStatusCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const reports = adminFilter === 'Tümü' ? getReports() : getReportsByStatus(adminFilter);

  app.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <button class="icon-btn" id="btn-back-admin">
        <span class="material-icons-round">arrow_back</span>
      </button>
      <div class="app-header__title">Yönetim Paneli</div>
      <div style="width:40px;display:flex;align-items:center;justify-content:flex-end">
        <span style="font-size:13px;font-weight:600;color:var(--primary);background:var(--primary-light);padding:3px 10px;border-radius:20px">${total}</span>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card stat-card--open">
        <div class="stat-card__number">${counts[ReportStatus.OPEN]}</div>
        <div class="stat-card__label">Açık</div>
      </div>
      <div class="stat-card stat-card--review">
        <div class="stat-card__number">${counts[ReportStatus.UNDER_REVIEW]}</div>
        <div class="stat-card__label">İnceleniyor</div>
      </div>
      <div class="stat-card stat-card--resolved">
        <div class="stat-card__number">${counts[ReportStatus.RESOLVED]}</div>
        <div class="stat-card__label">Çözüldü</div>
      </div>
    </div>

    <!-- Filter Chips -->
    <div class="filter-chips">
      <button class="filter-chip ${adminFilter === 'Tümü' ? 'filter-chip--active' : ''}" data-filter="Tümü">Tümü</button>
      ${ALL_STATUSES.map((s) => `
        <button class="filter-chip ${adminFilter === s ? 'filter-chip--active' : ''}" data-filter="${s}">${s}</button>
      `).join('')}
    </div>

    <!-- Report List -->
    <div class="scroll-content" id="admin-list">
      ${reports.length === 0
        ? `
          <div class="empty-state">
            <div class="empty-state__icon">
              <span class="material-icons-round">inbox</span>
            </div>
            <div class="empty-state__title">
              ${adminFilter === 'Tümü' ? 'Henüz ihbar yok' : `"${adminFilter}" durumunda ihbar yok`}
            </div>
          </div>
        `
        : reports.map((r) => renderAdminCard(r)).join('')
      }
    </div>
  `;

  // Back button
  document.getElementById('btn-back-admin').onclick = () => {
    currentView = 'home';
    adminFilter = 'Tümü';
    render();
  };

  // Filter clicks
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.onclick = () => {
      adminFilter = chip.dataset.filter;
      renderAdmin();
    };
  });

  // Card clicks — open admin detail modal
  document.querySelectorAll('.admin-card').forEach((card) => {
    card.onclick = () => {
      const report = getReportById(card.dataset.id);
      if (report) showDetailModal(report, true);
    };
  });
}

function renderAdminCard(report) {
  return `
    <div class="admin-card" data-id="${report.id}">
      ${report.imageDataUrl
        ? `<img class="admin-card__thumb" src="${report.imageDataUrl}" alt="" loading="lazy" />`
        : `<div class="admin-card__thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><span class="material-icons-round">image</span></div>`
      }
      <div class="admin-card__info">
        <div class="admin-card__desc">${escapeHtml(report.description)}</div>
        <div class="admin-card__time">
          <span class="material-icons-round">schedule</span>
          ${formatDate(report.timestamp)}
        </div>
      </div>
      <span class="status-badge status-badge--${statusClass(report.status)}">
        <span class="material-icons-round">${statusIcon(report.status)}</span>
        ${report.status}
      </span>
    </div>
  `;
}

// ─── DETAIL MODAL ───
function showDetailModal(report, isAdmin) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>

      ${report.imageDataUrl
        ? `<img class="modal-image" src="${report.imageDataUrl}" alt="İhbar fotoğrafı" />`
        : ''
      }

      <div class="modal-content">
        <!-- Status + Date -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <span class="status-badge status-badge--${statusClass(report.status)}">
            <span class="material-icons-round">${statusIcon(report.status)}</span>
            ${report.status}
          </span>
          <span style="font-size:13px;color:var(--text-muted)">${formatDate(report.timestamp)}</span>
        </div>

        <!-- Category -->
        ${report.category
          ? `<div style="margin-bottom:12px">
              <span class="category-badge" style="font-size:13px;padding:5px 12px">
                <span class="material-icons-round">${getCategoryIcon(report.category)}</span>
                ${getCategoryLabel(report.category)}
              </span>
            </div>`
          : ''
        }

        <!-- Description -->
        <div class="modal-section-title" style="margin-top:0">Açıklama</div>
        <div class="modal-description">${escapeHtml(report.description)}</div>

        <!-- Location -->
        ${report.address || report.latitude
          ? `
            <div class="modal-section-title">Konum</div>
            <div class="modal-location">
              <span class="material-icons-round">location_on</span>
              <div>
                <div class="modal-location__address">${escapeHtml(report.address || '')}</div>
                <div class="modal-location__coords">${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}</div>
              </div>
            </div>
          `
          : ''
        }

        ${isAdmin
          ? `
            <!-- Status Change -->
            <div class="modal-section-title">Durumu Güncelle</div>
            <div class="status-buttons">
              ${ALL_STATUSES.map((s) => `
                <button
                  class="status-btn status-btn--${statusClass(s)} ${report.status === s ? 'status-btn--active' : ''}"
                  data-status="${s}"
                  ${report.status === s ? 'disabled' : ''}
                >${s}</button>
              `).join('')}
            </div>

            <!-- Delete -->
            <button class="delete-btn" id="btn-delete-report">
              <span class="material-icons-round">delete_outline</span>
              İhbarı Sil
            </button>
          `
          : ''
        }
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  // Admin: status change buttons
  if (isAdmin) {
    overlay.querySelectorAll('.status-btn').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const newStatus = btn.dataset.status;
        updateReportStatus(report.id, newStatus);
        overlay.remove();
        renderAdmin();
        showToast(`Durum "${newStatus}" olarak güncellendi.`, 'success');
      };
    });

    // Delete button
    overlay.querySelector('#btn-delete-report').onclick = async (e) => {
      e.stopPropagation();
      const confirmed = await showConfirm(
        'İhbarı Sil',
        'Bu ihbarı silmek istediğinize emin misiniz?'
      );
      if (confirmed) {
        deleteReport(report.id);
        overlay.remove();
        renderAdmin();
        showToast('İhbar silindi.', 'success');
      }
    };
  }
}

// ─── Helpers ───
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getCategoryLabel(categoryId) {
  const cat = HAZARD_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

function getCategoryIcon(categoryId) {
  const cat = HAZARD_CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.icon : 'report_problem';
}

// ─── Initialize ───

// Re-render when Firestore data changes (real-time sync)
subscribe(() => {
  render();
});

// Track auth state
onAuthChange((user) => {
  currentAuthUser = user;
  render();
});

render();
