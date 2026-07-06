/**
 * Generate original, stylized leader portraits as standalone SVG files.
 *
 * These are heraldic *interpretations* — illustrated busts built from geometric
 * parts (house colors, mantle, headgear, face marks), not depictions of any
 * copyrighted character likeness. Run from the repo root:
 *
 *   node tools/gen-portraits.mjs
 *
 * writing one `<id>.svg` per leader into `public/portraits/`. Wire them up by
 * setting each leader's `portrait` to `/portraits/<id>.svg` in
 * `src/imperium/data/leaders.ts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/portraits');
mkdirSync(OUT, { recursive: true });

/** Per-leader art recipe. Colors are house-themed; parts pick the silhouette. */
const LEADERS = {
  paulAtreides: {
    bg: ['#2f6b4f', '#0c1c15'], mantle: '#1f4d38', trim: '#4bbd8a', skin: '#dcb488',
    hair: '#3a2416', head: 'hood', eyes: 'spice', badge: '#4bbd8a',
  },
  dukeLeto: {
    bg: ['#3d6b34', '#101c0d'], mantle: '#26401f', trim: '#9ecb52', skin: '#dcb488',
    hair: '#2a1c10', head: 'circlet', beard: 'short', badge: '#9ecb52',
  },
  baronHarkonnen: {
    bg: ['#7a4420', '#1e0f06'], mantle: '#4a2a14', trim: '#e0a050', skin: '#cb9d78',
    hair: 'none', head: 'bald', suspensor: true, jowls: true, badge: '#e0a050',
  },
  glossuRabban: {
    bg: ['#7a2626', '#1c0808'], mantle: '#3a1414', trim: '#e0604f', skin: '#c28a68',
    hair: 'none', head: 'warhelm', scowl: true, badge: '#e0604f',
  },
  arianaThorvald: {
    bg: ['#2a7566', '#0a1f1a'], mantle: '#1d5148', trim: '#54d0b4', skin: '#e0be92',
    hair: '#2a1a12', head: 'updo', eyes: 'spice', badge: '#54d0b4',
  },
  memnonThorvald: {
    bg: ['#59662a', '#181f0b'], mantle: '#3a451c', trim: '#c0d45c', skin: '#d6b085',
    hair: '#40301a', head: 'coronet', beard: 'full', badge: '#c0d45c',
  },
  helenaRichese: {
    bg: ['#4a4f7e', '#12141f'], mantle: '#2e3350', trim: '#a0a6ea', skin: '#e2c19a',
    hair: '#3a2c46', head: 'highcollar', badge: '#a0a6ea',
  },
  ilbanRichese: {
    bg: ['#555c66', '#131619'], mantle: '#33383e', trim: '#b6c6d2', skin: '#d6b896',
    hair: '#5a5148', head: 'cogcrown', visor: true, beard: 'short', badge: '#b6c6d2',
  },
};

const round = (n) => Math.round(n * 100) / 100;

/** A soft heraldic shield watermark behind the figure. */
function watermark(trim) {
  return `<path d="M50 14 L80 24 V52 C80 72 66 84 50 92 C34 84 20 72 20 52 V24 Z"
    fill="none" stroke="${trim}" stroke-width="2" opacity="0.12"/>`;
}

function mantle(c) {
  // Robe + shoulders, with a collar V of trim.
  return `
    <path d="M6 100 C6 76 24 66 50 66 C76 66 94 76 94 100 Z" fill="${c.mantle}"/>
    <path d="M6 100 C6 76 24 66 50 66 C76 66 94 76 94 100 Z" fill="#000" opacity="0.18"/>
    <path d="M38 68 L50 84 L62 68 L58 66 L50 76 L42 66 Z" fill="${c.trim}" opacity="0.85"/>
  `;
}

