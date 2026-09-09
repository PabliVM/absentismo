// ================================================
// APP.JS — Punto de entrada
// ================================================

import { initFirebase }           from './firebase-service.js';
import { isFirebaseUnconfigured } from './firebase-config.js';
import { renderHeader }           from './render-header.js';
import { renderTabs }             from './render-tabs.js';
import { renderFooter }           from './render-footer.js';
import { TABS, DEFAULT_MOTIVOS }  from './constants.js';
import { state }                  from './state.js';

// ── AVISO FIREBASE ────────────────────────────────

function firebaseNotice() {
  if (!isFirebaseUnconfigured()) return '';
  return `
    <div class="firebase-notice">
      ⚠ Firebase pendiente de configurar — edita <code>js/firebase-config.js</code>
    </div>
  `;
}

// ── PANELES (fase 1 — estructura y datos base, sin export aún) ────

function renderPanelInicio(container) {
  container.innerHTML = `
    ${firebaseNotice()}
    <div class="card card-lg">
      <div class="card-title">Absentismo — Cantera del Real Madrid CF</div>
      <div class="card-body">
        <p>Base MAESTRO RM lista. Colecciones Firestore: <code>teams</code>, <code>players</code>,
        <code>courses</code>, <code>sessions</code>, <code>reasons</code>, <code>absences</code>.</p>
        <p style="margin-top:8px">Exportación PDF/Excel: pendiente de fase 2.</p>
      </div>
    </div>
  `;
}

function renderPanelJugadores(container) {
  container.innerHTML = `
    <div class="card card-lg">
      <div class="card-title">Jugadores</div>
      <div class="card-body">Alta y listado de jugadores — pendiente de implementar.</div>
    </div>
  `;
}

function renderPanelEquipos(container) {
  container.innerHTML = `
    <div class="card card-lg">
      <div class="card-title">Equipos</div>
      <div class="card-body">
        Gestión de equipos de cantera. Sin escudo real disponible todavía —
        se muestra iniciales sobre color hasta que se suban los assets oficiales.
      </div>
    </div>
  `;
}

function renderPanelSesiones(container) {
  container.innerHTML = `
    <div class="card card-lg">
      <div class="card-title">Sesiones</div>
      <div class="card-body">Calendario de sesiones previstas por equipo/curso — pendiente de implementar.</div>
    </div>
  `;
}

function renderPanelMotivos(container) {
  const rows = DEFAULT_MOTIVOS.map(m => `
    <div class="motivo-pill" style="background:${m.color}">${m.codigo} — ${m.nombre}</div>
  `).join(' ');
  container.innerHTML = `
    <div class="card card-lg">
      <div class="card-title">Motivos de ausencia</div>
      <div class="card-body">
        <p>Configuración inicial (editable, no hardcodeada en el exportador):</p>
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">${rows}</div>
      </div>
    </div>
  `;
}

function renderPanelInformes(container) {
  container.innerHTML = `
    <div class="card card-lg">
      <div class="card-title">Informes</div>
      <div class="card-body">
        Exportación PDF / Excel / Calendario Excel — fase 2, pendiente de tu aprobación.
      </div>
    </div>
  `;
}

// ── RENDER MAIN ──────────────────────────────────────

const RENDERERS = {
  inicio:    renderPanelInicio,
  jugadores: renderPanelJugadores,
  equipos:   renderPanelEquipos,
  sesiones:  renderPanelSesiones,
  motivos:   renderPanelMotivos,
  informes:  renderPanelInformes,
};

function renderMain() {
  const main = document.getElementById('rm-main');
  main.innerHTML = '';

  TABS.forEach(tab => {
    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (tab.key !== state.activeTab ? ' hidden' : '');
    panel.dataset.tab = tab.key;
    main.appendChild(panel);
    const render = RENDERERS[tab.key];
    if (render) render(panel);
  });
}

// ── EVENTOS ──────────────────────────────────────────

function setupEvents() {
  document.addEventListener('rm:tab-changed', e => {
    const panel = document.querySelector(`.tab-panel[data-tab="${e.detail}"]`);
    if (!panel) return;
    const render = RENDERERS[e.detail];
    if (render) render(panel);
  });
}

// ── BOOT ─────────────────────────────────────────────

function boot() {
  initFirebase();
  renderFooter();
  renderHeader();
  renderTabs();
  renderMain();
  setupEvents();
}

document.addEventListener('DOMContentLoaded', boot);
