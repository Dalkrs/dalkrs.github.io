// As capturas do Manual (lote 51): abre o site sem conta (cada um é o mestre de tudo), abre cada aba que tem imagem em
// manual/conteudo.js, prepara o que precisa estar à vista e marca os botões com os números da legenda. Grava em
// manual/img/<arq>. Rodar a cada lote em que uma aba com imagem mudar de cara:
//   node src/tests/manual-fotos.js            (todas)      node src/tests/manual-fotos.js cenas mundo   (só essas)
const path = require('path'), fs = require('fs');
const { start } = require('./lib');
const R = require('../../tc/rules.js');
const ROOT = path.join(__dirname, '..', '..');
global.window = {};
require(path.join(ROOT, 'manual', 'conteudo.js'));
const M = global.window.TC_MANUAL;
const so = process.argv.slice(2);

const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', level: 5, grupo: 'Heróis', estado: { lapros: 40 } });
const pc2 = Object.assign(R.personagemPadrao('Kaira'), { id: 'pc_kaira', level: 5, grupo: 'Heróis', estado: { lapros: 12 } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc, pc2], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'], abaFicha: 'atributos' });

// o que cada aba precisa antes da foto (o lugar vazio não mostra os botões)
const clicarTexto = async (F, re) => { const b = F.locator('button', { hasText: re }).first(); if (await b.count()) await b.click(); };
const PREP = {
  mundo: async (F, P) => { await F.locator('input').first().fill('Terras de Urgm').catch(() => {}); await clicarTexto(F, /Papel em branco/); await P.waitForTimeout(1500); },
  cla: async (F, P) => { await F.locator('[data-k="novo-cla"]').click(); await P.waitForTimeout(500); await F.locator('[data-k="dl:nome"]').fill('Casa Varonil'); await F.locator('[data-k="dl:nome"]').press('Enter'); await P.waitForTimeout(900); },
  bestiario: async (F, P) => {
    for (const nome of ['Lobo cinzento', 'Esqueleto guerreiro']) {
      await clicarTexto(F, /\+ Inimigo/); await P.waitForTimeout(700);
      await F.locator('#dlg input').first().fill(nome); await F.locator('#ed-salvar').click(); await P.waitForTimeout(700);
    }
    const mais = F.locator('[data-mais]');
    for (let i = 0; i < 3; i++) { await mais.nth(i % 2).click().catch(() => {}); await P.waitForTimeout(200); }
  },
  escudo: async (F, P) => { await clicarTexto(F, /\+ Sessão/); await P.waitForTimeout(900); },
};

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fotos', w: 1366, h: 820, seed: { urgm_calc_atributos_v1: estado, 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } });
  await P.goto(t.base, { waitUntil: 'load' }); await P.waitForTimeout(2500);
  for (const s of M.sistemas) {
    if (!s.img || (so.length && !so.includes(s.id))) continue;
    const aba = s.id === 'mesa' ? 'cenas' : s.id;
    await P.evaluate(i => { const b = document.getElementById('tab-' + i); if (b) b.click(); }, aba);
    await P.waitForTimeout(2500);
    const el = await P.$('#f-' + aba), F = el ? await el.contentFrame() : null;
    if (F && PREP[aba]) { try { await PREP[aba](F, P); } catch (e) { console.log(s.id, 'preparo:', e.message.split('\n')[0]); } }
    await P.waitForTimeout(600);
    if (F) await F.evaluate(() => document.querySelectorAll('.toast, .toasts, #toasts, #toast').forEach(x => { x.style.visibility = 'hidden'; })).catch(() => {});
    // os retângulos (na tela da casca) de cada marca
    const off = F ? await P.evaluate(i => { const r = document.getElementById('f-' + i).getBoundingClientRect(); return { x: r.left, y: r.top }; }, aba) : { x: 0, y: 0 };
    const caixas = [];
    for (const m of s.img.marcas) {
      let r = null;
      if (m.casca) r = await P.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, m.casca);
      else if (F) { r = await F.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; }, m.sel); if (r) { r.x += off.x; r.y += off.y; } }
      if (!r) console.log('  ' + s.id + ': não achei ' + (m.casca || m.sel));
      caixas.push(r);
    }
    await P.evaluate(cx => {
      const W = innerWidth, H = innerHeight;
      cx.forEach((r, i) => {
        if (!r) return;
        const x = Math.max(3, r.x - 4), y = Math.max(3, r.y - 4), w = Math.min(W - x - 3, r.w + 8), h = Math.min(H - y - 3, r.h + 8);
        const anel = document.createElement('div');
        anel.className = 'manual-foto';
        Object.assign(anel.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', border: '3px solid #e6ab4f', borderRadius: '10px', boxShadow: '0 0 0 3px rgba(0,0,0,.55), 0 0 18px rgba(230,171,79,.55)', zIndex: 9999, pointerEvents: 'none' });
        const n = document.createElement('div');
        n.className = 'manual-foto';
        n.textContent = String(i + 1);
        const bx = Math.min(W - 34, Math.max(4, x - 12)), by = Math.min(H - 34, Math.max(4, y - 12));
        Object.assign(n.style, { position: 'fixed', left: bx + 'px', top: by + 'px', width: '30px', height: '30px', borderRadius: '50%', background: '#e6ab4f', color: '#1d1503', font: '700 16px/30px "Atkinson Hyperlegible Next", system-ui, sans-serif', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.6), 0 0 0 2px #1d1503', zIndex: 10000, pointerEvents: 'none' });
        document.body.append(anel, n);
      });
    }, caixas);
    await P.screenshot({ path: path.join(ROOT, 'manual', 'img', s.img.arq), type: 'jpeg', quality: 78 });
    await P.evaluate(() => document.querySelectorAll('.manual-foto').forEach(x => x.remove()));
    console.log('foto', s.img.arq, caixas.filter(Boolean).length + '/' + caixas.length);
  }
  await t.close();
})().catch(e => { console.error(e); process.exit(1); });