function neckHead(c) {
  const jowl = c.jowls
    ? `<ellipse cx="50" cy="52" rx="21" ry="21" fill="${c.skin}"/>`
    : '';
  return `
    <rect x="43" y="52" width="14" height="16" rx="6" fill="${c.skin}"/>
    <rect x="43" y="52" width="14" height="16" rx="6" fill="#000" opacity="0.12"/>
    ${jowl}
    <ellipse cx="50" cy="42" rx="${c.jowls ? 19 : 16.5}" ry="${c.jowls ? 18 : 19}" fill="${c.skin}"/>
    <ellipse cx="33.5" cy="43" rx="2.4" ry="3.4" fill="${c.skin}"/>
    <ellipse cx="66.5" cy="43" rx="2.4" ry="3.4" fill="${c.skin}"/>
  `;
}

function hairBack(c) {
  if (c.hair === 'none' || c.head === 'hood' || c.head === 'warhelm') return '';
  // A soft mass behind/above the head.
  return `<path d="M31 40 C31 22 69 22 69 40 C69 33 64 27 50 27 C36 27 31 33 31 40 Z" fill="${c.hair}"/>`;
}

function headgear(c) {
  switch (c.head) {
    case 'hood':
      return `
        <path d="M24 46 C24 16 76 16 76 46 C76 40 74 34 70 30 C64 22 36 22 30 30 C26 34 24 40 24 46 Z"
          fill="${c.mantle}"/>
        <path d="M27 47 C27 24 73 24 73 47" fill="none" stroke="${c.trim}" stroke-width="1.6" opacity="0.5"/>
        <path d="M30 30 C36 22 64 22 70 30 L66 33 C60 27 40 27 34 33 Z" fill="#000" opacity="0.2"/>`;
    case 'circlet':
      return `<g>
        <path d="M33 30 Q50 24 67 30 L65 34 Q50 29 35 34 Z" fill="${c.trim}"/>
        <circle cx="50" cy="30" r="2.4" fill="${c.bg[0]}" stroke="${c.trim}" stroke-width="1"/>
      </g>`;
    case 'bald':
      return `<path d="M34 34 C40 28 60 28 66 34 C60 31 40 31 34 34 Z" fill="#fff" opacity="0.08"/>`;
    case 'warhelm':
      return `<g>
        <path d="M30 40 C30 22 70 22 70 40 L70 34 C66 27 34 27 30 34 Z" fill="#3a3f45"/>
        <path d="M30 40 C30 24 70 24 70 40" fill="none" stroke="${c.trim}" stroke-width="2"/>
        <rect x="47.5" y="38" width="5" height="14" rx="2" fill="#3a3f45"/>
        <path d="M30 38 L26 44 M70 38 L74 44" stroke="#3a3f45" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    case 'updo':
      return `<g>
        <path d="M31 40 C31 20 69 20 69 40 C69 31 62 25 50 25 C38 25 31 31 31 40 Z" fill="${c.hair}"/>
        <ellipse cx="50" cy="20" rx="8" ry="6.5" fill="${c.hair}"/>
        <path d="M31 40 C28 46 27 54 30 60 L34 44 Z M69 40 C72 46 73 54 70 60 L66 44 Z" fill="${c.hair}"/>
      </g>`;
    case 'coronet':
      return `<path d="M34 31 L38 26 L44 30 L50 24 L56 30 L62 26 L66 31 Q50 27 34 31 Z" fill="${c.trim}"/>`;
    case 'highcollar':
      return `<g>
        <path d="M31 39 C31 21 69 21 69 39 C69 29 61 24 50 24 C39 24 31 29 31 39 Z" fill="${c.hair}"/>
        <path d="M34 66 L30 92 L40 70 Z M66 66 L70 92 L60 70 Z" fill="${c.trim}" opacity="0.85"/>
      </g>`;
    case 'cogcrown': {
      const teeth = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const x = round(50 + Math.cos(a) * 12);
        const y = round(24 + Math.sin(a) * 6);
        return `<rect x="${round(x - 1.6)}" y="${round(y - 1.6)}" width="3.2" height="3.2" rx="0.8" fill="${c.trim}"/>`;
      }).join('');
      return `<g>${teeth}<ellipse cx="50" cy="24" rx="12" ry="6" fill="none" stroke="${c.trim}" stroke-width="2"/></g>`;
    }
    default:
      return '';
  }
}

function face(c) {
  const browY = 39;
  const eyeY = 43;
  const spice = c.eyes === 'spice';
  const eye = (cx) => spice
    ? `<ellipse cx="${cx}" cy="${eyeY}" rx="3.1" ry="2" fill="#2f8fe0"/>
       <ellipse cx="${cx}" cy="${eyeY}" rx="3.1" ry="2" fill="none" stroke="#7fd0ff" stroke-width="0.7"/>`
    : `<ellipse cx="${cx}" cy="${eyeY}" rx="2.6" ry="1.7" fill="#fff" opacity="0.85"/>
       <circle cx="${cx}" cy="${eyeY}" r="1.2" fill="#241a12"/>`;
  const brow = c.scowl
    ? `<path d="M40 ${browY + 1} L46.5 ${browY - 1.5}" stroke="#241a12" stroke-width="1.8" stroke-linecap="round"/>
       <path d="M60 ${browY + 1} L53.5 ${browY - 1.5}" stroke="#241a12" stroke-width="1.8" stroke-linecap="round"/>`
    : `<path d="M40 ${browY} Q43.5 ${browY - 1.8} 47 ${browY}" stroke="#241a12" stroke-width="1.5" fill="none" stroke-linecap="round"/>
       <path d="M53 ${browY} Q56.5 ${browY - 1.8} 60 ${browY}" stroke="#241a12" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  const beard =
    c.beard === 'full'
      ? `<path d="M35 46 C36 62 44 68 50 68 C56 68 64 62 65 46 C60 56 40 56 35 46 Z" fill="${c.hair}"/>`
      : c.beard === 'short'
        ? `<path d="M38 50 C40 58 45 61 50 61 C55 61 60 58 62 50 C56 55 44 55 38 50 Z" fill="${c.hair}" opacity="0.9"/>`
        : '';
  const nose = `<path d="M50 44 L48 50 Q50 51.5 52 50" fill="none" stroke="#00000040" stroke-width="1.2" stroke-linecap="round"/>`;
  const mouth = c.scowl
    ? `<path d="M45 55 Q50 53 55 55" fill="none" stroke="#00000055" stroke-width="1.4" stroke-linecap="round"/>`
    : `<path d="M46 54 Q50 56 54 54" fill="none" stroke="#00000045" stroke-width="1.3" stroke-linecap="round"/>`;
  const visor = c.visor
    ? `<rect x="34" y="40.5" width="32" height="5" rx="2.5" fill="#1a1d22" opacity="0.85"/>
       <rect x="35" y="41.5" width="30" height="1.4" rx="0.7" fill="${c.trim}" opacity="0.7"/>`
    : '';
  return `${brow}${visor || `${eye(42)}${eye(58)}`}${nose}${beard}${visor ? '' : mouth}`;
}

function svg(id, c) {
  const gid = id;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" role="img" aria-label="${id} portrait">
  <defs>
    <radialGradient id="${gid}-bg" cx="50%" cy="34%" r="80%">
      <stop offset="0%" stop-color="${c.bg[0]}"/>
      <stop offset="100%" stop-color="${c.bg[1]}"/>
    </radialGradient>
    <radialGradient id="${gid}-vig" cx="50%" cy="45%" r="65%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
    </radialGradient>
    <clipPath id="${gid}-clip"><rect x="0" y="0" width="100" height="100" rx="10"/></clipPath>
  </defs>
  <g clip-path="url(#${gid}-clip)">
    <rect width="100" height="100" fill="url(#${gid}-bg)"/>
    ${watermark(c.trim)}
    ${mantle(c)}
    ${hairBack(c)}
    ${neckHead(c)}
    ${face(c)}
    ${headgear(c)}
    <rect width="100" height="100" fill="url(#${gid}-vig)"/>
    <circle cx="88" cy="12" r="6.5" fill="#000" opacity="0.35"/>
    <circle cx="88" cy="12" r="4" fill="${c.badge}"/>
    <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="9.25" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5"/>
  </g>
</svg>`;
}

let n = 0;
for (const [id, c] of Object.entries(LEADERS)) {
  writeFileSync(resolve(OUT, `${id}.svg`), svg(id, c).trim() + '\n');
  n++;
}
console.log(`wrote ${n} portraits to ${OUT}`);
