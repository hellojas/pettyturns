import type { ImpGameState, ImpLogEntry, PlayerId } from '../types';

export function impLog(
  state: ImpGameState,
  entry: {
    event: string;
    text: string;
    data?: Record<string, unknown>;
    visibility?: ImpLogEntry['visibility'];
    at?: string;
  },
): ImpGameState {
  const logEntry: ImpLogEntry = {
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

export const impPrivate = (...playerIds: PlayerId[]): ImpLogEntry['visibility'] => ({
  scope: 'private',
  playerIds,
});
