// Pixel-art sprites (16×16) for roles, jokers and story moments, drawn once to a canvas.
window.SPR = (function () {
  'use strict';
  const PAL = {
    k: '#1b2326', W: '#ffffff', w: '#f3ebd9', s: '#f2c29b', S: '#d38f63', r: '#fe5f55', R: '#b8433c',
    b: '#009dff', B: '#0b6aa8', g: '#f5b244', G: '#b98227', n: '#9a6a45', N: '#5b3a25', e: '#8ea2a8',
    E: '#4c5b60', l: '#c9d6da', p: '#8a6ac9', P: '#5e4791', v: '#35bd86', V: '#24835c', o: '#ff9a3c',
    y: '#ffe066', m: '#ff8fb1', D: '#2c393c',
  };
  const DATA = {
    shown: [
      '................', '.....kkkkkk.....', '....kEEEEEEk....', '....kEEEEEEk....',
      '...kRRRRRRRRk...', '.kkkkkkkkkkkkkk.', '...kssssssssk...', '...kskksskksk.l.',
      '...kssssssRsk.l.', '...ksssSSsssk.l.', '....kssssssk..l.', '..kkEEkrrkEEkkN.',
      '.kEEEEkrrkEEEEk.', '.kEEEEEkkEEEEEk.', '.kEEEEEEEEEEEEk.', '.kkkkkkkkkkkkkk.',
    ],
    hidden: [
      '................', '......kkkk......', '.....kPPPPk.....', '....kPPPPPPk....',
      '...kPPkkkkPPk...', '...kPkkkkkkPk...', '...kPkrkkrkPk...', '...kPkkkkkkPk...',
      '...kPPkkkkPPk...', '..kPPPPPPPPPPk..', '.kPPPPPPPPPPPPk.', '.kPPPPPkkPPPPPk.',
      '.kPPPPklWkPPPPk.', '.kPPPPklWkPPPPk.', '.kPPPPPkGkPPPPk.', '.kkkkkkkkkkkkkk.',
    ],
    butcher: [
      '................', '.....kkkkkk.....', '....kssssssk....', '...kssssssssk...',
      '...kskksskksk...', '...kssssssssk...', '...ksNNNNNNsk...', '...ksssSSsssk...',
      '....kssssssk....', '..kkkWWWWWWkkk..', '.ksskWWrrWWkssk.', '.ksskWWWWWWkssk.',
      '.kkkkWWWWWWkkllk', '....kWWWWWWklllk', '....kWWWWWWkNkk.', '....kkkkkkkk....',
    ],
    detective: [
      '................', '.....kkkkkk.....', '....knnnnnnk....', '...kNNNNNNNNk...',
      '.kkknnnnnnnnkkk.', '...kssssssssk...', '...kskksskksk...', '...kssssssssk...',
      '...kssSSSSssk...', '....kssssssk....', '..kknnkWWknnkk..', '.knnnnkWWknkkk..',
      '.knnnnnkknkbbbk.', '.knnnnnnnnkbbbk.', '.knnnnnnnnnkkkN.', '.kkkkkkkkkkk..N.',
    ],
    snitch: [
      '................', '..kkk......kkk..', '.kemmk....kmmek.', '.kemmekkkkemmek.',
      '..keeeeeeeeeek..', '..keekeeeekeek..', '..keeeeeeeeeek..', '...keeelleeek...',
      'l..kelllllllk..l', '.l..kllmmllk..l.', '.....kllllk.....', '....keeeeeek....',
      '...keeWWWWeek...', '...keeWkkWeek...', '...keeWWWWeek.mk', '....kkkkkkkk.mk.',
    ],
    doctor: [
      '................', '.....kkkkkk.....', '....kNNNNNNk....', '...kNlllllNNk...',
      '...kslWWlsssk...', '...ksllllsssk...', '...kskksskksk...', '...kssssssssk...',
      '...ksssSSsssk...', '....kssssssk....', '..kkWWkbbkWWkk..', '.kWWWWkbbkWWWWk.',
      '.kWWrWWkkWWWWWk.', '.kWrrrWWWWWWWWk.', '.kWWrWWWWWWWWWk.', '.kkkkkkkkkkkkkk.',
    ],
    mayor: [
      '....kkkkkkkk....', '....kDDDDDDk....', '....kDDDDDDk....', '....kggggggk....',
      '..kkkkkkkkkkkk..', '...kssssssssk...', '...kskksskksk...', '...kssssssssk...',
      '...kNNNssNNNk...', '....kssssssk....', '..kkbbkWWkbbkk..', '.kbbbrkWWkbbbbk.',
      '.kbbbbrkkbbbbbk.', '.kbbbbbrrbbgbbk.', '.kbbbbbbrrbbbbk.', '.kkkkkkkkkkkkkk.',
    ],
    trela: [
      '.k.kk..kk..kk.k.', 'kpkppkkppkkppkpk', 'kpppppppppppppk.', '.kpppssssssppk..',
      'kppksssssssskppk', 'kppkWkssssWkkppk', 'kppksssssssskppk', 'kppkskkkkkkskppk',
      'kppksWWWWWWskppk', 'kppkskkkkkkskppk', '.kpksssssssskpk.', '..kkkkkkkkkkkk..',
      '.kpppkmmmmkpppk.', '.kppppkmmkppppk.', '.kpppppkkpppppk.', '.kkkkkkkkkkkkkk.',
    ],
    citizen: [
      '................', '................', '.....kkkkkk.....', '....knnnnnnk....',
      '...knnnnnnnnk...', '...kssssssssk...', '...kskksskksk...', '...kssssssssk...',
      '...ksssSSsssk...', '....kssssssk....', '..kkkbbbbbbkkk..', '.kbbbbbbbbbbbbk.',
      '.kbbbbbbbbbbbbk.', '.kbbbkbbbbkbbbk.', '.kbbbkbbbbkbbbk.', '.kkkkkkkkkkkkkk.',
    ],
    graves: [
      '................', '.....kkkkkk.....', '....keeeeeek....', '...keeeeeeeek...',
      '...keeekkeeek...', '...keekkkkeek...', '...keeekkeeek...', '...keeekkeeek...',
      '...keeeeeeeek...', '...keEEEEEEek...', '...keeeeeeeek...', '...keEEEEEEek...',
      '...keeeeeeeek...', '.kVVVVVVVVVVVVk.', '.kvVvVvVvVvVvVk.', '.kkkkkkkkkkkkkk.',
    ],
    lovers: [
      '................', '................', '..kkkk....kkkk..', '.krrrrk..krrrrk.',
      'krrWrrrkkrrrrrrk', 'krWrrrrrrrrrrrrk', 'krrrrrrrrrrrrrrk', '.krrrrrrrrrrrrk.',
      '..krrrrrrrrrrk..', '...krrrrrrrrk...', '....krrrrrrk....', '.....krrrrk.....',
      '......krrk......', '.......kk.......', '................', '................',
    ],
    fog: [
      '................', '................', '......kkkk......', '....kkllllkk....',
      '...kllllllllk...', '.kkklllllllllkk.', 'kllllllllllllllk', 'kllllllllllllllk',
      '.kkkkkkkkkkkkkk.', '................', '..kkkkkkkkkkk...', '.keeeeeeeeeeek..',
      '..kkkkkkkkkkk...', '................', '....kkkkkkkkk...', '................',
    ],
    words: [
      '................', '.......kk.......', '......kyyk......', '......kyok......',
      '.....kyoook.....', '......kook......', '.......kk.......', '......kwwk......',
      '......kwwk......', '.....kwwwwk.....', '.....kwwWwk.....', '.....kwwwwk.....',
      '.....kwwwwk.....', '...kkkkkkkkkk...', '...kGGGGGGGGk...', '...kkkkkkkkkk...',
    ],
    second: [
      '................', '.....kkkkk......', '....kbbbbbk.....', '...kbbkkkbbk....',
      '..kbbk...kbbk...', '..kbk.....kbk...', '..kbk....kbbbbk.', '..kbk.....kbbk..',
      '..kbk......kk...', '..kbbk..........', '...kbbk....kk...', '....kbbkkkbbk...',
      '.....kbbbbbk....', '......kkkkk.....', '................', '................',
    ],
    iron: [
      '................', '.......kk.......', '......kggk......', '.kkkkkkggkkkkkk.',
      '.kgggggggggggggk', '.k.k...kk...k.k.', 'k...k..kk..k...k', 'k...k..kk..k...k',
      'kkkkk..kk..kkkkk', 'kgggk..kk..kgggk', '.kkk...kk...kkk.', '.......kk.......',
      '.......kk.......', '.....kkkkkk.....', '....kggggggk....', '....kkkkkkkk....',
    ],
    moon: [
      '................', '.....kkkk.......', '...kkyyyyk......', '..kyyyyykk......',
      '..kyyyyk........', '.kyyyyk.........', '.kyyyk..........', '.kyyyk..........',
      '.kyyyk..........', '.kyyyyk.........', '..kyyyyk........', '..kyyyyykk......',
      '...kkyyyyyk.....', '.....kkkkk......', '................', '................',
    ],
    sun: [
      '................', '.......o........', '..o....o....o...', '...o.kkkkk.o....',
      '....kyyyyyk.....', '...kyyyyyyyk....', '...kyyyyyyyk....', '.ookyyyyyyykoo..',
      '...kyyyyyyyk....', '...kyyyyyyyk....', '....kyyyyyk.....', '...o.kkkkk.o....',
      '..o....o....o...', '.......o........', '................', '................',
    ],
    skull: [
      '................', '....kkkkkkk.....', '...kWWWWWWWk....', '..kWWWWWWWWWk...',
      '..kWWWWWWWWWk...', '..kWkkkWkkkWk...', '..kWkkkWkkkWk...', '..kWWWWkWWWWk...',
      '...kWWkkkWWk....', '....kWWWWWk.....', '....kWkWkWk.....', '....kkkkkkk.....',
      '................', '................', '................', '................',
    ],
    ballot: [
      '................', '................', '......kkkk......', '......kWWk......',
      '......kWkk......', '......kWWk......', '..kkkkkWWkkkkk..', '..kBBBkkkkBBBk..',
      '..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..', '..kbbbWWWWbbbk..', '..kbbbbbbbbbbk..',
      '..kbbbbbbbbbbk..', '..kkkkkkkkkkkk..', '................', '................',
    ],
    trophy: [
      '................', '..kkkkkkkkkkkk..', 'kkkgggggggggykkk', 'kg.kggggggggk.gk',
      'kg.kggggggggk.gk', '.kgkggggggggkgk.', '..kkggggggggkk..', '....kggggggk....',
      '.....kggggk.....', '......kggk......', '......kGGk......', '.....kGGGGk.....',
      '....kkkkkkkk....', '....kGGGGGGk....', '....kkkkkkkk....', '................',
    ],
    card: [
      '................', '...kkkkkkkkkk...', '...kwwwwwwwwk...', '...kwrwwwwwwk...',
      '...kwwwwwwwwk...', '...kwwwrrwwwk...', '...kwwrrrrwwk...', '...kwrrrrrrwk...',
      '...kwrrrrrrwk...', '...kwwrrrrwwk...', '...kwwwrrwwwk...', '...kwwwwwwwwk...',
      '...kwwwwwwrwk...', '...kwwwwwwwwk...', '...kkkkkkkkkk...', '................',
    ],
    hourglass: [
      '................', '...kkkkkkkkkk...', '...kNNNNNNNNk...', '...kkkkkkkkkk...',
      '....kyyyyyyk....', '....klyyyylk....', '.....klyylk.....', '......klyk......',
      '......kyyk......', '.....klyylk.....', '....kllyylk.....', '....kyyyyyyk....',
      '...kkkkkkkkkk...', '...kNNNNNNNNk...', '...kkkkkkkkkk...', '................',
    ],
  };
  // story moments reuse the role and joker art where it fits
  const ALIAS = { title: 'shown', info: 'hidden', night: 'moon', dawn: 'sun', death: 'skull', saved: 'doctor', silence: 'butcher', rumour: 'snitch', day: 'hourglass', vote: 'ballot', win: 'trophy', reveal: 'card', quiet: 'fog' };
  const cache = {};
  function url(name) {
    name = ALIAS[name] || name;
    if (cache[name]) return cache[name];
    const rows = DATA[name]; if (!rows) return '';
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, y, 1, 1); } }));
    return (cache[name] = c.toDataURL());
  }
  function img(name, size, cls) {
    const u = url(name);
    return u ? `<img class="spr ${cls || ''}" src="${u}" width="${size}" height="${size}" alt="">` : '';
  }
  return { url, img, DATA, PAL };
})();
