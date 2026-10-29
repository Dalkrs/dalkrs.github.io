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
        Luta ........ as telas de combate (atributos do token, disputa, grupo, ataque, terreno)
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
                    'bar' ou 'pts', regra de quem vê; x = sobrevida, que absorve
                    o dano antes da barra), conds + cinfo
                    (contador e duração de cada condição), auras, visão, luz,
                    ini (bônus de iniciativa), turns (turnos por rodada, 1 a 4),
                    inis (o bônus de iniciativa de cada turno, para quem tem mais de um)
     - desenho .... k: free | line | rect | ell | poly | text; com ter = { t, h } é uma
                    área de terreno (tipo e altura), pintada à parte e fora do clique comum
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
/* Dentro do site, a casca (o que está em volta) com o menu da conta ou uma janela aberta: o que as Cenas abrem
   sozinhas (o tutorial, a oferta das cenas do navegador) espera ela ficar livre, e nenhuma janela daqui toma o foco
   dela — o menu fecharia sozinho na mão de quem está mexendo. */
function cascaOcupada() {
  try { const d = window.parent !== window ? window.parent.document : null; return !!d && !!d.querySelector('dialog[open], [role="dialog"]:not([hidden]):not(dialog)'); }
  catch (e) { return false; }
}
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
  // (lote 28) o sino dos sons dos avisos (ligado e desligado)
  bell: 'M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15zM10 20.500a2 2 0 0 0 4 0',
  bellOff: 'M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15zM10 20.500a2 2 0 0 0 4 0M3.500 3.500l17 17',
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
  bag: 'M8.5 8L7 4h10l-1.5 4M8.5 8h7c2.6 2.4 4.5 5.4 4.5 8.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.500C4 13.400 5.900 10.400 8.500 8zM10 13h4M12 11v4',
  wound: 'M5.5 18.5L18.5 5.5M7 13l4 4M10 10l4 4M13 7l4 4',
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
  heart: 'M12 20.5s-7.5-4.6-7.5-10.4A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.5 2.9c0 5.8-7.5 10.4-7.5 10.4zM12 10.2v4.6M9.7 12.5h4.6',
  // (lote 15) a fogueira do descanso
  rest: 'M12 3.5c2.3 2.5 3.8 4.4 3.8 6.7a3.8 3.8 0 0 1-7.6 0c0-1.4.8-2.6 1.7-3.4.1 1.2.7 1.9 1.3 2.2 0-2.1.2-3.6.8-5.5zM5 20.5l14-3.6M5 16.9l14 3.6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  area: 'M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M8 12h8M12 8v8',
  room: 'M4 5h16v14H4zM4 5m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M20 5m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M20 19m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M4 19m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
  window: 'M5 4h14v16H5zM12 4v16M5 12h14',
  windowOpen: 'M5 4h14v16H5zM5 4l4.500 2.500v11L5 20M19 4l-4.500 2.500v11L19 20',
  die: 'M12 2.800l8 4.600v9.200l-8 4.600-8-4.600V7.400zM12 8l4.600 7.600H7.400zM12 2.800V8M7.400 15.600L4 16.600M16.600 15.600l3.400 1',
  veil: 'M4 4h16M6 4c0 6-1.500 10-1.500 16M10 4c0 6 .5 10 .5 16M14 4c0 6-.5 10-.5 16M18 4c0 6 1.500 10 1.500 16',
  veilOpen: 'M4 4h16M5.500 4c0 7-.4 11-1.500 16M8.500 4c-.2 6-1.300 9.500-4.300 11.500M18.500 4c0 7 .4 11 1.500 16M15.500 4c.2 6 1.300 9.500 4.300 11.500',
  terrain: 'M2.500 19.500L9 8l4 6.600 2.400-3.300 6.100 8.200zM7.400 10.900l1.600 1.400 1.400-1.100',
  reac: 'M10 5.500L4 11.500l6 6M4 11.500h10a6 6 0 0 1 6 6v1',
  obj: 'M4 10h16v9.500H4zM4 10l1.500-4.500h13L20 10M10 14h4M12 5.500V10',
  // (lote 6) as pastas da lista de cenas, o Mapa-múndi e o vilarejo
  folder: 'M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z',
  house: 'M3.5 11.5L12 4.5l8.5 7M6 10v9.5h12V10M10 19.5v-5h4v5',
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
  c_hemorragia: { d: 'M9 3.500c2.600 3.400 4.400 5.700 4.400 8.100a4.400 4.400 0 0 1-8.800 0c0-2.400 1.800-4.700 4.400-8.100zM17 12c1.600 2.100 2.700 3.500 2.700 5a2.700 2.700 0 0 1-5.400 0c0-1.500 1.100-2.900 2.700-5z', fill: true },
  c_molhado: 'M3 8.500c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14.500c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  c_oleo: 'M12 3.500c3.200 4.200 5.500 7 5.500 10a5.500 5.500 0 0 1-11 0c0-3 2.300-5.800 5.500-10zM9.300 13.800a2.800 2.800 0 0 0 2.500 2.600',
  c_emaranhado: 'M4 8c4-4 12-4 16 0M4 16c4 4 12 4 16 0M8 4c-3 5-3 11 0 16M16 4c3 5 3 11 0 16',
  c_inconsciente: 'M5 5.500h6l-6 7h6M13.500 12h5l-5 6.500h5',
  c_paranoico: 'M2.500 12s3.500-6.500 9.500-6.500 9.500 6.500 9.500 6.500-3.500 6.500-9.500 6.500S2.500 12 2.500 12zM12 12m-2.600 0a2.600 2.600 0 1 0 5.200 0a2.600 2.600 0 1 0-5.200 0',
  c_fraco: 'M4 7l6 6 4-4 6 7M20 16v-4.500M20 16h-4.500',
  c_exausto: 'M3.500 8.500h14.500v7H3.500zM20.500 10.800v2.400M6.500 11v2',
  c_inspirado: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.600 10.800c.6.5 1 1.200 1 2v.2h5.200v-.2c0-.8.4-1.500 1-2A6 6 0 0 0 12 3z',
  c_regen: 'M20 12a8 8 0 0 1-14.200 5M4 12a8 8 0 0 1 14.200-5M18.200 3.500V7h-3.500M5.800 20.500V17h3.500',
  c_tratado: { d: 'M9.500 4h5v5.500H20v5h-5.500V20h-5v-5.500H4v-5h5.500z', fill: true },
  // (lote 5)
  c_resfriado: 'M10 4.500a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9.500v6.500M17.500 5.500h3M19 4v3',
  c_grito: 'M4 9.500h3.500L13 5.500v13L7.500 14.500H4zM16.500 9a4.500 4.500 0 0 1 0 6M19 6.500a8 8 0 0 1 0 11',
  c_artefato: 'M12 3l6 6.500-6 11.500-6-11.500zM6 9.500h12M9.500 9.500L12 21l2.500-11.500M9 3.500L10 6M15 3.500L14 6',
  c_furia: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM7.200 8.300l3.300 1.700M16.800 8.300l-3.300 1.700M8.300 16.800c2.200-1.900 5.200-1.900 7.400 0M9.200 12.300v.2M14.800 12.300v.2',
  c_provocado: 'M4 5h16v11H10l-5 4v-4H4zM12 7.800v4.200M12 14v.2',
  c_defendendo: 'M12 3l7 2.600v5c0 4.400-2.900 8-7 9.400-4.100-1.400-7-5-7-9.400v-5zM5 10h14M12 3v17',
  c_desarmado: 'M15 4h5v5L11 18l-5-5zM8 16l-3.500 3.500M3.500 3.500l17 17',
  c_agarrado: 'M8 12.500V6.500a1.500 1.500 0 0 1 3 0V11M11 10.500V5a1.500 1.500 0 0 1 3 0v6M14 10.500V6.500a1.500 1.500 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4.300-2.500L4.200 14.200a1.500 1.500 0 0 1 2.600-1.500L8 14.500',
  c_confuso: 'M12 12.500a1.400 1.400 0 0 1 1.400 1.400 2.800 2.800 0 0 1-2.800 2.800 4.200 4.200 0 0 1-4.200-4.200 5.600 5.600 0 0 1 5.600-5.600 7 7 0 0 1 7 7',
  c_enfeiticado: { d: 'M12 20s-7-4.300-7-9.700A3.900 3.900 0 0 1 12 8a3.900 3.900 0 0 1 7 2.300C19 15.700 12 20 12 20zM18.500 2.500l.7 1.800 1.800.7-1.800.7-.7 1.800-.7-1.800-1.800-.7 1.800-.7z', fill: true },
  c_marcado: 'M12 12m-6.500 0a6.500 6.500 0 1 0 13 0a6.500 6.500 0 1 0-13 0M12 3v5M12 16v5M3 12h5M16 12h5',
  c_transformado: 'M5 8.500h12.500L14.500 5.500M19 15.500H6.500l3 3',
  c_doente: 'M12 12m-3.800 0a3.800 3.800 0 1 0 7.600 0a3.800 3.800 0 1 0-7.600 0M12 3.500v4.700M12 15.800v4.700M3.500 12h4.700M15.800 12h4.700M6 6l3.300 3.300M14.700 14.700L18 18M6 18l3.300-3.300M14.700 9.300L18 6',
  c_faminto: 'M3.500 12h17a8.500 8.500 0 0 1-17 0zM15 3.500L12 12M18.500 5L14.500 12',
  c_bebado: 'M5.500 6.500h9v11a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2zM14.500 9h2a2 2 0 0 1 2 2v2.500a2 2 0 0 1-2 2h-2M8.500 10v6M11.500 10v6M6 4.500c1-1 2.500-1 3.500 0s2.500 1 3.500 0',
  c_surdo: 'M8 17.500c0 1.700 1.300 3 3 3s3-1.300 3-3c0-2.800 4-3.800 4-8.500a6 6 0 0 0-12 0M10 9a2 2 0 0 1 4 0c0 1.500-2 1.800-2 3.500M3.500 3.500l17 17',
  c_lento: 'M3.500 18.500h13a3 3 0 0 0 3-3v-6M10.500 18.500a5 5 0 1 1 5-5 2.500 2.500 0 1 1-2.500-2.500M19.500 9.500l1.300-3.200M19.500 9.500L17 7.200',
  c_acelerado: 'M4 6l7 6-7 6M12.500 6l7 6-7 6',
  c_voando: { d: 'M2 9.500c4-1.300 7.200.8 10 3.800 2.800-3 6-5.100 10-3.800-3 1-5 3-6 5.800-1.300 2.400-6.700 2.400-8 0-1-2.800-3-4.800-6-5.800z', fill: true },
  c_oculto: 'M12 2.800c-4.100 0-7 4.400-7 9.400v8.800h14v-8.800c0-5-2.900-9.400-7-9.400zM8.300 13.200C9.300 10.800 10.600 9.800 12 9.800s2.700 1 3.700 3.400c-1 2.400-2.300 3.400-3.700 3.400s-2.700-1-3.700-3.400zM10.600 13.200v.2M13.400 13.200v.2',
  // (lote 7) as condições novas
  c_petrificado: 'M5 19.500l-1.500-6 3-6.500 5-2.500 5.500 2 3 5.500-1.500 7.500zM9 9l2.500 3.500-1 3M15 8.500l-1.500 3.500 2.500 2.500',
  c_adormecido: 'M4 9h5l-5 6h5M12 5h4l-4 5h4M16.500 13.500h4l-4 5h4',
  c_eletrizado: 'M13 2.500L7 12.500h5l-2 9 7-11h-5zM3.500 7l2 1M20.500 16l-2-1M4 17.500l2-1.500M20 6.500l-2 1.500',
  c_corroido: 'M12 3.500c3.200 4.200 5.500 7 5.500 10a5.500 5.500 0 0 1-11 0c0-3 2.300-5.800 5.500-10zM10 13.500h.01M13.500 16h.01M13 11h.01M10.500 17h.01',
  c_enregelado: 'M7 3.500v6M4.400 5l5.200 3M9.600 5L4.400 8M17 8.500v6M14.400 10l5.200 3M19.600 10l-5.200 3M9.500 14.500v6M6.900 16l5.200 3M12.100 16l-5.200 3',
  c_possuido: 'M6 20.500V11a6 6 0 0 1 12 0v9.500l-2-1.500-2 1.500-2-1.500-2 1.500-2-1.500zM9.500 11h.01M14.500 11h.01M10 14.500c1.300.8 2.700.8 4 0',
  c_enraizado: 'M12 3v9M12 12c-2 2-5 2.500-7 6M12 12c2 2 5 2.500 7 6M12 12v8.500M8.500 16.500L7 21M15.500 16.500L17 21',
  c_sufocando: 'M5.500 16.500a2.500 2.500 0 1 0 5 0a2.500 2.500 0 1 0-5 0M13 12.500a2 2 0 1 0 4 0a2 2 0 1 0-4 0M9 7a1.500 1.500 0 1 0 3 0a1.500 1.500 0 1 0-3 0M16 5.500a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  c_ofuscado: 'M2.500 14s3.500-5.500 9.500-5.500 9.500 5.500 9.500 5.500-3.500 5.500-9.500 5.500S2.500 14 2.500 14zM12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 2.500v3M5 4.500l1.700 2.300M19 4.500l-1.700 2.300',
  c_vulneravel: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800zM12 3l-1.500 6 3 3-2 5.500',
  c_escudado: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800zM8.500 11.500h7M12 8v7',
  // (lote 20) as condições das classes
  c_alvoDuelo: 'M4 4l10.500 10.500M20 4L9.500 14.500M6.500 17.500L4 20M17.500 17.500L20 20M7.500 14.500l2 2M16.500 14.500l-2 2',
  c_armaduraRachada: 'M8 3.500l4 1.800 4-1.800 4 3.500-2.500 4V20.500h-11V11L4 7zM13 6.500l-2 4 3 2-2 4.500',
  c_assombrado: 'M7 21V11a5 5 0 0 1 10 0v10l-2.500-2-2.500 2-2.500-2zM10 11h.01M14 11h.01',
  c_clausula: 'M12 12m-8.500 0a8.500 8.500 0 1 0 17 0a8.500 8.500 0 1 0-17 0M6 6l12 12',
  c_cobranca: 'M12.500 7.500a3 3 0 1 0 6 0 3 3 0 1 0-6 0M3 14h3.500l4 3h6a1.800 1.800 0 0 0 0-3.600H13M3 12v9',
  c_dancando: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  c_definhando: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7M18 15v2M15.500 18.500v1.500',
  c_desguarnecido: 'M11 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M11 13m-2.500 0a2.500 2.500 0 1 0 5 0a2.500 2.500 0 1 0-5 0M21 3l-7.500 7.500M16.500 3H21v4.500',
  c_devedor: 'M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M7.500 10h5M18 13v8M15 18l3 3 3-3',
  c_eloLuz: 'M3 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M17 7a2 2 0 1 0 4 0 2 2 0 1 0-4 0M6.600 15.600l10.800-7.200M10.500 6l1.500-2 1.500 2M10.500 18l1.500 2 1.500-2',
  c_escudoPlantado: 'M6 3h12v10c0 3-2.500 5.500-6 7-3.500-1.500-6-4-6-7zM2.500 21h19M12 7v8',
  c_escudoRachado: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 4l-1.500 4 3 2.500-2 4 1.500 5.500',
  c_extremamenteFerido: 'M12 3c3.200 4.200 5.500 7 5.500 10a5.500 5.500 0 0 1-11 0c0-3 2.300-5.800 5.500-10zM12 11v5.500M9.300 13.700h5.400',
  c_ginga: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 6v7l-3 8M12 13l3 8M7 9l5 1 5-1M4 6c-1.500 2-1.500 5 0 7M20 6c1.500 2 1.500 5 0 7',
  c_guardaQuebrada: 'M5 5l7-2 7 2v6c0 5-3.500 8-7 10-3.500-2-7-5-7-10zM2.500 12h18M17 9l3 3-3 3',
  c_levementeFerido: 'M4 15L15 4a3 3 0 0 1 4.200 4.200L8.200 19.200A3 3 0 0 1 4 15zM9.500 9.500l5 5M11.500 11.500h.01M13 13h.01',
  c_mortalmenteFerido: 'M2 12.500h5l2-5.500 3 11 2.300-5.500H22',
  c_pacto: 'M6 3h9l3 3v15H6zM9 17c1-1.500 2-1.500 3 0s2 1.500 3 0M12 7c1 1.200 1.600 2 1.600 2.800a1.600 1.600 0 0 1-3.200 0c0-.800.600-1.600 1.600-2.800z',
  c_perjuro: 'M7 3.500h10v7l-2 2 2 2v5.500H7v-5.500l2-2-2-2zM9.500 7.500h5M9.500 17h5',
  c_portaAberta: 'M5 21V3h9v18M14 4.500l5 2v12.500l-5 2M11 12h.01M3 21h18',
  c_seloLushmania: 'M12 12m-8.500 0a8.500 8.500 0 1 0 17 0a8.500 8.500 0 1 0-17 0M12 6.500l1.400 4.100 4.100 1.400-4.100 1.400L12 17.500l-1.400-4.100L6.500 12l4.100-1.400z',
  c_sobEgide: 'M3 12.500a9 9 0 0 1 18 0zM12 12.500v8M9.500 20.500h5',
  c_sobExorcismo: 'M8 15c0-3 1.800-5 4-5s4 2 4 5v5.500H8zM8.300 10.500L6.500 6.500M15.700 10.500l1.800-4M12 2v3M4.500 12.500H2M22 12.500h-2.500',
  c_tutelado: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800zM12 10a1.700 1.700 0 1 0 0-3.400 1.700 1.700 0 0 0 0 3.400zM8.800 16c.500-2.200 1.600-3.300 3.200-3.300s2.700 1.100 3.200 3.300',
  // (lote 19) as condições das raças
  // (lote 34) as do Vampiro, do Licantropo e do Antro Roedor
  c_sementeSangue: 'M12 3c3 4.500 5 7.300 5 10a5 5 0 0 1-10 0c0-2.700 2-5.500 5-10zM12 17.500v-4M12 14.500c.900-1.300 2.200-1.900 3.300-1.900M12 15.300c-.900-.900-1.900-1.200-2.900-1.200',
  c_criaNoite: 'M9 10a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5zM4 21v-3.500a5 5 0 0 1 10 0V21M18 2.500a4 4 0 1 0 3.200 6.400A3.300 3.300 0 0 1 18 2.500zM7.700 13.800l1.300 1.400 1.300-1.400',
  c_feraSolta: 'M5 4.500l4.500 15M10.300 3l3.700 15.500M15.500 4l3 11.500M3 12.500l3 1M20.500 9.500l-2 1.500',
  c_pocaRoedor: 'M3 18.500c0-1.700 4-3 9-3s9 1.300 9 3-4 3-9 3-9-1.300-9-3zM10 3h4M11 3v4.500l-3 5h8l-3-5V3M8.500 18.500h2M14 19h1.500',
  c_naToca: 'M2 19.500h20M4.500 19.500c1-5.500 4.200-8.500 7.500-8.500s6.500 3 7.500 8.500M9.300 19.500c.500-2.200 1.600-3.400 2.700-3.400s2.200 1.200 2.700 3.400M9.500 8l-1-3.500M14.500 8l1-3.500',
  c_ancestralEncarnado: 'M5 4.500c4-2 10-2 14 0v6.500c0 5-3.500 9-7 10-3.500-1-7-5-7-10zM8 10.500l2.500 1.200M16 10.500l-2.500 1.200M9.500 16.500c1.500 1 3.500 1 5 0M12 2.500V1',
  c_armaVitrine: 'M4 20l9-9M13 11l3.500-7 3.500 3.500-7 3.500M6.500 15.500l2 2M18 14.500l2.500 2.500-2.500 2.500-2.500-2.500z',
  c_armaRachada: 'M4 20l4-4M6.500 13.500l4 4M9.500 14.500L12 12l.800 1.800 2-2.300M15 9.500l5-5.500v3.200l-4.300 4.300',
  c_armaduraGelo: 'M8 3.500l4 1.800 4-1.800 4 3.500-2.500 4V20.500h-11V11L4 7zM12 9.500v8M9 11l6 5M15 11l-6 5',
  c_bracoPerdido: 'M5 19l4-4.500 2.200-6a2 2 0 0 1 3.800 1.200L13.500 14l4.500 1.200M3 3l18 18',
  c_cargaTrovao: 'M12.5 2L6 12.5h5L10 22l8-11h-5.5L14 2zM19.5 4v4M21.5 6h-4',
  c_cercado: 'M12 12m-2.500 0a2.500 2.500 0 1 0 5 0a2.500 2.500 0 1 0-5 0M4 4l4.500 4.500M20 4l-4.500 4.500M4 20l4.500-4.500M20 20l-4.500-4.500M8.500 5v3.500H5M15.500 5v3.500H19M8.500 19v-3.500H5M15.500 19v-3.500H19',
  c_coma: 'M13 4.500a7.500 7.500 0 1 0 6.500 11 6.500 6.500 0 0 1-6.500-11zM15 3h4l-4 4h4',
  c_comprado: 'M12 7m-7 0a7 3 0 1 0 14 0a7 3 0 1 0-14 0M5 7v5c0 1.700 3.100 3 7 3s7-1.300 7-3V7M5 12v5c0 1.700 3.100 3 7 3s7-1.300 7-3v-5',
  c_contagem: 'M6 3h12M6 21h12M7.500 3c0 5 4.500 6 4.500 9s-4.500 4-4.500 9M16.500 3c0 5-4.500 6-4.500 9s4.500 4 4.500 9M9.500 18.500h5',
  c_costelasAbertas: 'M12 3v18M12 7c-3 0-6 1-7.500 3M12 11c-3 0-6 1-7.500 3M12 15c-3 0-5.500 1-6.500 2.500M12 7c3 0 6 1 7.500 3M15.500 12.500l3 3M18.500 12.500l-3 3',
  c_couracaGelo: 'M12 4.500l7 2.500v4.800c0 4.200-2.800 7.600-7 9-4.200-1.400-7-4.800-7-9V7zM12 1v3M20.500 3.500L19 5.500M3.500 3.500L5 5.500M12 9v7.500M8.800 12.700h6.400',
  c_debaixoTerra: 'M2.500 17c3-4 6.300-6 9.500-6s6.500 2 9.500 6zM12 2v6.500M9.500 6l2.500 2.500L14.500 6M5.500 20.500h13',
  c_descontrole: 'M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4 4 6 6 0 1 1 6-6 8 8 0 1 1-8 8',
  c_dividaEspiritual: 'M10 12m-6.500 0a6.500 6.500 0 1 0 13 0a6.500 6.500 0 1 0-13 0M7.500 12h5M18 7c2 1 3 3 3 5s-1 4-3 5M18 9.500c1 .600 1.300 1.500 1.300 2.500s-.300 1.900-1.300 2.500',
  c_domDevorado: 'M3.500 11c3 6 14 6 17 0M3.500 11c3-3 14-3 17 0M12 2l.900 1.900 2 .300-1.500 1.400.400 2L12 6.600l-1.800 1 .400-2-1.500-1.400 2-.300z',
  c_dor: 'M12 20.500s-8-4.800-8-10.500A4.300 4.300 0 0 1 12 7.200 4.300 4.300 0 0 1 20 10c0 5.700-8 10.500-8 10.500zM12 7.200l-1.600 4 3 1.800-1.400 4',
  c_emBrasa: 'M4 20l9-9M13 11l2-7 5 5-7 2M6.500 15.500l2 2M18.300 13.500c.900 1.400 2.700 2 2.700 4a3 3 0 0 1-6 0c0-1.500 1-2.200 1.500-3.200.300 1 .900 1.500 1.800 1.500z',
  c_encanto: 'M4 20l9.500-9.500M13.500 10.500L16 4l4 4-6.500 2.500M6.500 15l2.500 2.500M18.500 14l.900 2 2 .900-2 .900-.900 2-.900-2-2-.900 2-.900z',
  c_endurecido: 'M4 15l2-7.500 5-3 6 2 3.500 5-1 6.500-6.500 2-7-2.200zM9 9.500l3 3-1 4M12 12.500l5-1',
  c_enxertado: 'M5 7c4-3 10-3 14 0v10c-4 3-10 3-14 0zM8 9.500l2 2M10 9.500l-2 2M14 12.500l2 2M16 12.500l-2 2M12 5v14',
  c_enxerto: 'M12 21v-9M12 12c0-4-3-6.500-7.500-6.500 0 4 3 6.500 7.500 6.500zM12 14.500c0-3.500 2.500-5.500 6.500-5.500 0 3.500-2.500 5.500-6.500 5.500z',
  c_erguido: 'M12 9.500a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 9.500v6M8.500 12h7M10 21.500l2-6 2 6M3.500 8l2.500-2.500L8.500 8M15.500 8L18 5.500 20.500 8M6 5.500v8M18 5.500v8',
  c_exposto: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800zM13.500 5.500l-3.500 5.500 4 2-3 6.500',
  c_farejado: { d: 'M12 12.500c-3 0-5.500 3-5.500 5.200 0 1.500 1.400 2.300 2.600 2.300 1.100 0 1.700-.6 2.900-.6s1.800.6 2.900.6c1.200 0 2.600-.8 2.600-2.300 0-2.200-2.500-5.200-5.500-5.200zM3.900 11a2 2.400 0 1 0 4 0 2 2.400 0 1 0-4 0zM7.500 6.500a2 2.400 0 1 0 4 0 2 2.400 0 1 0-4 0zM12.500 6.500a2 2.400 0 1 0 4 0 2 2.400 0 1 0-4 0zM16.100 11a2 2.400 0 1 0 4 0 2 2.400 0 1 0-4 0z', fill: true },
  c_frio: 'M10 4.5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9.5v6.5M16.5 6h3M16.5 9h2.5',
  c_gosto: 'M5 7.500h14v4.500a7 7 0 0 1-14 0zM12 7.500V15M3 7.500h18',
  c_guardaNatural: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800zM8.500 15.500c0-4 3-6.500 7-6.500 0 4-3 6.500-7 6.500zM8.500 15.500l4-4',
  c_habilidadeEngolida: 'M12 3l2.600 5.900 6.400.600-4.800 4.300 1.400 6.300L12 16.800l-5.600 3.300 1.400-6.300L3 9.500l6.400-.600zM3.500 20.500l17-17',
  c_jurado: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800zM12 15.500s-3.300-2-3.300-4.300a1.650 1.650 0 0 1 3.300-.6 1.650 1.650 0 0 1 3.300.6c0 2.300-3.300 4.300-3.300 4.300z',
  c_laco: 'M12 11c-2.300-3-6.300-4.800-7.600-2.800S6 13.500 12 11zM12 11c2.300-3 6.300-4.800 7.600-2.800S18 13.500 12 11zM12 11l-3.500 9.500M12 11l3.500 9.500',
  c_licao: 'M3 5c3-1.200 6.200-1 9 1.200V20c-2.800-2.200-6-2.400-9-1.200zM21 5c-3-1.200-6.200-1-9 1.200V20c2.800-2.200 6-2.400 9-1.200z',
  c_magiaEngatilhada: 'M4 20L14.500 9.500M14.500 9.500l2-2M18 2v2.500M22 6h-2.500M20.500 3.500L19 5M10 5l1 2M5.500 9.500l2 1M16 13l1.500.500',
  c_mandado: 'M8 3.500h10.500A2 2 0 0 1 20.500 5.500V7H17M8 3.500a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-13a2 2 0 0 1 2-2M9 9.500h5M9 13h5M9 16.500h3',
  c_maoPerdida: 'M8 13V6.500a1.500 1.500 0 0 1 3 0V11M11 11V5a1.500 1.500 0 0 1 3 0v6M14 11V6.500a1.500 1.500 0 0 1 3 0V13c0 4-2.500 6.500-5.500 6.500S7 18 6 16l-1.800-3a1.500 1.500 0 0 1 2.600-1.500L8 13M3 21L21 3',
  c_naPanca: 'M12 12.500m-7.500 0a7.500 7.500 0 1 0 15 0a7.500 7.500 0 1 0-15 0M12 8.500l1 2.200 2.300.3-1.700 1.600.5 2.300L12 13.700l-2.100 1.200.5-2.300-1.700-1.600 2.300-.3z',
  c_noOmbro: 'M8.500 7.500a2.200 2.200 0 1 0 0-4.400 2.200 2.200 0 0 0 0 4.400zM15 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5zM4.500 13l4-3.500 4 2.500M10.500 21.500v-4a4.500 4.500 0 0 1 9 0v4',
  c_pePerdido: 'M8.500 21c-2.200 0-3.200-2-2.700-4.500S7.300 10 9.300 10s3.200 2.500 3.200 5.200-1.500 5.800-4 5.800zM10.900 6.800a1.300 1.300 0 1 0 2.600 0 1.300 1.300 0 1 0-2.600 0M14.200 8.700a1.100 1.100 0 1 0 2.200 0 1.100 1.100 0 1 0-2.200 0M3 3l18 18',
  c_perdido: 'M8.500 8.500a3.500 3.500 0 1 1 5.200 3.100c-1.100.7-1.700 1.500-1.700 2.700v1M12 19.500h.01M4 4.500l2 2M20 4.500l-2 2',
  c_pernaPerdida: 'M10 3v9.500l-1.200 8h5.200M14 3v8.500M3 3l18 18',
  c_praga: 'M12 9.500a2.300 3.300 0 1 0 0 6.600 2.300 3.300 0 0 0 0-6.600zM10.300 10.500C8 9 4.500 7 4 9.500s3.500 2.500 6.300 2.200M13.700 10.500C16 9 19.500 7 20 9.500s-3.500 2.500-6.300 2.200M10 15.500l-3 2.500M14 15.500l3 2.500M11 9.700L9.500 7M13 9.700L14.500 7',
  c_procurado: 'M5 3h14v18H5zM12 11m-3.200 0a3.200 3.200 0 1 0 6.400 0a3.200 3.200 0 1 0-6.400 0M8 17.500h8M12 6v2M12 14v1M7 11h1.800M15.200 11H17',
  c_reboteAdiado: 'M13 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M13 7.500V12l3 2M1.500 9.500l3.500 3 3-3.300',
  c_recusaMorte: 'M8 20.500V17A5.500 5.500 0 1 1 16 17v3.500zM10 13h.01M14 13h.01M11 20.500v-2M13 20.500v-2M12 4V1.500M18.500 6.500l1.800-1.800M5.500 6.500L3.700 4.700',
  c_rendido: 'M6 21.500v-19M6 3.500h11.500L15 8l2.500 4.500H6',
  c_seloOcre: 'M12 12m-8.500 0a8.500 8.500 0 1 0 17 0a8.500 8.500 0 1 0-17 0M12 6.500l5 8.500H7zM12 11.500v.01',
  c_semeado: 'M12 3c4 3 6 7 6 10a6 6 0 0 1-12 0c0-3 2-7 6-10zM12 8c-1.200 3-1.200 7 0 11',
  c_sentenca: 'M14.500 3.500l6 6M11.500 6.500l6 6M13 5l-3 3 6 6 3-3zM10.500 12L4 18.500 5.500 20 12 13.500M3 21.500h9',
  c_sobra: 'M8 8l8 8M5.200 9.200a2 2 0 1 1 1.500-3.300 2 2 0 1 1 3.300-1.500M18.800 14.800a2 2 0 1 1-1.500 3.300 2 2 0 1 1-3.300 1.500M10 4.400L8 8M5.900 6.700L8 8M18.100 17.300L16 16M14 19.600L16 16',
  c_transeRubro: 'M2 12s4-6.500 10-6.500S22 12 22 12s-4 6.500-10 6.500S2 12 2 12zM12 9.300c1.300 1.700 2 2.700 2 3.600a2 2 0 0 1-4 0c0-.900.700-1.900 2-3.600z',
  c_tregua: 'M2.500 11l4-4 4.500 2 1.500-1 4.500 1 4.500 4M2.500 11l5 5.500 2-1 2 2 2-1 2 1 4.500-5.500M9 12.500l2.500 2.500M12 11.500l2.500 2.500',
  c_vinculoSangue: 'M9 2.500c2.500 3.200 4 5.400 4 7.400a4 4 0 0 1-8 0c0-2 1.500-4.200 4-7.400zM13.500 15.500h4a2.500 2.500 0 0 1 0 5h-4a2.500 2.500 0 0 1 0-5zM15 18h5',
  c_vozVolkhum: 'M3 12c3-3.500 8.500-3.500 11.500 0-3 3.500-8.500 3.500-11.500 0zM3 12h11.500M17.500 8.500c1.500 1.200 1.500 5.800 0 7M20.500 6c2.300 2.800 2.300 9.200 0 12',
  c_refletindo: 'M5 3.500v17M19.500 5.500L7.500 12l12 6.500M16 4.500h3.500V8',
  c_etereo: 'M12 7.500m-2.500 0a2.500 2.500 0 1 0 5 0a2.500 2.500 0 1 0-5 0M6.500 20.500c0-3.500 2.500-6 5.500-6s5.500 2.500 5.500 6M3 9h2M19 9h2M4 14.500h1.500M18.500 14.500H20',
  c_enlouquecido: 'M12 12a1 1 0 1 1 1 1 2.500 2.500 0 0 1-2.500-2.500A4 4 0 0 1 14.500 6.500 5.500 5.500 0 0 1 20 12a7 7 0 0 1-7 7A8.500 8.500 0 0 1 4.500 10.500',
  c_determinado: 'M6 21V3.500M6 4.500c4-2 7 2 12 0v8c-5 2-8-2-12 0',
  c_qibloq: 'M12 12m-8.500 0a8.500 8.500 0 1 0 17 0a8.500 8.500 0 1 0-17 0M9 11h6v5H9zM10 11V9.500a2 2 0 0 1 4 0V11',
  c_qidesvio: 'M4 12a8 8 0 0 1 13.500-5.800M20 12a8 8 0 0 1-13.500 5.800M17.500 2.500v4h-4M6.500 21.500v-4h4M11 9l-1.500 3.500h5L13 15.500',
  c_agigantado: 'M4 4l5.500 5.500M4 4v4.500M4 4h4.500M20 20l-5.500-5.500M20 20v-4.500M20 20h-4.500M20 4l-5.500 5.500M20 4h-4.500M20 4v4.500M4 20l5.500-5.500M4 20h4.500M4 20v-4.500',
  c_encolhido: 'M9.500 9.500L4 4M9.500 9.500H5.500M9.500 9.500V5.500M14.500 14.500L20 20M14.500 14.500h4M14.500 14.500v4M14.500 9.500L20 4M14.500 9.500h4M14.500 9.500V5.500M9.500 14.500L4 20M9.500 14.500H5.500M9.500 14.500v4',
  c_ventania: 'M3 8h11a2.500 2.500 0 1 0-2.500-2.500M3 12h15.500a2.500 2.500 0 1 1-2.500 2.500M3 16h8a2 2 0 1 1-2 2',
  // (lote 8) a ferida permanente (um coração rachado) e o clone (duas figuras, uma atrás da outra)
  c_ferida: 'M12 20s-7.500-4.500-7.500-10.200A4.200 4.200 0 0 1 12 7.300a4.200 4.200 0 0 1 7.500 2.500C19.500 15.500 12 20 12 20zM12 7.300l-1.600 3.200 2.800 1.800-1.700 3.400',
  c_clone: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.500 19.500c0-3.200 2.400-5.500 5.500-5.500s5.500 2.300 5.500 5.500M15 5.300a3 3 0 0 1 0 5.400M17 14.300c2.100.7 3.500 2.600 3.500 5.200',
  // (lote 9) o duplicado (a figura e o gêmeo dela, dos dois lados de um espelho)
  c_duplicado: 'M7 10.500a2.700 2.700 0 1 0 0-5.400 2.700 2.700 0 0 0 0 5.400zM2.500 19.500c0-2.900 2-5 4.500-5s4.500 2.100 4.500 5M17 10.500a2.700 2.700 0 1 0 0-5.400 2.700 2.700 0 0 0 0 5.400zM12.500 19.500c0-2.900 2-5 4.500-5s4.500 2.100 4.500 5M12 3v2.200M12 8v2.200M12 13v2.200',
  // (lote 28) Imbuído de Mana: a lâmina e a gota de mana
  c_imbuidoMana: 'M4.500 19.500L15 9M15 9l1-4.500 4.500-1-1 4.500zM6.300 14.700l3 3M18.500 12.500c1.300 1.700 2 2.700 2 3.600a2 2 0 0 1-4 0c0-.900.700-1.900 2-3.600z',
  real: 'M4 17.500L3 7.500l5 4 4-6.500 4 6.500 5-4-1 10zM4.500 20.500h15',     // (lote 8) a coroa do real de um Clone (só o mestre vê)
  // os números do token (Força, Canalização Mágica, Defesa Física, Defesa Mágica, Esquiva)
  st_for: 'M14.500 4H20v5.500L10 19.500 4.500 14zM6.500 16L3.500 19l1.500 1.500 3-3M8 12.500l3.500 3.500',
  st_can: 'M4 5.500C6 4.500 9 4.500 12 6c3-1.500 6-1.500 8-.5V19c-2-1-5-1-8 .5-3-1.500-6-1.500-8-.5zM12 6v13.500',
  st_dff: 'M12 3l7.500 2.800v5.400c0 4.600-3 8.300-7.500 9.800-4.500-1.500-7.500-5.200-7.500-9.800V5.800z',
  st_dfm: 'M9 4h6l3.500 3.500L16 9l2.500 11.500h-13L8 9 5.500 7.500zM12 4v3.500M9 4l3 3.500L15 4M10.500 20.500L12 12l1.500 8.500',
  st_esq: { d: 'M9.200 21c-2 0-3.200-1.500-3.200-3.500 0-2.500 1-4 1-6 0-2.200 1.200-3.600 3.200-3.600 1.900 0 2.600 1.500 2.600 3.500 0 2.500-1.500 4-1.500 6.500 0 1.800-.6 3.100-2.100 3.100zM14.300 7.300a1.600 1.600 0 1 0 3.200 0 1.600 1.600 0 0 0-3.200 0zM11.900 4.300a1.300 1.300 0 1 0 2.600 0 1.300 1.300 0 0 0-2.600 0zM17 10.600a1.400 1.400 0 1 0 2.800 0 1.400 1.400 0 0 0-2.800 0z', fill: true },
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
  const o = b || {}, lo = barLo(o);
  return cleanBarRef({
    n: String(o.n == null ? 'Barra' : o.n).slice(0, 24) || 'Barra',
    c: /^#[0-9a-f]{6}$/i.test(o.c || '') ? o.c : BAR_COLORS[0],
    v: Math.max(-lo, Number(o.v) || 0), m: Math.max(0, Number(o.m) || 0),
    k: o.k === 'pts' ? 'pts' : 'bar',
    on: o.on !== false,
    vis: ['num', 'bar', 'none'].includes(o.vis) ? o.vis : '',     // '' = segue a regra do token
  }, o);
}
// Barra ligada a um recurso da ficha do personagem (HP, SP…): guarda de qual recurso ela é.
// Sobrevida (x): pontos por cima da barra, que absorvem o dano antes dela. Só fica guardada quando há alguma.
// Piso (lo): até quanto abaixo de zero a barra pode ir (a barra comum para em zero). Começo (st): onde a barra
// começa — é para lá que a cura total a leva, em vez do máximo. Os dois só ficam guardados quando existem.
const cleanBarRef = (b, o) => {
  if (o && typeof o.ref === 'string' && o.ref) b.ref = o.ref.slice(0, 64);
  if (o && Number(o.x) > 0) b.x = Math.round(Number(o.x) * 10) / 10;
  // (na barra "só proporção" que os jogadores recebem, x é a proporção e xn, os pontos da sobrevida: é o xn que o escudo
  // do token mostra — sem ele, o jogador via a porcentagem no lugar dos pontos: 6 de sobrevida numa vida de 46 virava 13)
  if (o && Number(o.xn) > 0) b.xn = Math.round(Number(o.xn) * 10) / 10;
  if (barLo(o) > 0) b.lo = barLo(o);
  if (o && o.st != null && o.st !== '' && isFinite(Number(o.st))) b.st = Math.min(b.m, Math.max(-(b.lo || 0), Math.round(Number(o.st) * 10) / 10));
  // (lote 8) a ferida permanente: quanto da ponta da barra apodreceu (a cura não passa de m − pod)
  if (o && Number(o.pod) > 0 && b.m > 0) b.pod = Math.round(Math.min(Number(o.pod), b.m) * 10) / 10;
  if (o && (o.mapa === 'sempre' || o.mapa === 'passar')) b.mapa = o.mapa;         // (lote 15) quando ela aparece no mapa
  return b;
};
/* (lote 15) Quando a barra aparece em cima do token, no mapa: 'sempre', ou 'passar' — só com o mouse por cima ou com o
   token selecionado. As barras especiais da ficha (as cargas, os usos: ref "pd:…") começam em 'passar', para não ficarem
   o tempo todo no token; as outras, em 'sempre'. O mestre escolhe outra coisa nas opções da barra (b.mapa). */
