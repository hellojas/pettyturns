import type { GameLogEntry, GameState, LogVisibility, PlayerId } from '../types';

/** Append a structured log entry; returns a new state (never mutates). */
export function appendLog(
  state: GameState,
  entry: {
    event: string;
    text: string;
    data?: Record<string, unknown>;
    visibility?: LogVisibility;
    at?: string;
  },
): GameState {
  const logEntry: GameLogEntry = {
    seq: state.log.length,
    round: state.round,
    phase: state.phase,
    event: entry.event,
    text: entry.text,
    data: entry.data,
    visibility: entry.visibility ?? { scope: 'public' },
    at: entry.at,
  };
  return { ...state, log: [...state.log, logEntry] };
}

export const privateTo = (...playerIds: PlayerId[]): LogVisibility => ({
  scope: 'private',
  playerIds,
});
