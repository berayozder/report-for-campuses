/**
 * Report data store — powered by Firebase Firestore + Storage.
 * Falls back to localStorage if Firebase config is not set.
 */

import { db, storage } from './firebase.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  getDocs,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

/** Status constants */
export const ReportStatus = {
  OPEN: 'Açık',
  UNDER_REVIEW: 'İnceleniyor',
  RESOLVED: 'Çözüldü',
};

export const ALL_STATUSES = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW, ReportStatus.RESOLVED];

/** Campus hazard categories — includes accessibility */
export const HAZARD_CATEGORIES = [
  { id: 'elektrik', label: 'Bozuk Priz / Elektrik', icon: 'electrical_services' },
  { id: 'cam', label: 'Kırık Cam', icon: 'broken_image' },
  { id: 'zemin', label: 'Kaygan Zemin', icon: 'do_not_step' },
  { id: 'aydinlatma', label: 'Aydınlatma Sorunu', icon: 'lightbulb' },
  { id: 'yapi', label: 'Yapısal Hasar', icon: 'domain_disabled' },
  { id: 'yangin', label: 'Yangın Riski', icon: 'local_fire_department' },
  { id: 'su', label: 'Su Sızıntısı', icon: 'water_damage' },
  { id: 'erisilebilirlik', label: 'Erişilebilirlik Engeli', icon: 'accessible' },
  { id: 'diger', label: 'Diğer', icon: 'report_problem' },
];

/** User roles */
export const UserRoles = {
  USER: 'user',
  REPAIRMAN: 'repairman',
  ADMIN: 'admin',
};

// ─── Firebase or LocalStorage detection ───
const LOCAL_STORAGE_KEY = 'yga_hazard_reports';

function isFirebaseConfigured() {
  try {
    return db && db.app && db.app.options.apiKey && !db.app.options.apiKey.startsWith('YOUR_');
  } catch {
    return false;
  }
}

export const useFirebase = isFirebaseConfigured();

// ─── In-memory cache of reports (synced by Firestore listener or localStorage) ───
let _reports = [];
const listeners = new Set();

/**
 * Subscribe to report changes.
 */
export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(_reports));
}

/** Get all reports, newest first. */
export function getReports() {
  return [..._reports].sort((a, b) => {
    const tA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
    const tB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
    return tB - tA;
  });
}

/** Get reports filtered by status. */
export function getReportsByStatus(status) {
  return getReports().filter((r) => r.status === status);
}

/** Get a single report by ID. */
export function getReportById(id) {
  return _reports.find((r) => r.id === id) || null;
}

/** Get count of reports by each status. */
export function getStatusCounts() {
  return {
    [ReportStatus.OPEN]: _reports.filter((r) => r.status === ReportStatus.OPEN).length,
    [ReportStatus.UNDER_REVIEW]: _reports.filter((r) => r.status === ReportStatus.UNDER_REVIEW).length,
    [ReportStatus.RESOLVED]: _reports.filter((r) => r.status === ReportStatus.RESOLVED).length,
  };
}

/** Get reports assigned to a specific user. */
export function getAssignedReports(userId) {
  return getReports().filter((r) => r.assignedTo === userId);
}

/**
 * Get a unique visitor ID for anonymous upvoting.
 */
export function getVisitorId() {
  let id = localStorage.getItem('yga_visitor_id');
  if (!id) {
    id = 'v_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('yga_visitor_id', id);
  }
  return id;
}

/**
 * Check if a visitor has already upvoted a report.
 */
export function hasUpvoted(reportId) {
  const report = getReportById(reportId);
  if (!report) return false;
  const visitorId = getVisitorId();
  return (report.upvoterIds || []).includes(visitorId);
}

// ─── Haversine Distance (Smart Duplicate Detection) ───

/**
 * Calculate distance between two GPS points in meters.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get reports within a radius of given coordinates.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMeters - default 500m
 * @returns {Array} reports with distance, sorted by proximity
 */
