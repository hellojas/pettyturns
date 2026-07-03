import { TERRITORY_LIST } from '../game/data/territories';
import { GAME_CONSTANTS } from '../game/data/constants';
import type { Sector, TerritoryId } from '../game/types';

/**
 * Placeholder polar geometry for the board (ARCHITECTURE.md milestone 4).
 *
 * The map is drawn as a disc: the sanctuary territory is the center circle,
 * and every other territory is an annular wedge at its configured ring
 * (1 = inner … 3 = rim), spanning its sectors. Where two territories claim
 * the same (ring, sector) cell, the ring band is subdivided radially so
 * nothing overlaps. Exact board shapes can replace this later by swapping
 * this module — the engine never reads geometry.
 */

export const BOARD_SIZE = 400;
export const CX = BOARD_SIZE / 2;
export const CY = BOARD_SIZE / 2;

const RING_BANDS: Array<[number, number]> = [
  [0, 44], // ring 0: center sanctuary
  [46, 86],
  [86, 126],
  [126, 166],
];
export const RIM_RADIUS = 166;
export const LABEL_RADIUS = 176;
export const SEAT_RADIUS = 188;

const SECTORS = GAME_CONSTANTS.sectorCount;
export const SECTOR_ANGLE = 360 / SECTORS;

/** Angle (degrees) at which a sector begins; sector 0 starts at 12 o'clock. */
export function sectorStartAngle(sector: Sector): number {
  return sector * SECTOR_ANGLE - 90;
}

export function polar(r: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function wedgePath(r0: number, r1: number, a0: number, a1: number): string {
  const p0 = polar(r1, a0);
  const p1 = polar(r1, a1);
  const p2 = polar(r0, a1);
  const p3 = polar(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export interface BoardCell {
  territoryId: TerritoryId;
  /** null only for the center sanctuary (it has no sector). */
  sector: Sector | null;
  path: string;
  centroid: { x: number; y: number };
}

export function buildBoardCells(): BoardCell[] {
  const cells: BoardCell[] = [];

  for (const territory of TERRITORY_LIST) {
    if (territory.kind === 'polarSink') {
      cells.push({
        territoryId: territory.id,
        sector: null,
        path: `M ${CX - RING_BANDS[0][1]} ${CY} a ${RING_BANDS[0][1]} ${RING_BANDS[0][1]} 0 1 0 ${2 * RING_BANDS[0][1]} 0 a ${RING_BANDS[0][1]} ${RING_BANDS[0][1]} 0 1 0 ${-2 * RING_BANDS[0][1]} 0 Z`,
        centroid: { x: CX, y: CY },
      });
    }
  }

  // group claimants per (ring, sector) so shared cells subdivide radially
  for (let ring = 1; ring <= 3; ring++) {
    for (let sector = 0; sector < SECTORS; sector++) {
      const claimants = TERRITORY_LIST.filter(
        (t) => t.geometry?.ring === ring && t.sectors.includes(sector),
      ).sort((a, b) => a.id.localeCompare(b.id));
      if (claimants.length === 0) continue;
      const [bandLo, bandHi] = RING_BANDS[ring];
      const bandStep = (bandHi - bandLo) / claimants.length;
      const a0 = sectorStartAngle(sector) + 0.4;
      const a1 = sectorStartAngle(sector) + SECTOR_ANGLE - 0.4;
      claimants.forEach((territory, i) => {
        const r0 = bandLo + i * bandStep + 0.5;
        const r1 = bandLo + (i + 1) * bandStep - 0.5;
        const midR = (r0 + r1) / 2;
        const midA = (a0 + a1) / 2;
        cells.push({
          territoryId: territory.id,
          sector,
          path: wedgePath(r0, r1, a0, a1),
          centroid: polar(midR, midA),
        });
      });
    }
  }
  return cells;
}

/** One representative cell per territory (largest-radius cell) for labels. */
export function territoryLabelAnchors(cells: BoardCell[]): Record<TerritoryId, { x: number; y: number }> {
  const anchors: Record<TerritoryId, { x: number; y: number }> = {};
  const byTerritory = new Map<TerritoryId, BoardCell[]>();
  for (const cell of cells) {
    const list = byTerritory.get(cell.territoryId) ?? [];
    list.push(cell);
    byTerritory.set(cell.territoryId, list);
  }
  for (const [territoryId, list] of byTerritory) {
    const mid = list[Math.floor(list.length / 2)];
    anchors[territoryId] = mid.centroid;
  }
  return anchors;
}
