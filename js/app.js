// ================================================
// APP.JS — Punto de entrada + paneles
// ================================================

import { initFirebase, watchAuth, login, logout, resetPassword, listenCollection, addDocument, updateDocument, deleteDocument }
  from './firebase-service.js';
import { isFirebaseUnconfigured } from './firebase-config.js';
import { renderHeader }           from './render-header.js';
import { renderTabs }             from './render-tabs.js';
import { renderFooter }           from './render-footer.js';
import { TABS, TEAMS, MESES, LOGO_PATH } from './constants.js';
import { state }                  from './state.js';
import { safeText, showError, showSuccess, formatDate } from './utils.js';
import { resumenJugador, celdaCalendario, rangoFechas, isWeekend } from './attendance-calculator.js';

// ── ESTADO EN MEMORIA DE COLECCIONES (cache local, sincronizado con Firestore) ──

const data = { players: [], reasons: [], absences: [] };
let unsubscribers = [];

function startListeners() {
  unsubscribers.forEach(u => u());
  unsubscribers = [
    listenCollection('players',  rows => { data.players  = rows; renderActivePanel(); },
      err => showError('Error cargando jugadores: ' + err.message)),
    listenCollection('reasons',  rows => { data.reasons  = rows; renderActivePanel(); },
      err => showError('Error cargando motivos: ' + err.message)),
    listenCollection('absences', rows => { data.absences = rows; renderActivePanel(); },
      err => showError('Error cargando ausencias: ' + err.message)),
  ];
}

function reasonsById() {
  return Object.fromEntries(data.reasons.map(r => [r.id, r]));
}

function firebaseNotice() {
  if (!isFirebaseUnconfigured()) return '';
  return `<div class="firebase-notice">⚠ Firebase pendiente de configurar — edita <code>js/firebase-config.js</code></div>`;
}

// ── PANEL: INICIO (alta de ausencia) ─────────────────

function renderPanelInicio(container) {
  const jugadorOpts = data.players
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => `<option value="${p.id}">${safeText(p.nombre)} — ${safeText(p.equipo)}</option>`).join('');

  const motivoOpts = data.reasons
    .map(r => `<option value="${r.id}">${safeText(r.nombre)} (${safeText(r.codigo)})</option>`).join('');

  container.innerHTML = `
    ${firebaseNotice()}
    <div class="card card-lg" style="max-width:480px">
      <div class="card-title">Añadir ausencia escolar</div>
      ${data.players.length === 0 ? '<div class="card-body">No hay jugadores todavía. Ve a la pestaña Jugadores.</div>' : ''}
      ${data.reasons.length === 0 ? '<div class="card-body">No hay motivos todavía. Ve a la pestaña Motivos.</div>' : ''}
      ${data.players.length > 0 && data.reasons.length > 0 ? `
        <form id="form-ausencia">
          <div class="field-group">
            <label class="label">Jugador</label>
            <select class="select" id="au-jugador" required>${jugadorOpts}</select>
          </div>
          <div class="field-group">
            <label class="label">Fecha</label>
            <input class="input" type="date" id="au-fecha" required value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="field-group">
            <label class="label">Motivo</label>
            <select class="select" id="au-motivo" required>${motivoOpts}</select>
          </div>
          <div class="field-group">
            <label class="label">Observaciones (opcional)</label>
            <textarea class="textarea" id="au-obs"></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Registrar ausencia</button>
        </form>
      ` : ''}
    </div>
  `;

  const form = document.getElementById('form-ausencia');
  if (form) form.addEventListener('submit', onSubmitAusencia);
}

