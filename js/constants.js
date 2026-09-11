// ================================================
// CONSTANTS.JS — Constantes de la app Absentismo
// ================================================

export const APP_NAME    = 'Control de Absentismo';
export const LOGO_PATH   = './rm__.png';
export const FOOTER_TEXT = 'Cantera del Real Madrid CF — Control de Absentismo';

export const DEFAULT_SEASONS = [
  '2025/2026',
  '2026/2027',
  '2027/2028',
];

export const TABS = [
  { key: 'inicio',    label: 'Inicio'    },
  { key: 'jugadores', label: 'Jugadores' },
  { key: 'motivos',   label: 'Motivos'   },
  { key: 'informes',  label: 'Informes'  },
];

// Orden fijo de equipos de cantera — usado en el <select> de Jugadores
// y para ordenar filas en el informe calendario.
export const TEAMS = [
  'Castilla',
  'RM C',
  'Juvenil A',
  'Juvenil B',
  'Juvenil C',
  'Cadete A',
  'Cadete B',
  'Infantil A',
  'Infantil B',
  'Alevín A',
  'Fútbol 7',
];

export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