export function getNearbyReports(lat, lng, radiusMeters = 500) {
  if (!lat || !lng) return [];
  return _reports
    .filter((r) => r.latitude && r.longitude && r.status !== ReportStatus.RESOLVED)
    .map((r) => ({
      ...r,
      distance: Math.round(haversineDistance(lat, lng, r.latitude, r.longitude)),
    }))
    .filter((r) => r.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);
}

// ════════════════════════════════════════════════
// FIREBASE MODE
// ════════════════════════════════════════════════

if (useFirebase) {
  console.log('🔥 Firebase mode active — using Firestore + Storage');

  const reportsRef = collection(db, 'reports');
  const q = query(reportsRef, orderBy('createdAt', 'desc'));

  onSnapshot(q, (snapshot) => {
    _reports = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        imageUrl: data.imageUrl || null,
        imageDataUrl: data.imageUrl || null,
        description: data.description || '',
        category: data.category || null,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        address: data.address || null,
        timestamp: data.createdAt?.toDate?.() || new Date(),
        status: data.status || ReportStatus.OPEN,
        userId: data.userId || null,
        userName: data.userName || null,
        upvotes: data.upvotes || 0,
        upvoterIds: data.upvoterIds || [],
        assignedTo: data.assignedTo || null,
        assignedToName: data.assignedToName || null,
      };
    });
    notifyListeners();
  }, (error) => {
    console.error('Firestore listener error:', error);
  });
}