async function onSubmitAusencia(e) {
  e.preventDefault();
  const playerId = document.getElementById('au-jugador').value;
  const fecha    = document.getElementById('au-fecha').value;
  const reasonId = document.getElementById('au-motivo').value;
  const observaciones = document.getElementById('au-obs').value.trim();

  if (isWeekend(fecha)) { showError('Esa fecha es fin de semana, no es día lectivo.'); return; }

  try {
    await addDocument('absences', { playerId, fecha, reasonId, observaciones });
    showSuccess('Ausencia registrada.');
    e.target.reset();
    document.getElementById('au-fecha').value = new Date().toISOString().slice(0,10);
  } catch (err) {
    showError('Error al guardar: ' + err.message);
  }
}

// ── PANEL: JUGADORES (alta unitaria + por lista, listado) ──

let editingPlayerId = null;
let jugadoresSubTab = 'listado';
const equiposColapsados = new Set();

function renderPanelJugadores(container) {
  container.innerHTML = `
    ${firebaseNotice()}
    <div class="page-heading">Jugadores</div>
    <div class="subtabs">
      <button class="subtab-btn ${jugadoresSubTab === 'listado' ? 'active' : ''}" data-subtab="listado">👥 Jugadores</button>
      <button class="subtab-btn ${jugadoresSubTab === 'anadir'  ? 'active' : ''}" data-subtab="anadir">➕ Añadir</button>
    </div>
    <div id="jugadores-body"></div>
  `;

  container.querySelectorAll('[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => { jugadoresSubTab = btn.dataset.subtab; renderPanelJugadores(container); });
  });

  const body = document.getElementById('jugadores-body');
  if (jugadoresSubTab === 'listado') renderListadoJugadores(body);
  else renderAltaJugadores(body);
}

