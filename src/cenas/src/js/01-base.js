/* ================================================================
   CENAS · TINY CATS — mesa de cenas do Sistema de RPG Tiny Cats (página única)

   Organização do código, na ordem em que aparece:
     1. Base ........ utilidades, ícones e constantes
     2. Store ....... estado serializável + operações (desfazer/refazer)
     3. Geo ......... geometria pura (interseções, polígono de visão)
        Walls ....... as paredes como valem na hora (abertura sobre parede, cortina)
     4. Assets/DB ... imagens e salvamento no navegador (IndexedDB)
     5. Vision ...... paredes, luz, escuridão e névoa (máscaras)
     6. FX .......... biblioteca de efeitos de magia
     7. Render ...... desenho no canvas
     8. Tools ....... ferramentas e gestos de mouse e teclado
     9. UI .......... painéis, menus e janelas
    10. Tour ........ tutorial de primeiro uso
    11. Boot ........ cena de exemplo e inicialização

   Para portar ao React + Supabase: Store, Geo, Walls, Vision e FX não dependem
   da interface. A costura de sincronização é Store.on('commit'), que
   entrega a lista de operações de cada alteração (uma linha por objeto:
   tokens, shapes, walls, lights, effects, fogOps; e os campos da cena).

   O que mora onde, pensando nas tabelas:
     - cena ....... grade, luz, névoa, permissões, turn (ordem de turnos: cada
                    entrada tem init, roll { d, b }, k = qual dos turnos do
                    combatente na rodada; as avulsas têm bonus e grp),
                    targets (miras), tone (hora do dia), weather (clima)
     - token ...... bars (lista livre: nome, cor, valor, máximo, estilo
                    'bar' ou 'pts', regra de quem vê), conds + cinfo
                    (contador e duração de cada condição), auras, visão, luz,
                    ini (bônus de iniciativa), turns (turnos por rodada, 1 a 4)
     - parede ..... k: wall | door | window | veil; porta secreta = door + secret
     - efeito ..... k: circ | quad | rect | cone | line; r, ang, w conforme a forma;
                    rw/rh (largura e altura do retângulo); dir; dur/dur0 (rodadas) e
                    at (de quem era a vez ao criar); apply (a última aplicação em
                    área feita por ele, para o botão Reaplicar)
     - mesa ....... Store.S.prefs: barDefaults (barras padrão dos tokens novos)
     - por pessoa . o que é só de quem está olhando e não vai para o banco:
                    câmera, seleção, App.showVision, tutorial visto
     - passageiro . pings e números de dano (App.pings, App.floats): no site,
                    viram mensagens de tempo real, não linhas de tabela
   ================================================================ */

/* ---------------------------------------------------------------
   1. BASE
   --------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const snapTo = (v, step) => Math.round(v / step) * step;
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });

let uidCount = 0;
const uid = (p = 'o') => p + '_' + Math.random().toString(36).slice(2, 9) + (uidCount++).toString(36);

function debounce(fn, ms) {
  let t = 0;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.now = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Cor legível (clara ou escura) para escrever sobre um fundo.
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#15181f' : '#ffffff';
}

function initials(name) {
  const w = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

// Dado honesto: um inteiro de 1 a n, todos com a mesma chance. Usa o sorteio do navegador (crypto) e descarta
// os valores que sobrariam na divisão (sem isso, alguns números sairiam um nada mais que os outros).
// Sem crypto, cai no Math.random.
function rollDie(n) {
  n = Math.max(1, Math.floor(n) || 1);
  const c = typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function' ? crypto : null;
  if (c) {
    try {
      const lim = Math.floor(4294967296 / n) * n, buf = new Uint32Array(1);
      for (let i = 0; i < 64; i++) { c.getRandomValues(buf); if (buf[0] < lim) return 1 + (buf[0] % n); }
    } catch (e) { /* sorteio indisponível: segue para o Math.random */ }
  }
  return 1 + Math.floor(Math.random() * n);
}

/* Gancho para o site que embute a mesa. Ext.roll, se existir, recebe cada rolagem feita aqui:
   { kind: 'iniciativa', name, tokenId, d, bonus, total }. Por enquanto só a iniciativa rola dados. */
const Ext = { roll: null };

// Gerador pseudoaleatório determinístico (para a cena de exemplo).
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- DOM ---- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let val;
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') val = v;
      else if (k === 'style' && typeof v === 'object') { for (const s in v) { if (s.startsWith('--')) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; } }
      else if (k === 'data') { for (const d in v) el.dataset[d] = v[d]; }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'open' || k === 'readOnly') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  addKids(el, kids);
  if (val !== undefined) el.value = val;
  return el;
}
function addKids(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) addKids(el, k);
    else el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}

