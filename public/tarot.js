// Tarot-style symbols (SVG, 64×64) for role cards, joker cards and story moments.
// They draw in currentColor, so the card decides the colour (gold on dark).
window.TAROT = (function () {
  'use strict';
  const BG = 'var(--tarot-bg, #15151f)'; // used to "cut" holes into filled shapes
  const S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="currentColor"';
  const dagger = (x = 0, y = 0, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})">
      <path ${F} d="M32 4 L37.5 35 L32 39 L26.5 35Z"/><path d="M32 8 L32 34" stroke="${BG}" stroke-width="1.2" opacity=".6"/>
      <rect ${F} x="19" y="37" width="26" height="4.5" rx="2.2"/><rect ${F} x="29" y="41" width="6" height="12" rx="2"/>
      <circle ${F} cx="32" cy="56.5" r="3.6"/></g>`;
  const SYM = {
    shown: `${dagger()}<path ${F} d="M47 16c3.2 4.6 3.6 7.4 0 9.2c-3.6-1.8-3.2-4.6 0-9.2Z"/><path ${F} d="M16 26c2.4 3.4 2.7 5.5 0 6.8c-2.7-1.3-2.4-3.4 0-6.8Z"/>`,
    hidden: `${dagger()}<path ${F} d="M8 22c8-6 16-6 24 0s16 6 24 0v9c-8 6-16 6-24 0s-16-6-24 0Z"/>
      <path d="M8 26.5c8-6 16-6 24 0s16 6 24 0" stroke="${BG}" stroke-width="1.4" fill="none" opacity=".7"/>`,
    butcher: `<path ${F} d="M10 14h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H16l-6-5Z"/><circle cx="37" cy="20" r="2.6" fill="${BG}"/>
      <path ${S} stroke-width="2" d="M14 34h24" opacity=".35"/><rect ${F} x="44" y="22" width="16" height="7" rx="3.5"/>
      <circle cx="49" cy="25.5" r="1.3" fill="${BG}"/><circle cx="55" cy="25.5" r="1.3" fill="${BG}"/>`,
    detective: `<circle ${S} stroke-width="5" cx="26" cy="26" r="15"/><path ${S} stroke-width="7.5" d="M37.5 37.5L55 55"/>
      <path ${S} stroke-width="2.5" d="M18 21a9 9 0 0 1 8-6" opacity=".7"/>`,
    snitch: `<path ${S} stroke-width="3.5" d="M5 32C14 19 23 14 32 14s18 5 27 18C50 45 41 50 32 50S14 45 5 32Z"/>
      <circle ${F} cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="4" fill="${BG}"/><circle ${F} cx="35.5" cy="28.5" r="1.8"/>
      <path ${S} stroke-width="2.5" d="M32 4v5M18 7l2.5 4.5M46 7l-2.5 4.5"/>`,
    doctor: `<circle ${S} stroke-width="3" cx="32" cy="32" r="26"/><path ${F} d="M27 12h10v15h15v10H37v15H27V37H12V27h15Z"/>`,
    mayor: `<path ${F} d="M9 46L13 18l11 12 8-18 8 18 11-12 4 28Z"/><rect ${F} x="9" y="48" width="46" height="7" rx="2"/>
      <circle ${F} cx="13" cy="15" r="3"/><circle ${F} cx="32" cy="9" r="3"/><circle ${F} cx="51" cy="15" r="3"/>
      <circle cx="32" cy="38" r="3.2" fill="${BG}"/><circle cx="20" cy="40" r="2.2" fill="${BG}"/><circle cx="44" cy="40" r="2.2" fill="${BG}"/>`,
    trela: `<path ${F} d="M13 44C14 30 10 20 4 14c11 3 17 10 19 20 0-12 4-21 9-27 5 6 9 15 9 27 2-10 8-17 19-20-6 6-10 16-9 30Z"/>
      <rect ${F} x="12" y="45" width="40" height="7" rx="3"/><circle ${F} cx="4" cy="13" r="3.4"/><circle ${F} cx="32" cy="5" r="3.4"/><circle ${F} cx="60" cy="13" r="3.4"/>
      <path d="M22 48.5h4M30 48.5h4M38 48.5h4" stroke="${BG}" stroke-width="2.4" stroke-linecap="round"/>`,
    citizen: `<path ${F} d="M10 30L32 11l22 19v25H10Z"/><rect x="27.5" y="39" width="9" height="16" rx="1" fill="${BG}"/>
      <rect x="16" y="33" width="7" height="7" fill="${BG}"/><rect x="41" y="33" width="7" height="7" fill="${BG}"/><rect ${F} x="42" y="13" width="5" height="10"/>`,
    graves: `<path ${F} d="M17 54V27a15 15 0 0 1 30 0v27Z"/><path d="M32 22v20M24.5 29h15" stroke="${BG}" stroke-width="3.6" stroke-linecap="round"/>
      <path ${S} stroke-width="3" d="M6 57h52"/><path ${S} stroke-width="2" d="M12 57l2-5M50 57l2-5M44 57l1.5-4"/>`,
    lovers: `<path ${F} d="M24 50C8 39 6 26 15 22.5c4.5-1.8 7.7.8 9 3.8 1.3-3 4.5-5.6 9-3.8C42 26 40 39 24 50Z" opacity=".55"/>
      <path ${F} d="M40 44C24 33 22 20 31 16.5c4.5-1.8 7.7.8 9 3.8 1.3-3 4.5-5.6 9-3.8C58 20 56 33 40 44Z"/>
      <path ${S} stroke-width="2.8" d="M6 54L58 10"/><path ${F} d="M58 10l-9 1.5 3 3 1.5 3Z"/><path ${S} stroke-width="2.4" d="M6 54l-1-6M6 54l6 1"/>`,
    fog: `<path ${S} stroke-width="4" d="M8 20c6-5 12-5 18 0s12 5 18 0 10-4 12-2M6 34c6-5 12-5 18 0s12 5 18 0 12-5 16-3M10 48c6-5 12-5 18 0s12 5 18 0"/>`,
    words: `<path ${F} d="M32 5c6 7.5 7 12.5 0 17-7-4.5-6-9.5 0-17Z"/><path d="M32 14c2 3 2 5 0 6.5-2-1.5-2-3.5 0-6.5Z" fill="${BG}"/>
      <path ${S} stroke-width="2" d="M32 22v4"/><rect ${F} x="25" y="26" width="14" height="24" rx="2"/><path d="M29 30v10" stroke="${BG}" stroke-width="2" stroke-linecap="round" opacity=".6"/>
      <path ${F} d="M16 50h32l-4 7H20Z"/>`,
    second: `<path ${S} stroke-width="5" d="M50 26A19 19 0 1 0 51 38"/><path ${F} d="M57 14l-1.5 16-15-5.5Z"/>`,
    iron: `<path ${S} stroke-width="3.5" d="M32 9v42M12 17h40M12 17L5 36M12 17l7 19M52 17l-7 19M52 17l7 19"/>
      <path ${F} d="M3 36h18a9 7 0 0 1-18 0ZM43 36h18a9 7 0 0 1-18 0Z"/><path ${F} d="M22 52h20l3 6H19Z"/><circle ${F} cx="32" cy="8" r="3.4"/>`,
    moon: `<path ${F} d="M41 7a25 25 0 1 0 16 41A21 21 0 0 1 41 7Z"/><circle ${F} cx="50" cy="16" r="1.6"/><circle ${F} cx="56" cy="27" r="1.1"/>`,
    sun: `<circle ${F} cx="32" cy="32" r="11"/><path ${S} stroke-width="4" d="M32 5v9M32 50v9M5 32h9M50 32h9M13 13l6.5 6.5M44.5 44.5L51 51M51 13l-6.5 6.5M19.5 44.5L13 51"/>`,
    skull: `<path ${F} d="M32 8C18 8 11 18 11 28c0 7 3.5 11 7 13v8h28v-8c3.5-2 7-6 7-13 0-10-7-20-21-20Z"/>
      <circle cx="23.5" cy="29" r="5.5" fill="${BG}"/><circle cx="40.5" cy="29" r="5.5" fill="${BG}"/><path d="M32 35l-3 6h6Z" fill="${BG}"/>
      <path d="M25 49v-5M32 49v-5M39 49v-5" stroke="${BG}" stroke-width="2.4"/><path ${F} d="M18 52h28v4H18Z"/>`,
    ballot: `<rect ${F} x="9" y="30" width="46" height="26" rx="3"/><rect x="20" y="33" width="24" height="3.5" rx="1.5" fill="${BG}"/>
      <path ${F} d="M22 34V9h20v25Z"/><path d="M26 16h12M26 22h12M26 28h7" stroke="${BG}" stroke-width="2.4" stroke-linecap="round"/>`,
    trophy: `<path ${F} d="M18 8h28v14c0 9-6 16-14 16s-14-7-14-16Z"/><path ${S} stroke-width="3.5" d="M18 13H9c0 9 5 13 10 13M46 13h9c0 9-5 13-10 13"/>
      <rect ${F} x="29" y="37" width="6" height="9"/><path ${F} d="M20 56l3-10h18l3 10Z"/><path d="M26 15v10" stroke="${BG}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`,
    card: `<rect ${S} stroke-width="3.5" x="15" y="7" width="34" height="50" rx="4"/><path ${F} d="M32 18l9 14-9 14-9-14Z"/>`,
    hourglass: `<path ${S} stroke-width="3.5" d="M14 6h36M14 58h36"/><path ${S} stroke-width="3" d="M18 7c0 13 14 17 14 25S18 44 18 57M46 7c0 13-14 17-14 25s14 12 14 25"/>
      <path ${F} d="M22 14h20c-2 6-7 9-10 13-3-4-8-7-10-13ZM20 56c1-7 7-10 12-13 5 3 11 6 12 13Z"/>`,
  };
  const ALIAS = { ritual: 'moon', title: 'shown', info: 'hidden', night: 'moon', dawn: 'sun', death: 'skull', saved: 'doctor', silence: 'butcher', rumour: 'snitch', day: 'hourglass', vote: 'ballot', win: 'trophy', reveal: 'card', quiet: 'fog' };
  // tarot numerals for the role and joker cards
  const NUM = { trela: '0', mayor: 'IV', lovers: 'VI', detective: 'IX', doctor: 'XIV', shown: 'XV', butcher: 'XVI', hidden: 'XIII', snitch: 'XVIII', citizen: 'XIX', graves: 'XX', words: 'III', fog: 'II', second: 'X', iron: 'XI' };
  function svg(name, size, cls) {
    const body = SYM[ALIAS[name] || name]; if (!body) return '';
    return `<svg class="sym ${cls || ''}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
  }
  return { svg, NUM, has: n => !!SYM[ALIAS[n] || n] };
})();
