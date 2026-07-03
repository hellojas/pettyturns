import type { ImpLeaderDef, LeaderId } from '../types';

/**
 * Leaders — EDITABLE CONFIG.
 *
 * MVP TEMPORARY SHORTCUT: only the signet-ring ability is machine-implemented
 * (it fires when the signet starting card is played on an agent turn). Each
 * leader's passive is recorded as an original-wording note and not yet
 * enforced by the engine — wire them up as engine hooks in a later milestone.
 * VERIFY all values against the leader sheets you own.
 */
export const IMP_LEADERS: Record<LeaderId, ImpLeaderDef> = {
  paulAtreides: {
    id: 'paulAtreides',
    name: 'Paul Atreides',
    signetGains: { drawCards: 1 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — may look at the top card of his deck at any time (config TODO).',
  },
  dukeLeto: {
    id: 'dukeLeto',
    name: 'Duke Leto Atreides',
    signetGains: { solari: 2 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — signet/economy synergy per the leader sheet (config TODO).',
  },
  baronHarkonnen: {
    id: 'baronHarkonnen',
    name: 'Baron Vladimir Harkonnen',
    signetGains: { intrigueCards: 1 },
    signetCost: {},
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — extra intrigue synergy per the leader sheet (config TODO).',
  },
  glossuRabban: {
    id: 'glossuRabban',
    name: 'Glossu "The Beast" Rabban',
    signetGains: { troops: 1 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — aggression bonus per the leader sheet (config TODO).',
  },
  arianaThorvald: {
    id: 'arianaThorvald',
    name: 'Countess Ariana Thorvald',
    signetGains: { spice: 1 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — spice-harvest synergy per the leader sheet (config TODO).',
  },
  memnonThorvald: {
    id: 'memnonThorvald',
    name: 'Earl Memnon Thorvald',
    signetGains: { troops: 1 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — landsraad synergy per the leader sheet (config TODO).',
  },
  helenaRichese: {
    id: 'helenaRichese',
    name: 'Helena Richese',
    signetGains: { solari: 1, drawCards: 1 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — city placement advantage per the leader sheet (config TODO).',
  },
  ilbanRichese: {
    id: 'ilbanRichese',
    name: 'Count Ilban Richese',
    signetGains: { solari: 1 },
    passiveNote: 'PASSIVE NOT YET IMPLEMENTED — manufacturing bonus per the leader sheet (config TODO).',
  },
};

export const IMP_LEADER_LIST = Object.values(IMP_LEADERS);
