import type { Sector, TerritoryDef, TerritoryId, TerritoryKind } from '../types';

/**
 * Board definition — EDITABLE CONFIG.
 *
 * VERIFY: this whole file is meant to be checked against the physical board you
 * own. Sector spans, adjacency, spice-blow sectors and spice amounts were
 * entered from memory as placeholders. Fix any entry that disagrees with your
 * copy; the engine reads only this file for board topology.
 *
 * Conventions:
 *  - 18 sectors numbered 0..17 running counterclockwise (storm direction).
 *  - Adjacency is declared once per pair below and mirrored automatically.
 *  - `geometry.ring` is placeholder polar geometry for the SVG renderer
 *    (0 = center ... 3 = rim); exact shapes can be refined later without
 *    touching the engine.
 */

interface Row {
  id: TerritoryId;
  name: string;
  kind: TerritoryKind;
  sectors: Sector[];
  spiceBlow?: { sector: Sector; amount: number };
  ring: number;
}

const ROWS: Row[] = [
  // center
  { id: 'polar_sink', name: 'Polar Sink', kind: 'polarSink', sectors: [], ring: 0 },

  // strongholds (all five count toward stronghold victory)
  { id: 'arrakeen', name: 'Arrakeen', kind: 'stronghold', sectors: [9], ring: 2 },
  { id: 'carthag', name: 'Carthag', kind: 'stronghold', sectors: [10], ring: 2 },
  { id: 'tueks_sietch', name: "Tuek's Sietch", kind: 'stronghold', sectors: [4], ring: 2 },
  { id: 'sietch_tabr', name: 'Sietch Tabr', kind: 'stronghold', sectors: [13], ring: 2 },
  { id: 'habbanya_sietch', name: 'Habbanya Sietch', kind: 'stronghold', sectors: [16], ring: 2 },

  // rock (storm-proof)
  { id: 'false_wall_south', name: 'False Wall South', kind: 'rock', sectors: [3, 4], ring: 1 },
  { id: 'false_wall_east', name: 'False Wall East', kind: 'rock', sectors: [4, 5, 6, 7, 8], ring: 1 },
  { id: 'pasty_mesa', name: 'Pasty Mesa', kind: 'rock', sectors: [4, 5, 6, 7], ring: 2 },
  { id: 'shield_wall', name: 'Shield Wall', kind: 'rock', sectors: [7, 8], ring: 1 },
  { id: 'rim_wall_west', name: 'Rim Wall West', kind: 'rock', sectors: [8], ring: 2 },
  { id: 'plastic_basin', name: 'Plastic Basin', kind: 'rock', sectors: [11, 12, 13], ring: 1 },
  { id: 'false_wall_west', name: 'False Wall West', kind: 'rock', sectors: [15, 16, 17], ring: 1 },

  // sand
  { id: 'cielago_north', name: 'Cielago North', kind: 'sand', sectors: [0, 1, 2], ring: 1, spiceBlow: { sector: 1, amount: 8 } },
  { id: 'cielago_depression', name: 'Cielago Depression', kind: 'sand', sectors: [0, 1, 2], ring: 2 },
  { id: 'meridian', name: 'Meridian', kind: 'sand', sectors: [0, 1], ring: 3 },
  { id: 'cielago_south', name: 'Cielago South', kind: 'sand', sectors: [1, 2], ring: 3, spiceBlow: { sector: 1, amount: 12 } },
  { id: 'cielago_east', name: 'Cielago East', kind: 'sand', sectors: [2, 3], ring: 3 },
  { id: 'harg_pass', name: 'Harg Pass', kind: 'sand', sectors: [3, 4], ring: 1 },
  { id: 'south_mesa', name: 'South Mesa', kind: 'sand', sectors: [3, 4, 5], ring: 3, spiceBlow: { sector: 4, amount: 10 } },
  { id: 'red_chasm', name: 'Red Chasm', kind: 'sand', sectors: [6], ring: 3, spiceBlow: { sector: 6, amount: 8 } },
  { id: 'the_minor_erg', name: 'The Minor Erg', kind: 'sand', sectors: [4, 5, 6, 7], ring: 1, spiceBlow: { sector: 7, amount: 8 } },
  { id: 'gara_kulon', name: 'Gara Kulon', kind: 'sand', sectors: [7], ring: 3 },
  { id: 'hole_in_the_rock', name: 'Hole in the Rock', kind: 'sand', sectors: [8], ring: 2, spiceBlow: { sector: 8, amount: 6 } },
  { id: 'sihaya_ridge', name: 'Sihaya Ridge', kind: 'sand', sectors: [8], ring: 3, spiceBlow: { sector: 8, amount: 6 } },
  { id: 'basin', name: 'Basin', kind: 'sand', sectors: [8, 9], ring: 3 },
  { id: 'imperial_basin', name: 'Imperial Basin', kind: 'sand', sectors: [8, 9, 10], ring: 1 },
  { id: 'old_gap', name: 'Old Gap', kind: 'sand', sectors: [8, 9, 10], ring: 3, spiceBlow: { sector: 9, amount: 6 } },
  { id: 'arsunt', name: 'Arsunt', kind: 'sand', sectors: [10, 11], ring: 1 },
  { id: 'tsimpo', name: 'Tsimpo', kind: 'sand', sectors: [10, 11], ring: 2 },
  { id: 'broken_land', name: 'Broken Land', kind: 'sand', sectors: [10, 11, 12], ring: 3, spiceBlow: { sector: 11, amount: 8 } },
  { id: 'hagga_basin', name: 'Hagga Basin', kind: 'sand', sectors: [11, 12], ring: 1, spiceBlow: { sector: 12, amount: 6 } },
  { id: 'rock_outcroppings', name: 'Rock Outcroppings', kind: 'sand', sectors: [12, 13], ring: 3, spiceBlow: { sector: 13, amount: 6 } },
  { id: 'bight_of_the_cliff', name: 'Bight of the Cliff', kind: 'sand', sectors: [13, 14], ring: 3 },
  { id: 'funeral_plain', name: 'Funeral Plain', kind: 'sand', sectors: [14], ring: 2, spiceBlow: { sector: 14, amount: 6 } },
  { id: 'the_great_flat', name: 'The Great Flat', kind: 'sand', sectors: [14], ring: 1, spiceBlow: { sector: 14, amount: 10 } },
  { id: 'the_greater_flat', name: 'The Greater Flat', kind: 'sand', sectors: [15], ring: 1 },
  { id: 'habbanya_erg', name: 'Habbanya Erg', kind: 'sand', sectors: [15, 16], ring: 2, spiceBlow: { sector: 15, amount: 8 } },
  { id: 'habbanya_ridge_flat', name: 'Habbanya Ridge Flat', kind: 'sand', sectors: [16, 17], ring: 3, spiceBlow: { sector: 17, amount: 10 } },
  { id: 'wind_pass', name: 'Wind Pass', kind: 'sand', sectors: [13, 14, 15, 16], ring: 1 },
  { id: 'wind_pass_north', name: 'Wind Pass North', kind: 'sand', sectors: [16, 17], ring: 1, spiceBlow: { sector: 16, amount: 6 } },
  { id: 'cielago_west', name: 'Cielago West', kind: 'sand', sectors: [17, 0], ring: 1 },
];

