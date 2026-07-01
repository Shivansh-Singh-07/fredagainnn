import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import { firebaseConfig, EVENT_CONFIG as localEventConfig, ADMIN_EMAILS as localAdminEmails } from "../firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});
export const analyticsReady = isSupported()
  .then((supported) => supported ? getAnalytics(app) : null)
  .catch(() => null);

export const ADMIN_EMAILS = (localAdminEmails || []).map((email) => normalizeEmail(email));

export const EVENT_CONFIG = {
  MAX_GUESTS: 120,
  MAX_PARTY_SIZE: 4,
  EVENT_DATE: "2026-08-15T20:30:00+05:30",
  EVENT_LOCATION: "Revealed when approved",
  ARRIVAL_TIME: "Saturday, 8:30 PM",
  DRESS_CODE: "Black, silver, something you can move in",
  ...localEventConfig
};

export {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
};

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

export async function statusLookupId(email) {
  const normalized = normalizeEmail(email);
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(normalized);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return btoa(normalized).replace(/[+/=]/g, "");
}

export function firstName(name) {
  return String(name || "Guest").trim().split(/\s+/)[0] || "Guest";
}

export function initials(name) {
  return String(name || "Guest")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "G";
}

export function relativeTime(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : new Date();
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
    ["m", 60]
  ];
  for (const [label, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return `${seconds}s ago`;
}
