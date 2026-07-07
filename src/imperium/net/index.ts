/**
 * Async-multiplayer scaffolding — public surface.
 *
 * `ImpGameTransport` is the client contract; `LocalMockTransport` is the
 * in-process authoritative implementation used for local play and tests. A real
 * backend implements `ImpGameTransport` and drops in with no engine/UI changes.
 */
export type {
  ChatMessage,
  ChatSinceResult,
  CreateGameInput,
  GameSnapshot,
  ImpGameSummary,
  ImpGameTransport,
  JournalStore,
  SinceResult,
  StoredImpGame,
  SubmitError,
  SubmitErrorCode,
  SubmitInput,
  SubmitOk,
  SubmitResult,
} from './types';
export { InMemoryJournalStore, LocalStorageJournalStore } from './journalStore';
export { LocalMockTransport, type LocalTransportOptions } from './localTransport';