function renderListadoJugadores(container) {
  const porEquipo = TEAMS.map(equipo => ({
    equipo,
    jugadores: data.players.filter(p => p.equipo === equipo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  })).filter(g => g.jugadores.length > 0);

  if (porEquipo.length === 0) {
    container.innerHTML = '<div class="card card-lg">Sin jugadores todavía. Ve a "Añadir".</div>';
    return;
  }

  container.innerHTML = `
    <div class="team-grid">
      ${porEquipo.map(({ equipo, jugadores }) => {
        const colapsado = equiposColapsados.has(equipo);
        const rows = jugadores.map(p => {
          if (p.id === editingPlayerId) {
            const teamOptsEdit = TEAMS.map(t => `<option value="${t}" ${t === p.equipo ? 'selected' : ''}>${t}</option>`).join('');
            return `
              <tr data-edit-row="${p.id}">
                <td><input class="input" id="edit-nombre-${p.id}" value="${safeText(p.nombre)}"></td>
                <td><input class="input" id="edit-curso-${p.id}" value="${safeText(p.curso)}"></td>
                <td><select class="select" id="edit-equipo-${p.id}" style="display:none">${teamOptsEdit}</select></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-primary btn-sm" data-save-player="${p.id}">Guardar</button>
                  <button class="btn btn-ghost btn-sm" data-cancel-player="${p.id}">Cancelar</button>
                </td>
              </tr>
            `;
          }
          return `
            <tr>
              <td>${safeText(p.nombre)}</td>
              <td>${safeText(p.curso)}</td>
              <td style="white-space:nowrap;text-align:right">
                <button class="btn btn-ghost btn-icon" data-edit-player="${p.id}" title="Editar">✏️</button>
                <button class="btn btn-ghost btn-icon" data-del-player="${p.id}" title="Eliminar">🗑️</button>
              </td>
            </tr>
          `;
        }).join('');

        return `
          <div class="card team-card">
            <button class="team-group-header" data-toggle-team="${safeText(equipo)}">
              <span>${colapsado ? '▸' : '▾'} ${safeText(equipo)}</span>
              <span class="badge badge-blue">${jugadores.length}</span>
            </button>
            ${colapsado ? '' : `
              <table class="team-table">
                <thead><tr style="text-align:left"><th>Nombre</th><th>Curso</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-toggle-team]').forEach(btn => {
    btn.addEventListener('click', () => {
      const eq = btn.dataset.toggleTeam;
      if (equiposColapsados.has(eq)) equiposColapsados.delete(eq); else equiposColapsados.add(eq);
      renderListadoJugadores(container);
    });
  });
  container.querySelectorAll('[data-del-player]').forEach(btn => {
    btn.addEventListener('click', () => onDeletePlayer(btn.dataset.delPlayer));
  });
  container.querySelectorAll('[data-edit-player]').forEach(btn => {
    btn.addEventListener('click', () => { editingPlayerId = btn.dataset.editPlayer; renderListadoJugadores(container); });
  });
  container.querySelectorAll('[data-cancel-player]').forEach(btn => {
    btn.addEventListener('click', () => { editingPlayerId = null; renderListadoJugadores(container); });
  });
  container.querySelectorAll('[data-save-player]').forEach(btn => {
    btn.addEventListener('click', () => onSavePlayer(btn.dataset.savePlayer, container, renderListadoJugadores));
  });
}

function renderAltaJugadores(container) {
  const teamOpts = TEAMS.map(t => `<option value="${t}">${t}</option>`).join('');

  container.innerHTML = `
    <div class="card card-lg" style="margin-bottom:16px">
      <div class="card-title">Alta unitaria</div>
      <form id="form-jugador-unico">
        <div class="field-group"><label class="label">Nombre</label><input class="input" id="ju-nombre" required></div>
        <div class="field-group"><label class="label">Equipo</label><select class="select" id="ju-equipo" required>${teamOpts}</select></div>
        <div class="field-group"><label class="label">Curso</label><input class="input" id="ju-curso" required placeholder="ej. Bachillerato"></div>
        <button class="btn btn-primary" type="submit">Añadir jugador</button>
      </form>
    </div>

    <div class="card card-lg">
      <div class="card-title">Alta por lista</div>
      <div class="card-body">Una línea por jugador: <code>Nombre,Equipo,Curso</code></div>
      <div class="field-group" style="margin-top:8px">
        <textarea class="textarea" id="ju-lista" rows="5" placeholder="Juan Pérez,Juvenil A,Bachillerato&#10;Pedro López,Cadete A,4º ESO"></textarea>
      </div>
      <button class="btn btn-primary" id="btn-alta-lista">Añadir lista</button>
    </div>
  `;

  document.getElementById('form-jugador-unico').addEventListener('submit', onSubmitJugadorUnico);
  document.getElementById('btn-alta-lista').addEventListener('click', onAltaLista);
}

async function onSavePlayer(id, container, refresh) {
  const nombre = document.getElementById(`edit-nombre-${id}`).value.trim();
  const equipo = document.getElementById(`edit-equipo-${id}`).value;
  const curso  = document.getElementById(`edit-curso-${id}`).value.trim();
  if (!nombre || !curso) { showError('Nombre y curso son obligatorios.'); return; }
  try {
    await updateDocument('players', id, { nombre, equipo, curso });
    showSuccess('Jugador actualizado.');
    editingPlayerId = null;
  } catch (err) { showError('Error: ' + err.message); }
}

async function onSubmitJugadorUnico(e) {
  e.preventDefault();
  const nombre = document.getElementById('ju-nombre').value.trim();
  const equipo = document.getElementById('ju-equipo').value;
  const curso  = document.getElementById('ju-curso').value.trim();
  if (!nombre || !curso) { showError('Nombre y curso son obligatorios.'); return; }
  try {
    await addDocument('players', { nombre, equipo, curso });
    showSuccess('Jugador añadido.');
    e.target.reset();
  } catch (err) { showError('Error: ' + err.message); }
}

async function onAltaLista() {
  const raw = document.getElementById('ju-lista').value.trim();
  if (!raw) { showError('La lista está vacía.'); return; }
  const lineas = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const validos = [];
  const invalidos = [];

  for (const linea of lineas) {
    const partes = linea.split(',').map(p => p.trim());
    if (partes.length < 3 || !partes[0] || !partes[2]) { invalidos.push(linea); continue; }
    const [nombre, equipo, curso] = partes;
    if (!TEAMS.includes(equipo)) { invalidos.push(linea + '  (equipo no reconocido)'); continue; }
    validos.push({ nombre, equipo, curso });
  }

  if (invalidos.length) {
    showError(`Líneas inválidas:\n${invalidos.slice(0, 5).join('\n')}${invalidos.length > 5 ? `\n… y ${invalidos.length - 5} más` : ''}`, 8000);
    return;
  }

  try {
    for (const p of validos) await addDocument('players', p);
    showSuccess(`${validos.length} jugador(es) añadido(s).`);
    document.getElementById('ju-lista').value = '';
  } catch (err) { showError('Error: ' + err.message); }
}

async function onDeletePlayer(id) {
  if (!confirm('¿Eliminar este jugador? También deberías revisar sus ausencias.')) return;
  try {
    await deleteDocument('players', id);
    showSuccess('Jugador eliminado.');
  } catch (err) { showError('Error: ' + err.message); }
}

// ── PANEL: MOTIVOS (CRUD) ────────────────────────────

let editingReasonId = null;

function renderPanelMotivos(container) {
  const rows = data.reasons.map(r => {
    if (r.id === editingReasonId) {
      return `
        <tr data-edit-row="${r.id}">
          <td><input class="input" id="edit-codigo-${r.id}" maxlength="4" value="${safeText(r.codigo)}"></td>
          <td><input class="input" id="edit-nombre-r-${r.id}" value="${safeText(r.nombre)}"></td>
          <td><input type="color" id="edit-color-${r.id}" value="${safeText(r.color)}" style="height:32px;width:50px;padding:2px"></td>
          <td style="white-space:nowrap">
            <button class="btn btn-primary btn-sm" data-save-reason="${r.id}">Guardar</button>
            <button class="btn btn-ghost btn-sm" data-cancel-reason="${r.id}">Cancelar</button>
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td><span class="motivo-pill" style="background:${safeText(r.color)}">${safeText(r.codigo)}</span></td>
        <td>${safeText(r.nombre)}</td>
        <td></td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-icon" data-edit-reason="${r.id}" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-icon" data-del-reason="${r.id}" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    ${firebaseNotice()}
    <div class="card card-lg" style="margin-bottom:16px;max-width:480px">
      <div class="card-title">Nuevo motivo</div>
      <form id="form-motivo">
        <div class="field-group"><label class="label">Nombre</label><input class="input" id="mo-nombre" required placeholder="ej. Selección nacional"></div>
        <div class="field-group"><label class="label">Código (máx 4 letras)</label><input class="input" id="mo-codigo" required maxlength="4" placeholder="ej. SEL"></div>
        <div class="field-group"><label class="label">Color</label><input type="color" id="mo-color" value="#2563eb" style="height:36px;width:60px;padding:2px"></div>
        <button class="btn btn-primary" type="submit">Crear motivo</button>
      </form>
    </div>

    <div class="card card-lg">
      <div class="card-title">Motivos (${data.reasons.length})</div>
      ${data.reasons.length === 0 ? '<div class="card-body">Sin motivos todavía.</div>' : `
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="text-align:left"><th>Código</th><th>Nombre</th><th></th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `}
    </div>
  `;

  document.getElementById('form-motivo').addEventListener('submit', onSubmitMotivo);
  container.querySelectorAll('[data-del-reason]').forEach(btn => {
    btn.addEventListener('click', () => onDeleteReason(btn.dataset.delReason));
  });
  container.querySelectorAll('[data-edit-reason]').forEach(btn => {
    btn.addEventListener('click', () => { editingReasonId = btn.dataset.editReason; renderPanelMotivos(container); });
  });
  container.querySelectorAll('[data-cancel-reason]').forEach(btn => {
    btn.addEventListener('click', () => { editingReasonId = null; renderPanelMotivos(container); });
  });
  container.querySelectorAll('[data-save-reason]').forEach(btn => {
    btn.addEventListener('click', () => onSaveReason(btn.dataset.saveReason));
  });
}

async function onSaveReason(id) {
  const nombre = document.getElementById(`edit-nombre-r-${id}`).value.trim();
  const codigo = document.getElementById(`edit-codigo-${id}`).value.trim().toUpperCase();
  const color  = document.getElementById(`edit-color-${id}`).value;
  if (!nombre || !codigo) { showError('Nombre y código son obligatorios.'); return; }
  try {
    await updateDocument('reasons', id, { nombre, codigo, color });
    showSuccess('Motivo actualizado.');
    editingReasonId = null;
  } catch (err) { showError('Error: ' + err.message); }
}

async function onSubmitMotivo(e) {
  e.preventDefault();
  const nombre = document.getElementById('mo-nombre').value.trim();
  const codigo = document.getElementById('mo-codigo').value.trim().toUpperCase();
  const color  = document.getElementById('mo-color').value;
  if (!nombre || !codigo) { showError('Nombre y código son obligatorios.'); return; }
  try {
    await addDocument('reasons', { nombre, codigo, color });
    showSuccess('Motivo creado.');
    e.target.reset();
    document.getElementById('mo-color').value = '#2563eb';
  } catch (err) { showError('Error: ' + err.message); }
}

async function onDeleteReason(id) {
  const enUso = data.absences.some(a => a.reasonId === id);
  if (enUso && !confirm('Este motivo tiene ausencias registradas. ¿Eliminar igualmente?')) return;
  try {
    await deleteDocument('reasons', id);
    showSuccess('Motivo eliminado.');
  } catch (err) { showError('Error: ' + err.message); }
}

// ── PANEL: INFORMES (calendario general + ficha individual) ──

let informesView = 'calendario';
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let jugadorSeleccionado = null;

function primerYUltimoDiaMes(anio, mes) {
  const inicio = new Date(anio, mes, 1).toISOString().slice(0, 10);
  const fin    = new Date(anio, mes + 1, 0).toISOString().slice(0, 10);
  return { inicio, fin };
}

function renderPanelInformes(container) {
  container.innerHTML = `
    <div class="card card-sm" style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn ${informesView === 'calendario' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-view="calendario">Calendario general</button>
      <button class="btn ${informesView === 'individual' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-view="individual">Ficha individual</button>
    </div>
    <div id="informes-body"></div>
  `;

  container.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => { informesView = btn.dataset.view; renderPanelInformes(container); });
  });

  const body = document.getElementById('informes-body');
  if (informesView === 'calendario') renderCalendarioGeneral(body);
  else renderFichaIndividual(body);
}

function renderMesSelector() {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" id="mes-prev">‹</button>
      <strong>${MESES[mesActual]} ${anioActual}</strong>
      <button class="btn btn-ghost btn-sm" id="mes-next">›</button>
    </div>
  `;
}

function bindMesSelector(container, onChange) {
  container.querySelector('#mes-prev').addEventListener('click', () => {
    mesActual--; if (mesActual < 0) { mesActual = 11; anioActual--; } onChange();
  });
  container.querySelector('#mes-next').addEventListener('click', () => {
    mesActual++; if (mesActual > 11) { mesActual = 0; anioActual++; } onChange();
  });
}

function renderCalendarioGeneral(container) {
  const { inicio, fin } = primerYUltimoDiaMes(anioActual, mesActual);
  const fechas = rangoFechas(inicio, fin);
  const rById = reasonsById();

  const jugadoresOrdenados = data.players.slice().sort((a, b) =>
    TEAMS.indexOf(a.equipo) - TEAMS.indexOf(b.equipo) || a.nombre.localeCompare(b.nombre));

  const absByPlayerFecha = {};
  for (const a of data.absences) absByPlayerFecha[`${a.playerId}_${a.fecha}`] = a;

  const headerCells = fechas.map(f => `<th style="min-width:26px;font-weight:500">${f.slice(8,10)}</th>`).join('');

  const rows = jugadoresOrdenados.map(p => {
    const cells = fechas.map(f => {
      const abs = absByPlayerFecha[`${p.id}_${f}`];
      const c = celdaCalendario(f, abs, rById);
      const bg = c.tipo === 'no-lectivo' ? '#e5e7eb' : (c.tipo === 'ausencia' ? c.color : 'transparent');
      const fg = c.tipo === 'ausencia' ? '#fff' : '#374151';
      return `<td style="text-align:center;background:${bg};color:${fg};font-size:9px;font-weight:700">${c.texto}</td>`;
    }).join('');
    return `<tr><td style="white-space:nowrap;font-size:12px">${safeText(p.nombre)} <span style="color:#9ca3af">(${safeText(p.equipo)})</span></td>${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    ${renderMesSelector()}
    ${data.players.length === 0 ? '<div class="card card-lg">Sin jugadores todavía.</div>' : `
      <div class="card" style="overflow-x:auto">
        <table style="border-collapse:collapse;font-size:11px">
          <thead><tr><th style="text-align:left">Jugador</th>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `}
  `;
  bindMesSelector(container, () => renderPanelInformes(document.getElementById('rm-main')));
}

let editingAbsenceId = null;

function renderFichaIndividual(container) {
  const opts = data.players.slice().sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => `<option value="${p.id}" ${p.id === jugadorSeleccionado ? 'selected' : ''}>${safeText(p.nombre)}</option>`).join('');

  container.innerHTML = `
    <div class="field-group" style="max-width:320px;margin-bottom:12px">
      <label class="label">Jugador</label>
      <select class="select" id="ficha-jugador"><option value="">Selecciona...</option>${opts}</select>
    </div>
    <div id="ficha-detalle"></div>
  `;

  document.getElementById('ficha-jugador').addEventListener('change', e => {
    jugadorSeleccionado = e.target.value || null;
    editingAbsenceId = null;
    renderFichaDetalle();
  });

  renderFichaDetalle();

  function renderFichaDetalle() {
    const detalle = document.getElementById('ficha-detalle');
    const player = data.players.find(p => p.id === jugadorSeleccionado);
    if (!player) { detalle.innerHTML = ''; return; }

    const { inicio, fin } = primerYUltimoDiaMes(anioActual, mesActual);
    const absences = data.absences.filter(a => a.playerId === player.id && a.fecha >= inicio && a.fecha <= fin);
    const resumen = resumenJugador(inicio, fin, absences);
    const rById = reasonsById();

    const motivoRows = Object.entries(resumen.porMotivo).map(([reasonId, count]) => {
      const r = rById[reasonId];
      return `<span class="motivo-pill" style="background:${r ? r.color : '#6b7280'}">${r ? r.codigo : '?'}: ${count}</span>`;
    }).join(' ');

    const motivoOptsBase = data.reasons.map(r => `<option value="${r.id}">${safeText(r.nombre)} (${safeText(r.codigo)})</option>`).join('');

    const ausenciasRows = absences.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(a => {
      if (a.id === editingAbsenceId) {
        const motivoOptsEdit = data.reasons.map(r => `<option value="${r.id}" ${r.id === a.reasonId ? 'selected' : ''}>${safeText(r.nombre)} (${safeText(r.codigo)})</option>`).join('');
        return `
          <tr>
            <td><input class="input" type="date" id="edit-au-fecha-${a.id}" value="${a.fecha}"></td>
            <td><select class="select" id="edit-au-motivo-${a.id}">${motivoOptsEdit}</select></td>
            <td><input class="input" id="edit-au-obs-${a.id}" value="${safeText(a.observaciones || '')}"></td>
            <td style="white-space:nowrap">
              <button class="btn btn-primary btn-sm" data-save-absence="${a.id}">Guardar</button>
              <button class="btn btn-ghost btn-sm" data-cancel-absence="${a.id}">Cancelar</button>
            </td>
          </tr>
        `;
      }
      const r = rById[a.reasonId];
      return `
        <tr>
          <td>${formatDate(a.fecha)}</td>
          <td><span class="motivo-pill" style="background:${r ? r.color : '#6b7280'}">${r ? r.codigo : '?'}</span> ${r ? safeText(r.nombre) : ''}</td>
          <td>${safeText(a.observaciones || '')}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-icon" data-edit-absence="${a.id}" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-icon" data-del-absence="${a.id}" title="Eliminar">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    detalle.innerHTML = `
      ${renderMesSelector()}
      <div class="card card-lg" style="margin-bottom:16px">
        <div class="card-title">${safeText(player.nombre)}</div>
        <div class="card-body">Equipo: <strong>${safeText(player.equipo)}</strong> · Curso: <strong>${safeText(player.curso)}</strong></div>
        <div class="divider"></div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px">
          <div><div class="label">Días lectivos</div><div style="font-size:20px;font-weight:700">${resumen.previstas}</div></div>
          <div><div class="label">Asistencias</div><div style="font-size:20px;font-weight:700;color:#16a34a">${resumen.asistencias}</div></div>
          <div><div class="label">Ausencias</div><div style="font-size:20px;font-weight:700;color:#dc2626">${resumen.ausencias}</div></div>
          <div><div class="label">% Asistencia</div><div style="font-size:20px;font-weight:700">${resumen.pctAsistencia}%</div></div>
          <div><div class="label">% Absentismo</div><div style="font-size:20px;font-weight:700">${resumen.pctAbsentismo}%</div></div>
        </div>
        ${motivoRows ? `<div class="label">Ausencias por motivo</div><div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">${motivoRows}</div>` : ''}
      </div>
      <div class="card card-lg">
        <div class="card-title">Ausencias del mes (${absences.length})</div>
        ${absences.length === 0 ? '<div class="card-body">Sin ausencias este mes.</div>' : `
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead><tr style="text-align:left"><th>Fecha</th><th>Motivo</th><th>Observaciones</th><th></th></tr></thead>
            <tbody>${ausenciasRows}</tbody>
          </table>
        `}
      </div>
    `;
    bindMesSelector(detalle, renderFichaDetalle);

    detalle.querySelectorAll('[data-edit-absence]').forEach(btn => {
      btn.addEventListener('click', () => { editingAbsenceId = btn.dataset.editAbsence; renderFichaDetalle(); });
    });
    detalle.querySelectorAll('[data-cancel-absence]').forEach(btn => {
      btn.addEventListener('click', () => { editingAbsenceId = null; renderFichaDetalle(); });
    });
    detalle.querySelectorAll('[data-save-absence]').forEach(btn => {
      btn.addEventListener('click', () => onSaveAbsence(btn.dataset.saveAbsence, renderFichaDetalle));
    });
    detalle.querySelectorAll('[data-del-absence]').forEach(btn => {
      btn.addEventListener('click', () => onDeleteAbsence(btn.dataset.delAbsence));
    });
  }
}

async function onSaveAbsence(id, refresh) {
  const fecha    = document.getElementById(`edit-au-fecha-${id}`).value;
  const reasonId = document.getElementById(`edit-au-motivo-${id}`).value;
  const observaciones = document.getElementById(`edit-au-obs-${id}`).value.trim();
  if (isWeekend(fecha)) { showError('Esa fecha es fin de semana, no es día lectivo.'); return; }
  try {
    await updateDocument('absences', id, { fecha, reasonId, observaciones });
    showSuccess('Ausencia actualizada.');
    editingAbsenceId = null;
  } catch (err) { showError('Error: ' + err.message); }
}

async function onDeleteAbsence(id) {
  if (!confirm('¿Eliminar esta ausencia?')) return;
  try {
    await deleteDocument('absences', id);
    showSuccess('Ausencia eliminada.');
  } catch (err) { showError('Error: ' + err.message); }
}

// ── RENDER MAIN / EVENTOS / BOOT ──────────────────────

const RENDERERS = {
  inicio:    renderPanelInicio,
  jugadores: renderPanelJugadores,
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
    RENDERERS[tab.key]?.(panel);
  });
}

function renderActivePanel() {
  const panel = document.querySelector(`.tab-panel[data-tab="${state.activeTab}"]`);
  if (panel) RENDERERS[state.activeTab]?.(panel);
}

function setupEvents() {
  document.addEventListener('rm:tab-changed', e => {
    const panel = document.querySelector(`.tab-panel[data-tab="${e.detail}"]`);
    if (panel) RENDERERS[e.detail]?.(panel);
  });
}

// ── LOGIN ─────────────────────────────────────────────

function renderLoginScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                background:linear-gradient(135deg,#1d4ed8,#2563eb)">
      <div style="background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);
                  padding:32px 30px;width:300px;text-align:center">
        <img src="${LOGO_PATH}" alt="RM" style="width:64px;height:64px;object-fit:contain;margin:0 auto 12px">
        <div style="font-size:19px;font-weight:800;color:#0f1117">Control de Absentismo</div>
        <div style="font-size:12px;font-weight:600;color:#2563eb;margin-bottom:20px">Real Madrid · Cantera</div>
        <form id="form-login">
          <div class="field-group" style="text-align:left"><input class="input" type="email" id="login-email" placeholder="Email" required autocomplete="username"></div>
          <div class="field-group" style="text-align:left"><input class="input" type="password" id="login-pass" placeholder="Contraseña" required autocomplete="current-password"></div>
          <div id="login-error" class="hidden" style="color:#dc2626;font-size:12px;margin-bottom:10px"></div>
          <button class="btn btn-primary" type="submit" style="width:100%;padding:10px">Iniciar sesión</button>
        </form>
        <a href="#" id="link-forgot" style="display:block;margin-top:14px;font-size:12px;color:#2563eb;text-decoration:underline">¿Olvidaste tu contraseña?</a>
      </div>
    </div>
  `;

  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.add('hidden');
    try {
      await login(email, pass);
      // watchAuth() detecta el login y llama a renderAppShell()
    } catch (err) {
      errBox.textContent = 'Email o contraseña incorrectos.';
      errBox.classList.remove('hidden');
    }
  });

  document.getElementById('link-forgot').addEventListener('click', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (!email) { showError('Escribe tu email arriba primero.'); return; }
    try {
      await resetPassword(email);
      showSuccess('Te hemos enviado un email para restablecer la contraseña.');
    } catch (err) {
      showError('No se pudo enviar el email: ' + err.message);
    }
  });
}

function renderAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header id="rm-header"></header>
    <nav    id="rm-tabs"></nav>
    <main   id="rm-main"></main>
    <footer id="rm-footer"></footer>
  `;
  renderFooter();
  renderHeader();
  renderTabs();
  renderMain();

  const headerRight = document.querySelector('#rm-header .header-right');
  if (headerRight) {
    const btnLogout = document.createElement('button');
    btnLogout.className = 'btn-theme';
    btnLogout.title = 'Cerrar sesión';
    btnLogout.textContent = '⏻';
    btnLogout.addEventListener('click', () => logout());
    headerRight.appendChild(btnLogout);
  }
}

// ── BOOT ─────────────────────────────────────────────

function boot() {
  const ok = initFirebase();
  setupEvents();
  if (!ok) { renderAppShell(); return; }

  watchAuth(user => {
    if (user) { renderAppShell(); startListeners(); }
    else { unsubscribers.forEach(u => u()); unsubscribers = []; renderLoginScreen(); }
  });
}

document.addEventListener('DOMContentLoaded', boot);
