// ================================================
// STATE.JS — Estado de UI en memoria
// activeTab, seasons y activeSeason persisten en localStorage
// para no perderse al recargar la página.
// ================================================

import { APP_NAME, DEFAULT_SEASONS, TABS } from './constants.js';

const TAB_KEY     = 'absentismo:activeTab';
const SEASONS_KEY = 'absentismo:seasons';
const ACTIVE_SEASON_KEY = 'absentismo:activeSeason';

function tabGuardada() {
  const saved = localStorage.getItem(TAB_KEY);
  return TABS.some(t => t.key === saved) ? saved : 'inicio';
}

function seasonsGuardadas() {
  try {
    const raw = localStorage.getItem(SEASONS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_SEASONS];
  } catch { return [...DEFAULT_SEASONS]; }
}

function activeSeasonGuardada(seasons) {
  const saved = localStorage.getItem(ACTIVE_SEASON_KEY);
  return seasons.includes(saved) ? saved : seasons[seasons.length - 1];
}

const _seasons = seasonsGuardadas();

const _state = {
  appName:      APP_NAME,
  seasons:      _seasons,
  activeSeason: activeSeasonGuardada(_seasons),
  activeTab:    tabGuardada(),
  darkMode:     false,
};

export const state = _state;

export function setState(patch) {
  Object.assign(_state, patch);
  if (patch.activeTab)    localStorage.setItem(TAB_KEY, patch.activeTab);
  if (patch.seasons)      localStorage.setItem(SEASONS_KEY, JSON.stringify(patch.seasons));
  if (patch.activeSeason) localStorage.setItem(ACTIVE_SEASON_KEY, patch.activeSeason);
}
