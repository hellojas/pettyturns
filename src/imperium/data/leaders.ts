import type { ImpLeaderDef, LeaderId } from '../types';

/**
 * Leaders — EDITABLE CONFIG.
 *
 * Each leader has a signet-ring ability (fired by the signet starting card on
 * an agent turn) plus a machine-enforced passive expressed as data and
 * consumed at a named engine hook (`onReveal`, `onAgentPlaced`,
 * `combatStrength`, `onRoundStart`) — the same data-driven pattern the classic
 * game uses for faction powers. Passives that need a player choice are now
 * machine-enforced through the pending-decision system (e.g. Paul's foresight
 * `deckPeek`); a `passiveNote` remains available for any ability still awaiting
 * an engine hook.
 *
 * The `signetGains` / `signetCost` / `signetNote` fields below have been
 * reconciled against the base-game leader sheets (effect types confirmed; a
 * few amounts, e.g. Ilban's solari, are still worth a final check against your
 * copy). Signets the Gains DSL can't express (Leto's conditional influence,
 * Rabban's deploy, Helena's Imperium-Row manipulation) carry a `signetNote`
 * and are shown in the UI but not auto-applied by the engine.
 *
 * VERIFY: the machine-enforced `passives` below are still placeholders — every
 * summary is original wording and the `params` numbers/hooks are guesses to be
 * checked against the leader sheets you own. The engine reads only this config.
 */
export const IMP_LEADERS: Record<LeaderId, ImpLeaderDef> = {
  paulAtreides: {
    id: 'paulAtreides',
    name: 'Paul Atreides',
    // Signet "Discipline": draw a card.
    signetGains: { drawCards: 1 },
    passives: [
      {
        id: 'paul-foresight',
        hook: 'onReveal',
        summary: 'Prescience: on his reveal turn he inspects the top of his deck and may set it aside.',
        // deckPeek raises a pending decision (keep or discard the top card).
        // VERIFY the trigger/timing against the leader sheet you own.
        params: { deckPeek: true },
      },
    ],
  },
  dukeLeto: {
    id: 'dukeLeto',
    name: 'Duke Leto Atreides',
    // Signet: gain 1 influence with a faction where an opponent leads you.
    // Conditional target — not expressible as flat Gains, so it's note-only.
    signetGains: {},
    signetNote: 'Gain 1 influence with a faction where an opponent has more influence than you.',
    passives: [
      {
        id: 'leto-reveal-income',
        hook: 'onReveal',
        summary: 'Turns his standing into coin: gains solari each time he takes his reveal turn.',
        params: { gains: { solari: 1 } }, // VERIFY amount
      },
    ],
  },
  baronHarkonnen: {
    id: 'baronHarkonnen',
    name: 'Baron Vladimir Harkonnen',
    // Signet: pay 1 solari to draw an Intrigue card.
    signetGains: { intrigueCards: 1 },
    signetCost: { solari: 1 },
    passives: [
      {
        id: 'baron-reveal-scheme',
        hook: 'onReveal',
        summary: 'Never short of a scheme: draws an intrigue card when he reveals.',
        params: { gains: { intrigueCards: 1 } }, // VERIFY trigger/amount
      },
    ],
  },
  glossuRabban: {
    id: 'glossuRabban',
    name: 'Glossu "The Beast" Rabban',
    // Signet "Brutality": deploy up to 2 of your troops to the current conflict.
    // Deploying isn't a flat Gain (needs a conflict + garrison), so it's note-only.
    signetGains: {},
    signetNote: 'Deploy up to 2 of your troops to the current conflict.',
    passives: [
      {
        id: 'rabban-brute-force',
        hook: 'combatStrength',
        summary: 'Sheer brutality: adds fixed strength to any conflict he commits troops to.',
        params: { strength: 2 }, // VERIFY amount / conditions
      },
    ],
  },
  arianaThorvald: {
    id: 'arianaThorvald',
    name: 'Countess Ariana Thorvald',
    // Signet: gain 1 water.
    signetGains: { water: 1 },
    passives: [
      {
        id: 'ariana-desert-harvest',
        hook: 'onAgentPlaced',
        summary: 'At home in the deep desert: gains extra spice when sending an agent into the sands.',
        params: { group: 'desert', gains: { spice: 1 } }, // VERIFY amount
      },
    ],
  },
  memnonThorvald: {
    id: 'memnonThorvald',
    name: 'Earl Memnon Thorvald',
    // Signet: gain 1 spice.
    signetGains: { spice: 1 },
    passives: [
      {
        id: 'memnon-landsraad-favor',
        hook: 'onAgentPlaced',
        summary: 'Works the noble houses: gains coin when sending an agent to a Landsraad space.',
        params: { group: 'landsraad', gains: { solari: 1 } }, // VERIFY amount
      },
    ],
  },
  helenaRichese: {
    id: 'helenaRichese',
    name: 'Helena Richese',
    // Signet: trash a card in the Imperium Row and refill the empty slot from
    // the deck. Row manipulation isn't a flat Gain, so it's note-only.
    signetGains: {},
    signetNote: 'Trash a card in the Imperium Row, then refill the empty slot from the deck.',
    passives: [
      {
        id: 'helena-city-holdings',
        hook: 'onAgentPlaced',
        summary: 'Trades on her city holdings: gains coin when sending an agent to a city space.',
        params: { group: 'city', gains: { solari: 1 } }, // VERIFY amount
      },
    ],
  },
  ilbanRichese: {
    id: 'ilbanRichese',
    name: 'Count Ilban Richese',
    // Signet: gain 2 solari.
    signetGains: { solari: 2 },
    passives: [
      {
        id: 'ilban-manufacturing',
        hook: 'onRoundStart',
        summary: 'Steady manufacturing revenue: collects coin at the start of each round.',
        params: { gains: { solari: 1 } }, // VERIFY amount
      },
    ],
  },
};

export const IMP_LEADER_LIST = Object.values(IMP_LEADERS);
