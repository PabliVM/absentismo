// ================================================
// STATE.JS — Estado de UI en memoria
// activeTab persiste en localStorage para no volver a "Inicio" al recargar.
// ================================================

import { APP_NAME, DEFAULT_SEASONS, TABS } from './constants.js';

const TAB_STORAGE_KEY = 'absentismo:activeTab';

function tabGuardada() {
  const saved = localStorage.getItem(TAB_STORAGE_KEY);
  return TABS.some(t => t.key === saved) ? saved : 'inicio';
}

const _state = {
  appName:      APP_NAME,
  seasons:      [...DEFAULT_SEASONS],
  activeSeason: '2026/2027',
  activeTab:    tabGuardada(),
  darkMode:     false,
};

export const state = _state;

export function setState(patch) {
  Object.assign(_state, patch);
  if (patch.activeTab) localStorage.setItem(TAB_STORAGE_KEY, patch.activeTab);
}