const barMapa = b => (b && (b.mapa === 'sempre' || b.mapa === 'passar') ? b.mapa : b && typeof b.ref === 'string' && b.ref.startsWith('pd:') ? 'passar' : 'sempre');
const barX = b => Math.max(0, Number(b && b.x) || 0);
const barLo = b => { const n = Math.round((Number(b && b.lo) || 0) * 10) / 10; return n > 0 ? Math.min(n, 999999) : 0; };
/* (lote 8) A ferida permanente: o que apodreceu na ponta da barra (0 a m) e o teto da cura (o máximo menos isso,
   nunca abaixo do piso). Sem ferida, o teto é o máximo. */
const barPod = b => { const v = Number(b && b.pod) || 0; return v > 0 && b.m > 0 ? Math.round(Math.min(v, b.m) * 10) / 10 : 0; };
const barTeto = b => Math.max(-barLo(b), b.m - barPod(b));
const PODRE_COR = '#6b7a35';                // a cor da ponta apodrecida, no mapa e nos painéis
// Para onde a "cura total" leva a barra: o começo dela, ou o máximo quando ela não tem um (e nunca acima do teto).
const barFull = b => Math.min(b && b.st != null && isFinite(Number(b.st)) ? Number(b.st) : b.m, barTeto(b));
const NEG_COR = '#ff5d73';                  // a cor da parte negativa de uma barra (riscada), no mapa e nos painéis
const fmtV = v => fmt(v).replace('-', '−');   // valor de barra, com o sinal de menos de verdade
// Quanto do piso uma barra negativa já gastou (0 a 1); 0 quando ela não está abaixo de zero.
const barNeg = b => (b && b.v < 0 && barLo(b) > 0 ? clamp(-b.v / barLo(b), 0, 1) : 0);
const SOBRE_COR = '#8fe3ff';                // a cor da sobrevida, no mapa e nos painéis
const MENTE_COR = { san: '#b39cf0', conf: '#e6ab4f' };     // Sanidade e Conforto, como no Acampamento
const NUM_CORES = { FOR: '#f0937a', CAN: '#93b6ff', DFF: '#d9c08c', DFM: '#c6a6f7', ESQ: '#8ddba6' };   // os números do token
function barDefaults() {
  const p = typeof Store !== 'undefined' ? Store.S.prefs.barDefaults : null;
  return (Array.isArray(p) && p.length ? p : BAR_DEFAULTS).slice(0, MAX_BARS).map(cleanBar);
}

