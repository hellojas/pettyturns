import type { Phase } from '../../types';
import type { PhaseModule } from './module';
import { setupPhase } from './setup';
import { stormPhase } from './storm';
import { spiceBlowPhase } from './spiceBlow';
import { nexusPhase } from './nexus';
import { biddingPhase } from './bidding';
import { revivalPhase } from './revival';
import { shipmentAndMovementPhase } from './shipmentAndMovement';
import { battlePhase } from './battle';
import { spiceCollectionPhase } from './spiceCollection';
import { mentatPausePhase } from './mentatPause';

export const PHASE_MODULES: Partial<Record<Phase, PhaseModule>> = {
  setup: setupPhase,
  storm: stormPhase,
  spiceBlow: spiceBlowPhase,
  nexus: nexusPhase,
  bidding: biddingPhase,
  revival: revivalPhase,
  shipmentAndMovement: shipmentAndMovementPhase,
  battle: battlePhase,
  spiceCollection: spiceCollectionPhase,
  mentatPause: mentatPausePhase,
};

export function phaseModule(phase: Phase): PhaseModule {
  const mod = PHASE_MODULES[phase];
  if (!mod) throw new Error(`No module for phase '${phase}'`);
  return mod;
}

export type { PhaseModule } from './module';
