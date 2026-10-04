// Fichas sem mesa (tudo neste navegador): imagem do personagem, Lapros, passivas nos equipamentos, distribuição livre
// de atributos, Sanidade/Conforto/Relacionamentos e a memória do alvo da disputa.
const zlib = require('zlib');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');

/* um PNG de verdade, feito aqui */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function png(w, h, cor) {
  const pedaco = (tipo, dados) => { const tam = Buffer.alloc(4), td = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]), c = Buffer.alloc(4); tam.writeUInt32BE(dados.length); c.writeUInt32BE(crc32(td)); return Buffer.concat([tam, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const linha = 1 + w * 3, cru = Buffer.alloc(linha * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = cor(x, y), i = y * linha + 1 + x * 3; cru[i] = r; cru[i + 1] = g; cru[i + 2] = b; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))]);
}
const pc = (id, nome, lvl) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [{ id: 'it1', nome: 'Espadão serra', equipado: true, bonus: { FOR: 6, DES: 0, VIT: 0, CAN: 0, AGI: -2 } }],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '' });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5), pc('pc_cap', 'Capitão Orrin', 4), pc('pc_gob', 'Goblin batedor', 2)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas', seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const S0 = fn => P.evaluate(fn);
  const abrirFicha = async nome => { await P.locator('#lista .pc', { has: P.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(250); };

  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Dain X', 'a ficha abre');

  // ---------- regras: distribuição livre na biblioteca ----------
  {
    const p = R.personagemPadrao('T'); p.level = 3;
    const tab = R.calcular(p);
    p.modoAtr = 'livre';
    const semDist = R.calcular(p);
    ok(JSON.stringify(semDist.nat) === JSON.stringify(tab.nat) && semDist.livre === true && semDist.limite === 61, 'regras: em modo livre sem distribuição ainda, valem os números da tabela (limite 61 no level 3)');
    p.atrLivre = { FOR: 20, DES: '10', VIT: 5.6, CAN: -3, AGI: null };
    const c = R.calcular(p, null, { arvore: { FOR: 2 } });
    ok(JSON.stringify(c.nat) === '{"FOR":20,"DES":10,"VIT":6,"CAN":0,"AGI":0}' && c.base.FOR === 22 && c.usados === 36 && c.ant.FOR === 22, 'regras: os pontos postos à mão viram a base (inteiros, nunca negativos), a árvore soma por cima e a conta de usados sai certa');
    p.modoAtr = 'tabela';
    ok(JSON.stringify(R.calcular(p).nat) === JSON.stringify(tab.nat) && R.calcular(p).livre === undefined, 'regras: de volta à tabela, os números são os dos tiers');
  }

  // ---------- Lapros ----------
  await P.locator('#f_lapros').fill('1250'); await w(500);
  ok(await S0(() => S.personagens[0].estado.lapros === 1250), 'Lapros fica guardado na ficha');
  await P.locator('#f_lapros').fill('-7'); await P.locator('#f_nome').focus(); await w(300);
  ok(await S0(() => S.personagens[0].estado.lapros === 0) && await P.locator('#f_lapros').inputValue() === '0', 'Lapros não fica negativo');
  await P.locator('#f_lapros').fill('380'); await w(500);

  // ---------- passivas e efeitos nos equipamentos ----------
  await P.locator('[data-itemfx="it1"]').fill('Serra: sangramento 2 por turno.\n1×/combate: arranca uma parte do inimigo.'); await w(500);
  ok(await S0(() => S.personagens[0].itens[0].efeito.startsWith('Serra: sangramento')), 'o equipamento guarda passivas e efeitos');
  ok(await P.locator('[data-itemfx="it1"]').evaluate(el => el.offsetHeight >= 40), 'o campo cresce para caber o texto');
  await P.locator('[data-sub="habs"]').click(); await w(250);
  ok((await P.locator('.fxequip').innerText()).includes('Espadão serra') && (await P.locator('.fxequip').innerText()).includes('sangramento'), 'a aba de Passivas mostra o que vem dos equipamentos em uso');
  await P.locator('[data-itemon="it1"]').uncheck(); await w(300);
  ok(await P.locator('.fxequip').count() === 0, 'item desmarcado deixa de aparecer ali');
  await P.locator('[data-itemon="it1"]').check(); await w(300);

  // ---------- distribuição livre ----------
  const antes = await S0(() => { const c = calcular(S.personagens[0]); return { nat: c.nat, tot: c.tot, total: c.total }; });
  ok(await P.locator('[data-modo="livre"]').count() === 1 && await P.locator('[data-pts]').count() === 0, 'pela tabela, há o botão "Distribuição livre" e nenhum campo de pontos');
  await P.locator('[data-modo="livre"]').click(); await w(350);
  ok(await S0(() => S.personagens[0].modoAtr === 'livre') && JSON.stringify(await S0(() => S.personagens[0].atrLivre)) === JSON.stringify(antes.nat), 'ao passar para a distribuição livre, os valores atuais ficam como ponto de partida');
  ok(await P.locator('[data-pts]').count() === 5 && await P.locator('.attr select.tsel').count() === 0, 'a tabela mostra os pontos de cada atributo (sem tiers)');
  const cont = () => P.locator('#ptsCont').innerText();
  const usados0 = Object.values(antes.nat).reduce((a, b) => a + b, 0), limite = Math.floor(antes.total);
  ok((await cont()).startsWith(usados0 + ' de ' + limite + ' pontos'), 'o contador mostra quantos pontos foram distribuídos: ' + await cont());
  await P.locator('[data-ptsstep="FOR|1"]').click(); await w(250);
  ok(await S0(() => S.personagens[0].atrLivre.FOR) === antes.nat.FOR + 1 && await S0(() => calcular(S.personagens[0]).tot.FOR) === antes.tot.FOR + 1, 'o + põe um ponto e o total acompanha');
  ok(await P.evaluate(() => document.activeElement && document.activeElement.dataset.ptsstep === 'FOR|1'), 'e o foco continua no botão (dá para clicar várias vezes)');
  await P.locator('[data-pts="DES"]').fill('0'); await P.locator('[data-pts="DES"]').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].atrLivre.DES) === 0 && await P.locator('[data-ptsstep="DES|-1"]').isDisabled(), 'dá para digitar os pontos; em zero, o − desliga');
  ok(/faltam? \d+/.test(await cont()) && await P.locator('#ptsCont.falta').count() === 1, 'faltando pontos, o contador avisa: ' + await cont());
  await P.locator('[data-pts="VIT"]').fill('500'); await P.locator('[data-pts="VIT"]').press('Enter'); await w(300);
  ok(/passou \d+/.test(await cont()) && await P.locator('#ptsCont.passou').count() === 1 && await S0(() => S.personagens[0].atrLivre.VIT) === 500, 'passando do total, a ficha avisa mas não trava: ' + await cont());
  await P.locator('[data-pts="VIT"]').fill(String(antes.nat.VIT)); await P.locator('[data-pts="VIT"]').press('Enter'); await w(250);
  ok(await S0(() => { const c = calcular(S.personagens[0]); return c.recursos[0].val === c.tot.VIT * 8 + 25; }), 'HP e SP usam os atributos distribuídos');
  await P.locator('[data-modo="tabela"]').click(); await w(300);
  ok(await S0(() => S.personagens[0].modoAtr === 'tabela' && S.personagens[0].atrLivre.DES === 0) && JSON.stringify(await S0(() => calcular(S.personagens[0]).nat)) === JSON.stringify(antes.nat), '"Usar a tabela" volta aos tiers e guarda os pontos distribuídos');
  await P.locator('[data-modo="livre"]').click(); await w(300);
  ok(await S0(() => calcular(S.personagens[0]).nat.DES) === 0, 'e a distribuição guardada volta ao religar');

  // ---------- Sanidade, Conforto e Relacionamentos ----------
  ok(await P.locator('#painelMente .menteoff').count() === 1, 'por padrão (sem mesa), o painel de Sanidade e Conforto começa desligado');
  await P.locator('[data-mente="usar"]').click(); await w(250);
  ok(await S0(() => S.personagens[0].estado.san === 100 && S.personagens[0].estado.conf === 50), 'ligado, começa com Sanidade 100 e Conforto 50');
  await P.locator('[data-mstep="san|-5"]').click(); await P.locator('[data-mstep="san|-5"]').click(); await P.locator('[data-mstep="san|-1"]').click(); await w(200);
  ok(await S0(() => S.personagens[0].estado.san) === 89 && (await P.locator('.m-san .mfaixa').innerText()).toLowerCase() === 'lúcido', 'os botões descem a Sanidade: 89 · ' + await P.locator('.m-san .mfaixa').innerText());
  await P.locator('[data-mval="san"]').fill('30'); await P.locator('[data-mval="san"]').press('Enter'); await w(200);
  ok((await P.locator('.m-san .mfaixa').innerText()).toLowerCase() === 'abalado' && await P.locator('.m-san.n-medio').count() === 1, 'em 30 a faixa é "Abalado"');
  await P.locator('[data-mval="san"]').fill('-20'); await P.locator('[data-mval="san"]').press('Enter'); await w(200);
  ok(await S0(() => S.personagens[0].estado.san) === 0 && (await P.locator('.m-san .mfaixa').innerText()).toLowerCase() === 'em colapso', 'não passa de zero: "Em colapso"');
  await P.locator('[data-mval="conf"]').fill('999'); await P.locator('[data-mval="conf"]').press('Enter'); await w(200);
  ok(await S0(() => S.personagens[0].estado.conf) === 100 && (await P.locator('.m-conf .mfaixa').innerText()).toLowerCase() === 'aconchegado', 'nem de cem: Conforto 100, "Aconchegado"');
  ok(await P.locator('.m-conf .mbar i').evaluate(el => el.style.width) === '100%', 'a barra acompanha o valor');
  // relacionamentos
  await P.locator('#relNovo').selectOption({ label: 'Capitão Orrin' }); await w(250);
  ok(await S0(() => S.personagens[0].estado.rel.length === 1 && S.personagens[0].estado.rel[0].alvo === 'pc_cap' && S.personagens[0].estado.rel[0].v === 0), 'acrescenta um relacionamento com outro personagem, começando em 0');
  ok(await P.locator('#relNovo option', { hasText: 'Capitão Orrin' }).count() === 0, 'quem já está na lista sai das opções');
  const relId = await S0(() => S.personagens[0].estado.rel[0].id);
  for (let i = 0; i < 5; i++) await P.locator(`[data-relstep="${relId}|5"]`).click();
  await w(200);
  ok(await S0(() => S.personagens[0].estado.rel[0].v) === 25 && (await P.locator('.relrow .relfaixa').first().innerText()).toLowerCase() === 'amigável', '+25: "Amigável"');
  await P.locator(`[data-relval="${relId}"]`).fill('-150'); await P.locator(`[data-relval="${relId}"]`).press('Enter'); await w(200);
  ok(await S0(() => S.personagens[0].estado.rel[0].v) === -100 && (await P.locator('.relrow .relfaixa').first().innerText()).toLowerCase() === 'hostil' && await P.locator('.relrow.n-ruim').count() === 1, 'o valor fica entre −100 e +100: "Hostil"');
  P.once('dialog', d => d.accept('Irmã Calla'));
  await P.locator('#relNovo').selectOption('__nome__'); await w(300);
  ok(await S0(() => S.personagens[0].estado.rel.length === 2 && S.personagens[0].estado.rel[1].nome === 'Irmã Calla' && S.personagens[0].estado.rel[1].alvo === null), 'também dá para escrever um nome (alguém sem ficha)');
  await P.locator(`[data-reldel="${relId}"]`).click(); await w(200);
  ok(await S0(() => S.personagens[0].estado.rel.length) === 1, 'o × tira o relacionamento');
  await P.locator('.toast.comacao button').click(); await w(250);
  ok(await S0(() => S.personagens[0].estado.rel.length === 2 && S.personagens[0].estado.rel[0].alvo === 'pc_cap' && S.personagens[0].estado.rel[0].v === -100), 'e o Desfazer devolve, no mesmo lugar e com o mesmo valor');
  // cada um tem a sua: a ficha do Capitão não ganhou nada
  ok(await S0(() => !S.personagens[1].estado || !S.personagens[1].estado.rel), 'o relacionamento é de quem sente: a ficha do outro não muda');

  // ---------- imagem do personagem ----------
  ok(await P.locator('.retrato .ini').innerText() === 'DX' && await P.locator('#lista .pcrow').first().locator('.avmini.semimg').count() === 1, 'sem imagem, aparecem as iniciais (na ficha e no elenco)');
  await P.locator('#imgIn').setInputFiles({ name: 'dain.png', mimeType: 'image/png', buffer: png(600, 900, (x, y) => [180, 60 + (y >> 3), 40 + (x >> 3)]) });
  ok(await (async () => { for (let i = 0; i < 40; i++) { if (await S0(() => !!S.personagens[0].img)) return true; await w(150); } return false; })(), 'a imagem escolhida entra na ficha');
  const img = await S0(() => S.personagens[0].img);
  ok(/^data:image\/(webp|png);base64,/.test(img) && img.length < 120000, 'sem mesa ela fica embutida, já diminuída (' + Math.round(img.length / 1024) + ' KB)');
  ok(await P.locator('.retrato .quadro img').evaluate(el => el.naturalHeight === 256 && el.naturalWidth > 0 && el.naturalWidth < 256), 'o lado maior fica com 256 px, na proporção original');
  ok(await P.locator('#lista .pcrow').first().locator('img.avmini').count() === 1, 'e aparece no elenco');
  await P.locator('#btnImgX').click(); await w(250);
  ok(await S0(() => !S.personagens[0].img), 'o × tira a imagem');
  await P.locator('.toast.comacao button').click(); await w(250);
  ok(await S0(() => S.personagens[0].img) === img, 'Desfazer devolve a imagem');
  await P.locator('#imgIn').setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') }); await w(400);
  ok(await S0(() => S.personagens[0].img) === img, 'arquivo que não é imagem é recusado');

  // ---------- disputa: os dados do alvo valem para todos ----------
  await P.locator('#btnDisputa').click(); await w(250);
  await P.locator('#disAlvo').selectOption({ label: 'Capitão Orrin' }); await w(200);
  await P.locator('#disAtrB').selectOption('DFF'); await w(200);
  await P.locator('#disFixaB').fill('12'); await w(200);
  await P.locator('#disFechar').click(); await w(250);
  await abrirFicha('Goblin batedor');
  await P.locator('#btnDisputa').click(); await w(250);
  ok(await P.locator('#disAlvo').inputValue() === 'pc_cap' && await P.locator('#disAtrB').inputValue() === 'DFF' && await P.locator('#disFixaB').inputValue() === '12', 'outro personagem abre a disputa e já encontra o alvo, o atributo e a fixa dele preenchidos');
  await P.locator('#disAlvo').selectOption('__avulso__'); await w(200);
  await P.locator('#disValorB').fill('55'); await P.locator('#disFixaB').fill('3'); await w(200);
  await P.locator('#disAlvo').selectOption({ label: 'Capitão Orrin' }); await w(200);
  ok(await P.locator('#disAtrB').inputValue() === 'DFF' && await P.locator('#disFixaB').inputValue() === '12', 'trocar de alvo traz os dados guardados daquele alvo');
  await P.locator('#disAtrB').selectOption('ESQ'); await P.locator('#disFixaB').fill('7'); await w(200);
  await P.locator('#disRolar').click(); await w(300);
  ok((await P.locator('.disveredito').innerText()).length > 5, 'a disputa rola');
  await P.locator('#disFechar').click(); await w(250);
  await abrirFicha('Dain X');
  await P.locator('#btnDisputa').click(); await w(250);
  ok(await P.locator('#disAlvo').inputValue() === 'pc_cap' && await P.locator('#disAtrB').inputValue() === 'DFF' && await P.locator('#disFixaB').inputValue() === '12', 'cada ficha lembra o que ELA usou contra o alvo (o Dain continua com DEF F e 12)');
  await P.locator('#disAlvo').selectOption('__avulso__'); await w(200);
  ok(await P.locator('#disValorB').inputValue() === '55' && await P.locator('#disFixaB').inputValue() === '3', 'e o valor avulso guardado por outro personagem também aparece para este');
  await P.locator('#disFechar').click(); await w(250);
  await abrirFicha('Capitão Orrin');
  await P.locator('#btnDisputa').click(); await w(250);
  ok(await P.locator('#disAlvo').inputValue() === '__avulso__', 'ficha que nunca disputou começa pelo último alvo usado');
  await P.locator('#disFechar').click(); await w(250);

  // ---------- tudo continua lá depois de recarregar ----------
  await w(500);
  await P.reload({ waitUntil: 'load' }); await w(1200);
  ok(await S0(() => { const p = S.personagens.find(x => x.id === 'pc_dain'); return p.estado.lapros === 380 && p.modoAtr === 'livre' && p.atrLivre.DES === 0 && p.estado.san === 0 && p.estado.conf === 100 && p.estado.rel.length === 2 && !!p.img && p.itens[0].efeito.length > 10 && p.disputa.alvos.pc_cap.atr === 'DFF' && S.alvos.pc_cap.atr === 'ESQ'; }), 'recarregando a página, tudo o que foi posto continua na ficha');

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