/**
 * Adjacency, declared once per pair (mirrored automatically below).
 * VERIFY against your board — this is the most error-prone dataset.
 */
const ADJACENCY: Array<[TerritoryId, TerritoryId]> = [
  ['polar_sink', 'cielago_north'],
  ['polar_sink', 'harg_pass'],
  ['polar_sink', 'false_wall_east'],
  ['polar_sink', 'imperial_basin'],
  ['polar_sink', 'arsunt'],
  ['polar_sink', 'hagga_basin'],
  ['polar_sink', 'plastic_basin'],
  ['polar_sink', 'wind_pass'],
  ['polar_sink', 'wind_pass_north'],
  ['polar_sink', 'cielago_west'],

  ['cielago_north', 'cielago_west'],
  ['cielago_north', 'cielago_depression'],
  ['cielago_north', 'cielago_east'],
  ['cielago_north', 'harg_pass'],
  ['cielago_depression', 'meridian'],
  ['cielago_depression', 'cielago_south'],
  ['cielago_depression', 'cielago_east'],
  ['cielago_depression', 'cielago_west'],
  ['meridian', 'cielago_west'],
  ['meridian', 'cielago_south'],
  ['cielago_south', 'cielago_east'],
  ['cielago_east', 'south_mesa'],
  ['cielago_east', 'harg_pass'],
  ['cielago_east', 'false_wall_south'],

  ['harg_pass', 'false_wall_south'],
  ['harg_pass', 'false_wall_east'],
  ['false_wall_south', 'south_mesa'],
  ['false_wall_south', 'pasty_mesa'],
  ['false_wall_south', 'false_wall_east'],
  ['south_mesa', 'pasty_mesa'],
  ['south_mesa', 'tueks_sietch'],
  ['south_mesa', 'red_chasm'],
  ['tueks_sietch', 'pasty_mesa'],
  ['pasty_mesa', 'false_wall_east'],
  ['pasty_mesa', 'red_chasm'],
  ['pasty_mesa', 'the_minor_erg'],
  ['pasty_mesa', 'shield_wall'],
  ['pasty_mesa', 'gara_kulon'],
  ['the_minor_erg', 'false_wall_east'],
  ['the_minor_erg', 'shield_wall'],
  ['red_chasm', 'the_minor_erg'],
  ['shield_wall', 'false_wall_east'],
  ['shield_wall', 'gara_kulon'],
  ['shield_wall', 'hole_in_the_rock'],
  ['shield_wall', 'sihaya_ridge'],
  ['shield_wall', 'imperial_basin'],
  ['gara_kulon', 'sihaya_ridge'],
  ['sihaya_ridge', 'old_gap'],

  ['hole_in_the_rock', 'rim_wall_west'],
  ['hole_in_the_rock', 'imperial_basin'],
  ['rim_wall_west', 'imperial_basin'],
  ['rim_wall_west', 'arrakeen'],
  ['rim_wall_west', 'basin'],
  ['basin', 'old_gap'],
  ['basin', 'arrakeen'],
  ['imperial_basin', 'false_wall_east'],
  ['imperial_basin', 'arrakeen'],
  ['imperial_basin', 'old_gap'],
  ['imperial_basin', 'arsunt'],
  ['imperial_basin', 'carthag'],
  ['arrakeen', 'old_gap'],
  ['old_gap', 'broken_land'],
  ['old_gap', 'carthag'],
  ['old_gap', 'tsimpo'],
  ['carthag', 'tsimpo'],
  ['carthag', 'arsunt'],
  ['carthag', 'hagga_basin'],
  ['arsunt', 'tsimpo'],
  ['arsunt', 'hagga_basin'],
  ['tsimpo', 'broken_land'],
  ['tsimpo', 'hagga_basin'],
  ['tsimpo', 'plastic_basin'],
  ['broken_land', 'plastic_basin'],
  ['broken_land', 'rock_outcroppings'],
  ['hagga_basin', 'plastic_basin'],
  ['plastic_basin', 'rock_outcroppings'],
  ['plastic_basin', 'sietch_tabr'],
  ['plastic_basin', 'bight_of_the_cliff'],
  ['plastic_basin', 'wind_pass'],
  ['plastic_basin', 'funeral_plain'],
  ['rock_outcroppings', 'sietch_tabr'],
  ['rock_outcroppings', 'bight_of_the_cliff'],
  ['sietch_tabr', 'bight_of_the_cliff'],
  ['bight_of_the_cliff', 'funeral_plain'],
  ['funeral_plain', 'the_great_flat'],
  ['funeral_plain', 'wind_pass'],
  ['the_great_flat', 'the_greater_flat'],
  ['the_great_flat', 'wind_pass'],
  ['the_greater_flat', 'habbanya_erg'],
  ['the_greater_flat', 'wind_pass'],
  ['the_greater_flat', 'false_wall_west'],
  ['habbanya_erg', 'false_wall_west'],
  ['habbanya_erg', 'habbanya_ridge_flat'],
  ['habbanya_erg', 'habbanya_sietch'],
  ['habbanya_ridge_flat', 'habbanya_sietch'],
  ['habbanya_ridge_flat', 'false_wall_west'],
  ['habbanya_ridge_flat', 'meridian'],
  ['habbanya_ridge_flat', 'cielago_west'],
  ['false_wall_west', 'wind_pass'],
  ['false_wall_west', 'wind_pass_north'],
  ['false_wall_west', 'cielago_west'],
  ['wind_pass', 'wind_pass_north'],
  ['wind_pass_north', 'cielago_west'],
];

