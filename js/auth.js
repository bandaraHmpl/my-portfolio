// js/auth.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { auth } from './firebase-config.js';

/**
 * Log in admin with email & password
 */
export async function loginAdmin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Register new admin account (Initial setup)
 */
export async function registerAdmin(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Send password reset email
 */
export async function resetAdminPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Log out current admin
 */
export async function logoutAdmin() {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Monitor authentication state
 * @param {function(import('firebase/auth').User|null):void} callback 
 */
export function onAuthUpdate(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Friendly error messages for Firebase Auth codes
 */
function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    default:
      return 'Authentication failed. Please check your network and credentials.';
  }
}
