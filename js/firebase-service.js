
// ================================================
// FIREBASE-SERVICE.JS — Operaciones Firestore
// CDN ESM 10.7.1. Sin bundler. Compatible Vercel.
// ================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { firebaseConfig, isFirebaseUnconfigured } from './firebase-config.js';

let _app = null;
let _db  = null;

export function initFirebase() {
  if (isFirebaseUnconfigured()) {
    console.warn('[Firebase] Credenciales sin configurar. Firestore desactivado.');
    return false;
  }
  if (!_app) {
    _app = initializeApp(firebaseConfig);
    _db  = getFirestore(_app);
    window._fb = window._fb || {};
    window._fb.db = _db;
  }
  return true;
}

export function getDB() {
  if (!_db) throw new Error('Firebase no inicializado. Llama a initFirebase() primero.');
  return _db;
}

export function listenCollection(collectionName, callback, onError) {
  const db = getDB();
  return onSnapshot(
    collection(db, collectionName),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => onError(err),
  );
}

export async function saveDocument(collectionName, documentId, data) {
  const db = getDB();
  await setDoc(doc(db, collectionName, documentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function addDocument(collectionName, data) {
  const db  = getDB();
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(collectionName, documentId, patch) {
  const db = getDB();
  await updateDoc(doc(db, collectionName, documentId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName, documentId) {
  const db = getDB();
  await deleteDoc(doc(db, collectionName, documentId));
}

export async function readDocument(collectionName, documentId) {
  const db   = getDB();
  const snap = await getDoc(doc(db, collectionName, documentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
