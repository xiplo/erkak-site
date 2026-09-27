// ERKAK · силуэты рыб и иконки. Общий файл для браузера и build.mjs (ART — глобальная константа).
// Силуэты в viewBox 0 0 240 100, голова справа. Вырезы (глаз, жабра) рисуются цветом фона: class="cut".
var ART = (function(){
  const F = {
    sailfish: {
      body:'M6,30Q20,44 34,50Q20,56 6,70Q15,58 15,50Q15,42 6,30ZM34,50Q70,40 120,42Q160,40 186,46L236,49L186,53Q160,60 120,60Q70,61 34,50ZM64,45Q74,10 104,6Q146,6 176,45Q130,40 64,45ZM138,58L124,86L148,60ZM170,54L148,68L168,55ZM96,59L104,70L112,60Z',
      cut:'<circle cx="179" cy="48" r="1.8"/><path d="M168,44Q164,50 168,56" fill="none" stroke-width="1.4"/>'
    },
    marlin: {
      body:'M4,22Q22,42 38,50Q22,58 4,78Q16,60 17,50Q16,40 4,22ZM38,50Q76,34 128,36Q170,36 192,44L238,49L192,54Q170,64 128,64Q76,66 38,50ZM120,37Q130,14 146,10Q154,24 162,38ZM60,43L70,38L72,44ZM146,62L132,84L154,63ZM176,55L150,70L172,57ZM92,63L100,74L108,63Z',
      cut:'<circle cx="184" cy="47" r="2"/><path d="M172,42Q167,50 172,58" fill="none" stroke-width="1.4"/>'
    },
    gt: {
      body:'M6,20Q22,42 40,50Q22,58 6,80Q20,62 22,50Q20,38 6,20ZM40,50Q64,38 96,25Q142,8 186,22Q208,32 214,48Q212,60 200,65Q168,80 120,76Q78,70 40,50ZM100,22Q108,8 130,8Q146,10 160,16Q128,14 100,22ZM78,63Q100,84 132,78Q116,74 100,66ZM66,44L50,48L66,47Z',
      cut:'<circle cx="196" cy="38" r="2.6"/><path d="M182,30Q176,48 184,62" fill="none" stroke-width="1.6"/><path d="M176,52Q156,44 142,46" fill="none" stroke-width="1.2"/>'
    },
    tuna: {
      body:'M4,22Q26,42 42,50Q26,58 4,78Q18,60 20,50Q18,40 4,22ZM42,50Q80,28 140,29Q192,31 224,48Q226,52 222,54Q192,69 140,71Q80,72 42,50ZM118,31Q124,6 134,2Q134,18 140,30ZM118,69Q124,94 134,98Q134,82 140,70ZM150,31Q166,18 186,33ZM56,44L62,39L64,45ZM68,41L74,36L76,42ZM80,38L86,33L88,39ZM96,36L102,31L104,37ZM56,56L62,61L64,55ZM68,59L74,64L76,58ZM80,62L86,67L88,61ZM96,64L102,69L104,63Z',
      cut:'<circle cx="206" cy="45" r="2.4"/><path d="M194,38Q188,50 194,62" fill="none" stroke-width="1.5"/><path d="M186,51Q156,54 128,62" fill="none" stroke-width="1.3"/>'
    },
    mahi: {
      body:'M4,24Q22,44 36,50Q22,56 4,76Q15,60 17,50Q15,40 4,24ZM36,50Q52,44 84,40Q146,30 202,22Q218,26 218,44Q218,58 206,64Q150,68 84,63Q52,58 36,50ZM48,45Q60,34 92,30Q150,16 204,21L198,26Q140,30 84,40ZM50,56Q72,72 124,68L112,64Z',
      cut:'<circle cx="206" cy="38" r="2.4"/><path d="M194,30Q188,46 196,60" fill="none" stroke-width="1.4"/>'
    },
    barracuda: {
      body:'M6,32Q18,46 30,50Q18,54 6,68Q14,57 14,50Q14,43 6,32ZM30,50Q62,43 120,42Q190,41 234,48L236,52Q204,57 190,57Q120,59 60,57Q42,55 30,50ZM148,43L156,32L166,43ZM58,47L66,37L76,46ZM62,56L70,65L80,57ZM166,56L154,64L170,57Z',
      cut:'<circle cx="214" cy="47" r="1.8"/><path d="M200,44Q197,50 200,56" fill="none" stroke-width="1.2"/>'
    },
    catfish: {
      body:'M4,32Q20,44 32,50Q20,58 4,70Q12,58 12,50Q12,42 4,32ZM32,50Q60,36 120,32Q182,30 216,46Q222,52 216,58Q182,72 120,70Q60,66 32,50ZM150,33L160,16L174,33ZM212,57Q228,60 236,72Q224,64 211,60ZM214,54Q230,52 238,58Q226,56 214,56ZM60,62Q90,74 130,70Z',
      cut:'<circle cx="200" cy="46" r="2"/><path d="M188,40Q184,52 190,62" fill="none" stroke-width="1.3"/>'
    },
    snakehead: {
      body:'M8,38Q0,50 8,62Q22,64 30,50Q22,36 8,38ZM28,50Q42,40 100,38Q170,36 216,44Q228,50 216,58Q170,66 100,64Q42,62 28,50ZM38,44Q100,24 184,36L184,39Q100,38 38,46ZM38,56Q92,72 156,64Q100,62 38,54Z',
      cut:'<circle cx="208" cy="46" r="1.8"/><path d="M196,42Q193,50 197,58" fill="none" stroke-width="1.2"/>'
    },
    carp: {
      body:'M6,24Q22,42 38,50Q22,58 6,76Q18,60 20,50Q18,40 6,24ZM38,50Q60,32 110,22Q160,16 196,32Q214,42 214,52Q210,64 190,70Q150,82 104,76Q60,68 38,50ZM92,24Q110,6 150,14L160,20Q124,18 92,24ZM80,70L92,84L108,74Z',
      cut:'<circle cx="196" cy="42" r="2.4"/><path d="M182,34Q176,50 184,64" fill="none" stroke-width="1.5"/>'
    },
    ray: {
      body:'M58,50Q66,12 128,10Q196,12 206,50Q196,88 128,90Q66,88 58,50ZM60,49L2,52L60,52Z',
      cut:'<circle cx="170" cy="42" r="2.2"/><circle cx="170" cy="58" r="2.2"/><path d="M140,30Q120,50 140,70" fill="none" stroke-width="1" stroke-opacity=".5"/>'
    },
    grouper: {
      body:'M8,30Q12,50 8,70Q24,64 38,52Q24,38 8,30ZM36,52Q56,30 110,26Q170,22 208,40Q220,48 216,58Q204,72 160,76Q96,80 36,52ZM70,34Q110,12 176,26L170,30Q120,26 70,36ZM84,70L100,84L120,74Z',
      cut:'<circle cx="198" cy="42" r="2.6"/><path d="M182,34Q176,52 186,66" fill="none" stroke-width="1.5"/><path d="M216,54L204,56" stroke-width="1.4"/>'
    }
  };
  function fish(kind, cls){
    const f = F[kind] || F.gt;
    return `<svg class="fish ${cls||''}" viewBox="0 0 240 100" aria-hidden="true"><path fill="currentColor" d="${f.body}"/><g class="cut" fill="var(--cut,#071E2A)" stroke="var(--cut,#071E2A)">${f.cut}</g></svg>`;
  }
  const I = {
    boat:'<path d="M3 17l2 3h14l2-3M5 17l1-6h12l1 6M9 11V6l6 2-6 2"/>',
    rod:'<path d="M4 20L18 4M18 4v9a3 3 0 0 1-3 3M7 17l-2 2"/>',
    cam:'<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l2-3h4l2 3"/>',
    chef:'<path d="M6 14a4 4 0 1 1 2-7.5A4 4 0 0 1 16 6a4 4 0 1 1 2 8v6H6z"/><path d="M6 17h12"/>',
    car:'<path d="M3 16l2-6h14l2 6v3H3zM7 19v2M17 19v2"/><circle cx="7.5" cy="15.5" r="1"/><circle cx="16.5" cy="15.5" r="1"/>',
    home:'<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
    shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    wave:'<path d="M2 12c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 18c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
    phone:'<path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    plane:'<path d="M2 16l20-8-8 12-2-6z"/>',
    medic:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M9 6V4h6v2M12 10v6M9 13h6"/>',
    star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    tg:'<path d="M21.5 4.5L2.8 11.7c-1 .4-1 1.8.1 2.1l4.7 1.5 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.9 3.6c.8.6 2 .1 2.2-.9l3-15.1c.2-1.2-.9-2.1-2.6-1.8zM9.3 15l9-7.8-7.2 9.2-.4 3.3z" fill="currentColor" stroke="none"/>',
    wa:'<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" fill="currentColor" stroke="none"/>'
  };
  function icon(name, cls){ return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]||''}</svg>`; }
  const logo = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#14C4B4"/><rect x="11" y="15" width="26" height="2.6" rx="1.3" fill="#03111A" opacity=".75"/><rect x="11" y="23" width="26" height="2.6" rx="1.3" fill="#03111A" opacity=".75"/><rect x="11" y="31" width="26" height="2.6" rx="1.3" fill="#03111A" opacity=".75"/><circle cx="30" cy="24.3" r="5" fill="#FF5A36" stroke="#03111A" stroke-width="2"/></svg>';
  // Крупные глифы направлений (viewBox 0 0 64 64, линия).
  const G = {
    glove:'<path d="M17 33c0-12 8-20 20-20 9 0 15 6 15 15v6c0 8-6 13-14 13H25"/><path d="M17 33c0 7 4 12 11 12h7"/><path d="M22 47h19v8H22z"/><path d="M31 23c3-1 7-1 10 1"/>',
    kettle:'<path d="M21 28c-3-10 3-17 11-17s14 7 11 17"/><circle cx="32" cy="40" r="15"/><path d="M24 55h16"/>',
    pulse:'<path d="M32 52S11 40 11 25a10 10 0 0 1 21-4 10 10 0 0 1 21 4c0 15-21 27-21 27z"/><path d="M14 33h10l4-8 6 14 4-6h12"/>',
    leaf:'<path d="M13 51C13 27 29 14 52 12c0 25-13 39-39 39z"/><path d="M13 51l24-24M28 36h9M22 42v-9"/>',
    snow:'<path d="M32 9v46M12 20l40 24M12 44l40-24M26 13l6 6 6-6M26 51l6-6 6 6M12 28l8-2-2-8M52 36l-8 2 2 8"/>',
    enso:'<path d="M50 30A19 19 0 1 1 40 15"/><circle cx="46" cy="18" r="2.5"/><path d="M26 38c3 3 9 3 12 0"/>',
    mountain:'<path d="M5 52l19-30 10 15 8-11 17 26z"/><path d="M19 30l5 5 4-5M38 32l4 4 3-4"/>',
    wave:'<path d="M6 36c6 0 6-6 13-6s7 6 13 6 7-6 13-6 7 6 13 6M6 47c6 0 6-6 13-6s7 6 13 6 7-6 13-6 7 6 13 6"/><path d="M30 26c0-9 7-15 16-15"/>',
    flag:'<path d="M24 54V10l21 8-21 8"/><path d="M13 54h24"/><circle cx="46" cy="49" r="3"/>',
    spark:'<path d="M30 9l5 16 16 5-16 5-5 16-5-16-16-5 16-5z"/><path d="M49 44l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    capsule:'<path d="M20 44l22-22a9 9 0 0 1 13 13L33 57a9 9 0 0 1-13-13z"/><path d="M31 33l13 13"/><circle cx="16" cy="18" r="6"/><path d="M12 22l8-8"/>',
    duo:'<circle cx="22" cy="18" r="6"/><circle cx="44" cy="26" r="5"/><path d="M10 54c0-11 5-19 12-19s12 8 12 19M34 54c0-8 4-14 10-14s10 6 10 14"/>',
    case:'<rect x="9" y="21" width="46" height="31" rx="4"/><path d="M24 21v-6h16v6M9 34h46M29 34v5h6v-5"/>'
  };
  function glyph(name, cls){ if (name === 'fish') return fish('sailfish', cls); return `<svg class="glyph ${cls||''}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[name]||''}</svg>`; }
  // Фон постера: глубина + контуры дна, оттенок по «вайбу» тура.
  const TONES = { sea:['#0B3A4A','#04161F','#14C4B4'], deep:['#0B2340','#030C18','#4EA8FF'], sunset:['#4A1E2A','#120A14','#FF7A50'], jungle:['#123A2A','#06140E','#6FD18B'], gold:['#3A2C10','#110C04','#F2B544'], night:['#16163A','#05050F','#9A8CFF'] };
  function posterBg(tone){
    const [a,b,c] = TONES[tone] || TONES.sea;
    const id = 'g' + Math.random().toString(36).slice(2,8);
    return `<svg class="bg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="${id}r" cx=".8" cy="0" r=".9"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><rect width="400" height="250" fill="url(#${id})"/><rect width="400" height="250" fill="url(#${id}r)"/><g fill="none" stroke="${c}" stroke-opacity=".16" stroke-width="1"><path d="M0 200Q60 180 120 196T240 190T400 176"/><path d="M0 216Q80 196 150 212T300 204T400 196"/><path d="M0 232Q70 218 160 230T320 222T400 214"/></g><g fill="${c}" fill-opacity=".5"><circle cx="40" cy="60" r="1.2"/><circle cx="330" cy="40" r="1"/><circle cx="360" cy="120" r="1.4"/><circle cx="80" cy="140" r="1"/><circle cx="220" cy="30" r="1"/></g></svg>`;
  }
  return { fish, icon, glyph, logo, posterBg, TONES, kinds:Object.keys(F) };
})();
if (typeof module !== 'undefined') module.exports = ART;
