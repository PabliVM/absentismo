// ================================================
// ATTENDANCE-CALCULATOR.JS — Fuente única de verdad
// Día lectivo = laborable (lunes-viernes), no festivo para ese curso,
// y no posterior a hoy (no se puede contar asistencia de días futuros).
// ================================================

// Colecciones Firestore:
// players  { id, nombre, equipo, curso }
// reasons  { id, nombre, codigo, color }
// absences { id, playerId, fecha (YYYY-MM-DD), reasonId, observaciones? }
// festivos { id, nombre, curso ('todos' o curso exacto), fechaInicio, fechaFin }

export function hoyStr() {
  return new Date().toISOString().slice(0, 10);
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** ¿La fecha cae dentro de algún festivo/periodo de vacaciones de ese curso? */
export function esFestivo(dateStr, curso, festivos = []) {
  return festivos.some(f =>
    (f.curso === 'todos' || f.curso === curso) &&
    dateStr >= f.fechaInicio && dateStr <= (f.fechaFin || f.fechaInicio));
}

export function isLectivo(dateStr, curso, festivos = []) {
  if (isWeekend(dateStr)) return false;
  if (dateStr > hoyStr()) return false; // día futuro: aún no ha ocurrido
  if (esFestivo(dateStr, curso, festivos)) return false;
  return true;
}

/** Devuelve array de fechas YYYY-MM-DD entre inicio y fin (inclusive). */
export function rangoFechas(inicio, fin) {
  const out = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin + 'T00:00:00');
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function diasLectivos(inicio, fin, curso, festivos = []) {
  return rangoFechas(inicio, fin).filter(f => isLectivo(f, curso, festivos)).length;
}

/**
 * absences: ya filtradas por playerId y rango de fechas.
 * curso: el del jugador, para aplicar sus festivos correspondientes.
 */
export function resumenJugador(inicio, fin, absences, curso, festivos = []) {
  const previstas   = diasLectivos(inicio, fin, curso, festivos);
  const ausencias   = absences.length;
  const asistencias = Math.max(previstas - ausencias, 0);
  const pctAsistencia = previstas ? +(asistencias / previstas * 100).toFixed(1) : 0;
  const pctAbsentismo = previstas ? +(ausencias   / previstas * 100).toFixed(1) : 0;

  const porMotivo = {};
  for (const a of absences) porMotivo[a.reasonId] = (porMotivo[a.reasonId] || 0) + 1;

  return { previstas, asistencias, ausencias, pctAsistencia, pctAbsentismo, porMotivo };
}

/**
 * Código de celda para el calendario. '' = lectivo sin ausencia (presente).
 * Ausencia = código del motivo. Fin de semana/festivo/futuro = no-lectivo.
 */
export function celdaCalendario(dateStr, absence, reasonsById, curso, festivos = []) {
  if (!isLectivo(dateStr, curso, festivos)) return { tipo: 'no-lectivo', texto: '' };
  if (absence) {
    const reason = reasonsById[absence.reasonId];
    return { tipo: 'ausencia', texto: reason ? reason.codigo : 'OTR', color: reason ? reason.color : '#6b7280' };
  }
  return { tipo: 'presente', texto: '' };
}
