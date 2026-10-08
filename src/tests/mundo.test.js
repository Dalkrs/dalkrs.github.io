// Mapa-múndi de ponta a ponta. Primeiro a página sozinha (tudo no navegador); depois na mesa, com a casca falsa
// (casca-falsa.html) em dois aparelhos: o mestre monta o mapa pela interface e o jogador recebe só a projeção pública.
// O Node faz o papel do banco: guarda os documentos, serve as imagens enviadas e repassa a cada aparelho o que mudou
// nos outros. A rede de fora não é usada (as imagens da mesa têm um endereço https que o próprio teste responde).
// Cada parte roda num passo protegido: se uma quebra no meio, ela conta como falha e as outras seguem.
// MUNDO_FOTOS=<pasta> guarda capturas das telas principais, para olhar depois.
const path = require('path'), zlib = require('zlib');
const { start, checker } = require('./lib');
const { ok, end } = checker();

const MESA = 'mesa_e2e';
const SEG = 'K7731K';                                  // vai em tudo o que é só do mestre; não pode chegar ao jogador
const HOST = 'https://arquivos.casca-falsa.invalid/';
const PRE_MAPA = 'mundo:mapa:', PRE_PUB = 'mundo:pub:', INDICE = 'mundo:indice';
const FOTOS = process.env.MUNDO_FOTOS || null;
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

/* ---- um PNG de verdade, feito aqui (sem arquivo no repositório) ---- */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function png(w, h, cor) {
  const pedaco = (tipo, dados) => {
    const tam = Buffer.alloc(4), td = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]), c = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length); c.writeUInt32BE(crc32(td));
    return Buffer.concat([tam, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;          // 8 bits por canal, RGB
  const linha = 1 + w * 3, cru = Buffer.alloc(linha * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = cor(x, y), i = y * linha + 1 + x * 3; cru[i] = r; cru[i + 1] = g; cru[i + 2] = b; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))]);
}
// terra e mar em xadrez largo, com uma grade fina por cima
const terra = (x, y) => (x % 100 === 0 || y % 100 === 0 ? [40, 44, 52] : ((x >> 7) + (y >> 7)) & 1 ? [92, 128, 84] : [64, 96, 140]);
const PNG_LOCAL = png(1000, 700, terra);
const PNG_MESA = png(1000, 700, (x, y) => terra(y, x));

