import { describe, expect, it } from 'vitest';
import { buildBoardCells } from '../lib/boardGeometry';
import { TERRITORIES, TERRITORY_LIST } from '../game/data/territories';

describe('board geometry', () => {
  const cells = buildBoardCells();

  it('renders a cell for every (territory, sector) pair plus the center', () => {
    for (const territory of TERRITORY_LIST) {
      if (territory.kind === 'polarSink') {
        expect(cells.some((c) => c.territoryId === territory.id && c.sector === null)).toBe(true);
        continue;
      }
      for (const sector of territory.sectors) {
        expect(
          cells.some((c) => c.territoryId === territory.id && c.sector === sector),
          `${territory.id} sector ${sector} missing`,
        ).toBe(true);
      }
    }
  });

  it('produces no duplicate cells', () => {
    const keys = cells.map((c) => `${c.territoryId}:${c.sector}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every cell references a known territory and a sector that territory spans', () => {
    for (const cell of cells) {
      const territory = TERRITORIES[cell.territoryId];
      expect(territory).toBeDefined();
      if (cell.sector !== null) expect(territory.sectors).toContain(cell.sector);
    }
  });

  it('adjacency is symmetric across the whole map', () => {
    for (const territory of TERRITORY_LIST) {
      for (const adj of territory.adjacent) {
        expect(
          TERRITORIES[adj].adjacent,
          `${adj} is missing the back-link to ${territory.id}`,
        ).toContain(territory.id);
      }
    }
  });
});
