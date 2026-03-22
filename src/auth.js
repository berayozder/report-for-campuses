/**
 * Firebase Authentication service.
 * Provides Google sign-in, sign-out, and auth state tracking.
 */

import { auth, googleProvider } from './firebase.js';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

/** Current user state */
let currentUser = null;
const authListeners = new Set();

/**
 * Subscribe to auth state changes.
 * @param {Function} callback - receives user object or null
 * @returns {Function} unsubscribe
 */
export function onAuthChange(callback) {
  authListeners.add(callback);
  // Immediately call with current state
  callback(currentUser);
  return () => authListeners.delete(callback);
}

function notifyAuthListeners() {
  authListeners.forEach((fn) => fn(currentUser));
}

/**
 * Sign in with Google popup.
 * @returns {Promise<Object>} user object
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Giriş iptal edildi.');
    }
    throw new Error('Giriş yapılamadı: ' + error.message);
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  await firebaseSignOut(auth);
}

/**
 * Get the current user.
 * @returns {Object|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is logged in.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return currentUser !== null;
}

// Listen for auth state changes from Firebase
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  notifyAuthListeners();
});