function buildTerritories(): Record<TerritoryId, TerritoryDef> {
  const map: Record<TerritoryId, TerritoryDef> = {};
  for (const row of ROWS) {
    map[row.id] = {
      id: row.id,
      name: row.name,
      kind: row.kind,
      sectors: row.sectors,
      adjacent: [],
      spiceBlow: row.spiceBlow,
      isVictoryStronghold: row.kind === 'stronghold',
      geometry: { ring: row.ring },
    };
  }
  for (const [a, b] of ADJACENCY) {
    if (!map[a]) throw new Error(`Adjacency references unknown territory '${a}'`);
    if (!map[b]) throw new Error(`Adjacency references unknown territory '${b}'`);
    if (!map[a].adjacent.includes(b)) map[a].adjacent.push(b);
    if (!map[b].adjacent.includes(a)) map[b].adjacent.push(a);
  }
  return map;
}

export const TERRITORIES: Record<TerritoryId, TerritoryDef> = buildTerritories();

export const TERRITORY_LIST: TerritoryDef[] = Object.values(TERRITORIES);

export const STRONGHOLD_IDS: TerritoryId[] = TERRITORY_LIST.filter(
  (t) => t.isVictoryStronghold,
).map((t) => t.id);

export const SPICE_BLOW_TERRITORY_IDS: TerritoryId[] = TERRITORY_LIST.filter(
  (t) => t.spiceBlow,
).map((t) => t.id);