// Combate: bônus de iniciativa (a rolagem é 1d20 + bônus) e turnos por rodada (chefes jogam mais de uma vez).
const MAX_TURNS = 4;
const MAX_BAND = 60;                      // tokens numa faixa de grupo
// Os números que o mestre anota num token sem ficha, para aparecerem ao lado do nome: Força, Canalização Mágica,
// Defesa Física, Defesa Mágica e Esquiva. Só os preenchidos ficam; nenhum preenchido, nada fica.
const ST_CAMPOS = [['for', 'FOR', 'Força'], ['can', 'CAN', 'Canalização Mágica'], ['dff', 'DFF', 'Defesa Física'], ['dfm', 'DFM', 'Defesa Mágica'], ['esq', 'ESQ', 'Esquiva']];
function cleanSt(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = {};
  let tem = false;
  for (const [k] of ST_CAMPOS) {
    const n = v[k];
    if (n == null || n === '' || typeof n === 'boolean' || !isFinite(Number(n))) continue;
    o[k] = clamp(Math.round(Number(n)), -9999, 99999); tem = true;
  }
  return tem ? o : null;
}
const clampTurns = v => clamp(Math.round(Number(v)) || 1, 1, MAX_TURNS);
const clampIni = v => clamp(Math.round(Number(v)) || 0, -99, 99);

