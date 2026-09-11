// ================================================
// ATTENDANCE-CALCULATOR.JS — Fuente única de verdad
// Modelo simplificado: sin colección "sessions".
// Día lectivo = día laborable (lunes-viernes) que no sea festivo.
// Ausencia = documento en "absences" para ese jugador+fecha.
// Presencia se asume por defecto (no hay registro positivo de asistencia).
// ================================================

// Colecciones Firestore:
// players  { id, nombre, equipo, curso }
// reasons  { id, nombre, codigo, color }
// absences { id, playerId, fecha (YYYY-MM-DD), reasonId, observaciones? }

export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = domingo, 6 = sábado
  return day === 0 || day === 6;
}

export function isLectivo(dateStr, festivos = []) {
  if (isWeekend(dateStr)) return false;
  if (festivos.includes(dateStr)) return false;
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

export function diasLectivos(inicio, fin, festivos = []) {
  return rangoFechas(inicio, fin).filter(f => isLectivo(f, festivos)).length;
}

/**
 * absences: ya filtradas por playerId y rango de fechas.
 * Devuelve el resumen único que consumen app, PDF y Excel.
 */
export function resumenJugador(inicio, fin, absences, festivos = []) {
  const previstas  = diasLectivos(inicio, fin, festivos);
  const ausencias  = absences.length;
  const asistencias = Math.max(previstas - ausencias, 0);
  const pctAsistencia = previstas ? +(asistencias / previstas * 100).toFixed(1) : 0;
  const pctAbsentismo = previstas ? +(ausencias   / previstas * 100).toFixed(1) : 0;

  const porMotivo = {};
  for (const a of absences) {
    porMotivo[a.reasonId] = (porMotivo[a.reasonId] || 0) + 1;
  }

  return { previstas, asistencias, ausencias, pctAsistencia, pctAbsentismo, porMotivo };
}

/**
 * Código de celda para el calendario. '' = lectivo sin ausencia (presente).
 * 'FIN' = fin de semana. Ausencia = código del motivo.
 */
export function celdaCalendario(dateStr, absence, reasonsById, festivos = []) {
  if (isWeekend(dateStr) || festivos.includes(dateStr)) return { tipo: 'no-lectivo', texto: '' };
  if (absence) {
    const reason = reasonsById[absence.reasonId];
    return { tipo: 'ausencia', texto: reason ? reason.codigo : 'OTR', color: reason ? reason.color : '#6b7280' };
  }
  return { tipo: 'presente', texto: '' };
}