// Onde está o foco do teclado: 'text' (digitando), 'range' (controle deslizante),
// 'control' (botão, caixa de marcar) ou 'none' (o mapa). Decide quais atalhos valem.
function focusKind(t) {
  if (!t || !t.tagName || t === document.body) return 'none';
  if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return 'text';
  if (t.tagName === 'INPUT') {
    const ty = String(t.type || 'text').toLowerCase();
    if (ty === 'range') return 'range';
    return ty === 'checkbox' || ty === 'radio' || ty === 'button' || ty === 'color' || ty === 'file' ? 'control' : 'text';
  }
  return t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || t.tagName === 'A' ? 'control' : 'none';
}

/* ---- Ícones (traço 24×24). Os mesmos caminhos servem ao DOM e ao canvas. ---- */
const ICONS = {
  select: 'M5 3l14 7.5-6 1.8L10.5 19z',
  pan: 'M12 3v18M3 12h18M12 3L9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5',
  token: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.3 18.6c1-2.4 3.1-3.8 5.7-3.8s4.7 1.4 5.7 3.8',
  pen: 'M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM14.5 6.5l3 3',
  line: 'M6.2 17.8L17.8 6.2M5 19m-1.7 0a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0M19 5m-1.7 0a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0',
  rect: 'M4 6h16v12H4z',
  ell: 'M12 19c4.4 0 8-3.1 8-7s-3.6-7-8-7-8 3.1-8 7 3.6 7 8 7z',
  poly: 'M12 3l8.5 6.2-3.2 10H6.7l-3.2-10z',
  text: 'M5 7V4h14v3M12 4v16M9 20h6',
  wall: 'M3 6h18v12H3zM3 12h18M12 6v6M8 12v6M16 12v6',
  door: 'M6 21V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V21M4 21h16M14.5 12.4v.2',
  doorOpen: 'M6 21V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V21M4 21h16M6 3.5l6 2.2v15.3',
  light: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
  fog: 'M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.25 4.25 0 0 1 .5 8.5z',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 5.7c.5-.1.9-.2 1.4-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.3 7.4A16.6 16.6 0 0 0 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.4 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  fx: 'M11 3l1.9 5.6 5.6 1.9-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  ruler: 'M3 16.5L16.5 3l4.5 4.5L7.5 21zM6 13.5l1.5 1.5M9 10.5l1.5 1.5M12 7.5l1.5 1.5',
  ping: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 12m-5.5 0a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M12 12m-9.2 0a9.2 9.2 0 1 0 18.4 0a9.2 9.2 0 1 0-18.4 0',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  unlock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.7-1.4',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M9 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.9c1.6.9 2.7 2.6 3 5.1',
  turns: 'M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9',
  image: 'M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 3-3 5 5M9 9.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  download: 'M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14',
  upload: 'M12 15.5V4.5M7.5 9L12 4.5 16.5 9M5 20h14',
  map: 'M9 4L3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 1 1 3.9 2.2c-.9.6-1.4 1.1-1.4 2.1M12 16.9v.2',
  more: 'M5 12v.2M12 12v.2M19 12v.2',
  center: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
  panel: 'M4 5h16v14H4zM15 5v14',
  front: 'M4 4h10v10H4zM10 14v6h10V10h-6',
  back: 'M10 10h10v10H10zM14 10V4H4v10h6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  play: 'M7 4.5l12 7.5-12 7.5z',
  stop: 'M6 6h12v12H6z',
  next: 'M5 5l9 7-9 7zM18 5v14',
  prev: 'M19 5l-9 7 9 7zM6 5v14',
  sort: 'M7 5v14M7 19l-3-3M7 19l3-3M13 6h8M13 11h6M13 16h4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  reset: 'M4 5v5h5M4.6 10A8 8 0 1 1 4 13.5',
  brush: 'M14 4l6 6-8.5 8.5a3 3 0 0 1-2 .9l-3 .1c-.9 0-1.6-.6-1.6-1.5l.1-3a3 3 0 0 1 .9-2zM11 7l6 6',
  shield: 'M12 3l7.5 2.8v5.4c0 4.6-3 8.3-7.5 9.8-4.5-1.5-7.5-5.2-7.5-9.8V5.8z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  area: 'M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M8 12h8M12 8v8',
  room: 'M4 5h16v14H4zM4 5m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M20 5m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M20 19m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M4 19m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
  window: 'M5 4h14v16H5zM12 4v16M5 12h14',
  windowOpen: 'M5 4h14v16H5zM5 4l4.500 2.500v11L5 20M19 4l-4.500 2.500v11L19 20',
  die: 'M12 2.800l8 4.600v9.200l-8 4.600-8-4.600V7.400zM12 8l4.600 7.600H7.400zM12 2.800V8M7.400 15.600L4 16.600M16.600 15.600l3.400 1',
  veil: 'M4 4h16M6 4c0 6-1.500 10-1.500 16M10 4c0 6 .5 10 .5 16M14 4c0 6-.5 10-.5 16M18 4c0 6 1.500 10 1.500 16',
  veilOpen: 'M4 4h16M5.500 4c0 7-.4 11-1.500 16M8.500 4c-.2 6-1.300 9.500-4.300 11.500M18.500 4c0 7 .4 11 1.500 16M15.500 4c.2 6 1.300 9.500 4.300 11.500',
  // Condições (as marcadas com fill são preenchidas)
  c_veneno: { d: 'M8 4c2 2.6 3.2 4.4 3.2 6.2a3.2 3.2 0 0 1-6.4 0C4.8 8.4 6 6.6 8 4zM16 10c2 2.6 3.2 4.4 3.2 6.2a3.2 3.2 0 0 1-6.4 0c0-1.8 1.2-3.6 3.2-6.2z', fill: true },
  c_sangue: { d: 'M12 3.5c3.2 4.2 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.3-5.800 5.5-10z', fill: true },
  c_atordoado: { d: 'M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.300L12 16.8 6.4 20.1l1.4-6.300L3 9.5l6.4-.6z', fill: true },
  c_caido: 'M12 4v12M6.500 11l5.500 5.500 5.500-5.500M5 20h14',
  c_fogo: { d: 'M12 3c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 1-3.200 2-4.500.3 1.600 1 2.400 1.800 2.600C10.600 9 10.800 6 12 3z', fill: true },
  c_gelo: 'M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2',
  c_cego: 'M3 3l18 18M10.6 5.7c.5-.1.9-.2 1.4-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.3 7.4A16.6 16.6 0 0 0 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.4 4.1-1',
  c_silencio: 'M12 20.500a8.500 8.500 0 1 0 0-17 8.500 8.500 0 0 0 0 17zM6 6l12 12',
  c_medo: 'M12 4v10M12 18.900v.2',
  c_paralisia: { d: 'M13.500 2.500L5 13.500h6l-1 8L18.500 10.500h-6z', fill: true },
  c_invisivel: 'M12 4a8 8 0 0 1 8 8M12 20a8 8 0 0 1-8-8M17.700 17.700a8 8 0 0 1-2.200 1.500M6.300 6.300a8 8 0 0 1 2.200-1.500',
  c_escudo: { d: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800z', fill: true },
  c_bencao: { d: 'M12 2.500l2.200 7.300 7.300 2.200-7.300 2.200L12 21.500l-2.200-7.300L2.500 12l7.300-2.200z', fill: true },
  c_maldicao: { d: 'M15.500 3.500a9 9 0 1 0 5 13.600A7.500 7.500 0 0 1 15.500 3.500z', fill: true },
  c_foco: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-2.500 0a2.500 2.500 0 1 0 5 0a2.500 2.500 0 1 0-5 0',
  c_morto: 'M6 6l12 12M18 6L6 18',
};

const SVGNS = 'http://www.w3.org/2000/svg';
function icon(name, size = 18) {
  const def = ICONS[name] || ICONS.help;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ic');
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', def.d || def);
  if (def.fill) { p.setAttribute('fill', 'currentColor'); p.setAttribute('stroke', 'none'); }
  else {
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', name === 'more' ? '2.6' : '1.8');
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  }
  svg.append(p);
  return svg;
}
const iconPaths = {};
function iconPath(name) {
  if (!iconPaths[name]) { const def = ICONS[name]; iconPaths[name] = new Path2D(def.d || def); }
  return iconPaths[name];
}

/* ---- Constantes do jogo ---- */
const FONT_UI = '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif';

// Barras de fábrica de um token novo. O mestre pode trocar essa lista em "Barras padrão";
// cada token pode ter até MAX_BARS barras, em estilo barra ('bar') ou pontos ('pts').
const MAX_BARS = 8;
const BAR_DEFAULTS = [
  { n: 'Vida', c: '#d6524b', v: 10, m: 10, k: 'bar', on: true, vis: '' },
  { n: 'SP', c: '#4a9be0', v: 10, m: 10, k: 'bar', on: false, vis: '' },
  { n: 'Energia', c: '#e2b23e', v: 10, m: 10, k: 'bar', on: false, vis: '' },
];
const BAR_COLORS = ['#d6524b', '#4a9be0', '#e2b23e', '#6fbf73', '#b07ad9', '#e58a4e', '#4fc3c0', '#d96aa0'];
function cleanBar(b) {
  const o = b || {};
  return {
    n: String(o.n == null ? 'Barra' : o.n).slice(0, 24) || 'Barra',
    c: /^#[0-9a-f]{6}$/i.test(o.c || '') ? o.c : BAR_COLORS[0],
    v: Math.max(0, Number(o.v) || 0), m: Math.max(0, Number(o.m) || 0),
    k: o.k === 'pts' ? 'pts' : 'bar',
    on: o.on !== false,
    vis: ['num', 'bar', 'none'].includes(o.vis) ? o.vis : '',     // '' = segue a regra do token
  };
}
function barDefaults() {
  const p = typeof Store !== 'undefined' ? Store.S.prefs.barDefaults : null;
  return (Array.isArray(p) && p.length ? p : BAR_DEFAULTS).slice(0, MAX_BARS).map(cleanBar);
}

// Combate: bônus de iniciativa (a rolagem é 1d20 + bônus) e turnos por rodada (chefes jogam mais de uma vez).
const MAX_TURNS = 4;
const clampTurns = v => clamp(Math.round(Number(v)) || 1, 1, MAX_TURNS);
const clampIni = v => clamp(Math.round(Number(v)) || 0, -99, 99);

const PLAYER_COLORS = ['#4fb8e0', '#ee8a4a', '#8fd05a', '#c084fc', '#ff7396', '#ffd25e'];
const TOKEN_COLORS = ['#7c8fb8', '#b87c7c', '#7cb88c', '#b8a77c', '#9b7cb8', '#7cb4b8', '#b88d7c', '#8a98a8'];

const CONDS = [
  { id: 'veneno', n: 'Envenenado', c: '#4ea84a', i: 'c_veneno' },
  { id: 'sangue', n: 'Sangrando', c: '#c93a3a', i: 'c_sangue' },
  { id: 'fogo', n: 'Queimando', c: '#e8792b', i: 'c_fogo' },
  { id: 'gelo', n: 'Congelado', c: '#5fb6e0', i: 'c_gelo' },
  { id: 'atordoado', n: 'Atordoado', c: '#d9a821', i: 'c_atordoado' },
  { id: 'paralisia', n: 'Paralisado', c: '#9a9f2e', i: 'c_paralisia' },
  { id: 'caido', n: 'Caído', c: '#8a6a4c', i: 'c_caido' },
  { id: 'cego', n: 'Cego', c: '#5a6072', i: 'c_cego' },
  { id: 'silencio', n: 'Silenciado', c: '#8b62c9', i: 'c_silencio' },
  { id: 'medo', n: 'Amedrontado', c: '#b0559f', i: 'c_medo' },
  { id: 'invisivel', n: 'Invisível', c: '#6f8aa6', i: 'c_invisivel' },
  { id: 'escudo', n: 'Protegido', c: '#3f7fc0', i: 'c_escudo' },
  { id: 'bencao', n: 'Abençoado', c: '#c9a227', i: 'c_bencao' },
  { id: 'maldicao', n: 'Amaldiçoado', c: '#5b3f8f', i: 'c_maldicao' },
  { id: 'foco', n: 'Concentrando', c: '#2f9d93', i: 'c_foco' },
  { id: 'morto', n: 'Morto', c: '#1c1c22', i: 'c_morto' },
];
const COND_BY_ID = Object.fromEntries(CONDS.map(c => [c.id, c]));

const LIGHT_PRESETS = [
  { id: 'vela', n: 'Vela', bright: 1, dim: 2, c: '#ffd9a0' },
  { id: 'tocha', n: 'Tocha', bright: 4, dim: 8, c: '#ffc477' },
  { id: 'lampiao', n: 'Lampião', bright: 6, dim: 12, c: '#ffe2ad' },
  { id: 'fogueira', n: 'Fogueira', bright: 5, dim: 10, c: '#ff9d4d' },
  { id: 'magica', n: 'Luz mágica', bright: 6, dim: 12, c: '#a9d4ff' },
];

const PERMS = [
  ['mover', 'Mover o próprio token'],
  ['barras', 'Editar as barras do próprio token'],
  ['condicoes', 'Editar as condições do próprio token'],
  ['auras', 'Editar as auras do próprio token'],
  ['desenhar', 'Desenhar e criar formas'],
  ['efeitos', 'Soltar efeitos de magia'],
  ['regua', 'Usar a régua'],
  ['ping', 'Usar o ping'],
  ['portas', 'Abrir e fechar portas, janelas e cortinas'],
  ['turnos', 'Ver a ordem de turnos'],
  ['mira', 'Marcar alvos com a mira'],
];

const WALL_KINDS = [
  ['wall', 'Parede'], ['door', 'Porta'], ['secret', 'Porta secreta'], ['window', 'Janela'], ['veil', 'Cortina'],
];
// Abertura: tudo o que não é parede comum (porta, porta secreta, janela, cortina). Toda abertura abre e fecha.
const isOpening = w => w.k === 'door' || w.k === 'window' || w.k === 'veil';
const wallOpen = w => isOpening(w) && !!w.open;
const OPENING_NAMES = { door: ['porta', 'portas'], window: ['janela', 'janelas'], veil: ['cortina', 'cortinas'] };
/* O que cada tipo barra:
     tipo             fechada: visão   fechada: passagem   aberta
     parede           barra            barra               (não abre)
     porta, secreta   barra            barra               nada
     janela           livre            barra               nada
     cortina          barra (*)        livre               nada
   (*) menos a de quem está encostado nela. Isso depende de quem olha, então fica em Walls.sightFor;
       aqui a cortina fechada conta como "barra a visão". */
const wallBlocksSight = w => !wallOpen(w) && w.k !== 'window';
const wallBlocksMove = w => !wallOpen(w) && w.k !== 'veil';

const TONES = [
  { id: 'dia', n: 'Dia', light: 'claro', tint: null },
  { id: 'entardecer', n: 'Entardecer', light: 'claro', tint: 'rgba(255,150,70,0.30)' },
  { id: 'noite', n: 'Noite', light: 'penumbra', tint: 'rgba(70,100,190,0.40)' },
  { id: 'breu', n: 'Breu', light: 'escuro', tint: 'rgba(40,50,90,0.35)' },
];
const WEATHERS = [['', 'Nenhum'], ['chuva', 'Chuva'], ['neve', 'Neve'], ['neblina', 'Neblina'], ['cinzas', 'Cinzas e brasas'], ['vagalumes', 'Vaga-lumes']];

// Dano e cura em área. O que foi digitado: "12" ou "-12" tira, "+8" devolve; vazio vale 0 e texto inválido, null.
function areaAmount(text) {
  const s = String(text || '').trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return 0;
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  return s[0] === '+' ? Number(s) : -Math.abs(Number(s));
}

/* Configuração de "aplicar em área" guardada num efeito, para o botão Reaplicar: a barra (pelo nome), o valor
   como foi digitado ("8", "-8", "+5"), a condição (com contador e rodadas) e quem ficou de fora (ids de token).
   O ½ da janela não entra: é de cada vez (quem resistiu daquela vez). Devolve null se não há o que reaplicar. */
function cleanApply(o) {
  if (!o || typeof o !== 'object') return null;
  const int = v => Math.max(0, Math.round(Number(v) || 0));
  const cond = o.cond && o.cond.id ? { id: String(o.cond.id), n: int(o.cond.n), d: int(o.cond.d) } : null;
  let amt = String(o.amt == null ? '' : o.amt).trim();
  if (!areaAmount(amt)) amt = '';                 // zero, ou algo que não é número: não há valor a reaplicar
  if (!amt && !cond) return null;
  return { bar: String(o.bar || ''), amt, cond, skip: Array.isArray(o.skip) ? o.skip.map(String) : [] };
}

/* ---- Modelos de dados (tudo JSON puro) ---- */
function newScene(name) {
  return {
    id: uid('cena'), name: name || 'Nova cena',
    cols: 30, rows: 20, cell: 64,
    bgColor: '#3d4a3a',
    bg: { asset: null, stretch: false, dx: 0, dy: 0, scale: 1 },
    grid: { on: true, color: '#000000', alpha: 0.28, unit: 1.5, unitName: 'm', diag: 'cheb' },
    light: 'claro',                       // claro | penumbra | escuro
    fog: { dynamic: false, manual: false, explored: true, shared: true },
    blockMove: true,
    perms: { mover: true, barras: true, condicoes: true, auras: true, desenhar: false, efeitos: false, regua: true, ping: true, portas: false, turnos: true, mira: true },
    tokens: [], shapes: [], walls: [], lights: [], effects: [], fogOps: [],
    turn: { on: false, round: 1, cur: null, list: [] },
    targets: [],                          // miras: [{ by: 'gm' | id do jogador, t: id do token }]
    tone: 'dia',                          // hora do dia: dia | entardecer | noite | breu
    weather: { k: '', pow: 0.6 },         // clima sobre o mapa
    explored: {},
  };
}

function newToken(scene, x, y, extra) {
  const n = scene.tokens.length + 1;
  const name = (extra && extra.name) || 'Token ' + n;
  return Object.assign({
    id: uid('tk'), name, x, y, size: 1, shape: 'circ', img: null,
    color: TOKEN_COLORS[hashStr(name) % TOKEN_COLORS.length],
    owner: null, hidden: false, locked: false, showName: true,
    bars: barDefaults(),
    barVis: 'bar',                        // o que quem não é dono vê: num | bar | none
    conds: [], cinfo: {}, auras: [],      // cinfo: { idDaCondição: { n: contador, d: rodadas restantes, d0: duração inicial } }
    vis: { on: true, range: 0, dark: 0 },
    light: { on: false, bright: 4, dim: 8, c: '#ffc477' },
    ini: 0, turns: 1,                     // bônus de iniciativa; turnos por rodada
    notes: '',
  }, extra || {});
}

// Completa campos que possam faltar em dados importados de versões antigas.
function normalizeScene(sc) {
  const base = newScene(sc.name);
  for (const k in base) if (sc[k] === undefined) sc[k] = base[k];
  for (const k of ['bg', 'grid', 'fog', 'perms', 'turn', 'weather']) sc[k] = Object.assign({}, base[k], sc[k]);
  if (!Array.isArray(sc.turn.list)) sc.turn.list = [];
  // Entradas da ordem de turnos: as antigas ganham k = 1 (um turno por rodada) e os campos da rolagem;
  // as avulsas (sem token), o bônus próprio e o grupo.
  sc.turn.list = sc.turn.list.filter(e => e && typeof e === 'object');
  for (const e of sc.turn.list) {
    if (!e.id) e.id = uid('tn');
    if (e.init === undefined || (e.init !== null && !isFinite(e.init))) e.init = null;
    e.k = e.k >= 1 ? Math.floor(e.k) : 1;
    // o detalhe da rolagem só vale enquanto fecha com a iniciativa (dado + bônus); senão, é um valor digitado
    e.roll = e.roll && isFinite(e.roll.d) && isFinite(e.roll.b) && Number(e.roll.d) + Number(e.roll.b) === e.init ? { d: Number(e.roll.d), b: Number(e.roll.b) } : null;
    if (!e.token) { e.token = null; e.bonus = clampIni(e.bonus); e.grp = e.grp || null; }
  }
  if (!Array.isArray(sc.targets)) sc.targets = [];
  if (!TONES.some(x => x.id === sc.tone)) sc.tone = 'dia';
  for (const w of sc.walls) {
    if (!(w.k === 'door' && w.secret) && !['wall', 'door', 'window', 'veil'].includes(w.k)) w.k = 'wall';
    w.open = !!w.open; w.locked = !!w.locked; w.secret = w.k === 'door' && !!w.secret;     // janela e cortina também abrem e trancam
  }
  for (const e of sc.effects) {
    // retângulo: largura e altura próprias. Nos efeitos antigos, a caixa do tamanho que eles já tinham.
    const side = Math.max(0.5, 2 * (Number(e.r) || 1));
    if (!(e.rw > 0)) e.rw = side;
    if (!(e.rh > 0)) e.rh = side;
    e.apply = cleanApply(e.apply);
  }
  for (const t of sc.tokens) {
    const d = newToken({ tokens: [] }, t.x || 0, t.y || 0, { name: t.name });
    for (const k in d) if (t[k] === undefined) t[k] = d[k];
    t.vis = Object.assign({}, d.vis, t.vis);
    t.light = Object.assign({}, d.light, t.light);
    t.bars = (Array.isArray(t.bars) ? t.bars : barDefaults()).slice(0, MAX_BARS).map(cleanBar);
    if (!t.cinfo || typeof t.cinfo !== 'object') t.cinfo = {};
    t.ini = clampIni(t.ini); t.turns = clampTurns(t.turns);
  }
  return sc;
}
