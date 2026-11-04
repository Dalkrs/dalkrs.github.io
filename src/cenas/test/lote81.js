// Bateria do lote 81 nas Cenas (sem mesa): os fundos grandes.
//   · um WebP de 7680 × 5120 px entra como veio (os mesmos bytes, sem passar pelo canvas), com w e h de verdade;
//   · um PNG maior que 8192 px é reduzido para 8192 no lado maior;
//   · a janela "Ajustar a cena ao mapa" sugere 120 quadrados (7680 / 64); ajustada, a cena fica 120 × 80 e o fundo
//     encaixa na grade (esticado);
//   · as cópias reduzidas (½ e ¼) do fundo grande, e a escolha da que basta para o zoom;
//   · um fundo de 4096 px ou menos continua como antes (sem cópias).
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  // um arquivo de imagem feito na página (um mapa com uma grade de 64 px, para ver a nitidez)
  const fazer = (w, h, tipo, q) => ev(([w, h, tipo, q]) => new Promise(ok => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    c.fillStyle = '#3d4a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e6ab4f'; c.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 0; i < 400; i++) { c.fillStyle = `hsl(${i * 37 % 360},60%,50%)`; c.fillRect((i * 997) % w, (i * 613) % h, 40, 40); }
    cv.toBlob(b => { window.__arq = new File([b], 'fortaleza.' + (tipo === 'image/png' ? 'png' : 'webp'), { type: b.type }); ok({ size: b.size, type: b.type }); }, tipo, q);
  }), [w, h, tipo, q]);

  const info = await fazer(7680, 5120, 'image/webp', 0.9);
  ok(info.type === 'image/webp', '(o WebP de 7680 × 5120: ' + Math.round(info.size / 1024) + ' kB)');
  const a = await ev(async () => { const a = await __tc.Assets.fromFile(window.__arq, 'bg'); const b64 = a.url.slice(a.url.indexOf(',') + 1); return { w: a.w, h: a.h, tipo: a.url.slice(5, a.url.indexOf(';')), bytes: Math.floor(b64.length * 3 / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0), id: a.id }; });
  ok(a.w === 7680 && a.h === 5120, 'o WebP grande entra com 7680 × 5120 px (antes, era reduzido para 4096): ' + JSON.stringify(a));
  ok(a.tipo === 'image/webp' && a.bytes === info.size, 'e com os mesmos bytes do arquivo (sem comprimir de novo): ' + a.bytes + ' = ' + info.size);

  // a janela de ajustar: sugere 120 e encaixa
  await ev(() => { const { Store } = __tc; Store.tx('x', () => Store.scn({ cols: 30, rows: 20, cell: 64 })); });
  await ev(() => __tc.UI.bgFromFile(window.__arq)); await w(1200);
  ok(await page.locator('#dlg-cols').inputValue() === '120', 'a janela "Ajustar a cena ao mapa" sugere 120 quadrados na largura (7680 / 64)');
  await page.locator('.modal .btn', { hasText: 'Ajustar a cena' }).click(); await w(600);
  const sc = await ev(() => { const s = __tc.Store.scene(); return { cols: s.cols, rows: s.rows, stretch: s.bg.stretch, asset: s.bg.asset }; });
  ok(sc.cols === 120 && sc.rows === 80 && sc.stretch === true, 'a cena fica 120 × 80 e o fundo encaixa na grade (esticado): ' + JSON.stringify(sc));
  // as cópias reduzidas, e a escolha pelo zoom
  ok(await (async () => { for (let i = 0; i < 40; i++) { if (await ev(id => { const im = __tc.Assets.img(id); return !!im && !!im.mips && im.mips.length === 2; }, sc.asset)) return true; await w(250); } return false; })(), 'o fundo grande ganha as cópias de ½ e ¼');
  const esc = await ev(id => { const A = __tc.Assets, im = A.img(id), nome = x => (x === im ? 'inteira' : x.width + '×' + x.height); return { z1: nome(A.escolher(im, 1)), z05: nome(A.escolher(im, 2.2)), z025: nome(A.escolher(im, 4.5)), meio: nome(A.escolher(im, 1.6)) }; }, sc.asset);
  ok(esc.z1 === 'inteira' && esc.meio === 'inteira' && esc.z05 === '3840×2560' && esc.z025 === '1920×1280', 'no zoom de perto, a imagem inteira; de longe, a cópia que basta: ' + JSON.stringify(esc));
  // 100%: cada quadrado com 64 px
  await ev(() => { const { App, Render } = __tc; App.view.z = 1; App.view.x = 0; App.view.y = 0; Render.request(); }); await w(400);
  await foto('l81-fundo-100');
  // o desenho com o fundo grande: o tempo de um quadro, de longe e de perto
  const tempo = await ev(async () => { const { App, Render } = __tc, med = async z => { App.view.z = z; const t0 = performance.now(); for (let i = 0; i < 20; i++) { Render.draw ? Render.draw() : Render.request(); await new Promise(r => requestAnimationFrame(r)); } return (performance.now() - t0) / 20; }; return { longe: Math.round(await med(0.12)), perto: Math.round(await med(1)) }; });
  ok(tempo.longe < 60 && tempo.perto < 60, 'desenhar com o fundo grande continua leve (ms por quadro): ' + JSON.stringify(tempo));
  // um PNG maior que o teto é reduzido para 8192
  await fazer(9000, 3000, 'image/png');
  const p = await ev(async () => { const a = await __tc.Assets.fromFile(window.__arq, 'bg'); return { w: a.w, h: a.h, tipo: a.url.slice(5, a.url.indexOf(';')) }; });
  ok(p.w === 8192 && p.h === 2731 && p.tipo === 'image/webp', 'um PNG de 9000 px é reduzido para 8192 no lado maior (e recodificado): ' + JSON.stringify(p));
  // um fundo pequeno: como antes
  await fazer(2048, 1024, 'image/webp', 0.9);
  const s = await ev(async () => { const a = await __tc.Assets.fromFile(window.__arq, 'bg'); const im = await new Promise(r => { const f = () => { const i = __tc.Assets.img(a.id); if (i) r(i); else setTimeout(f, 100); }; f(); }); return { w: a.w, mips: !!im.mips }; });
  ok(s.w === 2048 && !s.mips, 'um fundo de 4096 px ou menos continua como antes (sem cópias)');
  ok(!t.errs.length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  console.log((fails ? fails + ' falharam, ' : '') + (n - fails) + ' verificações passaram');
  await t.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
