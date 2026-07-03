import type { Leader, LeaderId } from '../types';

/**
 * Leader roster — EDITABLE CONFIG.
 *
 * VERIFY: names and strength values should be checked against the leader discs
 * in the copy you own; edit freely. Ids are stable keys used by the engine and
 * by traitor cards — change names, not ids.
 */
export const LEADERS: Record<LeaderId, Leader> = {
  // atreides
  at_thufir: { id: 'at_thufir', factionId: 'atreides', name: 'Thufir Hawat', strength: 5 },
  at_gurney: { id: 'at_gurney', factionId: 'atreides', name: 'Gurney Halleck', strength: 4 },
  at_duncan: { id: 'at_duncan', factionId: 'atreides', name: 'Duncan Idaho', strength: 2 },
  at_wellington: { id: 'at_wellington', factionId: 'atreides', name: 'Dr. Wellington Yueh', strength: 1 },
  at_jessica: { id: 'at_jessica', factionId: 'atreides', name: 'Lady Jessica', strength: 5 },

  // harkonnen
  hk_feyd: { id: 'hk_feyd', factionId: 'harkonnen', name: 'Feyd-Rautha', strength: 6 },
  hk_beast: { id: 'hk_beast', factionId: 'harkonnen', name: 'Beast Rabban', strength: 4 },
  hk_piter: { id: 'hk_piter', factionId: 'harkonnen', name: 'Piter de Vries', strength: 3 },
  hk_iakin: { id: 'hk_iakin', factionId: 'harkonnen', name: 'Captain Iakin Nefud', strength: 2 },
  hk_umman: { id: 'hk_umman', factionId: 'harkonnen', name: 'Umman Kudu', strength: 1 },

  // emperor
  em_bashar: { id: 'em_bashar', factionId: 'emperor', name: 'Bashar', strength: 2 },
  em_burseg: { id: 'em_burseg', factionId: 'emperor', name: 'Burseg', strength: 3 },
  em_caid: { id: 'em_caid', factionId: 'emperor', name: 'Caid', strength: 3 },
  em_aramsham: { id: 'em_aramsham', factionId: 'emperor', name: 'Captain Aramsham', strength: 5 },
  em_irulan: { id: 'em_irulan', factionId: 'emperor', name: 'Hasimir Fenring', strength: 6 },

  // guild
  gu_repr: { id: 'gu_repr', factionId: 'guild', name: 'Guild Rep.', strength: 1 },
  gu_sook: { id: 'gu_sook', factionId: 'guild', name: 'Soo-Soo Sook', strength: 2 },
  gu_esmar: { id: 'gu_esmar', factionId: 'guild', name: 'Esmar Tuek', strength: 3 },
  gu_bewt: { id: 'gu_bewt', factionId: 'guild', name: 'Master Bewt', strength: 3 },
  gu_staban: { id: 'gu_staban', factionId: 'guild', name: 'Staban Tuek', strength: 5 },

  // fremen
  fr_jamis: { id: 'fr_jamis', factionId: 'fremen', name: 'Jamis', strength: 2 },
  fr_shadout: { id: 'fr_shadout', factionId: 'fremen', name: 'Shadout Mapes', strength: 3 },
  fr_otheym: { id: 'fr_otheym', factionId: 'fremen', name: 'Otheym', strength: 5 },
  fr_chani: { id: 'fr_chani', factionId: 'fremen', name: 'Chani', strength: 6 },
  fr_stilgar: { id: 'fr_stilgar', factionId: 'fremen', name: 'Stilgar', strength: 7 },

  // bene gesserit
  bg_alia: { id: 'bg_alia', factionId: 'beneGesserit', name: 'Alia', strength: 5 },
  bg_margot: { id: 'bg_margot', factionId: 'beneGesserit', name: 'Lady Margot Fenring', strength: 5 },
  bg_mohiam: { id: 'bg_mohiam', factionId: 'beneGesserit', name: 'Mother Ramallo', strength: 5 },
  bg_irulan: { id: 'bg_irulan', factionId: 'beneGesserit', name: 'Princess Irulan', strength: 5 },
  bg_wanna: { id: 'bg_wanna', factionId: 'beneGesserit', name: 'Wanna Yueh', strength: 5 },
};

export const LEADERS_BY_FACTION = (factionId: string): Leader[] =>
  Object.values(LEADERS).filter((l) => l.factionId === factionId);
