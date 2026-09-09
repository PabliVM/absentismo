// ================================================
// FIREBASE-CONFIG.JS — Credenciales Firebase
// Proyecto: absentismo-f846b
// ================================================

export const firebaseConfig = {
  apiKey:            'AIzaSyD6mDZbH8u-YBqowC7Wk0s01tVnQy4LHCM',
  authDomain:        'absentismo-f846b.firebaseapp.com',
  projectId:         'absentismo-f846b',
  storageBucket:      'absentismo-f846b.firebasestorage.app',
  messagingSenderId: '225772880902',
  appId:             '1:225772880902:web:d6027a2570c24a75b3ef87',
};

export function isFirebaseUnconfigured() {
  return firebaseConfig.apiKey === 'TU_API_KEY';
}
