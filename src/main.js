/**
 * Main application — Tehlike İhbar (Hazard Reporting)
 * Views: Home, Create Report, Admin Panel, Hall of Fame, Leaderboard, My Assignments
 * Features: i18n (TR/EN), PWA, role-based access, smart duplicate detection, notifications
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
  upvoteReport,
  removeUpvote,
  hasUpvoted,
  getNearbyReports,
  getUserRole,
  setUserRole,
  getAllUsers,
  getRepairmen,
  assignReport,
  getAssignedReports,
  UserRoles,
  getNotifications,
  addNotification,
  markAllNotificationsRead,
  getUnreadCount,
} from './store.js';

import { getCurrentPosition, getAddressFromCoords } from './location.js';
import { formatDate, statusClass, statusIcon, readFileAsDataUrl, showToast, showConfirm } from './utils.js';
import { signInWithGoogle, signOut, getCurrentUser, onAuthChange } from './auth.js';
import { calculateUserPoints, getUserBadges, getLeaderboard, BADGES, POINT_RULES } from './gamification.js';
import { t, tCat, tStatus, getLanguage, toggleLanguage } from './i18n.js';

const app = document.getElementById('app');

// Current view state
let currentView = 'home';
let adminFilter = 'Tümü';
let currentAuthUser = null;
let currentUserRole = UserRoles.USER;
let showNotifDropdown = false;

// ─── Render Router ───
function render() {
  switch (currentView) {
    case 'home': renderHome(); break;
    case 'create': renderCreate(); break;
    case 'admin': renderAdmin(); break;
    case 'fame': renderFame(); break;
    case 'leaderboard': renderLeaderboard(); break;
    case 'assignments': renderAssignments(); break;
  }
}

// ─── Navigation Bar ───
function renderNavBar() {
  const showAssignments = currentUserRole === UserRoles.REPAIRMAN || currentUserRole === UserRoles.ADMIN;
  return `
    <nav class="nav-bar">
      <button class="nav-bar__item ${currentView === 'home' ? 'nav-bar__item--active' : ''}" data-nav="home">
        <span class="material-icons-round">home</span>
        ${t('navReports')}
      </button>
      <button class="nav-bar__item ${currentView === 'fame' ? 'nav-bar__item--active' : ''}" data-nav="fame">
        <span class="material-icons-round">emoji_events</span>
        ${t('navFame')}
      </button>
      <button class="nav-bar__item ${currentView === 'leaderboard' ? 'nav-bar__item--active' : ''}" data-nav="leaderboard">
        <span class="material-icons-round">leaderboard</span>
        ${t('navLeaderboard')}
      </button>
      ${showAssignments ? `
        <button class="nav-bar__item ${currentView === 'assignments' ? 'nav-bar__item--active' : ''}" data-nav="assignments">
          <span class="material-icons-round">assignment_ind</span>
          ${t('myAssignments')}
        </button>
      ` : ''}
    </nav>
  `;
}

function bindNavBar() {
  document.querySelectorAll('.nav-bar__item').forEach((item) => {
    item.onclick = () => { currentView = item.dataset.nav; render(); };
  });
}

// ─── Header Actions (shared) ───
function renderHeaderActions() {
  const unread = getUnreadCount();
  return `
    <div class="app-header__actions">
      <button class="icon-btn lang-toggle" id="btn-lang" title="${getLanguage() === 'tr' ? 'Switch to English' : 'Türkçeye geç'}">
        ${getLanguage() === 'tr' ? 'EN' : 'TR'}
      </button>
      ${currentAuthUser ? `
        <button class="icon-btn notif-btn" id="btn-notif" title="${t('notifications')}">
          <span class="material-icons-round">notifications</span>
          ${unread > 0 ? `<span class="notif-badge">${unread}</span>` : ''}
        </button>
        ${currentUserRole === UserRoles.ADMIN ? `
          <button class="icon-btn" id="btn-admin" title="${t('adminPanel')}">
            <span class="material-icons-round">admin_panel_settings</span>
          </button>
        ` : ''}
        <button class="icon-btn" id="btn-logout" title="${t('logout')} (${escapeHtml(currentAuthUser.displayName)})">
          ${currentAuthUser.photoURL
            ? `<img src="${currentAuthUser.photoURL}" alt="" style="width:28px;height:28px;border-radius:50%" />`
            : `<span class="material-icons-round">account_circle</span>`
          }
        </button>
      ` : `
        <button class="icon-btn" id="btn-login" title="${t('login')}">
          <span class="material-icons-round">login</span>
        </button>
      `}
    </div>
  `;
}

function bindHeaderActions() {
  const langBtn = document.getElementById('btn-lang');
  if (langBtn) langBtn.onclick = () => { toggleLanguage(); render(); };

  const loginBtn = document.getElementById('btn-login');
  if (loginBtn) loginBtn.onclick = async () => {
    try { await signInWithGoogle(); showToast(t('loginSuccess'), 'success'); } catch (err) { showToast(err.message, 'error'); }
  };

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.onclick = async () => { await signOut(); showToast(t('logoutSuccess'), 'info'); };

  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) adminBtn.onclick = () => { currentView = 'admin'; render(); };

  const notifBtn = document.getElementById('btn-notif');
  if (notifBtn) notifBtn.onclick = (e) => {
    e.stopPropagation();
    showNotifDropdown = !showNotifDropdown;
    renderNotifDropdown();
  };
}

function renderNotifDropdown() {
  let existing = document.getElementById('notif-dropdown');
  if (existing) existing.remove();
  if (!showNotifDropdown) return;

  const notifs = getNotifications();
  const dropdown = document.createElement('div');
  dropdown.id = 'notif-dropdown';
  dropdown.className = 'notif-dropdown';
  dropdown.innerHTML = `
    <div class="notif-dropdown__header">
      <span>${t('notifications')}</span>
      ${notifs.length > 0 ? `<button class="notif-dropdown__mark" id="btn-mark-read">${t('markAllRead')}</button>` : ''}
    </div>
    <div class="notif-dropdown__list">
      ${notifs.length === 0
        ? `<div class="notif-dropdown__empty">${t('noNotifications')}</div>`
        : notifs.slice(0, 10).map((n) => `
          <div class="notif-dropdown__item ${n.read ? '' : 'notif-dropdown__item--unread'}">
            <span class="material-icons-round" style="font-size:16px;color:var(--primary)">info</span>
            <div>
              <div class="notif-dropdown__msg">${escapeHtml(n.message)}</div>
              <div class="notif-dropdown__time">${formatDate(n.timestamp)}</div>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
  document.body.appendChild(dropdown);

  const markBtn = dropdown.querySelector('#btn-mark-read');
  if (markBtn) markBtn.onclick = () => { markAllNotificationsRead(); showNotifDropdown = false; renderNotifDropdown(); render(); };

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      showNotifDropdown = false;
      renderNotifDropdown();
      document.removeEventListener('click', handler);
    });
  }, 50);
}

// ─── HOME VIEW ───
function renderHome() {
  const reports = getReports();
  const openCount = reports.filter((r) => r.status === ReportStatus.OPEN).length;

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header__title">
        <div class="app-header__icon"><span class="material-icons-round">warning_amber</span></div>
        ${t('appName')}
        ${currentUserRole !== UserRoles.USER ? `<span class="role-badge role-badge--${currentUserRole}">${t('role' + capitalize(currentUserRole))}</span>` : ''}
      </div>
      ${renderHeaderActions()}
    </header>
    ${renderNavBar()}
    <div class="scroll-content" id="home-content">
      ${reports.length === 0
        ? `<div class="empty-state">
            <div class="empty-state__icon"><span class="material-icons-round">shield</span></div>
            <div class="empty-state__title">${t('noReports')}</div>
            <div class="empty-state__text">${t('noReportsHint').replace('\n', '<br/>')}</div>
          </div>`
        : `<div class="section-header">
            <span class="section-header__title">${t('recentReports')}</span>
            ${openCount > 0 ? `<span class="section-header__badge">${openCount} ${t('openCount')}</span>` : ''}
          </div>
          ${reports.map((report) => renderReportCard(report)).join('')}`
      }
    </div>
    ${currentAuthUser ? `
      <button class="fab" id="btn-create">
        <span class="material-icons-round">add_a_photo</span>
        ${t('reportBtn')}
      </button>
    ` : `
      <button class="fab" id="btn-create-login" style="background:var(--text-primary);color:var(--bg)">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px;height:18px;background:white;border-radius:50%;padding:2px" alt="G" />
        İhbar Etmek İçin Giriş Yap
      </button>
    `}
    <footer class="app-footer">
      <span>${t('appVersion')}</span>
      <span class="app-footer__dot">·</span>
      <span>${t('builtFor')}</span>
    </footer>
  `;
  bindNavBar();
  bindHeaderActions();
  
  if (currentAuthUser) {
    document.getElementById('btn-create').onclick = () => { currentView = 'create'; render(); };
  } else {
    document.getElementById('btn-create-login').onclick = async () => {
      try { 
        await signInWithGoogle(); 
        showToast(t('loginSuccess'), 'success'); 
        currentView = 'create';
        render();
      } catch (err) { showToast(err.message, 'error'); }
    };
  }

  document.querySelectorAll('.report-card').forEach((card) => {
    card.onclick = (e) => {
      if (e.target.closest('.upvote-btn')) return;
      const report = getReportById(card.dataset.id);
      if (report) showDetailModal(report, currentUserRole === UserRoles.ADMIN);
    };
  });
  bindUpvoteButtons();
}

function renderReportCard(report) {
  const voted = hasUpvoted(report.id);
  const upvoteCount = report.upvotes || 0;
  return `
    <div class="report-card" data-id="${report.id}">
      ${report.imageDataUrl
        ? `<img class="report-card__image" src="${report.imageDataUrl}" alt="" loading="lazy" />`
        : `<div class="report-card__image-placeholder"><span class="material-icons-round" style="font-size:48px">image</span></div>`}
      <div class="report-card__body">
        <div class="report-card__meta">
          <span class="status-badge status-badge--${statusClass(report.status)}">
            <span class="material-icons-round">${statusIcon(report.status)}</span>
            ${tStatus(report.status)}
          </span>
          <span class="report-card__date">${formatDate(report.timestamp)}</span>
        </div>
        <div class="report-card__desc">${escapeHtml(report.description)}</div>
        ${report.category ? `<div class="category-badge"><span class="material-icons-round">${getCategoryIcon(report.category)}</span>${tCat(report.category)}</div>` : ''}
        <div class="report-card__actions">
          ${report.address ? `<div class="report-card__location"><span class="material-icons-round">location_on</span>${escapeHtml(report.address)}</div>` : '<div></div>'}
          <button class="upvote-btn ${voted ? 'upvote-btn--active' : ''}" data-report-id="${report.id}">
            <span class="material-icons-round">${voted ? 'thumb_up' : 'thumb_up_off_alt'}</span>
            ${upvoteCount}
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindUpvoteButtons() {
  document.querySelectorAll('.upvote-btn').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const reportId = btn.dataset.reportId;
      const voted = hasUpvoted(reportId);
      btn.classList.add('upvote-btn--animate');
      setTimeout(() => btn.classList.remove('upvote-btn--animate'), 300);
      try {
        if (voted) { await removeUpvote(reportId); }
        else { await upvoteReport(reportId); showToast(t('voted'), 'success'); }
      } catch { showToast(t('voteFailed'), 'error'); }
    };
  });
}

// ─── CREATE REPORT VIEW ───
function renderCreate() {
  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back"><span class="material-icons-round">arrow_back</span></button>
      <div class="app-header__title">${t('newReport')}</div>
      <div style="width:40px"></div>
    </header>
    <div class="form-screen">
      <div class="form-section">
        <div class="form-section__label"><span class="material-icons-round">category</span>${t('hazardType')}</div>
        <div class="category-chips" id="category-chips">
          ${HAZARD_CATEGORIES.map((cat) => `
            <button class="category-chip" data-category="${cat.id}">
              <span class="material-icons-round">${cat.icon}</span>
              ${tCat(cat.id)}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="form-section">
        <div class="form-section__label"><span class="material-icons-round">camera_alt</span>${t('photo')}</div>
        <div class="image-picker" id="image-picker">
          <div class="image-picker__icon"><span class="material-icons-round">add_a_photo</span></div>
          <div class="image-picker__text">${t('photoHint')}</div>
        </div>
        <input type="file" id="file-input" accept="image/*" capture="environment" style="display:none" />
      </div>
      <div class="form-section">
        <div class="form-section__label"><span class="material-icons-round">edit</span>${t('description')}</div>
        <textarea class="form-textarea" id="description-input" placeholder="${t('descPlaceholder')}" maxlength="500"></textarea>
        <div class="form-char-count"><span id="char-count">0</span>/500</div>
      </div>
      <div class="form-section">
        <div class="form-section__label"><span class="material-icons-round">location_on</span>${t('location')}</div>
        <div class="location-card" id="location-card">
          <div class="location-card__icon location-card__icon--loading"><span class="material-icons-round">my_location</span></div>
          <div class="location-card__info"><div class="location-card__address">${t('fetchingLocation')}</div></div>
          <div class="spinner spinner--dark"></div>
        </div>
      </div>
      <!-- Nearby reports panel -->
      <div id="nearby-panel"></div>
      <button class="submit-btn" id="btn-submit">
        <span class="material-icons-round">send</span>
        ${t('submitReport')}
      </button>
    </div>
  `;

  let selectedCategory = null;
  let selectedImageDataUrl = null;
  let latitude = null;
  let longitude = null;
  let address = null;
  let isSubmitting = false;

  document.querySelectorAll('.category-chip').forEach((chip) => {
    chip.onclick = () => {
      const catId = chip.dataset.category;
      if (selectedCategory === catId) { selectedCategory = null; chip.classList.remove('category-chip--active'); }
      else { selectedCategory = catId; document.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('category-chip--active')); chip.classList.add('category-chip--active'); }
    };
  });

  document.getElementById('btn-back').onclick = () => { currentView = 'home'; render(); };

  const fileInput = document.getElementById('file-input');
  const imagePicker = document.getElementById('image-picker');
  imagePicker.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      selectedImageDataUrl = await readFileAsDataUrl(file);
      imagePicker.innerHTML = `<img class="image-picker__preview" src="${selectedImageDataUrl}" alt="" /><button class="image-picker__edit-btn" id="btn-change-image"><span class="material-icons-round">edit</span></button>`;
      imagePicker.classList.add('image-picker--has-image');
      document.getElementById('btn-change-image').onclick = (ev) => { ev.stopPropagation(); fileInput.click(); };
    } catch { showToast(t('photoFailed'), 'error'); }
  };

  const descInput = document.getElementById('description-input');
  const charCount = document.getElementById('char-count');
  descInput.oninput = () => { charCount.textContent = descInput.value.length; };

  fetchLocation();

  async function fetchLocation() {
    const locationCard = document.getElementById('location-card');
    try {
      const pos = await getCurrentPosition();
      latitude = pos.latitude;
      longitude = pos.longitude;
      address = await getAddressFromCoords(latitude, longitude);
      locationCard.innerHTML = `
        <div class="location-card__icon location-card__icon--success"><span class="material-icons-round">location_on</span></div>
        <div class="location-card__info">
          <div class="location-card__address">${escapeHtml(address)}</div>
          <div class="location-card__coords">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
        </div>
        <button class="icon-btn" id="btn-refresh-location" title="${t('refreshLocation')}"><span class="material-icons-round">refresh</span></button>
      `;
      document.getElementById('btn-refresh-location').onclick = () => {
        locationCard.innerHTML = `<div class="location-card__icon location-card__icon--loading"><span class="material-icons-round">my_location</span></div><div class="location-card__info"><div class="location-card__address">${t('fetchingLocation')}</div></div><div class="spinner spinner--dark"></div>`;
        fetchLocation();
      };
      // Show nearby reports (Smart Duplicate Detection)
      showNearbyReports(latitude, longitude);
    } catch (err) {
      locationCard.innerHTML = `
        <div class="location-card__icon location-card__icon--error"><span class="material-icons-round">location_off</span></div>
        <div class="location-card__info"><div class="location-card__error">${escapeHtml(err.message)}</div></div>
        <button class="location-card__retry" id="btn-retry-location">${t('retry')}</button>
      `;
      document.getElementById('btn-retry-location').onclick = () => {
        locationCard.innerHTML = `<div class="location-card__icon location-card__icon--loading"><span class="material-icons-round">my_location</span></div><div class="location-card__info"><div class="location-card__address">${t('fetchingLocation')}</div></div><div class="spinner spinner--dark"></div>`;
        fetchLocation();
      };
    }
  }

  function showNearbyReports(lat, lng) {
    const panel = document.getElementById('nearby-panel');
    const nearby = getNearbyReports(lat, lng, 500);
    if (nearby.length === 0) {
      panel.innerHTML = '';
      return;
    }
    panel.innerHTML = `
      <div class="nearby-panel">
        <div class="nearby-panel__header">
          <span class="material-icons-round">explore</span>
          <div>
            <div class="nearby-panel__title">${t('nearbyTitle')}</div>
            <div class="nearby-panel__subtitle">${t('nearbyHint')}</div>
          </div>
        </div>
        <div class="nearby-panel__list">
          ${nearby.slice(0, 3).map((r) => `
            <div class="nearby-item" data-id="${r.id}">
              <div class="nearby-item__info">
                <div class="nearby-item__desc">${escapeHtml(r.description).substring(0, 60)}${r.description.length > 60 ? '...' : ''}</div>
                <div class="nearby-item__meta">
                  <span class="material-icons-round" style="font-size:12px">location_on</span>
                  ${r.distance} ${t('metersAway')}
                  ${(r.upvotes || 0) > 0 ? ` · 👍 ${r.upvotes}` : ''}
                </div>
              </div>
              <button class="upvote-btn upvote-btn--small ${hasUpvoted(r.id) ? 'upvote-btn--active' : ''}" data-report-id="${r.id}">
                <span class="material-icons-round">thumb_up_off_alt</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    // Bind nearby upvote buttons
    panel.querySelectorAll('.upvote-btn').forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        try { await upvoteReport(btn.dataset.reportId); showToast(t('voted'), 'success'); showNearbyReports(lat, lng); } catch {}
      };
    });
    panel.querySelectorAll('.nearby-item').forEach((item) => {
      item.onclick = () => {
        const report = getReportById(item.dataset.id);
        if (report) showDetailModal(report, false);
      };
    });
  }

  document.getElementById('btn-submit').onclick = async () => {
    if (isSubmitting) return;
    if (!selectedCategory) { showToast(t('selectCategory'), 'error'); return; }
    if (!selectedImageDataUrl) { showToast(t('addPhoto'), 'error'); return; }
    if (!descInput.value.trim()) { showToast(t('addDescription'), 'error'); return; }
    if (latitude === null || longitude === null) { showToast(t('locationFailed'), 'error'); return; }

    isSubmitting = true;
    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div>';

    try {
      await createReport({
        imageDataUrl: selectedImageDataUrl,
        description: descInput.value.trim(),
        category: selectedCategory,
        latitude, longitude, address,
        userId: currentAuthUser?.uid || null,
        userName: currentAuthUser?.displayName || null,
      });
      showToast(t('reportSuccess'), 'success');
      currentView = 'home';
      render();
    } catch (err) {
      showToast(t('reportFailed') + err.message, 'error');
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="material-icons-round">send</span> ${t('submitReport')}`;
    }
  };
}

// ─── ADMIN VIEW ───
function renderAdmin() {
  const counts = getStatusCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const reports = adminFilter === 'Tümü' ? getReports() : getReportsByStatus(adminFilter);

  app.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="btn-back-admin"><span class="material-icons-round">arrow_back</span></button>
      <div class="app-header__title">${t('adminPanel')}</div>
      <div style="width:40px;display:flex;align-items:center;justify-content:flex-end">
        <span style="font-size:13px;font-weight:600;color:var(--primary);background:var(--primary-light);padding:3px 10px;border-radius:20px">${total}</span>
      </div>
    </header>
    <div class="stats-row">
      <div class="stat-card stat-card--open"><div class="stat-card__number">${counts[ReportStatus.OPEN]}</div><div class="stat-card__label">${t('statusOpen')}</div></div>
      <div class="stat-card stat-card--review"><div class="stat-card__number">${counts[ReportStatus.UNDER_REVIEW]}</div><div class="stat-card__label">${t('statusReview')}</div></div>
      <div class="stat-card stat-card--resolved"><div class="stat-card__number">${counts[ReportStatus.RESOLVED]}</div><div class="stat-card__label">${t('statusResolved')}</div></div>
    </div>
    <div class="filter-chips">
      <button class="filter-chip ${adminFilter === 'Tümü' ? 'filter-chip--active' : ''}" data-filter="Tümü">${t('filterAll')}</button>
      ${ALL_STATUSES.map((s) => `<button class="filter-chip ${adminFilter === s ? 'filter-chip--active' : ''}" data-filter="${s}">${tStatus(s)}</button>`).join('')}
    </div>
    <div class="scroll-content" id="admin-list">
      <!-- User Management Button -->
      <div style="padding:0 16px 8px">
        <button class="submit-btn" id="btn-manage-users" style="background:var(--text-primary);margin:0;padding:10px 16px;font-size:13px">
          <span class="material-icons-round">group</span> ${t('manageUsers')}
        </button>
      </div>
      ${reports.length === 0
        ? `<div class="empty-state"><div class="empty-state__icon"><span class="material-icons-round">inbox</span></div>
            <div class="empty-state__title">${adminFilter === 'Tümü' ? t('noReports') : `"${tStatus(adminFilter)}" ${t('noFilteredReports')}`}</div></div>`
        : reports.map((r) => renderAdminCard(r)).join('')}
    </div>
  `;

  document.getElementById('btn-back-admin').onclick = () => { currentView = 'home'; adminFilter = 'Tümü'; render(); };
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.onclick = () => { adminFilter = chip.dataset.filter; renderAdmin(); };
  });
  document.querySelectorAll('.admin-card').forEach((card) => {
    card.onclick = () => { const report = getReportById(card.dataset.id); if (report) showDetailModal(report, true); };
  });
  document.getElementById('btn-manage-users').onclick = () => showUserManagement();
}

function renderAdminCard(report) {
  return `
    <div class="admin-card" data-id="${report.id}">
      ${report.imageDataUrl
        ? `<img class="admin-card__thumb" src="${report.imageDataUrl}" alt="" loading="lazy" />`
        : `<div class="admin-card__thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><span class="material-icons-round">image</span></div>`}
      <div class="admin-card__info">
        <div class="admin-card__desc">${escapeHtml(report.description)}</div>
        <div class="admin-card__time">
          <span class="material-icons-round">schedule</span> ${formatDate(report.timestamp)}
          ${(report.upvotes || 0) > 0 ? ` · 👍 ${report.upvotes}` : ''}
          ${report.assignedToName ? ` · 🔧 ${escapeHtml(report.assignedToName)}` : ''}
        </div>
      </div>
      <span class="status-badge status-badge--${statusClass(report.status)}">
        <span class="material-icons-round">${statusIcon(report.status)}</span>
        ${tStatus(report.status)}
      </span>
    </div>
  `;
}

// ─── USER MANAGEMENT MODAL ───
async function showUserManagement() {
  const users = await getAllUsers();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-content">
        <div class="modal-section-title" style="margin-top:0">${t('manageUsers')}</div>
        ${users.length === 0
          ? `<div style="text-align:center;padding:24px;color:var(--text-muted)">
              <span class="material-icons-round" style="font-size:48px">group</span>
              <div style="margin-top:8px">No users registered yet. Users appear after signing in.</div>
            </div>`
          : `<div style="display:flex;flex-direction:column;gap:8px">
              ${users.map((u) => `
                <div class="user-row" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;background:var(--bg)">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.displayName || u.uid)}</div>
                    <span class="role-badge role-badge--${u.role || 'user'}">${t('role' + capitalize(u.role || 'user'))}</span>
                  </div>
                  <select class="role-select" data-uid="${u.uid}" data-name="${escapeHtml(u.displayName || '')}">
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>${t('roleUser')}</option>
                    <option value="repairman" ${u.role === 'repairman' ? 'selected' : ''}>${t('roleRepairman')}</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('roleAdmin')}</option>
                  </select>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.querySelectorAll('.role-select').forEach((sel) => {
    sel.onchange = async () => {
      await setUserRole(sel.dataset.uid, sel.value, sel.dataset.name);
      showToast(t('roleUpdated'), 'success');
      // If changing own role, update it
      if (currentAuthUser && sel.dataset.uid === currentAuthUser.uid) {
        currentUserRole = sel.value;
      }
    };
  });
}

// ─── HALL OF FAME ───
function renderFame() {
  const resolvedReports = getReportsByStatus(ReportStatus.RESOLVED);
  app.innerHTML = `
    <header class="app-header">
      <div class="app-header__title">
        <div class="app-header__icon" style="background:var(--success-bg)"><span class="material-icons-round" style="color:var(--success)">emoji_events</span></div>
        ${t('hallOfFame')}
      </div>
      ${renderHeaderActions()}
    </header>
    ${renderNavBar()}
    <div class="scroll-content">
      ${resolvedReports.length === 0
        ? `<div class="empty-state"><div class="empty-state__icon" style="background:var(--success-bg)"><span class="material-icons-round" style="color:var(--success)">emoji_events</span></div>
            <div class="empty-state__title">${t('noResolved')}</div><div class="empty-state__text">${t('noResolvedHint').replace('\n', '<br/>')}</div></div>`
        : `<div class="section-header"><span class="section-header__title">${t('resolvedHazards')}</span><span style="font-size:12px;color:var(--success);font-weight:600">${resolvedReports.length} ${t('resolved')}</span></div>
          ${resolvedReports.map((report) => `
            <div class="fame-card">
              ${report.imageDataUrl ? `<img class="fame-card__image" src="${report.imageDataUrl}" alt="" loading="lazy" />` : ''}
              <div class="fame-card__body">
                <div class="fame-card__meta">
                  <span class="fame-card__resolved-badge"><span class="material-icons-round">check_circle</span>${t('resolvedBadge')}</span>
                  <span style="font-size:12px;color:var(--text-muted)">${formatDate(report.timestamp)}</span>
                </div>
                <div class="fame-card__desc">${escapeHtml(report.description)}</div>
                <div class="fame-card__stats">
                  ${report.category ? `<span class="fame-card__stat"><span class="material-icons-round">${getCategoryIcon(report.category)}</span>${tCat(report.category)}</span>` : ''}
                  ${(report.upvotes || 0) > 0 ? `<span class="fame-card__stat"><span class="material-icons-round">thumb_up</span>${report.upvotes} ${t('votes')}</span>` : ''}
                  ${report.userName ? `<span class="fame-card__stat"><span class="material-icons-round">person</span>${escapeHtml(report.userName)}</span>` : ''}
                </div>
              </div>
            </div>
          `).join('')}`
      }
    </div>
  `;
  bindNavBar();
  bindHeaderActions();
}

// ─── LEADERBOARD ───
function renderLeaderboard() {
  const reports = getReports();
  const leaderboard = getLeaderboard(reports);
  const myPoints = currentAuthUser ? calculateUserPoints(reports, currentAuthUser.uid) : 0;
  const myBadges = currentAuthUser ? getUserBadges(reports, currentAuthUser.uid) : [];

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header__title">
        <div class="app-header__icon" style="background:linear-gradient(135deg, #FFF8E1, #FFE082)"><span class="material-icons-round" style="color:#F9A825">leaderboard</span></div>
        ${t('leaderboard')}
      </div>
      ${renderHeaderActions()}
    </header>
    ${renderNavBar()}
    <div class="scroll-content">
      ${currentAuthUser
        ? `<div class="points-hero">
            <div class="points-hero__number">${myPoints}</div>
            <div class="points-hero__label">${t('yourPoints')}</div>
            ${myBadges.length > 0 ? `<div class="points-hero__badges">${myBadges.map((b) => `<span class="points-hero__badge"><span class="material-icons-round">${b.icon}</span>${b.label}</span>`).join('')}</div>` : ''}
          </div>`
        : `<div class="points-hero" style="cursor:pointer" id="lb-login-cta"><div class="points-hero__number">?</div><div class="points-hero__label">${t('loginToSee')}</div></div>`
      }
      <div class="point-rules">
        <div class="point-rules__title"><span class="material-icons-round">info</span>${t('pointRules')}</div>
        <div class="point-rules__item"><span>${t('ruleReport')}</span><span class="point-rules__value">+${POINT_RULES.REPORT_CREATED}</span></div>
        <div class="point-rules__item"><span>${t('ruleUpvote')}</span><span class="point-rules__value">+${POINT_RULES.UPVOTE_RECEIVED}</span></div>
        <div class="point-rules__item"><span>${t('ruleResolve')}</span><span class="point-rules__value">+${POINT_RULES.REPORT_RESOLVED}</span></div>
      </div>
      ${leaderboard.length === 0
        ? `<div class="empty-state" style="padding:40px 32px"><div class="empty-state__icon" style="background:linear-gradient(135deg, #FFF8E1, #FFE082)"><span class="material-icons-round" style="color:#F9A825">leaderboard</span></div>
            <div class="empty-state__title">${t('noLeaderboard')}</div><div class="empty-state__text">${t('noLeaderboardHint').replace('\n', '<br/>')}</div></div>`
        : `<div class="section-header"><span class="section-header__title">${t('safetyHeroes')}</span></div>
          ${leaderboard.map((user, idx) => `
            <div class="leaderboard-row">
              <div class="leaderboard-row__rank ${idx < 3 ? `leaderboard-row__rank--${idx + 1}` : 'leaderboard-row__rank--default'}">${idx + 1}</div>
              <div class="leaderboard-row__info">
                <div class="leaderboard-row__name">${escapeHtml(user.userName)}</div>
                ${user.badges.length > 0 ? `<div class="leaderboard-row__badges">${user.badges.map((b) => `<span class="badge-pill badge-pill--earned"><span class="material-icons-round">${b.icon}</span>${b.label}</span>`).join('')}</div>` : ''}
              </div>
              <div><div class="leaderboard-row__points">${user.points}</div><span class="leaderboard-row__points-label">${t('points')}</span></div>
            </div>
          `).join('')}`
      }
      <div class="section-header" style="margin-top:16px"><span class="section-header__title">${t('allBadges')}</span></div>
      <div style="padding:0 16px 24px;display:flex;flex-wrap:wrap;gap:6px">
        ${BADGES.map((badge) => {
          const earned = currentAuthUser && myBadges.find((b) => b.id === badge.id);
          return `<span class="badge-pill ${earned ? 'badge-pill--earned' : 'badge-pill--locked'}" title="${badge.description}"><span class="material-icons-round">${badge.icon}</span>${badge.label}</span>`;
        }).join('')}
      </div>
    </div>
  `;
  bindNavBar();
  bindHeaderActions();
  const loginCta = document.getElementById('lb-login-cta');
  if (loginCta) loginCta.onclick = async () => {
    try { await signInWithGoogle(); showToast(t('loginSuccess'), 'success'); } catch (err) { showToast(err.message, 'error'); }
  };
}

// ─── MY ASSIGNMENTS VIEW (Repairman) ───
function renderAssignments() {
  const reports = currentAuthUser ? getAssignedReports(currentAuthUser.uid) : [];

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header__title">
        <div class="app-header__icon" style="background:#FFF3E0"><span class="material-icons-round" style="color:#E65100">assignment_ind</span></div>
        ${t('myAssignments')}
        <span class="role-badge role-badge--${currentUserRole}">${t('role' + capitalize(currentUserRole))}</span>
      </div>
      ${renderHeaderActions()}
    </header>
    ${renderNavBar()}
    <div class="scroll-content">
      ${reports.length === 0
        ? `<div class="empty-state"><div class="empty-state__icon" style="background:#FFF3E0"><span class="material-icons-round" style="color:#E65100">assignment_ind</span></div>
            <div class="empty-state__title">${t('noAssignments')}</div><div class="empty-state__text">${t('noAssignmentsHint')}</div></div>`
        : `<div class="section-header"><span class="section-header__title">${t('myAssignments')}</span><span class="section-header__badge">${reports.length}</span></div>
          ${reports.map((r) => renderAdminCard(r)).join('')}`
      }
    </div>
  `;
  bindNavBar();
  bindHeaderActions();
  // Card clicks open modal where repairman can update status
  document.querySelectorAll('.admin-card').forEach((card) => {
    card.onclick = () => { const report = getReportById(card.dataset.id); if (report) showDetailModal(report, true); };
  });
}

// ─── DETAIL MODAL ───
function showDetailModal(report, isAdmin) {
  const voted = hasUpvoted(report.id);
  const upvoteCount = report.upvotes || 0;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      ${report.imageDataUrl ? `<img class="modal-image" src="${report.imageDataUrl}" alt="" />` : ''}
      <div class="modal-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <span class="status-badge status-badge--${statusClass(report.status)}"><span class="material-icons-round">${statusIcon(report.status)}</span>${tStatus(report.status)}</span>
          <span style="font-size:13px;color:var(--text-muted)">${formatDate(report.timestamp)}</span>
        </div>
        ${report.category ? `<div style="margin-bottom:12px"><span class="category-badge" style="font-size:13px;padding:5px 12px"><span class="material-icons-round">${getCategoryIcon(report.category)}</span>${tCat(report.category)}</span></div>` : ''}
        <div class="modal-section-title" style="margin-top:0">${t('description')}</div>
        <div class="modal-description">${escapeHtml(report.description)}</div>
        ${report.address || report.latitude ? `
          <div class="modal-section-title">${t('location')}</div>
          <div class="modal-location"><span class="material-icons-round">location_on</span><div>
            <div class="modal-location__address">${escapeHtml(report.address || '')}</div>
            <div class="modal-location__coords">${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}</div>
          </div></div>` : ''}
        <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
          <button class="upvote-btn ${voted ? 'upvote-btn--active' : ''}" id="modal-upvote-btn" data-report-id="${report.id}" style="padding:8px 16px;font-size:14px">
            <span class="material-icons-round">${voted ? 'thumb_up' : 'thumb_up_off_alt'}</span> ${upvoteCount} ${t('votes')}
          </button>
          ${report.userName ? `<span style="font-size:12px;color:var(--text-muted)"><span class="material-icons-round" style="font-size:14px;vertical-align:middle">person</span> ${escapeHtml(report.userName)}</span>` : ''}
        </div>
        ${report.assignedToName ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted)"><span class="material-icons-round" style="font-size:14px;vertical-align:middle">build</span> ${t('assignTo')}: ${escapeHtml(report.assignedToName)}</div>` : ''}
        ${isAdmin ? `
          <div class="modal-section-title">${t('updateStatus')}</div>
          <div class="status-buttons">
            ${ALL_STATUSES.map((s) => `<button class="status-btn status-btn--${statusClass(s)} ${report.status === s ? 'status-btn--active' : ''}" data-status="${s}" ${report.status === s ? 'disabled' : ''}>${tStatus(s)}</button>`).join('')}
          </div>
          ${currentUserRole === UserRoles.ADMIN ? `
            <div class="modal-section-title">${t('assignTo')}</div>
            <div id="assign-area"><button class="submit-btn" id="btn-load-repairmen" style="margin:0;padding:8px 16px;font-size:13px;background:var(--text-secondary)">
              <span class="material-icons-round">build</span> ${t('assignTo')}
            </button></div>
          ` : ''}
          <button class="delete-btn" id="btn-delete-report"><span class="material-icons-round">delete_outline</span>${t('deleteReport')}</button>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  // Upvote
  const modalUpvoteBtn = overlay.querySelector('#modal-upvote-btn');
  if (modalUpvoteBtn) {
    modalUpvoteBtn.onclick = async (e) => {
      e.stopPropagation();
      const isVoted = hasUpvoted(report.id);
      modalUpvoteBtn.classList.add('upvote-btn--animate');
      setTimeout(() => modalUpvoteBtn.classList.remove('upvote-btn--animate'), 300);
      try {
        if (isVoted) await removeUpvote(report.id);
        else { await upvoteReport(report.id); showToast(t('voted'), 'success'); }
        overlay.remove();
        const updated = getReportById(report.id);
        if (updated) showDetailModal(updated, isAdmin);
      } catch { showToast(t('voteFailed'), 'error'); }
    };
  }

  if (isAdmin) {
    overlay.querySelectorAll('.status-btn').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const newStatus = btn.dataset.status;
        updateReportStatus(report.id, newStatus);
        // Add notification for report owner
        if (report.userId) {
          addNotification(`"${report.description.substring(0, 30)}..." ${t('notifStatusChanged')} ${tStatus(newStatus)}`);
        }
        overlay.remove();
        showToast(`${t('statusUpdated')} → ${tStatus(newStatus)}`, 'success');
        render();
      };
    });

    // Assign to repairman
    const loadBtn = overlay.querySelector('#btn-load-repairmen');
    if (loadBtn) {
      loadBtn.onclick = async (e) => {
        e.stopPropagation();
        const assignArea = overlay.querySelector('#assign-area');
        const repairmen = await getRepairmen();
        if (repairmen.length === 0) {
          assignArea.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:8px">No repairmen found. Assign the "Repairman" role first.</div>`;
          return;
        }
        assignArea.innerHTML = `
          <select id="repairman-select" class="role-select" style="width:100%">
            <option value="">${t('unassigned')}</option>
            ${repairmen.map((r) => `<option value="${r.uid}" ${report.assignedTo === r.uid ? 'selected' : ''}>${escapeHtml(r.displayName || r.uid)}</option>`).join('')}
          </select>
        `;
        const sel = overlay.querySelector('#repairman-select');
        sel.onchange = async () => {
          const selectedUser = repairmen.find((r) => r.uid === sel.value);
          await assignReport(report.id, sel.value || null, selectedUser?.displayName || null);
          if (sel.value) {
            addNotification(t('notifAssigned'));
          }
          showToast(t('assignSuccess'), 'success');
        };
      };
    }

    // Delete
    const deleteBtn = overlay.querySelector('#btn-delete-report');
    if (deleteBtn) {
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        const confirmed = await showConfirm(t('deleteConfirmTitle'), t('deleteConfirmMsg'));
        if (confirmed) {
          deleteReport(report.id);
          overlay.remove();
          showToast(t('reportDeleted'), 'success');
          render();
        }
      };
    }
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

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Initialize ───
subscribe(() => { render(); });

onAuthChange(async (user) => {
  currentAuthUser = user;
  if (user) {
    currentUserRole = await getUserRole(user.uid);
    // Ensure user doc exists in Firestore
    try { await setUserRole(user.uid, currentUserRole, user.displayName); } catch {}
  } else {
    currentUserRole = UserRoles.USER;
  }
  render();
});

render();