// O bônus de iniciativa de cada turno de quem joga mais de uma vez por rodada (um chefe: 1d20 + 6 no primeiro turno,
// 1d20 + 4 no segundo, 1d20 + 0 no terceiro). Uma posição vazia (null) quer dizer "o bônus de sempre" (o do token).
const cleanInis = v => (Array.isArray(v) ? v.slice(0, MAX_TURNS).map(x => (x == null || x === '' || !isFinite(Number(x)) ? null : clampIni(x))) : []);

/* Terreno: uma área do mapa com tipo e altura. É um desenho (coleção shapes) com o campo ter = { t: tipo, h: altura
   na unidade da cena } — negativa num fosso. É só visual: o token que está em cima mostra a altura, e passar o
   mouse diz o que é. hq: a altura de fábrica de cada tipo, em quadrados. */
const TERRENOS = [
  { id: 'morro', n: 'Morro', c: '#9a8552', hq: 2 },
  { id: 'montanha', n: 'Montanha', c: '#8b8f99', hq: 6 },
  { id: 'plataforma', n: 'Plataforma', c: '#b08d5c', hq: 1 },
  { id: 'fosso', n: 'Fosso', c: '#3a3344', hq: -2 },
  { id: 'agua', n: 'Água', c: '#3f86c2', hq: 0 },
  { id: 'mata', n: 'Mata', c: '#4c8c4f', hq: 0 },
];
const TERRENO_POR_ID = Object.fromEntries(TERRENOS.map(t => [t.id, t]));
function cleanTer(o) {
  if (!o || typeof o !== 'object' || typeof o.t !== 'string' || !Object.prototype.hasOwnProperty.call(TERRENO_POR_ID, o.t)) return null;
  return { t: o.t, h: clamp(Math.round((Number(o.h) || 0) * 100) / 100, -9999, 9999) };
}
const isTer = s => !!(s && s.ter && Object.prototype.hasOwnProperty.call(TERRENO_POR_ID, s.ter.t));

