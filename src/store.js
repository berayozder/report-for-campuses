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

/** Campus hazard categories */
export const HAZARD_CATEGORIES = [
  { id: 'elektrik', label: 'Bozuk Priz / Elektrik', icon: 'electrical_services' },
  { id: 'cam', label: 'Kırık Cam', icon: 'broken_image' },
  { id: 'zemin', label: 'Kaygan Zemin', icon: 'do_not_step' },
  { id: 'aydinlatma', label: 'Aydınlatma Sorunu', icon: 'lightbulb' },
  { id: 'yapi', label: 'Yapısal Hasar', icon: 'domain_disabled' },
  { id: 'yangin', label: 'Yangın Riski', icon: 'local_fire_department' },
  { id: 'su', label: 'Su Sızıntısı', icon: 'water_damage' },
  { id: 'diger', label: 'Diğer', icon: 'report_problem' },
];

// ─── Firebase or LocalStorage detection ───
const LOCAL_STORAGE_KEY = 'yga_hazard_reports';

function isFirebaseConfigured() {
  try {
    // Check if the config has real values (not placeholder)
    return db && db.app && db.app.options.apiKey && !db.app.options.apiKey.startsWith('YOUR_');
  } catch {
    return false;
  }
}

const useFirebase = isFirebaseConfigured();

// ─── In-memory cache of reports (synced by Firestore listener or localStorage) ───
let _reports = [];
const listeners = new Set();

/**
 * Subscribe to report changes.
 * @param {Function} callback
 * @returns {Function} unsubscribe
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

// ════════════════════════════════════════════════
// FIREBASE MODE
// ════════════════════════════════════════════════

if (useFirebase) {
  console.log('🔥 Firebase mode active — using Firestore + Storage');

  // Real-time listener for all reports
  const reportsRef = collection(db, 'reports');
  const q = query(reportsRef, orderBy('createdAt', 'desc'));

  onSnapshot(q, (snapshot) => {
    _reports = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        imageUrl: data.imageUrl || null,
        imageDataUrl: data.imageUrl || null, // alias for compatibility
        description: data.description || '',
        category: data.category || null,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        address: data.address || null,
        timestamp: data.createdAt?.toDate?.() || new Date(),
        status: data.status || ReportStatus.OPEN,
        userId: data.userId || null,
        userName: data.userName || null,
      };
    });
    notifyListeners();
  }, (error) => {
    console.error('Firestore listener error:', error);
  });
}

/**
 * Upload an image file to Firebase Storage.
 * @param {File} file
 * @returns {Promise<string>} download URL
 */
async function uploadImageToStorage(file) {
  const filename = `reports/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Convert a data URL (base64) to a File/Blob for upload.
 * @param {string} dataUrl
 * @returns {File}
 */
function dataUrlToFile(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], `photo_${Date.now()}.jpg`, { type: mime });
}

/**
 * Create a new report.
 * Works with both Firebase and localStorage mode.
 */
export async function createReport({ imageDataUrl, description, latitude, longitude, address, category, userId, userName }) {
  if (useFirebase) {
    // Upload image to Storage
    let imageUrl = null;
    if (imageDataUrl) {
      const file = dataUrlToFile(imageDataUrl);
      imageUrl = await uploadImageToStorage(file);
    }

    // Save to Firestore
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
      createdAt: serverTimestamp(),
    });
    // No need to manually update _reports — onSnapshot handles it
  } else {
    // localStorage fallback
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
    };
    _reports.push(report);
    saveToLocalStorage();
    notifyListeners();
    return report;
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
