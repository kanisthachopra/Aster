export type MiniGameId = 'signal' | 'memory' | 'timing';
export const GAME_STATIONS: Array<{ id: MiniGameId; label: string; subtitle: string; position: [number, number]; color: string }> = [
  { id: 'signal', label: 'Signal lab', subtitle: 'REACTION TRIAL', position: [24, 39], color: '#f3b26c' },
  { id: 'memory', label: 'Memory array', subtitle: 'PATTERN TRIAL', position: [29, 65], color: '#b39def' },
  { id: 'timing', label: 'Precision chamber', subtitle: 'TIMING TRIAL', position: [-28, 70], color: '#8bcbb8' },
];