const PLAYER_COLORS = ['#4fb8e0', '#ee8a4a', '#8fd05a', '#c084fc', '#ff7396', '#ffd25e'];
const TOKEN_COLORS = ['#7c8fb8', '#b87c7c', '#7cb88c', '#b8a77c', '#9b7cb8', '#7cb4b8', '#b88d7c', '#8a98a8'];

// As condições são só marcadores (com contador e duração opcionais): nenhuma muda barras nem tira outra sozinha.
// A ordem é a dos painéis: as parecidas ficam juntas (Sangrando e Hemorragia, o grau acima dela).
/* Condições. Cada uma tem uma categoria (g), que separa a lista em abas na hora de escolher. A ordem aqui é a ordem
   em que aparecem: por categoria, e dentro dela as mais usadas primeiro. */
const COND_TAGS = [
  { id: 'dano', n: 'Dano', t: 'Dano e elementos' },
  { id: 'controle', n: 'Controle', t: 'Controle' },
  { id: 'combate', n: 'Combate', t: 'Combate' },
  { id: 'mente', n: 'Mente', t: 'Mente e magia' },
  { id: 'corpo', n: 'Corpo', t: 'Corpo e sentidos' },
  { id: 'ritmo', n: 'Ritmo', t: 'Ritmo e movimento' },
  { id: 'bencao', n: 'Bênçãos', t: 'Bênçãos e cura' },
  { id: 'racas', n: 'Raças', t: 'Das raças' },               // (lote 19)
  { id: 'classes', n: 'Classes', t: 'Das classes' },         // (lote 20)
];
// (lote 7) As 20 condições novas ficam no fim da categoria de cada uma (a aba "Todas" mostra a lista nesta ordem).
// São lembretes, como as outras; o Escudado mostra a sobrevida do token e sai quando ela acaba, e o Agigantado e o
// Encolhido dobram e diminuem o token (acertarCondicoes, em 07-app).
const CONDS = [
  { id: 'veneno', n: 'Envenenado', c: '#4ea84a', i: 'c_veneno', g: 'dano' },
  { id: 'sangue', n: 'Sangrando', c: '#c93a3a', i: 'c_sangue', g: 'dano' },
  { id: 'hemorragia', n: 'Hemorragia', c: '#8f1d1d', i: 'c_hemorragia', g: 'dano' },
  { id: 'fogo', n: 'Queimando', c: '#e8792b', i: 'c_fogo', g: 'dano' },
  { id: 'gelo', n: 'Congelado', c: '#5fb6e0', i: 'c_gelo', g: 'dano' },
  { id: 'resfriado', n: 'Resfriado', c: '#6aa3c4', i: 'c_resfriado', g: 'dano' },
  { id: 'molhado', n: 'Molhado', c: '#3b8fd1', i: 'c_molhado', g: 'dano' },
  { id: 'oleo', n: 'Óleo', c: '#6b5b2a', i: 'c_oleo', g: 'dano' },
  { id: 'eletrizado', n: 'Eletrizado', c: '#d9b51f', i: 'c_eletrizado', g: 'dano' },
  { id: 'corroido', n: 'Corroído', c: '#93ad2c', i: 'c_corroido', g: 'dano' },
  { id: 'enregelado', n: 'Enregelado', c: '#7fbfdf', i: 'c_enregelado', g: 'dano' },
  { id: 'ventania', n: 'Ventania', c: '#5fa9bf', i: 'c_ventania', g: 'dano' },
  { id: 'atordoado', n: 'Atordoado', c: '#d9a821', i: 'c_atordoado', g: 'controle' },
  { id: 'paralisia', n: 'Paralisado', c: '#9a9f2e', i: 'c_paralisia', g: 'controle' },
  { id: 'emaranhado', n: 'Emaranhado', c: '#5a8f3c', i: 'c_emaranhado', g: 'controle' },
  { id: 'agarrado', n: 'Agarrado', c: '#a0673a', i: 'c_agarrado', g: 'controle' },
  { id: 'caido', n: 'Caído', c: '#8a6a4c', i: 'c_caido', g: 'controle' },
  { id: 'inconsciente', n: 'Inconsciente', c: '#4b5568', i: 'c_inconsciente', g: 'controle' },
  { id: 'petrificado', n: 'Petrificado', c: '#8d8f94', i: 'c_petrificado', g: 'controle' },
  { id: 'adormecido', n: 'Adormecido', c: '#6b7fc4', i: 'c_adormecido', g: 'controle' },
  { id: 'enraizado', n: 'Enraizado', c: '#7a6a3a', i: 'c_enraizado', g: 'controle' },
  { id: 'furia', n: 'Fúria', c: '#c8242c', i: 'c_furia', g: 'combate' },
  { id: 'grito', n: 'Grito de Batalha', c: '#d9572b', i: 'c_grito', g: 'combate' },
  { id: 'provocado', n: 'Provocado', c: '#d4782a', i: 'c_provocado', g: 'combate' },
  { id: 'defendendo', n: 'Defendendo', c: '#4f7fa8', i: 'c_defendendo', g: 'combate' },
  { id: 'desarmado', n: 'Desarmado', c: '#7d838f', i: 'c_desarmado', g: 'combate' },
  { id: 'foco', n: 'Concentrando', c: '#2f9d93', i: 'c_foco', g: 'combate' },
  { id: 'vulneravel', n: 'Vulnerável', c: '#d0583c', i: 'c_vulneravel', g: 'combate' },
  { id: 'determinado', n: 'Determinado', c: '#d98f24', i: 'c_determinado', g: 'combate' },
  { id: 'medo', n: 'Amedrontado', c: '#b0559f', i: 'c_medo', g: 'mente' },
  { id: 'paranoico', n: 'Paranoico', c: '#a13d63', i: 'c_paranoico', g: 'mente' },
  { id: 'confuso', n: 'Confuso', c: '#b77ad0', i: 'c_confuso', g: 'mente' },
  { id: 'enfeiticado', n: 'Enfeitiçado', c: '#e0609a', i: 'c_enfeiticado', g: 'mente' },
  { id: 'silencio', n: 'Silenciado', c: '#8b62c9', i: 'c_silencio', g: 'mente' },
  { id: 'maldicao', n: 'Amaldiçoado', c: '#5b3f8f', i: 'c_maldicao', g: 'mente' },
  { id: 'marcado', n: 'Marcado', c: '#d94545', i: 'c_marcado', g: 'mente' },
  { id: 'transformado', n: 'Transformado', c: '#3fa58c', i: 'c_transformado', g: 'mente' },
  { id: 'artefato', n: 'Artefato Ativado', c: '#9a5fd6', i: 'c_artefato', g: 'mente' },
  { id: 'possuido', n: 'Possuído', c: '#7a3b8f', i: 'c_possuido', g: 'mente' },
  { id: 'refletindo', n: 'Refletindo', c: '#56aec2', i: 'c_refletindo', g: 'mente' },
  { id: 'enlouquecido', n: 'Enlouquecido', c: '#c4488c', i: 'c_enlouquecido', g: 'mente' },
  { id: 'qibloq', n: 'Qi bloqueado', c: '#5b6b80', i: 'c_qibloq', g: 'mente' },
  { id: 'qidesvio', n: 'Desvio de Qi', c: '#d4643a', i: 'c_qidesvio', g: 'mente' },
  { id: 'clone', n: 'Clone', c: '#7f8fd6', i: 'c_clone', g: 'mente' },
  { id: 'duplicado', n: 'Duplicado', c: '#a0447a', i: 'c_duplicado', g: 'mente' },
  // (lote 28) o ataque que gasta mana e rola com a Canalização Mágica (a janela pergunta o custo, a barra e o plano B)
  { id: 'imbuidoMana', n: 'Imbuído de Mana', c: '#3f7fe0', i: 'c_imbuidoMana', g: 'mente' },
  { id: 'cego', n: 'Cego', c: '#5a6072', i: 'c_cego', g: 'corpo' },
  { id: 'surdo', n: 'Surdo', c: '#667085', i: 'c_surdo', g: 'corpo' },
  { id: 'fraco', n: 'Fraquejado', c: '#9a8266', i: 'c_fraco', g: 'corpo' },
  { id: 'exausto', n: 'Exausto', c: '#7a6a8f', i: 'c_exausto', g: 'corpo' },
  { id: 'doente', n: 'Doente', c: '#82a03a', i: 'c_doente', g: 'corpo' },
  { id: 'faminto', n: 'Faminto', c: '#b8893a', i: 'c_faminto', g: 'corpo' },
  { id: 'bebado', n: 'Bêbado', c: '#c0902a', i: 'c_bebado', g: 'corpo' },
  { id: 'morto', n: 'Morto', c: '#1c1c22', i: 'c_morto', g: 'corpo' },
  { id: 'sufocando', n: 'Sufocando', c: '#4f7fb0', i: 'c_sufocando', g: 'corpo' },
  { id: 'ofuscado', n: 'Ofuscado', c: '#cfa83c', i: 'c_ofuscado', g: 'corpo' },
  { id: 'agigantado', n: 'Agigantado', c: '#b8743c', i: 'c_agigantado', g: 'corpo' },
  { id: 'encolhido', n: 'Encolhido', c: '#5f9ab4', i: 'c_encolhido', g: 'corpo' },
  { id: 'ferida', n: 'Ferida permanente', c: '#7a8a3a', i: 'c_ferida', g: 'corpo' },
  { id: 'lento', n: 'Lento', c: '#6f8f6a', i: 'c_lento', g: 'ritmo' },
  { id: 'acelerado', n: 'Acelerado', c: '#2ea6c9', i: 'c_acelerado', g: 'ritmo' },
  { id: 'voando', n: 'Voando', c: '#6aa8d8', i: 'c_voando', g: 'ritmo' },
  { id: 'oculto', n: 'Oculto', c: '#4b4f63', i: 'c_oculto', g: 'ritmo' },
  { id: 'invisivel', n: 'Invisível', c: '#6f8aa6', i: 'c_invisivel', g: 'ritmo' },
  { id: 'etereo', n: 'Etéreo', c: '#8a9cc4', i: 'c_etereo', g: 'ritmo' },
  { id: 'escudo', n: 'Protegido', c: '#3f7fc0', i: 'c_escudo', g: 'bencao' },
  { id: 'bencao', n: 'Abençoado', c: '#c9a227', i: 'c_bencao', g: 'bencao' },
  { id: 'inspirado', n: 'Inspirado', c: '#e6a700', i: 'c_inspirado', g: 'bencao' },
  { id: 'regen', n: 'Regeneração', c: '#58b368', i: 'c_regen', g: 'bencao' },
  { id: 'tratado', n: 'Tratado', c: '#d06a5a', i: 'c_tratado', g: 'bencao' },
  { id: 'escudado', n: 'Escudado', c: '#3f97d6', i: 'c_escudado', g: 'bencao' },
  /* (lote 19) As condições das raças: um grupo só, em ordem alfabética. r: a raça e a árvore de onde ela vem (aparece junto
     do nome); dur: as rodadas de começo (vêm preenchidas ao pôr; o mestre muda); max e ini: o contador (os acúmulos) —
     para no máximo e começa em ini; lim: a sugestão quando o contador chega ao limite (em 'max', ou 0 na que desce),
     com Aplicar; desce: a que conta para baixo (a Contagem); lado: o membro que se perde (pergunta o lado e marca na ficha).
     São marcadores, como as outras: o efeito, quem aplica é o mestre. */
  { id: 'ancestralEncarnado', n: 'Ancestral Encarnado', c: '#c9752e', i: 'c_ancestralEncarnado', g: 'racas', r: 'Orc Magi\'Ritu', dur: 2 },
  { id: 'armaVitrine', n: 'Arma de Vitrine', c: '#4fb0cf', i: 'c_armaVitrine', g: 'racas', r: 'Anão Mercador', dur: 3 },
  { id: 'armaRachada', n: 'Arma Rachada', c: '#8d8f94', i: 'c_armaRachada', g: 'racas', r: 'Anão da Forja' },
  { id: 'armaduraGelo', n: 'Armadura de Gelo', c: '#8fd4f2', i: 'c_armaduraGelo', g: 'racas', r: 'Humano Natuphas', dur: 3 },
  { id: 'bracoPerdido', n: 'Braço Perdido', c: '#7a8a52', i: 'c_bracoPerdido', g: 'racas', r: 'Ghoul Mãzier\'na', lado: 'braco' },
  { id: 'cargaTrovao', n: 'Carga de trovão', c: '#d9b51f', i: 'c_cargaTrovao', g: 'racas', r: 'Samurai Proto', max: 3, ini: 1 },
  { id: 'cercado', n: 'Cercado', c: '#c0563a', i: 'c_cercado', g: 'racas', r: 'Antro Canino' },
  { id: 'coma', n: 'Coma', c: '#56627e', i: 'c_coma', g: 'racas', r: 'Humano Vas' },
  { id: 'comprado', n: 'Comprado', c: '#d9b23a', i: 'c_comprado', g: 'racas', r: 'Anão Mercador', dur: 1 },
  { id: 'contagem', n: 'Contagem', c: '#9b6bd1', i: 'c_contagem', g: 'racas', r: 'Konaito', max: 3, ini: 3, desce: true, lim: { em: 0, sug: 'sentenca', d: 1, txt: 'a oração se cumpre e vem a Sentença (dá 1 de Voz ao Konaito)' } },
  { id: 'costelasAbertas', n: 'Costelas Abertas', c: '#9a7a6a', i: 'c_costelasAbertas', g: 'racas', r: 'Ghoul Mãzier\'na', lado: 'costelas' },
  { id: 'couracaGelo', n: 'Couraça de Gelo', c: '#5fbfe6', i: 'c_couracaGelo', g: 'racas', r: 'Orc Natuphas', dur: 3 },
  { id: 'criaNoite', n: 'Cria da Noite', c: '#6a4a8a', i: 'c_criaNoite', g: 'racas', r: 'Vampiro' },
  { id: 'debaixoTerra', n: 'Debaixo da Terra', c: '#8a6a3c', i: 'c_debaixoTerra', g: 'racas', r: 'Anão da Rocha', dur: 1 },
  { id: 'descontrole', n: 'Descontrole', c: '#d9342b', i: 'c_descontrole', g: 'racas', r: 'Orc Rastoroni', dur: 2 },
  { id: 'dividaEspiritual', n: 'Dívida Espiritual', c: '#7c8fd6', i: 'c_dividaEspiritual', g: 'racas', r: 'Orc Magi\'Ritu', max: 5, ini: 1 },
  { id: 'domDevorado', n: 'Dom Devorado', c: '#b8478f', i: 'c_domDevorado', g: 'racas', r: 'Ghoul Panso\'na' },
  { id: 'dor', n: 'Dor', c: '#b3364a', i: 'c_dor', g: 'racas', r: 'Karê Oradora · Rast', max: 5, ini: 1 },
  { id: 'emBrasa', n: 'Em Brasa', c: '#e8562b', i: 'c_emBrasa', g: 'racas', r: 'Anão da Forja', dur: 2 },
  { id: 'encanto', n: 'Encanto', c: '#e08a3c', i: 'c_encanto', g: 'racas', r: 'Humano Sarep', dur: 1 },
  { id: 'endurecido', n: 'Endurecido', c: '#8b7d6b', i: 'c_endurecido', g: 'racas', r: 'Orc Natuphas', max: 5, ini: 1 },
  { id: 'enxertado', n: 'Enxertado', c: '#8f5a6b', i: 'c_enxertado', g: 'racas', r: 'Ghoul Mãzier\'na', dur: 3 },
  { id: 'enxerto', n: 'Enxerto', c: '#6fae4f', i: 'c_enxerto', g: 'racas', r: 'Humano Sarep', dur: 1 },
  { id: 'erguido', n: 'Erguido', c: '#a66b3a', i: 'c_erguido', g: 'racas', r: 'Antro Bovino' },
  { id: 'exposto', n: 'Exposto', c: '#d67a3c', i: 'c_exposto', g: 'racas', r: 'Antro Equino', dur: 1 },
  { id: 'farejado', n: 'Farejado', c: '#a08a5c', i: 'c_farejado', g: 'racas', r: 'Antro Canino', dur: 1 },
  { id: 'feraSolta', n: 'Fera Solta', c: '#b5462a', i: 'c_feraSolta', g: 'racas', r: 'Licantropo' },
  { id: 'frio', n: 'Frio', c: '#7fc8ee', i: 'c_frio', g: 'racas', r: 'Kitsune Selene', max: 5, ini: 1, lim: { em: 'max', sug: 'gelo', d: 1, zera: true, txt: 'teste de VIT: se falhar, fica Congelado até o fim do próximo turno dele (o gelo tem 10 de HP) e os acúmulos zeram' } },
  { id: 'gosto', n: 'Gosto', c: '#c2588c', i: 'c_gosto', g: 'racas', r: 'Ghoul Panso\'na', dur: 3 },
  { id: 'guardaNatural', n: 'Guarda Natural', c: '#8a9a4a', i: 'c_guardaNatural', g: 'racas', r: 'Humano Sarep', dur: 2 },
  { id: 'habilidadeEngolida', n: 'Habilidade Engolida', c: '#6b4a7a', i: 'c_habilidadeEngolida', g: 'racas', r: 'Ghoul Panso\'na' },
  { id: 'jurado', n: 'Jurado', c: '#6f9fd6', i: 'c_jurado', g: 'racas', r: 'Humano Natuphas' },
  { id: 'laco', n: 'Laço', c: '#c9b8f2', i: 'c_laco', g: 'racas', r: 'Kitsune Merunê' },
  { id: 'licao', n: 'Lição', c: '#4f8fb0', i: 'c_licao', g: 'racas', r: 'Silk' },
  { id: 'magiaEngatilhada', n: 'Magia Engatilhada', c: '#7d5fd6', i: 'c_magiaEngatilhada', g: 'racas', r: 'Silk', dur: 1 },
  { id: 'mandado', n: 'Mandado', c: '#a07b45', i: 'c_mandado', g: 'racas', r: 'Konaito' },
  { id: 'maoPerdida', n: 'Mão Perdida', c: '#7a8a52', i: 'c_maoPerdida', g: 'racas', r: 'Ghoul Mãzier\'na', lado: 'mao' },
  { id: 'naPanca', n: 'Na Pança', c: '#9a6a3a', i: 'c_naPanca', g: 'racas', r: 'Ghoul Panso\'na', max: 2, ini: 1 },
  { id: 'naToca', n: 'Na Toca', c: '#8a6a4a', i: 'c_naToca', g: 'racas', r: 'Antro Roedor', dur: 2 },
  { id: 'noOmbro', n: 'No Ombro', c: '#8f7a54', i: 'c_noOmbro', g: 'racas', r: 'Antro Bovino' },
  { id: 'pePerdido', n: 'Pé Perdido', c: '#7a8a52', i: 'c_pePerdido', g: 'racas', r: 'Ghoul Mãzier\'na', lado: 'pe' },
  { id: 'perdido', n: 'Perdido', c: '#8a6ab8', i: 'c_perdido', g: 'racas', r: 'Antro Felino', max: 3, ini: 1 },
  { id: 'pernaPerdida', n: 'Perna Perdida', c: '#7a8a52', i: 'c_pernaPerdida', g: 'racas', r: 'Ghoul Mãzier\'na', lado: 'perna' },
  { id: 'pocaRoedor', n: 'Poça do Roedor', c: '#7a9a3a', i: 'c_pocaRoedor', g: 'racas', r: 'Antro Roedor', dur: 2 },
  { id: 'praga', n: 'Praga', c: '#6e8f2c', i: 'c_praga', g: 'racas', r: 'Ghoul Necrosado', dur: 2 },
  { id: 'procurado', n: 'Procurado', c: '#c9402e', i: 'c_procurado', g: 'racas', r: 'Anão Mercador' },
  { id: 'reboteAdiado', n: 'Rebote Adiado', c: '#6c8ad1', i: 'c_reboteAdiado', g: 'racas', r: 'Silk', dur: 1 },
  { id: 'recusaMorte', n: 'Recusa da Morte', c: '#c0392b', i: 'c_recusaMorte', g: 'racas', r: 'Humano Vas', dur: 2 },
  { id: 'rendido', n: 'Rendido', c: '#a89f84', i: 'c_rendido', g: 'racas', r: 'Anão Mercador', dur: 3 },
  { id: 'seloOcre', n: 'Selo de Ocre', c: '#c47a2c', i: 'c_seloOcre', g: 'racas', r: 'Humano Sarep', dur: 2 },
  { id: 'semeado', n: 'Semeado', c: '#8c7a3a', i: 'c_semeado', g: 'racas', r: 'Taekeir Magi\'atach', dur: 1 },
  { id: 'sementeSangue', n: 'Semente de Sangue', c: '#9b1b30', i: 'c_sementeSangue', g: 'racas', r: 'Vampiro' },
  { id: 'sentenca', n: 'Sentença', c: '#7a3a9a', i: 'c_sentenca', g: 'racas', r: 'Konaito', dur: 1 },
  { id: 'sobra', n: 'Sobra', c: '#b39c6a', i: 'c_sobra', g: 'racas', r: 'Ghoul Panso\'na', max: 2, ini: 1 },
  { id: 'transeRubro', n: 'Transe Rubro', c: '#c2263a', i: 'c_transeRubro', g: 'racas', r: 'Taekeir Zier\'Asurper' },
  { id: 'tregua', n: 'Trégua', c: '#8fb8a8', i: 'c_tregua', g: 'racas', r: 'Anão Mercador', dur: 1 },
  { id: 'vinculoSangue', n: 'Vínculo de Sangue', c: '#a8202e', i: 'c_vinculoSangue', g: 'racas', r: 'Taekeir Zier\'Asurper', dur: 3 },
  { id: 'vozVolkhum', n: 'Voz de Volkhum\'Pansar', c: '#d4a017', i: 'c_vozVolkhum', g: 'racas', r: 'Konaito', dur: 2 },
  /* (lote 20) As condições das classes: um grupo só, em ordem alfabética (r: a classe; dur: as rodadas de começo). Os
     três Feridos (ferido) são as tags de ferimento do Bruno: o HP negativo sugere a de cada terço do limite. */
  { id: 'alvoDuelo', n: 'Alvo do Duelo', c: '#c0392b', i: 'c_alvoDuelo', g: 'classes', r: 'Bárbaro' },
  { id: 'armaduraRachada', n: 'Armadura Rachada', c: '#a5663a', i: 'c_armaduraRachada', g: 'classes', r: 'Bárbaro' },
  { id: 'assombrado', n: 'Assombrado', c: '#8f9ac4', i: 'c_assombrado', g: 'classes', r: 'Bruxo', dur: 2 },
  { id: 'clausula', n: 'Cláusula', c: '#7a2f9a', i: 'c_clausula', g: 'classes', r: 'Feiticeiro', dur: 2 },
  { id: 'cobranca', n: 'Cobrança', c: '#b08a2a', i: 'c_cobranca', g: 'classes', r: 'Feiticeiro' },
  { id: 'dancando', n: 'Dançando', c: '#c05aa8', i: 'c_dancando', g: 'classes', r: 'Bardo', dur: 1 },
  { id: 'definhando', n: 'Definhando', c: '#76703a', i: 'c_definhando', g: 'classes', r: 'Bruxo', dur: 2 },
  { id: 'desguarnecido', n: 'Desguarnecido', c: '#e0603a', i: 'c_desguarnecido', g: 'classes', r: 'Aégis', dur: 1 },
  { id: 'devedor', n: 'Devedor', c: '#a04a2a', i: 'c_devedor', g: 'classes', r: 'Feiticeiro', dur: 1 },
  { id: 'eloLuz', n: 'Elo de Luz', c: '#d8b84a', i: 'c_eloLuz', g: 'classes', r: 'Sacerdote' },
  { id: 'escudoPlantado', n: 'Escudo Plantado', c: '#7a8aa8', i: 'c_escudoPlantado', g: 'classes', r: 'Aégis' },
  { id: 'escudoRachado', n: 'Escudo Rachado', c: '#8d8f94', i: 'c_escudoRachado', g: 'classes', r: 'Espadachim' },
  { id: 'extremamenteFerido', n: 'Extremamente Ferido', c: '#c8542f', i: 'c_extremamenteFerido', g: 'classes', r: 'Ferimento', ferido: true },
  { id: 'ginga', n: 'Ginga', c: '#2f9d93', i: 'c_ginga', g: 'classes', r: 'Bardo', dur: 1 },
  { id: 'guardaQuebrada', n: 'Guarda Quebrada', c: '#d98b2b', i: 'c_guardaQuebrada', g: 'classes', r: 'Espadachim', dur: 1 },
  { id: 'levementeFerido', n: 'Levemente Ferido', c: '#d9a05a', i: 'c_levementeFerido', g: 'classes', r: 'Ferimento', ferido: true },
  { id: 'mortalmenteFerido', n: 'Mortalmente Ferido', c: '#8f1d1d', i: 'c_mortalmenteFerido', g: 'classes', r: 'Ferimento', ferido: true },
  { id: 'pacto', n: 'Pacto', c: '#9a2a4a', i: 'c_pacto', g: 'classes', r: 'Feiticeiro' },
  { id: 'perjuro', n: 'Perjuro', c: '#6b4a7a', i: 'c_perjuro', g: 'classes', r: 'Aégis' },
  { id: 'portaAberta', n: 'Porta Aberta', c: '#5a3a6a', i: 'c_portaAberta', g: 'classes', r: 'Feiticeiro', dur: 2 },
  { id: 'seloLushmania', n: 'Selo de Lushmânia', c: '#e6c35a', i: 'c_seloLushmania', g: 'classes', r: 'Sacerdote', dur: 3 },
  { id: 'sobEgide', n: 'Sob a Égide', c: '#c9a227', i: 'c_sobEgide', g: 'classes', r: 'Aégis', dur: 1 },
  { id: 'sobExorcismo', n: 'Sob Exorcismo', c: '#e8b83a', i: 'c_sobExorcismo', g: 'classes', r: 'Sacerdote', dur: 2 },
  { id: 'tutelado', n: 'Tutelado', c: '#5a8fd6', i: 'c_tutelado', g: 'classes', r: 'Aégis' },
];
const COND_BY_ID = Object.fromEntries(CONDS.map(c => [c.id, c]));
/* (lote 8) As condições que pedem uma janela antes (a Ferida permanente: qual barra e quanto apodrece; o Clone:
   quantas cópias e em que raio; lote 9, o Duplicado: o gêmeo maligno, com as barras cheias ou como estão). Só o mestre
   as põe e tira, num token de cada vez — as zonas e o dano em área não as aplicam, e o pedido de um jogador não mexe
   nelas. */
