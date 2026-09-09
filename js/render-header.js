// ================================================
// RENDER-HEADER.JS — Header corporativo RM
// ================================================

import { state, setState } from './state.js';
import { LOGO_PATH }       from './constants.js';
import { safeText, showError } from './utils.js';

export function renderHeader() {
  const header = document.getElementById('rm-header');
  if (!header) return;

  header.innerHTML = `
    <div class="rm-header-inner">
      <div class="header-left">
        <div class="header-logo">
          <img src="${LOGO_PATH}" alt="RM" />
        </div>
        <span class="header-app-name">${safeText(state.appName)}</span>
      </div>
      <div class="header-right">
        <select class="season-select" id="season-select" title="Temporada activa">
          ${state.seasons.map(s => `
            <option value="${safeText(s)}" ${s === state.activeSeason ? 'selected' : ''}>
              ${safeText(s)}
            </option>
          `).join('')}
        </select>
        <button class="btn-season-add" id="btn-season-add" type="button" title="Añadir temporada">＋</button>
        <button class="btn-theme"      id="btn-theme"      type="button" title="Cambiar modo">
          ${state.darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('season-select').addEventListener('change', onSeasonChange);
  document.getElementById('btn-season-add').addEventListener('click', onAddSeason);
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
}

function onSeasonChange(e) {
  setState({ activeSeason: e.target.value });
  document.dispatchEvent(new CustomEvent('rm:season-changed', { detail: e.target.value }));
}

function onAddSeason() {
  const input = prompt('Nueva temporada (formato YYYY/YYYY):');
  if (input === null) return;
  const value = input.trim();
  if (!value) { showError('El nombre de la temporada no puede estar vacío.'); return; }
  if (!/^\d{4}\/\d{4}$/.test(value)) { showError('Formato incorrecto. Usa YYYY/YYYY.'); return; }
  if (state.seasons.includes(value)) { showError(`La temporada ${value} ya existe.`); return; }
  setState({ seasons: [...state.seasons, value], activeSeason: value });
  renderHeader();
  document.dispatchEvent(new CustomEvent('rm:season-changed', { detail: value }));
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  setState({ darkMode: isDark });
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}
