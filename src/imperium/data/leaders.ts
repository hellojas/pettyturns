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
 * VERIFY: every summary is original wording and every number below is a
 * placeholder to be checked against the leader sheets you own. Correct the
 * `params` (and add/remove passives) to match your copy — the engine reads
 * only this config.
 *
 * PORTRAITS: each leader carries a `portrait` pointing at an original generated
 * illustration under `/public/portraits` (regenerate with
 * `node tools/gen-portraits.mjs`). These are stylized heraldic interpretations,
 * not copyrighted character art. To use your own faces, replace the file or
 * point `portrait` at any image under `/public`; remove it to fall back to the
 * code-drawn cameo. See `public/portraits/README.md`.
 */
export const IMP_LEADERS: Record<LeaderId, ImpLeaderDef> = {
  paulAtreides: {
    id: 'paulAtreides',
    name: 'Paul Atreides',
    portrait: '/portraits/paulAtreides.svg',
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
    portrait: '/portraits/dukeLeto.svg',
    signetGains: { solari: 2 },
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
    portrait: '/portraits/baronHarkonnen.svg',
    signetGains: { intrigueCards: 1 },
    signetCost: {},
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
    portrait: '/portraits/glossuRabban.svg',
    signetGains: { troops: 1 },
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
    portrait: '/portraits/arianaThorvald.svg',
    signetGains: { spice: 1 },
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
    portrait: '/portraits/memnonThorvald.svg',
    signetGains: { troops: 1 },
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
    portrait: '/portraits/helenaRichese.svg',
    signetGains: { solari: 1, drawCards: 1 },
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
    portrait: '/portraits/ilbanRichese.svg',
    signetGains: { solari: 1 },
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