// (lote 19) os membros perdidos das raças: a janela pergunta o lado (e a ficha marca a parte)
const COND_LADO = new Set(CONDS.filter(c => c.lado).map(c => c.id));
const COND_JANELA = new Set(['ferida', 'clone', 'duplicado', 'imbuidoMana', ...COND_LADO]);

// (fl: a luz tremula, como chama; a mágica, não)
const LIGHT_PRESETS = [
  { id: 'vela', n: 'Vela', bright: 1, dim: 2, c: '#ffd9a0', fl: true },
  { id: 'tocha', n: 'Tocha', bright: 4, dim: 8, c: '#ffc477', fl: true },
  { id: 'lampiao', n: 'Lampião', bright: 6, dim: 12, c: '#ffe2ad', fl: true },
  { id: 'fogueira', n: 'Fogueira', bright: 5, dim: 10, c: '#ff9d4d', fl: true },
  { id: 'braseiro', n: 'Braseiro', bright: 4, dim: 8, c: '#ff8a3d', fl: true },
  { id: 'magica', n: 'Luz mágica', bright: 6, dim: 12, c: '#a9d4ff', fl: false },
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
  ['wall', 'Parede'], ['door', 'Porta'], ['secret', 'Porta secreta'], ['window', 'Janela'], ['veil', 'Cortina'], ['mureta', 'Mureta'],
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
     mureta           livre            barra               (não abre)
   (*) menos a de quem está encostado nela. Isso depende de quem olha, então fica em Walls.sightFor;
       aqui a cortina fechada conta como "barra a visão".
   (lote 7, parte 4b) A mureta (a amurada do navio, o parapeito, a mureta de pedra) é uma parede baixa: deixa ver, não
   deixa passar, e não abre (por isso não tem o ícone das aberturas). */
const wallBlocksSight = w => !wallOpen(w) && w.k !== 'window' && w.k !== 'mureta';
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
  // (lote 8: a Ferida permanente e o Clone pedem a janela deles — o dano em área e as zonas não os aplicam)
  const cond = o.cond && o.cond.id && !COND_JANELA.has(String(o.cond.id)) ? { id: String(o.cond.id), n: int(o.cond.n), d: int(o.cond.d) } : null;
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
    inis: [],                             // bônus de iniciativa de cada turno (quem tem mais de um); vazio = o de sempre
    notes: '',
  }, extra || {});
}

