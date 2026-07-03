import { useMemo } from 'react';
import {
  BOARD_SIZE,
  CX,
  CY,
  LABEL_RADIUS,
  RIM_RADIUS,
  SEAT_RADIUS,
  SECTOR_ANGLE,
  buildBoardCells,
  polar,
  sectorStartAngle,
} from '../lib/boardGeometry';
import { TERRITORIES } from '../../game/data/territories';
import { FACTIONS } from '../../game/data/factions';
import { GAME_CONSTANTS } from '../../game/data/constants';
import type { PublicGameState, Sector, TerritoryId } from '../../game/types';
import type { SelectedCell } from '../lib/store';

const KIND_FILL: Record<string, string> = {
  sand: '#c9a05e',
  rock: '#7d6a58',
  stronghold: '#a5581f',
  polarSink: '#9db4b0',
};

interface BoardProps {
  view: PublicGameState;
  selected: SelectedCell | null;
  onSelect(cell: SelectedCell): void;
}

/**
 * Data-driven placeholder board: every cell comes from territory config via
 * buildBoardCells(). Clicking a cell selects (territory, sector) for the
 * popover and for shipment/movement targeting.
 */
export default function Board({ view, selected, onSelect }: BoardProps) {
  const cells = useMemo(buildBoardCells, []);

  const stacksByCell = useMemo(() => {
    const map = new Map<string, typeof view.stacks>();
    for (const stack of view.stacks) {
      const key = `${stack.territoryId}:${stack.sector}`;
      map.set(key, [...(map.get(key) ?? []), stack]);
    }
    return map;
  }, [view.stacks]);

  const stormSector = view.storm.sector;
  const stormA0 = sectorStartAngle(stormSector);

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      className="w-full max-w-[640px] select-none"
      role="img"
      aria-label="Game board"
    >
      <circle cx={CX} cy={CY} r={SEAT_RADIUS + 8} fill="#171009" />
      <circle cx={CX} cy={CY} r={RIM_RADIUS + 2} fill="#241a10" stroke="#3d2c1a" />

      {/* territory cells */}
      {cells.map((cell) => {
        const territory = TERRITORIES[cell.territoryId];
        const isSelected =
          selected?.territoryId === cell.territoryId &&
          (selected.sector === cell.sector || territory.kind === 'polarSink');
        return (
          <path
            key={`${cell.territoryId}:${cell.sector}`}
            d={cell.path}
            fill={KIND_FILL[territory.kind]}
            fillOpacity={territory.kind === 'sand' ? 0.85 : 0.95}
            stroke={isSelected ? '#f7ecd7' : '#241a10'}
            strokeWidth={isSelected ? 2 : 0.75}
            className="cursor-pointer hover:brightness-110 transition-[filter]"
            onClick={() => onSelect({ territoryId: cell.territoryId, sector: cell.sector })}
          >
            <title>
              {territory.name}
              {cell.sector !== null ? ` — sector ${cell.sector}` : ''}
            </title>
          </path>
        );
      })}

      {/* spice on the board */}
      {view.spiceOnBoard.map((spice) => {
        const cell = cells.find((c) => c.territoryId === spice.territoryId && c.sector === spice.sector);
        if (!cell) return null;
        return (
          <g key={`spice:${spice.territoryId}:${spice.sector}`} pointerEvents="none">
            <circle cx={cell.centroid.x} cy={cell.centroid.y - 7} r={6.5} fill="#e8930c" stroke="#241a10" />
            <text
              x={cell.centroid.x}
              y={cell.centroid.y - 4.6}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#1c150f"
            >
              {spice.amount}
            </text>
          </g>
        );
      })}

      {/* unit stacks */}
      {cells.map((cell) => {
        const stacks = stacksByCell.get(`${cell.territoryId}:${cell.sector}`) ?? [];
        return stacks.map((stack, i) => {
          const total = stack.forces + stack.specialForces;
          const y = cell.centroid.y + 4 + i * 12;
          return (
            <g key={`stack:${cell.territoryId}:${cell.sector}:${stack.factionId}`} pointerEvents="none">
              <rect
                x={cell.centroid.x - 8}
                y={y - 6}
                width={16}
                height={11}
                rx={2.5}
                fill={FACTIONS[stack.factionId]?.color ?? '#888'}
                stroke="#1c150f"
                opacity={stack.isAdvisor ? 0.55 : 1}
              />
              <text x={cell.centroid.x} y={y + 2.5} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
                {total}
                {stack.specialForces > 0 ? '★' : ''}
              </text>
            </g>
          );
        });
      })}

      {/* storm overlay */}
      <path
        d={stormWedge(stormA0)}
        fill="#3d2545"
        fillOpacity={0.55}
        stroke="#8e5aa8"
        strokeWidth={1.2}
        pointerEvents="none"
      />

      {/* sector numbers + seat markers */}
      {Array.from({ length: GAME_CONSTANTS.sectorCount }, (_, sector) => {
        const p = polar(LABEL_RADIUS, sectorStartAngle(sector) + SECTOR_ANGLE / 2);
        return (
          <text key={`sec:${sector}`} x={p.x} y={p.y + 3} textAnchor="middle" fontSize="8" fill="#8a7460">
            {sector}
          </text>
        );
      })}
      {Object.values(view.players).map((player) => {
        const p = polar(SEAT_RADIUS, sectorStartAngle(player.seatSector) + SECTOR_ANGLE / 2);
        return (
          <g key={`seat:${player.id}`}>
            <circle cx={p.x} cy={p.y} r={6} fill={FACTIONS[player.factionId].color} stroke="#f7ecd7" strokeWidth={1} />
            <title>{`${player.name} — seat sector ${player.seatSector}`}</title>
          </g>
        );
      })}

      {/* stronghold markers */}
      {cells
        .filter((c) => TERRITORIES[c.territoryId].kind === 'stronghold')
        .map((cell) => (
          <circle
            key={`sh:${cell.territoryId}`}
            cx={cell.centroid.x}
            cy={cell.centroid.y - 16}
            r={3}
            fill="#f7ecd7"
            pointerEvents="none"
          />
        ))}
    </svg>
  );
}

function stormWedge(a0: number): string {
  const a1 = a0 + SECTOR_ANGLE;
  const p0 = polar(RIM_RADIUS, a0);
  const p1 = polar(RIM_RADIUS, a1);
  const inner = 46; // storm never covers the center sanctuary
  const p2 = polar(inner, a1);
  const p3 = polar(inner, a0);
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${RIM_RADIUS} ${RIM_RADIUS} 0 0 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${inner} ${inner} 0 0 0 ${p3.x} ${p3.y}`,
    'Z',
  ].join(' ');
}
