// ================================================
// CONSTANTS.JS — Constantes de la app Absentismo
// ================================================

export const APP_NAME    = 'Absentismo';
export const LOGO_PATH   = './rm__.png';
export const FOOTER_TEXT = 'Cantera del Real Madrid CF — Absentismo';

export const DEFAULT_SEASONS = [
  '2025/2026',
  '2026/2027',
  '2027/2028',
];

export const TABS = [
  { key: 'inicio',      label: 'Inicio'      },
  { key: 'jugadores',   label: 'Jugadores'   },
  { key: 'equipos',     label: 'Equipos'     },
  { key: 'sesiones',    label: 'Sesiones'    },
  { key: 'motivos',     label: 'Motivos'     },
  { key: 'informes',    label: 'Informes'    },
];

// Motivos de ausencia por defecto (fase inicial). Configurables desde
// la pestaña "Motivos" — NUNCA hardcodear en el exportador (punto 31).
export const DEFAULT_MOTIVOS = [
  { id: 'dep', nombre: 'Deportivo',          codigo: 'DEP', color: '#ea580c' },
  { id: 'enf', nombre: 'Enfermedad',         codigo: 'ENF', color: '#dc2626' },
  { id: 'sel', nombre: 'Selección nacional', codigo: 'SEL', color: '#16a34a' },
  { id: 'les', nombre: 'Lesión',             codigo: 'LES', color: '#7c3aed' },
  { id: 'per', nombre: 'Personal',           codigo: 'PER', color: '#0891b2' },
  { id: 'med', nombre: 'Médico',             codigo: 'MED', color: '#db2777' },
  { id: 'otr', nombre: 'Otros',              codigo: 'OTR', color: '#6b7280' },
];