/* (lote 29) O saque no chão: { itens: [{ nome, qtd, tipo }], lapros, de: de quem caiu }. null se não sobrou nada.
   (lote 33) A peça de equipamento que caiu de um inimigo vai inteira: eq { bonus, def, recN (as barras pelo nome), tipo,
   efeito } — quem pega recebe o equipamento com os bônus. */
function cleanEqSaque(e) {
  if (!e || typeof e !== 'object') return null;
  const nums = (o, max) => { const out = {}; if (o && typeof o === 'object' && !Array.isArray(o)) for (const k of Object.keys(o).slice(0, max)) { if (!/^[A-Za-z][A-Za-z0-9_ ]{0,29}$/.test(k)) continue; const v = Math.round(Number(o[k])); if (isFinite(v) && v) out[k] = clamp(v, -9999, 9999); } return out; };
  const o = { bonus: nums(e.bonus, 20) };
  const d = nums(e.def, 20), r = nums(e.recN, 8);
  if (Object.keys(d).length) o.def = d;
  if (Object.keys(r).length) o.recN = r;
  if (typeof e.tipo === 'string' && /^[A-Za-z0-9_-]{1,44}$/.test(e.tipo)) o.tipo = e.tipo;
  if (typeof e.efeito === 'string' && e.efeito.trim()) o.efeito = e.efeito.trim().slice(0, 300);
  return o;
}
const TIPOS_SAQUE = ['material', 'pocao', 'bomba', 'runa', 'municao', 'equip'];
function cleanSaque(o) {
  if (!o || typeof o !== 'object') return null;
  const itens = (Array.isArray(o.itens) ? o.itens : []).filter(x => x && typeof x === 'object').slice(0, 40)
    .map(x => { const o = { nome: String(x.nome == null ? 'Item' : x.nome).trim().slice(0, 80) || 'Item', qtd: clamp(Math.round(Number(x.qtd) || 1), 1, 9999), tipo: TIPOS_SAQUE.includes(x.tipo) ? x.tipo : 'material' }; const eq = o.tipo === 'equip' ? cleanEqSaque(x.eq) : null; if (eq) o.eq = eq; return o; });
  const lapros = clamp(Math.round(Number(o.lapros) || 0), 0, 9999999);
  if (!itens.length && !lapros) return null;
  const out = { itens, lapros };
  if (typeof o.de === 'string' && o.de.trim()) out.de = o.de.trim().slice(0, 60);
  return out;
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
    // faixa de um grupo: uma linha só para vários tokens (os ids deles, sem repetir)
    if (!e.token && Array.isArray(e.toks)) { e.toks = [...new Set(e.toks.filter(x => typeof x === 'string' && x))].slice(0, MAX_BAND); e.k = 1; }
    else delete e.toks;
    if (e.reac === true) e.reac = true; else delete e.reac;            // "esperando para reagir"
    if (e.inv === true) e.inv = true; else delete e.inv;               // linha invisível: os jogadores não a veem
  }
  // um token fica numa faixa só, e quem está numa faixa não tem linha própria
  const naFaixa = new Set();
  for (const e of sc.turn.list) if (e.toks) { e.toks = e.toks.filter(id => !naFaixa.has(id)); e.toks.forEach(id => naFaixa.add(id)); }
  if (naFaixa.size) sc.turn.list = sc.turn.list.filter(e => !(e.token && naFaixa.has(e.token)));
  if (!Array.isArray(sc.targets)) sc.targets = [];
  // (lote 18) as fases da arena (só do mestre): uma lista curta de { n, nome, feita, m: [as mudanças] }
  if (Array.isArray(sc.fases)) { sc.fases = sc.fases.filter(f => f && typeof f === 'object' && Array.isArray(f.m)).slice(0, 6); if (!sc.fases.length) delete sc.fases; } else delete sc.fases;
  if (!TONES.some(x => x.id === sc.tone)) sc.tone = 'dia';
  for (const w of sc.walls) {
    if (!(w.k === 'door' && w.secret) && !['wall', 'door', 'window', 'veil', 'mureta'].includes(w.k)) w.k = 'wall';
    w.open = !!w.open; w.locked = !!w.locked; w.secret = w.k === 'door' && !!w.secret;     // janela e cortina também abrem e trancam
  }
  for (const e of sc.effects) {
    // retângulo: largura e altura próprias. Nos efeitos antigos, a caixa do tamanho que eles já tinham.
    const side = Math.max(0.5, 2 * (Number(e.r) || 1));
    if (!(e.rw > 0)) e.rw = side;
    if (!(e.rh > 0)) e.rh = side;
    e.apply = cleanApply(e.apply);
    // (lote 7) o portal sem uma saída que valha fica só com a entrada; os pontos da muralha, inteiros e no limite
    if (e.fx === 'portal' && !(Number.isFinite(e.x2) && Number.isFinite(e.y2))) { delete e.x2; delete e.y2; }
    if (e.pvm != null) { e.pvm = Math.max(1, Math.round(Number(e.pvm)) || 30); e.pv = clamp(Math.round(Number.isFinite(Number(e.pv)) ? Number(e.pv) : e.pvm), 0, e.pvm); }
  }
  // terreno: o tipo tem de ser um dos que existem; senão, o desenho fica sendo um desenho comum
  for (const s of sc.shapes) if (s && s.ter !== undefined) { const c = cleanTer(s.ter); if (c) s.ter = c; else delete s.ter; }
  for (const t of sc.tokens) {
    const d = newToken({ tokens: [] }, t.x || 0, t.y || 0, { name: t.name });
    for (const k in d) if (t[k] === undefined) t[k] = d[k];
    t.vis = Object.assign({}, d.vis, t.vis);
    t.light = Object.assign({}, d.light, t.light);
    t.bars = (Array.isArray(t.bars) ? t.bars : barDefaults()).slice(0, MAX_BARS).map(cleanBar);
    if (!t.cinfo || typeof t.cinfo !== 'object') t.cinfo = {};
    t.ini = clampIni(t.ini); t.turns = clampTurns(t.turns);
    t.inis = cleanInis(t.inis);
    const st = cleanSt(t.st); if (st) t.st = st; else delete t.st;
    delete t.fixas;                                               // (a "fixa de cada turno" de antes saiu: era a iniciativa)
    t.char = typeof t.char === 'string' && t.char ? t.char : null;      // personagem da mesa ligado a este token
    // (lote 8) a cópia de um Clone: o id do real (só o mestre sabe; os jogadores veem todos iguais)
    if (!(typeof t.clone === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(t.clone) && t.clone !== t.id)) delete t.clone;
    // (lote 9) o gêmeo de um Duplicado: o id do token copiado (só o mestre sabe; para os jogadores, é igual ao original)
    if (!(typeof t.dup === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(t.dup) && t.dup !== t.id)) delete t.dup;
    // a fadiga da ficha (a pilha de 5 a 0), que a ficha manda para o token — todos a veem
    if (typeof t.fad === 'number' && isFinite(t.fad)) t.fad = clamp(Math.round(t.fad), 0, 5); else delete t.fad;
    if (t.post === true) t.post = true; else delete t.post;               // (lote 6) em postura: a etiqueta junto do nome
    if (t.light.fl) t.light.fl = true; else delete t.light.fl;          // luz que tremula (uma tocha na mão)
    // objeto de cenário: só os do catálogo, sempre quadrado; gira de 0 a 359 graus
    if (t.prop && Props.P[t.prop]) { t.rot = ((Math.round(Number(t.rot) || 0) % 360) + 360) % 360; t.shape = 'quad'; t.char = null; }
    else { delete t.prop; delete t.rot; }
    // (lote 29) o inimigo do Bestiário ligado a este token (só o id: os números vêm de lá; as barras ficam no token);
    // e, no objeto de cenário, o saque que ficou no chão (o que caiu de um inimigo, até alguém pegar)
    if (!(typeof t.best === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(t.best)) || t.char || t.prop) delete t.best;
    // (lote 33) o equipamento deste inimigo, peça por peça, quando ele troca na cena: { idDaPeça: true | false }
    if (t.best && t.bestEq && typeof t.bestEq === 'object' && !Array.isArray(t.bestEq)) {
      const eq = {};
      for (const k of Object.keys(t.bestEq).slice(0, 24)) if (/^[A-Za-z0-9_-]{1,60}$/.test(k)) eq[k] = !!t.bestEq[k];
      if (Object.keys(eq).length) t.bestEq = eq; else delete t.bestEq;
    } else delete t.bestEq;
    const sq = t.prop ? cleanSaque(t.saque) : null;
    if (sq) t.saque = sq; else delete t.saque;
    // (lote 7) o objeto que leva a outra cena (a entrada de uma casa, a saída, uma escada): o id da cena
    if (!(t.prop && typeof t.cena === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(t.cena))) delete t.cena;
    // (lote 7) o que o marcador sabe para gerar a cena de dentro: o prédio (tipo, medidas, porta, estilo, semente,
    // forma) ou o bairro do mapa de bairros
    const gera = t.prop && t.gera && typeof t.gera === 'object' ? t.gera : null, palavra = v => typeof v === 'string' && /^[a-z]{1,12}$/.test(v);
    if (gera && palavra(gera.b)) t.gera = { b: gera.b };
    // (parte 4b-3: a escada que desce — o tipo do nível de baixo, o número dele, o tamanho, o estilo e a semente)
    // (lote 28: os oito estilos novos e a largura dos corredores, lc)
    else if (gera && gera.t === 'masmorra') t.gera = Object.assign({ t: 'masmorra', m: ['pedra', 'caverna', 'cripta', 'mina', 'templo', 'esgoto', 'torre', 'laboratorio', 'fortaleza', 'ruinas', 'covil', 'navio'].includes(gera.m) ? gera.m : 'pedra', n: clamp(Math.round(Number(gera.n)) || 1, 1, 99), tam: ['pequeno', 'medio', 'grande'].includes(gera.tam) ? gera.tam : 'medio', e: palavra(gera.e) ? gera.e : 'comum', s: (Math.round(Number(gera.s)) >>> 0) || 1 }, [1, 2, 3].includes(gera.lc) ? { lc: gera.lc } : null);
    // (lote 18: a entrada de gruta — onde fica a boca, o bioma de baixo, a semente e o rio de cima, até 41 pontos)
    else if (gera && gera.t === 'subsolo') {
      const nu = v => (typeof v === 'number' && isFinite(v) ? Math.round(clamp(v, -1000, 1000) * 100) / 100 : null);
      t.gera = { t: 'subsolo', x: nu(gera.x), y: nu(gera.y), bio: ['fungos', 'cristais', 'lava', 'gelo', 'raizes'].includes(gera.bio) ? gera.bio : 'fungos', s: (Math.round(Number(gera.s)) >>> 0) || 1 };
      const rio = Array.isArray(gera.rio) ? gera.rio.filter(q => Array.isArray(q) && nu(q[0]) != null && nu(q[1]) != null).slice(0, 41).map(q => [nu(q[0]), nu(q[1])]) : [];
      if (rio.length >= 2) t.gera.rio = rio;
      if (t.gera.x == null || t.gera.y == null) { delete t.gera.x; delete t.gera.y; }
    }
    // (parte 4b: o navio — o casco vai até 32 quadrados, e a forma 'navio' tem a proa do lado p)
    else if (gera && palavra(gera.t)) {
      t.gera = { t: gera.t, w: clamp(Math.round(Number(gera.w)) || 4, 2, 32), h: clamp(Math.round(Number(gera.h)) || 4, 2, 32), p: typeof gera.p === 'string' && gera.p.length === 1 && 'nsol'.includes(gera.p) ? gera.p : 's', e: palavra(gera.e) ? gera.e : 'comum', s: (Math.round(Number(gera.s)) >>> 0) || 1, f: gera.f === 'oct' || gera.f === 'navio' ? gera.f : 'ret' };
      if (gera.c === true) t.gera.c = true;              // (lote 7, parte 4b) a moradia do chefe da tribo
    }
    else delete t.gera;
  }
  // (lote 7) o mapa de bairros guarda com que escolhas, semente e trava a cidade foi feita (para recortar os bairros)
  const gd = sc.gerado;
  if (gd && typeof gd === 'object' && gd.lugar === 'cidade' && gd.o && typeof gd.o === 'object' && JSON.stringify(gd).length < 24000) sc.gerado = { lugar: 'cidade', o: gd.o, seed: (Math.round(Number(gd.seed)) >>> 0) || 1, trava: gd.trava && typeof gd.trava === 'object' ? gd.trava : null };
  else delete sc.gerado;
  for (const l of sc.lights) { if (l.fl) l.fl = true; else delete l.fl; }
  return sc;
}