async function uploadImageToStorage(file) {
  const filename = `reports/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

function dataUrlToFile(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], `photo_${Date.now()}.jpg`, { type: mime });
}

/**
 * Create a new report.
 */
export async function createReport({ imageDataUrl, description, latitude, longitude, address, category, userId, userName }) {
  if (useFirebase) {
    let imageUrl = null;
    if (imageDataUrl) {
      const file = dataUrlToFile(imageDataUrl);
      imageUrl = await uploadImageToStorage(file);
    }
    await addDoc(collection(db, 'reports'), {
      imageUrl,
      description,
      category: category || null,
      latitude,
      longitude,
      address: address || null,
      status: ReportStatus.OPEN,
      userId: userId || null,
      userName: userName || null,
      upvotes: 0,
      upvoterIds: [],
      assignedTo: null,
      assignedToName: null,
      createdAt: serverTimestamp(),
    });
  } else {
    await new Promise((r) => setTimeout(r, 500));
    const report = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      imageDataUrl,
      description,
      category: category || null,
      latitude,
      longitude,
      address: address || null,
      timestamp: new Date().toISOString(),
      status: ReportStatus.OPEN,
      userId: userId || null,
      userName: userName || null,
      upvotes: 0,
      upvoterIds: [],
      assignedTo: null,
      assignedToName: null,
    };
    _reports.push(report);
    saveToLocalStorage();
    notifyListeners();
    return report;
  }
}

/**
 * Upvote a report.
 */
export async function upvoteReport(id) {
  const visitorId = getVisitorId();
  if (useFirebase) {
    const docRef = doc(db, 'reports', id);
    await updateDoc(docRef, {
      upvotes: increment(1),
      upvoterIds: arrayUnion(visitorId),
    });
  } else {
    const report = _reports.find((r) => r.id === id);
    if (report) {
      if (!report.upvoterIds) report.upvoterIds = [];
      if (report.upvoterIds.includes(visitorId)) return;
      report.upvotes = (report.upvotes || 0) + 1;
      report.upvoterIds.push(visitorId);
      saveToLocalStorage();
      notifyListeners();
    }
  }
}

/**
 * Remove upvote.
 */
export async function removeUpvote(id) {
  const visitorId = getVisitorId();
  if (useFirebase) {
    const docRef = doc(db, 'reports', id);
    await updateDoc(docRef, {
      upvotes: increment(-1),
      upvoterIds: arrayRemove(visitorId),
    });
  } else {
    const report = _reports.find((r) => r.id === id);
    if (report && report.upvoterIds) {
      const idx = report.upvoterIds.indexOf(visitorId);
      if (idx > -1) {
        report.upvoterIds.splice(idx, 1);
        report.upvotes = Math.max(0, (report.upvotes || 0) - 1);
        saveToLocalStorage();
        notifyListeners();
      }
    }
  }
}

/**
 * Update the status of a report.
 */
export async function updateReportStatus(id, newStatus) {
  if (useFirebase) {
    const docRef = doc(db, 'reports', id);
    await updateDoc(docRef, { status: newStatus });
  } else {
    await new Promise((r) => setTimeout(r, 300));
    const report = _reports.find((r) => r.id === id);
    if (report) {
      report.status = newStatus;
      saveToLocalStorage();
      notifyListeners();
    }
  }
}

/**
 * Assign a report to a repairman.
 */
export async function assignReport(reportId, repairmanId, repairmanName) {
  if (useFirebase) {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      assignedTo: repairmanId,
      assignedToName: repairmanName || null,
    });
  } else {
    const report = _reports.find((r) => r.id === reportId);
    if (report) {
      report.assignedTo = repairmanId;
      report.assignedToName = repairmanName || null;
      saveToLocalStorage();
      notifyListeners();
    }
  }
}

/**
 * Delete a report.
 */
export async function deleteReport(id) {
  if (useFirebase) {
    const docRef = doc(db, 'reports', id);
    await deleteDoc(docRef);
  } else {
    await new Promise((r) => setTimeout(r, 300));
    _reports = _reports.filter((r) => r.id !== id);
    saveToLocalStorage();
    notifyListeners();
  }
}

// ════════════════════════════════════════════════
// USER ROLES (Firestore)
// ════════════════════════════════════════════════

const _usersCache = new Map();

/**
 * Get user role from Firestore.
 */
export async function getUserRole(uid) {
  if (!uid) return UserRoles.USER;
  if (_usersCache.has(uid)) return _usersCache.get(uid);

  if (useFirebase) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const role = userDoc.exists() ? (userDoc.data().role || UserRoles.USER) : UserRoles.USER;
      _usersCache.set(uid, role);
      return role;
    } catch {
      return UserRoles.USER;
    }
  }

  // localStorage fallback
  const roles = JSON.parse(localStorage.getItem('yga_user_roles') || '{}');
  return roles[uid] || UserRoles.USER;
}

/**
 * Set user role (admin only).
 */
export async function setUserRole(uid, role, displayName) {
  if (useFirebase) {
    await setDoc(doc(db, 'users', uid), {
      role,
      displayName: displayName || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    _usersCache.set(uid, role);
  } else {
    const roles = JSON.parse(localStorage.getItem('yga_user_roles') || '{}');
    roles[uid] = role;
    localStorage.setItem('yga_user_roles', JSON.stringify(roles));
    _usersCache.set(uid, role);
  }
}

/**
 * Get all users with roles (for admin panel).
 */
export async function getAllUsers() {
  if (useFirebase) {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get all repairmen (for assignment dropdown).
 */
export async function getRepairmen() {
  const users = await getAllUsers();
  return users.filter((u) => u.role === UserRoles.REPAIRMAN || u.role === UserRoles.ADMIN);
}

// ════════════════════════════════════════════════
// IN-APP NOTIFICATIONS
// ════════════════════════════════════════════════

const NOTIF_KEY = 'yga_notifications';

export function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addNotification(message, type = 'info') {
  const notifs = getNotifications();
  notifs.unshift({
    id: Date.now().toString(36),
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  });
  // Keep max 20
  if (notifs.length > 20) notifs.length = 20;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function markAllNotificationsRead() {
  const notifs = getNotifications();
  notifs.forEach((n) => { n.read = true; });
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function getUnreadCount() {
  return getNotifications().filter((n) => !n.read).length;
}

// ════════════════════════════════════════════════
// LOCALSTORAGE FALLBACK
// ════════════════════════════════════════════════

if (!useFirebase) {
  console.log('💾 localStorage mode — Firebase not configured');
  loadFromLocalStorage();
}

function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    _reports = data ? JSON.parse(data) : [];
  } catch {
    _reports = [];
  }
}

function saveToLocalStorage() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(_reports));
}