/* ---- apoio: "a" é um aparelho { P: página, F: quadro onde o Mapa-múndi roda, nome } ---- */
const ate = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await espera(100); } };
async function pronto(F) { await F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await F.waitForTimeout(250); }
// um pedaço do teste: se quebrar no meio (o módulo não mostrou o que devia), vira uma falha e o resto segue
async function passo(nome, fn) {
  try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); }
}
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
// ponto do mapa (unidades) → ponto da página (o quadro pode estar dentro de uma moldura)
async function naTela(a, x, y) {
  const off = a.F === a.P.mainFrame() ? { x: 0, y: 0 } : await (await a.F.frameElement()).boundingBox();
  const [px, py] = await A(a, ([x, y]) => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(); return [r.left + x * r.width / m.larg, r.top + y * r.height / m.alt]; }, [x, y]);
  return [off.x + px, off.y + py];
}
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }   // um aviso por cima do mapa pegaria o clique
async function clicar(a, x, y) { await semAvisos(a); const [px, py] = await naTela(a, x, y); await a.P.mouse.click(px, py); await a.F.waitForTimeout(160); }
async function arrastar(a, de, para) {
  await semAvisos(a);
  const [x0, y0] = await naTela(a, de[0], de[1]), [x1, y1] = await naTela(a, para[0], para[1]);
  await a.P.mouse.move(x0, y0); await a.P.mouse.down(); await a.P.mouse.move(x1, y1, { steps: 10 }); await a.P.mouse.up(); await a.F.waitForTimeout(200);
}
async function ferramenta(a, f) { await a.F.click(`#rail .tool[data-f="${f}"]`); await a.F.waitForTimeout(120); }
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
// escreve num campo do painel e termina a edição (Enter; Ctrl+Enter num texto longo): um passo de desfazer
async function escrever(a, k, v) {
  const c = campo(a, k);
  await c.fill(v);
  await c.press((await c.evaluate(el => el.tagName)) === 'TEXTAREA' ? 'Control+Enter' : 'Enter');
  await a.F.waitForTimeout(160);
}
async function alternar(a, k) { await campo(a, k).click(); await a.F.waitForTimeout(160); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(160); }
async function botao(a, k) { await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(200); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function menuMapa(a, texto) {
  await a.F.click('#btMapa'); await a.F.waitForTimeout(150);
  await a.F.locator('#menuMapas button').filter({ hasText: texto }).first().click(); await a.F.waitForTimeout(250);
}
async function janela(a) { const d = a.F.locator('dialog.mundo-dl[open]'); await d.waitFor(); return d; }
const sel = a => A(a, () => __mundo.App.sel[0] || null);
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const hexDe = (a, x, y) => A(a, ([x, y]) => __mundo.N.chaveHex(__mundo.N.hexDe(__mundo.App.mapa, x, y)), [x, y]);
const mapa = a => A(a, () => __mundo.App.mapa);
const perto = (v, alvo, folga = 1.5) => typeof v === 'number' && Math.abs(v - alvo) <= folga;
// objetos desenhados (o selo de um evento fica num grupo à parte, na camada dos ícones: conta pelo id)
const desenhados = a => A(a, () => new Set([...document.querySelectorAll('#mundo svg .obj')].map(e => e.getAttribute('data-id'))).size);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const semRolagemLateral = a => A(a, () => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth);
const imagemAberta = (a, w) => ate(() => A(a, w => { const i = document.querySelector('#mundo img'); return !!i && i.complete && i.naturalWidth === w; }, w));
async function foto(a, nome) { if (FOTOS) await a.P.screenshot({ path: path.join(FOTOS, nome + '.png') }); }

(async () => {
  const t = await start();
  const id = {};                                       // ids do que o teste criou (os passos seguintes usam)
  let o, m;

  /* ================= 1. a página sozinha: tudo neste navegador ================= */
  const dl = await t.device({ name: 'local' });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame(), nome: 'local' };

  await passo('local: criar o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await pronto(L.F);
    ok(await A(L, () => { const a = __mundo.App; return !a.naMesa && a.papel === 'mestre' && a.mapa === null && !!(__mundo.N && __mundo.Tela && __mundo.Painel); }), 'sozinha: sem mesa, papel de mestre, nenhum mapa ainda, __mundo exposto com ?debug');
    ok(await L.F.locator('#vazio').isVisible() && /Criar o primeiro mapa/.test(await L.F.locator('#vazio').innerText()), 'primeira visita: estado vazio com "Criar o primeiro mapa"');
    ok(/neste navegador/.test(await L.F.locator('#vazio').innerText()), 'o estado vazio diz que fica guardado neste navegador');
    ok(await A(L, () => localStorage.getItem('tinycats:mundo:v1')) === null, 'nada é gravado antes de criar o mapa');
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Terras de Teste');
    await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    m = await mapa(L);
    ok(!!m && m.nome === 'Terras de Teste' && m.img === null && m.larg === 2000 && m.alt === 1400, 'papel em branco criado com o nome escolhido, 2000 × 1400, sem imagem');
    ok(await L.F.locator('#vazio').isHidden() && await L.F.locator('#mundo .papel').count() === 1, 'o papel em branco aparece no lugar do estado vazio');
    ok((await L.F.locator('#nomeMapa').innerText()) === 'Terras de Teste', 'o nome do mapa na barra de cima');
    ok(await L.F.locator('#rail .tool').count() === 11, 'trilho com as 11 ferramentas (com a Terreno e a Desenho)');
    ok(await ate(() => A(L, id => { const v = JSON.parse(localStorage.getItem('tinycats:mundo:v1') || 'null'); return !!v && v.atual === id && !!v.mapas[id]; }, m.id)), 'o mapa fica no localStorage (tinycats:mundo:v1)');
    ok(/Salvo neste navegador/.test(await L.F.locator('#salvo').innerText()), 'indicador: "Salvo neste navegador"');
  });

  // um objeto de cada tipo, pela interface; cada um editado pelo painel logo depois de posto
  await passo('local: marcador', async () => {
    await ferramenta(L, 'm');
    ok(await A(L, () => __mundo.App.ferramenta) === 'm' && await L.F.locator('#rail .tool[data-f="m"]').getAttribute('aria-pressed') === 'true', 'Marcador ligado pelo trilho (aria-pressed)');
    await L.F.click('#opts .chip[aria-haspopup]'); await espera(150);
    await L.F.click('.menu-icones button[aria-label="Castelo"]'); await espera(150);
    await clicar(L, 400, 300);
    id.m = await sel(L);
    o = await obj(L, id.m);
    ok(!!o && o.k === 'm' && o.ic === 'castelo' && perto(o.x, 400) && perto(o.y, 300), 'marcador posto com um clique, com o ícone escolhido nas opções (Castelo)');
    ok(await A(L, () => __mundo.App.ferramenta) === 'sel', 'depois de pôr, volta para Selecionar');
    ok(await rotulo(L) === 'novo marcador', 'pôr o marcador é um passo de desfazer: ' + await rotulo(L));
    ok(await campo(L, `o:${id.m}:nome`).isVisible(), 'o painel abre o formulário do marcador novo');
    await campo(L, `o:${id.m}:nome`).fill('Forte do Teste');
    ok((await obj(L, id.m)).nome === '', 'digitar ainda não grava (um passo por edição, não por tecla)');
    await campo(L, `o:${id.m}:nome`).press('Enter'); await espera(160);
    ok((await obj(L, id.m)).nome === 'Forte do Teste' && await rotulo(L) === 'mudar o nome', 'Enter grava o nome (passo "mudar o nome")');
    ok(await ate(async () => await A(L, id => { const el = document.querySelector(`#mundo svg [data-id="${id}"] .rotulo`); return el && el.textContent; }, id.m) === 'Forte do Teste', 3000), 'o nome aparece no mapa');
    await escrever(L, `o:${id.m}:txt`, 'Muralhas altas.');
    await escrever(L, `o:${id.m}:nota`, 'Guarda um segredo.');
    await alternar(L, `o:${id.m}:rumor`);
    await alternar(L, `o:${id.m}:falso`);
    o = await obj(L, id.m);
    ok(o.txt === 'Muralhas altas.' && o.nota === 'Guarda um segredo.' && o.rumor === true && o.falso === true, 'texto dos jogadores, nota do mestre, "É boato" e "O boato é falso" pelo painel');
    ok(await ate(() => A(L, id => { const g = document.querySelector(`#mundo svg [data-id="${id}"]`); return g.classList.contains('rumor') && g.classList.contains('falso') && !!g.querySelector('.risco'); }, id.m), 3000), 'o mestre vê o boato (com "?") e o risco de falso');
  });

  await passo('local: grupo, evento, região, rota e frente', async () => {
    await ferramenta(L, 'g');
    await clicar(L, 700, 450);
    id.g = await sel(L);
    ok((await obj(L, id.g) || {}).k === 'g' && await rotulo(L) === 'novo grupo', 'grupo posto com um clique');
    await escrever(L, `o:${id.g}:sigla`, 'abc');
    ok((await obj(L, id.g)).sigla === 'ABC' && await rotulo(L) === 'mudar a sigla', 'sigla do grupo pelo painel (em maiúsculas)');

    await ferramenta(L, 'e');
    await L.F.selectOption('#opts select[aria-label="Evento"]', 'tempestade'); await espera(100);
    await arrastar(L, [1300, 500], [1400, 500]);
    id.e = await sel(L);
    o = await obj(L, id.e);
    ok(!!o && o.k === 'e' && o.tipo === 'tempestade' && perto(o.r, 100, 4) && o.ini === 0, 'evento: arrastar define o raio (' + (o && o.r) + '), tipo das opções, começa hoje');
    await escolher(L, `o:${id.e}:forca`, '3');
    ok((await obj(L, id.e)).forca === 3 && await rotulo(L) === 'mudar a força', 'força do evento pelo painel');

    await ferramenta(L, 'r');
    for (const [x, y] of [[200, 800], [600, 800], [600, 1150], [200, 1150]]) await clicar(L, x, y);
    ok(await L.F.locator('#opts .chip', { hasText: 'Fechar a região' }).isVisible(), 'desenhando a região: chip "Fechar a região"');
    await clicar(L, 200, 800);
    id.r = await sel(L);
    o = await obj(L, id.r);
    ok(!!o && o.k === 'r' && o.pts.length === 4 && await rotulo(L) === 'nova região', 'região: 4 pontos, clicar no primeiro fecha');
    await escrever(L, `o:${id.r}:chance`, '50');
    await escrever(L, `o:${id.r}:enc`, '2: Lobos\nMercador');
    o = await obj(L, id.r);
    ok(o.enc.chance === 50 && j(o.enc.itens) === j([{ p: 2, txt: 'Lobos' }, { p: 1, txt: 'Mercador' }]), 'tabela de encontros pelo painel (chance e "peso: resultado"): ' + j(o.enc));

    await ferramenta(L, 't');
    await L.F.selectOption('#opts select[aria-label="Via"]', 'estrada'); await espera(100);
    await clicar(L, 800, 300); await clicar(L, 1100, 450);
    { const [x, y] = await naTela(L, 1500, 900); await L.P.mouse.click(x, y); await espera(60); await L.P.mouse.click(x, y); await espera(250); }
    id.t = await sel(L);
    o = await obj(L, id.t);
    ok(!!o && o.k === 't' && o.pts.length === 3 && o.via === 'estrada', 'rota: 3 pontos, duplo clique termina, via das opções');
    await escolher(L, `o:${id.t}:via`, 'rio');
    ok((await obj(L, id.t)).via === 'rio' && await rotulo(L) === 'mudar o desenho da rota', 'o desenho da rota (rio) pelo painel');

    await ferramenta(L, 'f');
    await clicar(L, 1100, 150); await clicar(L, 1700, 250);
    await L.F.locator('#opts .chip', { hasText: 'Terminar' }).click(); await espera(250);
    id.f = await sel(L);
    ok((await obj(L, id.f) || {}).k === 'f' && (await obj(L, id.f)).ativa === true, 'frente: 2 pontos e o chip "Terminar"');
    await alternar(L, `o:${id.f}:ativa`);
    ok((await obj(L, id.f)).ativa === false && await rotulo(L) === 'mudar o combate', '"Em combate" pelo painel');

    m = await mapa(L);
    for (const k of ['m', 'g', 'r', 'e', 't', 'f']) ok(m.objs.filter(x => x.k === k).length === 1, `um objeto do tipo ${k} posto pela interface`);
    ok(await ate(async () => await desenhados(L) === 6, 3000), 'os seis desenhados no mapa');
  });

  await passo('local: desfazer e refazer', async () => {
    await A(L, () => document.activeElement && document.activeElement.blur());
    ok((await L.F.getAttribute('#btDesfazer', 'title')) === 'Desfazer: mudar o combate (Ctrl+Z)', 'a dica do botão diz o que vai desfazer');
    await L.P.keyboard.press('Control+z'); await espera(200);
    ok((await obj(L, id.f)).ativa === true, 'Ctrl+Z desfaz o último passo');
    await L.F.click('#btDesfazer'); await espera(200);
    ok(!(await obj(L, id.f)) && (await obj(L, id.t)).via === 'rio', 'o botão Desfazer volta o passo anterior (a frente sai)');
    await A(L, () => document.activeElement && document.activeElement.blur());
    await L.P.keyboard.press('Control+Shift+z'); await espera(150);
    ok(!!(await obj(L, id.f)) && (await obj(L, id.f)).ativa === true, 'Ctrl+Shift+Z refaz (a frente volta)');
    await L.P.keyboard.press('Control+y'); await espera(200);
    ok((await obj(L, id.f)).ativa === false && await rotulo(L) === 'mudar o combate', 'Ctrl+Y refaz');
    await A(L, id => __mundo.App.selecionar([id]), id.f); await espera(150);
    ok(await campo(L, `o:${id.f}:ativa`).isChecked() === false, 'o painel mostra o estado refeito');
  });

  await passo('local: névoa, apagar e a data', async () => {
    // névoa: um traço do pincel é um passo só (um Ctrl+Z tira o traço inteiro); Esc volta para Selecionar
    await ferramenta(L, 'n');
    const opsAntes = await A(L, () => __mundo.App.mapa.nevoa.ops.length);
    await arrastar(L, [300, 300], [900, 400]);
    const opsDepois = await A(L, () => __mundo.App.mapa.nevoa.ops.length);
    ok(opsDepois > opsAntes + 2 && await rotulo(L) === 'revelar a névoa', 'o pincel de névoa grava o traço (' + (opsDepois - opsAntes) + ' círculos)');
    await A(L, () => document.activeElement && document.activeElement.blur());
    await L.P.keyboard.press('Control+z'); await espera(200);
    ok(await A(L, () => __mundo.App.mapa.nevoa.ops.length) === opsAntes, 'um Ctrl+Z desfaz o traço inteiro (um passo por traço)');
    await L.P.keyboard.press('Control+y'); await espera(200);
    ok(await A(L, () => __mundo.App.mapa.nevoa.ops.length) === opsDepois, 'e Ctrl+Y o traz de volta');
    await L.P.keyboard.press('Escape'); await espera(150);
    ok(await A(L, () => __mundo.App.ferramenta) === 'sel', 'Esc volta para Selecionar');

    // clique no mapa seleciona; Delete apaga; o "Desfazer" do aviso traz de volta
    await L.P.keyboard.press('Escape'); await espera(100);
    await clicar(L, 700, 450);
    ok(await sel(L) === id.g, 'clique no grupo o seleciona');
    await L.P.keyboard.press('Delete'); await espera(200);
    ok(!(await obj(L, id.g)) && await rotulo(L) === 'apagar', 'Delete apaga o selecionado');
    await L.F.locator('#toasts .toast', { hasText: 'Grupo apagado' }).locator('button').click(); await espera(200);
    ok(!!(await obj(L, id.g)), '"Desfazer" do aviso traz o grupo de volta');

    // a data: passar o dia não move nada
    await L.F.click('#diaMais'); await espera(200);
    ok(await A(L, () => __mundo.App.mapa.cal.dia) === 1 && /^2 de Alvorada, ano 1$/.test(await L.F.locator('#dataTxt .dt-longa').innerText()), 'avançar o dia muda a data na barra');
    ok(perto((await obj(L, id.g)).x, 700) && await rotulo(L) === 'passar o dia', 'passar o dia não move o grupo (e é um passo de desfazer)');
  });

  await passo('local: imagem no IndexedDB e recarregar', async () => {
    await aba(L, 'mapa');
    const [fc] = await Promise.all([L.P.waitForEvent('filechooser'), L.F.click('#pane [data-k="mapa:img"]')]);
    await fc.setFiles({ name: 'terras.png', mimeType: 'image/png', buffer: PNG_LOCAL });
    ok(await ate(() => A(L, () => !!(__mundo.App.mapa.img))), 'a imagem escolhida entra no mapa');
    m = await mapa(L);
    ok(/^idb:img_/.test(m.img.url) && m.img.w === 1000 && m.img.h === 700 && m.larg === 1000 && m.alt === 700, 'sem mesa a imagem fica no navegador ("idb:…") e o mapa passa a ter o tamanho dela: ' + j(m.img));
    ok(perto(m.objs.find(x => x.id === id.m).x, 200) && perto(m.objs.find(x => x.id === id.m).y, 150), 'o que estava desenhado acompanha a imagem (mesmo lugar relativo)');
    ok(await rotulo(L) === 'pôr a imagem', 'pôr a imagem é um passo de desfazer');
    const chave = m.img.url.slice(4);
    const noIdb = () => A(L, k => new Promise(ok => {
      const r = indexedDB.open('tinycats-mundo');
      r.onsuccess = () => { try { const g = r.result.transaction('imagens', 'readonly').objectStore('imagens').get(k); g.onsuccess = () => { const b = g.result; r.result.close(); ok(b ? { tipo: b.type, tam: b.size } : null); }; g.onerror = () => ok(null); } catch (e) { ok(null); } };
      r.onerror = () => ok(null);
    }), chave);
    let blob = await noIdb();
    ok(!!blob && blob.tipo === 'image/png' && blob.tam === PNG_LOCAL.length, 'o arquivo está no IndexedDB (tinycats-mundo/imagens), inteiro: ' + j(blob));
    ok(await ate(() => A(L, () => { const i = document.querySelector('#mundo img'); return !!i && i.complete && i.naturalWidth === 1000 && i.src.startsWith('blob:'); })), 'a imagem aparece no mapa');
    ok(await ate(() => A(L, () => /Salvo neste navegador/.test(document.getElementById('salvo').textContent))), 'gravado no navegador');
    await foto(L, 'local-imagem');
    const antes = j(await mapa(L));
    await L.P.reload({ waitUntil: 'load' });
    await pronto(L.F);
    ok(j(await mapa(L)) === antes, 'recarregado: o mesmo mapa, igualzinho');
    ok(await ate(() => A(L, () => { const i = document.querySelector('#mundo img'); return !!i && i.complete && i.naturalWidth === 1000 && i.src.startsWith('blob:'); })), 'recarregado: a imagem volta do IndexedDB');
    blob = await noIdb();
    ok(!!blob && blob.tam === PNG_LOCAL.length, 'recarregado: o arquivo continua no IndexedDB');
    ok(await desenhados(L) === 6 && !(await A(L, () => __mundo.App.podeDesfazer())), 'recarregado: os seis objetos de volta e o desfazer recomeça');
  });

  await passo('local: ver como jogador', async () => {
    await A(L, id => { __mundo.App.selecionar([id]); }, id.m); await espera(150);
    await L.F.check('#comoJog'); await espera(300);
    const h = await A(L, () => document.body.outerHTML);
    ok(await A(L, () => !__mundo.App.podeEditar()) && !h.includes('Guarda um segredo.') && !/class="[^"]*\bfalso\b/.test(h), 'ver como jogador: sem editar, sem a nota e sem o "falso"');
    ok(h.includes('Muralhas altas.'), 'ver como jogador: o que os jogadores sabem continua lá');
    await L.F.uncheck('#comoJog'); await espera(200);
    ok(await A(L, () => __mundo.App.podeEditar()), 'desligado, volta a editar');
  });

  /* ================= 2. na mesa: o Node é o banco; a casca falsa, a casca ================= */
  const banco = { personagens: new Map(), documentos: new Map(), rev: 0, arquivos: new Map(), log: [] };
  const aparelhos = [], pendentes = [];
  // gravação aceita pela casca de um aparelho: guarda e repassa aos outros (cada casca decide o que o seu papel vê)
  function gravou(origem, col, linha) {
    const c = banco[col];
    if (!c || !linha || !linha.id) return null;
    linha = Object.assign({}, linha, { rev: ++banco.rev });
    if (linha.apagado) c.delete(linha.id); else c.set(linha.id, linha);
    banco.log.push({ col, id: linha.id, apagado: !!linha.apagado, de: origem.nome });
    for (const b of aparelhos) if (b !== origem && !b.P.isClosed()) pendentes.push(b.P.evaluate(([c, l]) => window.__chegou && window.__chegou(c, l), [col, linha]).catch(() => null));
    return linha;
  }
  function subir(dataUrl, tipo) {
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[tipo] || 'bin';
    const url = HOST + 'mesas/' + MESA + '/img_' + (banco.arquivos.size + 1) + '.' + ext;
    banco.arquivos.set(url, { tipo, buf: Buffer.from(String(dataUrl).slice(String(dataUrl).indexOf(',') + 1), 'base64') });
    return url;
  }
  async function naCasca(nome, papel, eu, o = {}) {
    const d = await t.device(Object.assign({ name: nome }, o));
    d.page.setDefaultTimeout(8000);
    // as imagens "da nuvem" vêm daqui, em qualquer aparelho
    await d.ctx.route(HOST + '**', r => { const arq = banco.arquivos.get(r.request().url()); return arq ? r.fulfill({ status: 200, contentType: arq.tipo, body: arq.buf }) : r.fulfill({ status: 404, body: '' }); });
    const a = { P: d.page, F: null, nome, papel, eu };
    await a.P.exposeFunction('__tcLer', col => [...(banco[col] || new Map()).values()]);
    await a.P.exposeFunction('__tcGravou', (col, linha) => gravou(a, col, linha));
    await a.P.exposeFunction('__tcSubir', (dataUrl, tipo) => subir(dataUrl, tipo));
    aparelhos.push(a);
    if (o.antes) await o.antes(a.P);                     // preparar o navegador (mapas guardados nele, por exemplo)
    await abrirCasca(a);
    return a;
  }
  async function abrirCasca(a) {
    await a.P.goto(t.base + `src/tests/casca-falsa.html?papel=${a.papel}&eu=${a.eu}&mesa=${MESA}`, { waitUntil: 'load' });
    a.F = null;
    for (let i = 0; i < 80 && !a.F; i++) { a.F = a.P.frames().find(f => f !== a.P.mainFrame() && /\/mundo\//.test(f.url())) || null; if (!a.F) await espera(100); }
    await pronto(a.F);
  }
  const doc = id => banco.documentos.get(id) || null;
  const casca = (a, fn) => a.P.evaluate(fn);
  const gravacoes = a => casca(a, () => window.__gravacoes.length);

  /* ---- mapas que já estavam no navegador do mestre ---- */
  await passo('mesa: trazer os mapas deste navegador', async () => {
    const V = await naCasca('mestre-casa', 'mestre', 'u_mestre', { antes: async P => {
      await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
      await P.waitForFunction(() => window.__mundo && window.__mundo.App.pronto);
      await P.evaluate(() => {
        const A = __mundo.App;
        A.criarMapa('Mapa de casa', { larg: 1200, alt: 800 });
        A.mudar('novo marcador', m => { m.objs.push(__mundo.N.objNovo('m', { x: 100, y: 100, nome: 'Segredo de casa' })); });
        A.salvarJa();
      });
    } });
    ok(await V.F.locator('.oferta').isVisible(), 'mesa sem mapas e um mapa neste navegador: a faixa oferece trazer');
    await V.F.locator('.oferta button', { hasText: 'Trazer' }).click();
    ok(await ate(() => [...banco.documentos.keys()].some(k => k.startsWith(PRE_MAPA))), 'o mapa do navegador sobe para a mesa');
    const k = [...banco.documentos.keys()].find(x => x.startsWith(PRE_MAPA));
    ok(!!k && doc(k).dados.oculto === true && ![...banco.documentos.keys()].some(x => x.startsWith(PRE_PUB) || x === INDICE), 'o que foi trazido chega escondido dos jogadores: sem projeção e sem índice');
    await menuMapa(V, 'Apagar mapa…');
    await (await janela(V)).locator('button[type="submit"]').click(); await espera(300);
    ok(banco.documentos.size === 0, 'apagado, a mesa volta a ficar vazia para o resto do teste');
    await V.P.close();
  });

  /* ---- o mestre ---- */
  const M = await naCasca('mestre', 'mestre', 'u_mestre');
  await passo('mesa: o mestre cria o mapa com imagem', async () => {
    ok(await A(M, () => { const a = __mundo.App; return a.naMesa && a.papel === 'mestre' && a.mesa.id === 'mesa_e2e' && a.eu === 'u_mestre' && a.mapa === null; }), 'na casca com mesa: mestre, a mesa aberta, nenhum mapa');
    ok(await A(M, () => document.documentElement.classList.contains('na-casca') && !document.documentElement.classList.contains('jogador') && getComputedStyle(document.querySelector('.brand')).display === 'none'), 'na casca: classe na-casca (sem a marca) e sem a classe jogador');
    ok(/Criar o primeiro mapa/.test(await M.F.locator('#vazio').innerText()) && /guardado na mesa/.test(await M.F.locator('#vazio').innerText()), 'estado vazio do mestre na mesa');
    ok(await M.F.locator('.oferta').count() === 0 && banco.documentos.size === 0 && await gravacoes(M) === 0, 'abrir não grava nada (e sem faixa de trazer mapas: este navegador não tem nenhum)');
    await M.F.fill('#vazio [data-k="vz:nome"]', 'Mundo da Mesa');
    const [fc] = await Promise.all([M.P.waitForEvent('filechooser'), M.F.click('#vazio [data-k="vz:img"]')]);
    await fc.setFiles({ name: 'mundo.png', mimeType: 'image/png', buffer: PNG_MESA });
    ok(await ate(() => A(M, () => !!(__mundo.App.mapa && __mundo.App.mapa.img))), 'mapa criado pelo estado vazio com "Escolher imagem"');
    m = await mapa(M);
    id.mapa1 = m.id;
    ok(m.nome === 'Mundo da Mesa' && m.img.url.startsWith(HOST) && m.img.w === 1000 && m.img.h === 700 && m.larg === 1000, 'na mesa a imagem sobe (arquivo.subir) e o mapa guarda o endereço devolvido: ' + j(m.img));
    ok(banco.arquivos.size === 1 && [...banco.arquivos.values()][0].buf.equals(PNG_MESA), 'o arquivo que chegou é o PNG escolhido, inteiro');
    ok(await imagemAberta(M, 1000), 'a imagem aparece no mapa do mestre');
    ok(await ate(() => { const d = doc(PRE_MAPA + id.mapa1); return !!d && d.vis === 'mestre' && !!d.dados.img && d.dados.img.url === m.img.url; }), 'documento mundo:mapa:<id> (vis "mestre") com a imagem');
    // na mesa o mapa novo nasce escondido: nada vai para os jogadores sem o clique em "Mostrar aos jogadores"
    ok(m.oculto === true && doc(PRE_MAPA + id.mapa1).dados.oculto === true && !doc(PRE_PUB + id.mapa1) && !doc(INDICE), 'o mapa novo nasce escondido dos jogadores: sem projeção e sem índice na mesa');
  });

  await passo('mesa: grade e facções', async () => {
    await aba(M, 'terreno');
    await escrever(M, 'ter:tam', '25');
    // (a seta encaixa a grade: 2,5 unidades para a direita — e o grupo e a rota não caem bem na aresta de dois hexágonos)
    await botao(M, 'ter:dir');
    ok(await A(M, () => { const g = __mundo.App.mapa.grade; return g.tam === 25 && g.x === 2.5 && g.y === 0 && g.on === false; }), 'a grade pela aba Terreno: um hexágono de 25 unidades = 5 cubos (100 unidades = 20 cubos), encaixada pela seta, escondida');
    await aba(M, 'faccoes');
    await botao(M, 'fac:nova');
    id.reino = await A(M, () => __mundo.App.mapa.faccoes.slice(-1)[0].id);
    await escrever(M, `f:${id.reino}:nome`, 'Reino Azul');
    await escrever(M, `f:${id.reino}:txt`, 'O reino dos céus azuis.');
    await escrever(M, `f:${id.reino}:nota`, 'nota do reino ' + SEG);
    await botao(M, 'fac:nova');
    id.culto = await A(M, () => __mundo.App.mapa.faccoes.slice(-1)[0].id);
    await escrever(M, `f:${id.culto}:nome`, 'Culto ' + SEG);
    await escrever(M, `f:${id.culto}:nota`, 'nota do culto ' + SEG);
    await alternar(M, `f:${id.culto}:oculta`);
    await escolher(M, `rel:${id.culto}:${id.reino}`, 'guerra');
    m = await mapa(M);
    const r = m.faccoes.find(f => f.id === id.reino), c = m.faccoes.find(f => f.id === id.culto);
    ok(m.faccoes.length === 2 && r.nome === 'Reino Azul' && r.nota.includes(SEG) && c.oculta === true && r.rel[id.culto] === 'guerra' && c.rel[id.reino] === 'guerra', 'duas facções pela aba Facções: uma escondida, com notas, em guerra (relação dos dois lados)');
  });

  async function marcador(x, y, nome) {
    await ferramenta(M, 'm'); await clicar(M, x, y);
    const novo = await sel(M);
    await escrever(M, `o:${novo}:nome`, nome);
    return novo;
  }
  await passo('mesa: marcadores', async () => {
    id.vila = await marcador(200, 150, 'Vila Pública');
    await escrever(M, `o:${id.vila}:txt`, 'Uma vila tranquila.');
    await escrever(M, `o:${id.vila}:nota`, 'nota da vila ' + SEG);
    id.covil = await marcador(300, 150, 'Covil ' + SEG);
    await alternar(M, `o:${id.covil}:oculto`);
    id.torre = await marcador(400, 150, 'Torre do Boato');
    await alternar(M, `o:${id.torre}:rumor`);
    await alternar(M, `o:${id.torre}:falso`);
    id.ruina = await marcador(850, 600, 'Ruína ' + SEG);
    m = await mapa(M);
    const f = x => m.objs.find(y => y.id === x) || {};
    ok(f(id.vila).nota.includes(SEG) && f(id.covil).oculto === true && f(id.torre).rumor === true && f(id.torre).falso === true && f(id.ruina).k === 'm', 'marcadores: com nota, escondido, boato falso e um que vai para baixo da névoa');
  });

  await passo('mesa: região com encontros, rota e grupo', async () => {
    await ferramenta(M, 'r');
    for (const [x, y] of [[100, 300], [500, 300], [500, 580], [100, 580], [100, 300]]) await clicar(M, x, y);
    id.floresta = await sel(M);
    ok((await obj(M, id.floresta) || {}).k === 'r', 'região desenhada na mesa');
    await escrever(M, `o:${id.floresta}:nome`, 'Floresta Sombria');
    await escolher(M, `o:${id.floresta}:fac`, id.culto);
    await escrever(M, `o:${id.floresta}:chance`, '100');
    await escrever(M, `o:${id.floresta}:enc`, `3: Lobos famintos ${SEG}\n1: Mercador perdido ${SEG}`);
    await escrever(M, `o:${id.floresta}:nota`, 'nota da região ' + SEG);
    o = await obj(M, id.floresta);
    ok(o.fac === id.culto && o.enc.chance === 100 && o.enc.itens.length === 2 && o.enc.itens[0].p === 3, 'região da facção escondida, com tabela de encontros (chance 100%)');

    await ferramenta(M, 't');
    await clicar(M, 150, 450); await clicar(M, 750, 450);
    await M.F.locator('#opts .chip', { hasText: 'Terminar' }).click(); await espera(250);
    id.estrada = await sel(M);
    await escrever(M, `o:${id.estrada}:nome`, 'Estrada Velha');
    o = await obj(M, id.estrada);
    ok(!!o && o.k === 't' && o.via === 'trilha' && perto(o.pts[0][0], 150) && perto(o.pts[1][0], 750), 'rota de 600 unidades (120 cubos)');

    await ferramenta(M, 'g');
    await clicar(M, 150, 450);
    id.herois = await sel(M);
    await escrever(M, `o:${id.herois}:nome`, 'Os Heróis');
    await escrever(M, `o:${id.herois}:sigla`, 'HER');
    await escolher(M, `o:${id.herois}:rota`, id.estrada);
    await escrever(M, `o:${id.herois}:nota`, 'nota do grupo ' + SEG);
    o = await obj(M, id.herois);
    ok(o.k === 'g' && o.rota === id.estrada && o.prog === 0 && o.sigla === 'HER', 'grupo na rota, pelo painel');
    ok(/^0 de 120 cubos · hexágono 0 de 24 · faltam cerca de 4 dias$/.test((await M.F.locator('#pane .progresso small').innerText()).trim()), 'o painel mostra o progresso, em cubos e hexágonos (30 cubos por dia: 4 dias): ' + await M.F.locator('#pane .progresso').innerText());
  });

  await passo('mesa: eventos e frente', async () => {
    await ferramenta(M, 'e');
    await M.F.selectOption('#opts select[aria-label="Evento"]', 'magia'); await espera(100);
    await clicar(M, 600, 200);
    id.invasao = await sel(M);
    await escrever(M, `o:${id.invasao}:nome`, 'Invasão Futura');
    await botao(M, 'o:ini-escolher');
    const d = await janela(M);
    await d.locator('#dl-dia').fill('4');
    await d.locator('button[type="submit"]').click(); await espera(250);
    o = await obj(M, id.invasao);
    ok(o.tipo === 'magia' && o.ini === 3 && o.fim === null, 'evento futuro: começa no dia 3 (escolhido na janela "Quando o evento começa?")');
    ok(/começa em 3 dias/.test(await M.F.locator('#pane').innerText()), 'o painel diz quando começa');
    await escrever(M, `o:${id.invasao}:nota`, 'nota da invasão ' + SEG);

    await ferramenta(M, 'e');
    await M.F.selectOption('#opts select[aria-label="Evento"]', 'praga'); await espera(100);
    await clicar(M, 700, 530);
    id.praga = await sel(M);
    await escrever(M, `o:${id.praga}:nome`, 'Praga Ativa');
    await escrever(M, `o:${id.praga}:cresce`, '2');
    o = await obj(M, id.praga);
    ok(o.tipo === 'praga' && o.ini === 0 && o.r === 80 && perto(o.cresce, 10, 0.01), 'evento ativo que cresce 2 cubos (10 unidades) por dia: ' + j({ r: o.r, cresce: o.cresce }));

    await ferramenta(M, 'f');
    await M.F.selectOption('#opts select[aria-label="Lado A"]', id.reino);
    await M.F.selectOption('#opts select[aria-label="Lado B"]', id.culto);
    await clicar(M, 560, 640); await clicar(M, 740, 640);
    await M.F.locator('#opts .chip', { hasText: 'Terminar' }).click(); await espera(250);
    id.frente = await sel(M);
    await escrever(M, `o:${id.frente}:nome`, 'Frente Norte');
    o = await obj(M, id.frente);
    ok(!!o && o.k === 'f' && o.a === id.reino && o.b === id.culto, 'frente entre o reino e o culto (lados das opções do trilho)');
  });

  await passo('mesa: névoa', async () => {
    // liga, revela tudo (com confirmação) e cobre a ruína com o pincel
    await M.P.keyboard.press('Escape'); await espera(100);
    await aba(M, 'mapa');
    await alternar(M, 'mapa:nevoa');
    await botao(M, 'mapa:revelar');
    const d = await janela(M);
    await d.locator('button[type="submit"]').click(); await espera(250);
    ok(await A(M, () => { const m = __mundo.App.mapa; return m.nevoa.on && m.nevoa.ops.length === 1 && m.nevoa.ops[0].t === '+'; }), 'névoa ligada e "Revelar tudo" confirmado');
    await ferramenta(M, 'n');
    await M.F.locator('#opts .chip', { hasText: 'Cobrir' }).click(); await espera(100);
    await clicar(M, 850, 600);
    ok(await rotulo(M) === 'cobrir com névoa', 'um toque do pincel em "Cobrir" é um passo de desfazer');
    const cobre = await A(M, ids => { const m = __mundo.App.mapa, N = __mundo.N; return ids.map(id => { const o = m.objs.find(x => x.id === id); return N.nevoaCobre(m, o.x, o.y); }); }, [id.ruina, id.vila, id.torre, id.praga, id.invasao]);
    ok(j(cobre) === j([true, false, false, false, false]), 'a névoa cobre só a ruína: ' + j(cobre));
    await M.P.keyboard.press('Escape'); await espera(100);
    await M.P.keyboard.press('Escape'); await espera(100);
  });

  await passo('mesa: terreno nos hexágonos', async () => {
    // um hexágono de mata sob a névoa (o da ruína) e outro à mostra, com custo próprio; e a grade à mostra
    await aba(M, 'terreno');
    await alternar(M, 'ter:on');
    await ferramenta(M, 'h');
    await clicar(M, 850, 600);
    await clicar(M, 200, 150);
    await M.F.selectOption('#opts select[aria-label="O que o pincel faz"]', 'custo'); await espera(100);
    await M.F.fill('#opts input[aria-label="Custo próprio, em cubos por hexágono"]', '25'); await M.F.press('#opts input[aria-label="Custo próprio, em cubos por hexágono"]', 'Enter'); await espera(100);
    await clicar(M, 200, 150);
    await M.F.selectOption('#opts select[aria-label="O que o pincel faz"]', 'ter:fl'); await espera(100);
    id.hexNevoa = await hexDe(M, 850, 600); id.hexVisto = await hexDe(M, 200, 150);
    const m2 = await mapa(M);
    ok(m2.grade.on === true && m2.hexes[id.hexNevoa] === 'fl' && j(m2.hexes[id.hexVisto]) === j(['fl', 25]), 'o mestre pinta dois hexágonos de mata (um sob a névoa) e dá custo próprio a um: ' + j(m2.hexes));
    await ferramenta(M, 'sel');
  });

  await passo('mesa: mostrar aos jogadores', async () => {
    ok(!doc(PRE_PUB + id.mapa1) && !doc(INDICE), 'montado escondido: nada do mapa foi para a mesa dos jogadores');
    await aba(M, 'mapa');
    ok(/Escondido: os jogadores não veem este mapa/.test(await M.F.locator('#pane').innerText()), 'a aba Mapa diz que o mapa está escondido');
    await botao(M, 'mapa:mostrar');
    ok(await A(M, () => __mundo.App.mapa.oculto === false && __mundo.App.mostrado === __mundo.App.mapa.id), '"Mostrar aos jogadores" tira do esconderijo e mostra');
    ok(/Os jogadores agora veem: Mundo da Mesa/.test(await textoDoAviso(M)), 'o aviso diz o que os jogadores veem');
    await M.P.keyboard.press('Escape'); await espera(100);
  });

  await passo('mesa: o que foi gravado', async () => {
    // o mapa inteiro só para o mestre; a projeção e o índice para a mesa
    ok(await ate(async () => {
      const pub = doc(PRE_PUB + id.mapa1), mm = doc(PRE_MAPA + id.mapa1);
      if (!pub || !mm) return false;
      const [jm, jp] = await A(M, () => [JSON.stringify(__mundo.App.mapa), JSON.stringify(__mundo.N.projetar(__mundo.App.mapa))]);
      return j(mm.dados) === jm && j(pub.dados) === jp;
    }, 8000), 'a mesa fica com o mapa como está e com a projeção dele');
    ok(/Salvo na mesa/.test(await M.F.locator('#salvo').innerText()), 'indicador: "Salvo na mesa"');
    const mm = doc(PRE_MAPA + id.mapa1), pub = doc(PRE_PUB + id.mapa1), idx = doc(INDICE);
    ok(!!mm && mm.vis === 'mestre' && j(mm.dados).includes(SEG), 'mundo:mapa:<id> é vis "mestre" e guarda tudo (notas, escondidos, encontros)');
    ok(!!pub && pub.vis === 'mesa' && !j(pub.dados).includes(SEG), 'mundo:pub:<id> é vis "mesa" e não tem nada do que é só do mestre');
    ok(!!idx && idx.vis === 'mesa' && j(idx.dados) === j({ mapas: [{ id: id.mapa1, nome: 'Mundo da Mesa' }], mostrado: id.mapa1 }), 'mundo:indice é vis "mesa": ' + j(idx && idx.dados) + ' (vis ' + (idx && idx.vis) + ')');
    ok(j([...banco.documentos.keys()].sort()) === j([INDICE, PRE_MAPA + id.mapa1, PRE_PUB + id.mapa1].sort()), 'só esses três documentos na mesa: ' + [...banco.documentos.keys()].join(', '));
    ok(await casca(M, () => window.__recusas.length) === 0, 'nenhuma gravação do mestre foi recusada');
    await foto(M, 'mesa-mestre');
  });

  await passo('mesa: o mestre vendo como jogador', async () => {
    await M.F.check('#comoJog'); await espera(300);
    const h = await A(M, () => document.querySelector('#mundo').outerHTML);
    ok(!h.includes(SEG) && !h.includes('Invasão Futura') && !/class="[^"]*\bfalso\b/.test(h) && h.includes('Vila Pública'), 'ver como jogador (mestre na mesa): o mapa na tela sem escondidos, futuros, névoa e "falso"');
    await M.F.uncheck('#comoJog'); await espera(200);
  });

  /* ---- o jogador ---- */
  const J = await naCasca('jogador', 'jogador', 'u_jog');
  await passo('jogador: o que chegou', async () => {
    ok(await A(J, () => { const a = __mundo.App; return a.naMesa && a.papel === 'jogador' && a.eu === 'u_jog' && !a.podeEditar(); }), 'jogador na mesa: papel jogador, sem editar');
    ok(await A(J, id => !!__mundo.App.mapa && __mundo.App.mapa.id === id && document.documentElement.classList.contains('jogador'), id.mapa1), 'o jogador abre o mapa público (classe jogador no <html>)');
    // o que passou pela ponte para o jogador
    const entregues = await casca(J, () => window.__entregues);
    const linhas = entregues.filter(x => x.t === 'dados.tudo').flatMap(x => x.linhas).concat(entregues.filter(x => x.t === 'dado').map(x => x.linha)).filter(l => !l.apagado);
    ok(linhas.length > 0 && linhas.every(l => l.vis === 'mesa') && !linhas.some(l => l.id.startsWith(PRE_MAPA)), 'ao jogador só chegaram documentos vis "mesa": ' + linhas.map(l => l.id).join(', '));
    ok(!j(entregues).includes(SEG), 'nada do que chegou ao jogador tem texto do mestre');
    const p = (linhas.find(l => l.id === PRE_PUB + id.mapa1) || {}).dados;
    ok(!!p, 'o jogador recebeu a projeção mundo:pub:<id>');
    if (!p) return;
    const ids = p.objs.map(x => x.id), f = x => p.objs.find(y => y.id === x) || null;
    ok(p.objs.every(x => x.nota === '') && p.faccoes.every(x => x.nota === ''), 'na projeção: nenhuma nota (objetos e facções)');
    ok(p.oculto !== true && !ids.includes(id.covil) && p.objs.every(x => x.oculto !== true), 'na projeção: nada escondido (o covil não está)');
    ok(!!f(id.torre) && f(id.torre).rumor === true && p.objs.every(x => x.falso !== true), 'na projeção: o boato está como boato, sem o "falso"');
    ok(p.objs.filter(x => x.k === 'r').every(x => x.enc && x.enc.chance === 0 && x.enc.itens.length === 0), 'na projeção: nenhuma tabela de encontros');
    ok(!ids.includes(id.invasao) && !!f(id.praga), 'na projeção: o evento futuro não está; o ativo está');
    ok(f(id.praga) && f(id.praga).r === 80 && f(id.praga).cresce === 0 && f(id.praga).fim === null, 'na projeção: o evento vai como está hoje, sem o quanto ainda vai crescer: ' + j(f(id.praga) && { r: f(id.praga).r, cresce: f(id.praga).cresce }));
    ok(!ids.includes(id.ruina) && !!f(id.vila) && !!f(id.herois), 'na projeção: o marcador sob a névoa não está; os revelados e o grupo estão');
    ok(p.faccoes.length === 1 && p.faccoes[0].id === id.reino && !(id.culto in p.faccoes[0].rel), 'na projeção: a facção escondida não está, nem a relação com ela');
    ok(!!f(id.floresta) && f(id.floresta).fac === null && !!f(id.frente) && f(id.frente).a === id.reino && f(id.frente).b === null, 'na projeção: região e frente que apontavam para a facção escondida ficam sem ela');
    ok(!!f(id.herois) && f(id.herois).rota === id.estrada && !!f(id.estrada), 'na projeção: o grupo continua na rota');
    ok(p.grade.on === true && p.grade.tam === 25 && p.hexes[id.hexVisto] === 'fl' && !(id.hexNevoa in p.hexes) && Object.keys(p.hexes).length === 1, 'na projeção: a grade, e o terreno do hexágono à mostra sem o custo próprio — o que a névoa cobre não vai: ' + j(p.hexes));
    ok(j(await mapa(J)) === j(p), 'o mapa do jogador é a projeção que chegou');
  });

  await passo('jogador: a tela', async () => {
    ok(await A(J, () => ['#rail', '#btDesfazer', '#diaMais', '#diaMenos', '#comoJogBox'].every(s => getComputedStyle(document.querySelector(s)).display === 'none')), 'jogador: sem trilho, sem desfazer, sem botões de data, sem "ver como jogador"');
    ok(await A(J, () => document.getElementById('tab-mapa').hidden && document.getElementById('tab-terreno').hidden && !document.getElementById('tab-hoje').hidden && !document.getElementById('tab-faccoes').hidden), 'jogador: sem as abas Mapa e Terreno');
    ok((await J.F.locator('#salvo').innerText()) === '', 'jogador: sem indicador de "salvo"');
    ok(await A(J, () => getComputedStyle(document.querySelector('#mundo svg .c-hex')).display !== 'none' && document.querySelectorAll('#mundo svg .hex-ter').length === 1 && !document.querySelector('#mundo svg .hex-custo')), 'o jogador vê a grade e a mata do hexágono à mostra (sem o custo)');
    ok(await imagemAberta(J, 1000), 'a imagem da mesa abre no aparelho do jogador');
    const tela = [];
    await aba(J, 'selecao');
    tela.push(await A(J, () => document.body.outerHTML));
    const lista = await J.F.locator('#pane').innerText();
    ok(['Vila Pública', 'Torre do Boato', 'Praga Ativa', 'Os Heróis', 'Floresta Sombria', 'Estrada Velha', 'Frente Norte'].every(n => lista.includes(n)), 'a lista do jogador tem o que é público');
    ok(!lista.includes('Invasão Futura') && !lista.includes(SEG), 'a lista do jogador não tem o evento futuro nem nada escondido');
    // clique num objeto do mapa: a leitura (sem nota)
    await clicar(J, 200, 150);
    ok(await sel(J) === id.vila, 'o jogador seleciona a vila clicando no mapa');
    const p = await J.F.locator('#pane').innerText();
    ok(p.includes('Vila Pública') && p.includes('Uma vila tranquila.') && !p.includes(SEG) && await J.F.locator('#pane input, #pane textarea, #pane select').count() === 0, 'o jogador lê o que se sabe da vila, sem campos e sem a nota');
    for (const x of await A(J, () => __mundo.App.mapa.objs.map(o => o.id))) {
      await A(J, x => { __mundo.App.selecionar([x]); __mundo.Painel.redesenhar(); }, x);
      tela.push(await A(J, () => document.getElementById('pane').outerHTML));
    }
    await A(J, () => { __mundo.App.selecionar([]); });
    await aba(J, 'hoje'); tela.push(await A(J, () => document.body.outerHTML));
    ok(/Praga Ativa/.test(await J.F.locator('#pane').innerText()) && !/Invasão|próximos 30 dias/.test(await J.F.locator('#pane').innerText()), 'aba Hoje do jogador: o evento de hoje, sem os próximos');
    await aba(J, 'faccoes'); tela.push(await A(J, () => document.body.outerHTML));
    ok(/Reino Azul/.test(await J.F.locator('#pane').innerText()) && /O reino dos céus azuis\./.test(await J.F.locator('#pane').innerText()), 'aba Facções do jogador: a facção pública com o texto dela');
    await aba(J, 'selecao');
    const tudo = tela.join('\n');
    ok(!tudo.includes(SEG), 'na tela do jogador não aparece nada do mestre (notas, covil, ruína, culto, encontros)');
    ok(!tudo.includes('Invasão Futura'), 'na tela do jogador não aparece o evento futuro');
    ok(!/class="[^"]*\bfalso\b/.test(tudo) && !/class="risco"/.test(tudo) && !tudo.includes('(falso)'), 'na tela do jogador o boato não diz que é falso');
    ok(await A(J, x => document.querySelector(`#mundo svg [data-id="${x}"]`).classList.contains('rumor'), id.torre), 'o jogador vê a torre como boato ("?")');
    ok(await A(J, () => { const r = document.querySelector('#mundo svg .nevoa'); return !!r && r.closest('.c-nev').style.display !== 'none' && r.getAttribute('opacity') === '1'; }), 'para o jogador a névoa é opaca');
    // a névoa fechada não corta marcadores e selos à mostra (perto da borda de uma clareira): eles vão por cima dela
    const acima = a => A(a, () => !!(document.querySelector('#mundo svg .c-nev').compareDocumentPosition(document.querySelector('#mundo svg .c-mar')) & Node.DOCUMENT_POSITION_FOLLOWING));
    ok(await acima(J) && !(await acima(M)), 'para o jogador os ícones ficam por cima da névoa; para o mestre, por baixo (ele vê a névoa translúcida)');
    await foto(J, 'mesa-jogador');
  });

  await passo('jogador: tenta mexer', async () => {
    const antes = j(await mapa(J));
    await clicar(J, 200, 150);
    await J.P.keyboard.press('Delete'); await espera(150);
    await J.P.keyboard.press('Control+z'); await espera(150);
    await J.P.keyboard.press('m'); await espera(150);
    await arrastar(J, [200, 150], [260, 220]);
    await A(J, () => __mundo.App.mudar('teste', m => { m.nome = 'invadido'; }));
    await espera(1200);
    ok(j(await mapa(J)) === antes && await A(J, () => __mundo.App.ferramenta) === 'sel', 'Delete, Ctrl+Z, atalho de ferramenta, arrastar e App.mudar não mudam nada para o jogador');
    ok(await gravacoes(J) === 0, 'o jogador não mandou nenhum dados.gravar');
  });

  await passo('mesa: o mestre muda, o jogador recebe', async () => {
    await aba(M, 'selecao');
    await M.F.click(`#pane [data-k="li:${id.vila}"]`); await espera(450);
    await escrever(M, `o:${id.vila}:nome`, 'Vila Renomeada');
    ok(await ate(() => A(J, x => { const o = __mundo.App.mapa.objs.find(y => y.id === x), el = document.querySelector(`#mundo svg [data-id="${x}"] .rotulo`); return o.nome === 'Vila Renomeada' && !!el && el.textContent === 'Vila Renomeada'; }, id.vila)), 'o mestre renomeia a vila: o nome novo chega ao mapa do jogador');
  });

  /* ---- o tempo, a viagem e os encontros ---- */
  const raioJ = () => A(J, x => { const c = document.querySelector(`#mundo svg [data-id="${x}"] .eve-area`); return c && c.getAttribute('r'); }, id.praga);
  await passo('mesa: passar o dia', async () => {
    ok(await raioJ() === '80', 'o jogador vê a praga com raio 80');
    await aba(M, 'hoje');
    await botao(M, 'hoje:+1');
    ok(await A(M, () => __mundo.App.mapa.cal.dia) === 1 && await rotulo(M) === 'passar o dia', 'mestre: "Passar o dia" na aba Hoje');
    ok(await ate(() => A(J, () => __mundo.App.mapa.cal.dia === 1 && document.querySelector('#dataTxt .dt-longa').textContent === '2 de Alvorada, ano 1')), 'a data muda para o jogador: ' + await J.F.locator('#dataTxt .dt-longa').innerText());
    ok(await ate(async () => (await raioJ()) === '90'), 'o evento que cresce aparece maior para o jogador (80 → 90): ' + await raioJ());
    ok(perto((await obj(M, id.herois)).x, 150) && perto((await obj(J, id.herois)).x, 150), 'passar o dia não move o grupo');
  });

  await passo('mesa: andar 1 dia', async () => {
    await botao(M, `gr-andar:${id.herois}`);
    o = await obj(M, id.herois);
    ok(perto(o.x, 290) && perto(o.y, 454.66, 0.02) && perto(o.prog, 30, 0.01), 'Andar 1 dia: o grupo anda 30 cubos pela rota — 6 hexágonos de 5, de centro em centro: ' + j({ x: o.x, y: o.y, prog: o.prog }));
    ok(await A(M, () => __mundo.App.mapa.cal.dia) === 2 && await rotulo(M) === 'andar 1 dia', 'e o dia passa (no mesmo passo de desfazer)');
    ok(/^Andou 6 hexágonos \(30 cubos\); faltam 18 hexágonos \(90 cubos\)\. Passou o dia: hoje é 3 de Alvorada, ano 1\./.test(await textoDoAviso(M)), 'o aviso diz quanto andou, quanto falta e a data nova: ' + await textoDoAviso(M));
    ok(await ate(() => A(J, x => { const g = __mundo.App.mapa.objs.find(y => y.id === x); return Math.abs(g.x - 290) < 1.5 && __mundo.App.mapa.cal.dia === 2; }, id.herois)), 'o jogador vê o grupo no lugar novo e a data nova');
    // o desenho vem no quadro seguinte ao dado: espera por ele
    const tr = () => A(J, x => document.querySelector(`#mundo svg [data-id="${x}"] .fixo`).getAttribute('transform'), id.herois);
    const lugar = async () => (/translate\(([-\d.]+) ([-\d.]+)\)/.exec((await tr()) || '') || []).slice(1).map(Number);
    ok(await ate(async () => { const n = await lugar(); return perto(n[0], 290) && perto(n[1], 454.66, 0.02); }, 3000), 'e o grupo é desenhado lá: ' + await tr());
  });

  await passo('mesa: sortear encontro', async () => {
    await botao(M, `gr-sortear:${id.herois}`);
    const c = await M.F.locator('#pane .cartao').innerText();
    ok(/Encontro!/.test(c) && /(Lobos famintos|Mercador perdido) K7731K/.test(c) && /Floresta Sombria/.test(c), 'sortear encontro: o cartão com o resultado da tabela da região');
    ok(await casca(M, () => window.__rolagens.length) === 0, 'sortear não manda nada para a mesa sozinho');
    await botao(M, 'enc:seg');
    let rol = await casca(M, () => window.__rolagens);
    ok(rol.length === 1 && rol[0].origem === 'mundo' && rol[0].dados.secreta === true && /^Encontro em Floresta Sombria$/.test(rol[0].dados.titulo) && /K7731K/.test(rol[0].dados.resumo), '"Mandar só para mim" vira rolagem secreta (origem mundo): ' + j(rol[0] && rol[0].dados));
    await botao(M, 'enc:mesa');
    rol = await casca(M, () => window.__rolagens);
    ok(rol.length === 2 && rol[1].origem === 'mundo' && rol[1].dados.secreta === false && rol[1].dados.titulo === rol[0].dados.titulo, '"Mandar para a mesa" vai sem segredo: ' + j(rol[1] && rol[1].dados));
    ok(/Foi só para você/.test(await M.F.locator('#pane .cartao').innerText()) && /Foi para a mesa/.test(await M.F.locator('#pane .cartao').innerText()), 'o cartão marca o que já foi mandado');
    ok(await casca(J, () => window.__rolagens.length) === 0 && !j(await casca(J, () => window.__entregues)).includes(SEG), 'nada do encontro chegou ao jogador pela ponte');
  });

  await passo('mesa: encontro numa região escondida', async () => {
    // a região escondida (ou coberta pela névoa) não dá o nome dela ao que vai para a mesa às claras
    await aba(M, 'selecao');
    await A(M, x => __mundo.App.selecionar([x]), id.floresta); await espera(200);
    await alternar(M, `o:${id.floresta}:oculto`);
    ok((await obj(M, id.floresta)).oculto === true, 'o mestre esconde a Floresta Sombria');
    await aba(M, 'hoje');
    await botao(M, `gr-sortear:${id.herois}`);
    ok(/escondida dos jogadores: o nome dela não vai para a mesa/.test(await M.F.locator('#pane .cartao').innerText()), 'o cartão avisa que o nome da região não vai para a mesa');
    await botao(M, 'enc:mesa');
    const rol = (await casca(M, () => window.__rolagens)).slice(-1)[0];
    ok(!!rol && rol.dados.secreta === false && rol.dados.titulo === 'Encontro' && !/Floresta/.test(j(rol.dados)) && /^Os Heróis: /.test(rol.dados.resumo), '"Mandar para a mesa" sem o nome da região escondida: ' + j(rol && rol.dados));
    await botao(M, 'enc:fechar');
    await aba(M, 'selecao');
    await A(M, x => __mundo.App.selecionar([x]), id.floresta); await espera(200);
    await alternar(M, `o:${id.floresta}:oculto`);
    ok((await obj(M, id.floresta)).oculto === false, 'e mostra de novo');
    await A(M, () => __mundo.App.selecionar([]));
    await aba(M, 'hoje');
  });

  await passo('mesa: o evento futuro chega', async () => {
    await botao(M, 'hoje:+7');
    ok(await ate(() => A(J, x => __mundo.App.mapa.cal.dia === 9 && __mundo.App.mapa.objs.some(y => y.id === x), id.invasao)), '+7 dias: o evento que começava no dia 3 aparece para o jogador');
    ok(await ate(async () => (await raioJ()) === '170'), 'e a praga já tem raio 170: ' + await raioJ());
  });

  /* ---- mostrar outro mapa, esconder ---- */
  await passo('mesa: mostrar outro mapa', async () => {
    await menuMapa(M, 'Novo mapa…');
    const d = await janela(M);
    await d.locator('#dl-nome').fill('Ilhas do Sul');
    await d.locator('input[name="dl-fundo"][value="papel"]').check();
    await d.locator('button[type="submit"]').click(); await espera(400);
    id.mapa2 = await A(M, () => __mundo.App.mapa && __mundo.App.mapa.id);
    ok(!!id.mapa2 && id.mapa2 !== id.mapa1 && (await mapa(M)).nome === 'Ilhas do Sul', 'mestre: "Novo mapa…" (papel em branco) pelo menu');
    // um rascunho: o marcador posto nele não pode chegar a ninguém
    await A(M, () => __mundo.App.mudar('novo marcador', m => { m.objs.push(__mundo.N.objNovo('m', { id: 'mc_rascunho', x: 500, y: 500, nome: 'Covil do rascunho' })); }));
    await espera(600);
    ok(!!doc(PRE_MAPA + id.mapa2) && doc(PRE_MAPA + id.mapa2).dados.oculto === true && !doc(PRE_PUB + id.mapa2) && doc(INDICE).dados.mapas.length === 1, 'o mapa novo entra na mesa escondido: sem projeção e fora do índice');
    ok(await A(J, x => __mundo.App.mapas.length === 1 && __mundo.App.mapa.id === x, id.mapa1) && !j(await casca(J, () => window.__entregues)).includes('Covil do rascunho'), 'o jogador não recebe nada do rascunho e continua onde estava');
    await A(J, () => document.getElementById('toasts').replaceChildren());
    await menuMapa(M, 'Mostrar este mapa aos jogadores');
    ok(await ate(() => doc(INDICE).dados.mostrado === id.mapa2 && doc(INDICE).dados.mapas.length === 2 && !!doc(PRE_PUB + id.mapa2)), 'índice: mostrado = o mapa novo (tirado do esconderijo pelo mesmo clique)');
    ok(await ate(() => A(J, x => !!__mundo.App.mapa && __mundo.App.mapa.id === x && document.getElementById('nomeMapa').textContent === 'Ilhas do Sul', id.mapa2)), 'o mestre mostra outro mapa: o jogador troca para ele');
    ok(/O mestre mostrou: Ilhas do Sul/.test(await textoDoAviso(J)), 'e é avisado: "' + await textoDoAviso(J) + '"');
  });

  await passo('mesa: esconder o mapa', async () => {
    // parar de mostrar não esconde: o aviso diz isso e oferece esconder
    await semAvisos(M);
    await menuMapa(M, 'Parar de mostrar aos jogadores');
    ok(await ate(() => doc(INDICE).dados.mostrado === null) && /continua aberto para os jogadores/.test(await textoDoAviso(M)) && await M.F.locator('#toasts .toast button', { hasText: 'Esconder' }).count() === 1,
      '"Parar de mostrar": o aviso diz que o mapa continua aberto para os jogadores e oferece "Esconder": ' + await textoDoAviso(M));
    await menuMapa(M, 'Esconder dos jogadores');
    ok(await ate(() => !doc(PRE_PUB + id.mapa2) && j(doc(INDICE).dados) === j({ mapas: [{ id: id.mapa1, nome: 'Mundo da Mesa' }], mostrado: null })), 'esconder: a projeção sai da mesa e o índice fica sem o mapa');
    ok(await ate(() => A(J, ([a, b]) => !!__mundo.App.mapa && __mundo.App.mapa.id === a && !__mundo.App.mapas.some(x => x.id === b), [id.mapa1, id.mapa2])), 'o mapa escondido some para o jogador (ele volta ao que sobrou)');
    await J.F.click('#btMapa'); await espera(200);
    const t2 = await J.F.locator('#menuMapas').innerText();
    ok(/Mundo da Mesa/.test(t2) && !/Ilhas do Sul/.test(t2), 'o seletor de mapas do jogador não tem o escondido: ' + t2.replace(/\s+/g, ' '));
    await J.P.keyboard.press('Escape'); await espera(150);
    ok(await A(M, x => __mundo.App.mapas.some(y => y.id === x && y.oculto), id.mapa2), 'para o mestre o mapa continua na lista, como escondido');

    // esconde o que sobrou: o jogador fica sem mapa; deixar ver de novo traz de volta
    await menuMapa(M, 'Mundo da Mesa');
    ok(await A(M, x => __mundo.App.mapa.id === x, id.mapa1), 'o mestre volta ao primeiro mapa pelo seletor');
    await menuMapa(M, 'Esconder dos jogadores');
    ok(await ate(() => !doc(PRE_PUB + id.mapa1) && doc(INDICE).dados.mapas.length === 0), 'nenhum mapa público na mesa');
    ok(await ate(() => A(J, () => __mundo.App.mapa === null && !document.getElementById('vazio').hidden && /O mestre ainda não mostrou nenhum mapa\./.test(document.getElementById('vazio').textContent))), 'o jogador sem mapa vê: "O mestre ainda não mostrou nenhum mapa."');
    await menuMapa(M, 'Deixar os jogadores verem este mapa');
    ok(await ate(() => A(J, x => !!__mundo.App.mapa && __mundo.App.mapa.id === x && __mundo.App.mapa.cal.dia === 9, id.mapa1)), 'o mestre deixa ver de novo: o mapa volta para o jogador');
  });

  await passo('mesa: dois aparelhos do mestre', async () => {
    // Um segundo aparelho do mestre está com um campo em foco (a mudança de fora fica esperando). Neste, o mestre
    // esconde a torre. Quando o segundo grava a sua mudança, as duas ficam: a torre não volta para os jogadores.
    const M2 = await naCasca('mestre-tablet', 'mestre', 'u_mestre');
    await A(M2, x => __mundo.App.trocarMapa(x), id.mapa1); await espera(300);
    await aba(M2, 'selecao');
    await A(M2, x => __mundo.App.selecionar([x]), id.vila); await espera(250);
    await campo(M2, `o:${id.vila}:txt`).fill('Rumores novos');
    await aba(M, 'selecao');
    await A(M, x => __mundo.App.selecionar([x]), id.torre); await espera(250);
    await alternar(M, `o:${id.torre}:oculto`);
    ok(await ate(() => !doc(PRE_PUB + id.mapa1).dados.objs.some(o => o.id === id.torre)) && await ate(() => A(J, x => !__mundo.App.mapa.objs.some(o => o.id === x), id.torre)), 'um aparelho esconde a torre: ela sai da projeção e do mapa do jogador');
    ok(await A(M2, x => __mundo.App.mapa.objs.find(o => o.id === x).oculto === false, id.torre), 'o outro aparelho, com um campo em foco, ainda não aplicou a mudança');
    await campo(M2, `o:${id.vila}:txt`).press('Control+Enter'); await espera(500);
    const mm = doc(PRE_MAPA + id.mapa1).dados, pub = doc(PRE_PUB + id.mapa1).dados, of = (x, k) => x.objs.find(o => o.id === k);
    ok(of(mm, id.torre).oculto === true && of(mm, id.vila).txt === 'Rumores novos', 'o outro aparelho grava: as duas mudanças ficam (a torre continua escondida)');
    ok(!of(pub, id.torre) && of(pub, id.vila).txt === 'Rumores novos', 'e a projeção não traz a torre de volta');
    ok(await A(M2, x => __mundo.App.mapa.objs.find(o => o.id === x).oculto === true, id.torre), 'o outro aparelho fica com as duas mudanças');
    await M2.P.close();
    await alternar(M, `o:${id.torre}:oculto`);
    ok(await ate(() => !!doc(PRE_PUB + id.mapa1).dados.objs.some(o => o.id === id.torre)), 'a torre volta quando o mestre a mostra');
    await A(M, () => __mundo.App.selecionar([]));
  });

  await passo('mesa: o mestre recarrega', async () => {
    const n = banco.log.length;
    await abrirCasca(M);
    ok(await A(M, x => !!__mundo.App.mapa && __mundo.App.mapa.id === x, id.mapa1) && j(await mapa(M)) === j(doc(PRE_MAPA + id.mapa1).dados), 'mestre recarregado: volta ao mesmo mapa, igual ao da mesa');
    await espera(1500);
    ok(banco.log.length === n, 'abrir de novo não regrava nada: ' + banco.log.slice(n).map(x => x.id).join(', '));
  });

  /* ================= 3. celular e tema claro ================= */
  const C = await naCasca('jogador-celular', 'jogador', 'u_jog2', { w: 390, h: 844, theme: 'light' });
  await passo('celular: jogador, tema claro', async () => {
    ok(await A(C, x => !!__mundo.App.mapa && __mundo.App.mapa.id === x, id.mapa1), 'celular (claro): o jogador abre o mapa da mesa');
    ok(await semRolagemLateral(C) && await C.P.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular: sem rolagem para o lado');
    ok(await A(C, () => matchMedia('(prefers-color-scheme: light)').matches && getComputedStyle(document.body).backgroundColor === 'rgb(199, 206, 217)'), 'celular: tema claro aplicado');
    ok(await A(C, () => document.getElementById('side').classList.contains('fechado') && getComputedStyle(document.getElementById('rail')).display === 'none'), 'celular: o painel começa fechado e não há trilho');
    ok(await imagemAberta(C, 1000), 'celular: a imagem abre');
    await clicar(C, 400, 150);
    ok(await sel(C) === id.torre, 'celular: tocar na torre a seleciona');
    await C.F.click('#btPainel'); await espera(300);
    const p = await C.F.locator('#pane').innerText();
    ok(await C.F.locator('#side').isVisible() && /Torre do Boato/.test(p) && /boato/.test(p) && !p.includes('(falso)') && !p.includes(SEG), 'celular: o painel abre com a leitura da torre (boato, sem o "falso")');
    ok(await semRolagemLateral(C), 'celular: com o painel aberto, sem rolagem para o lado');
    await foto(C, 'celular-jogador-claro');
    ok(await gravacoes(C) === 0, 'celular: o jogador não grava nada');
  });

  await passo('celular: mestre sem mesa, tema claro', async () => {
    const dc = await t.device({ name: 'celular-mestre', w: 390, h: 844, theme: 'light' });
    dc.page.setDefaultTimeout(8000);
    const K = { P: dc.page, F: dc.page.mainFrame(), nome: 'celular-mestre' };
    await K.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await pronto(K.F);
    ok(await K.F.locator('#vazio').isVisible() && await semRolagemLateral(K), 'celular (claro), sem mesa: estado vazio, sem rolagem para o lado');
    await K.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    ok(await A(K, () => !!__mundo.App.mapa && document.getElementById('side').classList.contains('fechado')), 'celular: papel em branco criado; o painel fica fechado');
    await ferramenta(K, 'm');
    await clicar(K, 1000, 700);
    const novo = await sel(K);
    ok(!!novo && (await obj(K, novo)).k === 'm' && await A(K, () => document.getElementById('side').classList.contains('fechado')), 'celular: marcador posto pelo trilho, sem o painel abrir por cima do mapa');
    await K.F.click('#btPainel'); await espera(300);
    ok(await campo(K, `o:${novo}:nome`).isVisible() && await semRolagemLateral(K), 'celular: o painel abre com o formulário, sem rolagem para o lado');
    await escrever(K, `o:${novo}:nome`, 'Porto Claro');
    ok((await obj(K, novo)).nome === 'Porto Claro', 'celular: editar pelo painel');
    await foto(K, 'celular-mestre-claro');
    await K.F.click('#btPainel'); await espera(200);
    await K.F.click('#btMapa'); await espera(200);
    ok(await K.F.locator('#menuMapas').isVisible() && /Ver como jogador/.test(await K.F.locator('#menuMapas').innerText()), 'celular: o menu de mapas abre (com "Ver como jogador", que não cabe na barra)');
    await K.P.keyboard.press('Escape'); await espera(150);
  });

  /* ================= 4. no fim: o jogador nunca gravou; a casca falsa segue as regras do banco ================= */
  await passo('fim', async () => {
    ok(await gravacoes(J) === 0, 'em todo o teste o jogador não mandou nenhum dados.gravar');
    ok(!j(await casca(J, () => window.__entregues)).includes(SEG) && !j(await casca(C, () => window.__entregues)).includes(SEG), 'em todo o teste nada do mestre chegou aos jogadores');
    const antes = j(doc(INDICE));
    await A(J, () => TC.dados.col('documentos').gravar('mundo:indice', { dados: { mapas: [], mostrado: null } }));
    await espera(300);
    const rec = await casca(J, () => window.__recusas);
    ok(rec.length === 1 && rec[0].id === 'mundo:indice' && j(doc(INDICE)) === antes, 'a casca falsa recusa a gravação de um jogador num documento que não é dele (e o banco não muda)');
  });

  await Promise.all(pendentes);
  if (t.errs.length) console.log('CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro (nem aviso) no console em todo o teste');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
