
// ================================================
// ATTENDANCE-CALCULATOR.JS — Fuente única de verdad
// Ningún otro módulo (app, PDF, Excel) recalcula % por su cuenta.
// Todos consumen las funciones de aquí. (punto 37/38 del brief)
// ================================================

// Modelo de datos Firestore (colecciones):
//
// teams      { id, nombre, cursoTipo }
// players    { id, nombre, apellidos, teamId, cursos:[cursoId], fechaAlta, fechaBaja? }
// courses    { id, nombre }                      // ej. Bachillerato, Inglés
// sessions   { id, teamId, courseId, fecha (YYYY-MM-DD) }   // 1 doc = 1 sesión prevista
// reasons    { id, nombre, codigo, color }        // motivos configurables (punto 31)
// absences   { id, playerId, sessionId, reasonId, justificada:bool, observaciones }

/**
 * Calcula fecha inicial/final efectivas para un jugador dado un rango
 * seleccionado por el usuario. Nunca usa "hoy" salvo que el usuario
 * pida explícitamente "hasta hoy". (punto 38)
 */
export function rangoEfectivo(fechaInicioSel, fechaFinSel, player) {
  const inicio = maxFecha(fechaInicioSel, player.fechaAlta);
  const fin    = player.fechaBaja ? minFecha(fechaFinSel, player.fechaBaja) : fechaFinSel;
  return { inicio, fin };
}

function maxFecha(a, b) { if (!b) return a; return a > b ? a : b; }
function minFecha(a, b) { if (!b) return a; return a < b ? a : b; }

/**
 * sessions: sesiones ya filtradas por equipo/curso/rango efectivo.
 * absences: ausencias del jugador cruzadas por sessionId.
 * Devuelve el resumen único que consumen app, PDF y Excel.
 */
export function resumenJugador(sessions, absences) {
  const previstas   = sessions.length;
  const ausenciasMap = new Map(absences.map(a => [a.sessionId, a]));
  const ausencias    = sessions.filter(s => ausenciasMap.has(s.id)).length;
  const asistencias  = previstas - ausencias;
  const pctAsistencia = previstas ? +(asistencias / previstas * 100).toFixed(1) : 0;
  const pctAbsentismo = previstas ? +(ausencias   / previstas * 100).toFixed(1) : 0;

  const porMotivo = {};
  for (const a of absences) {
    porMotivo[a.reasonId] = (porMotivo[a.reasonId] || 0) + 1;
  }

  return { previstas, asistencias, ausencias, pctAsistencia, pctAbsentismo, porMotivo };
}

/**
 * Código de celda para el Excel calendario (punto 33/34).
 * '—' = sin sesión prevista ese día. Nunca se cuenta como asistencia.
 */
export function celdaCalendario(session, absence, reasonsById) {
  if (!session) return '—';
  if (!absence) return '✓';
  const reason = reasonsById[absence.reasonId];
  return reason ? reason.codigo : 'OTR';
}
