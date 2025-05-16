// Arquivo: xadrez-magico.js

const PECAS = {
  imperador: '👑',
  magoTempo: '🔄',
  cavaleiro: '🛡️',
  mago: '🔥'
};

let jogadorAtual = 'A';
let selecao = null;
let movimentosPossiveis = [];
let habilidadesUsadas = {
  A: { troca: false },
  B: { troca: false }
};

const tabuleiro = [];
const tabuleiroEl = document.getElementById('tabuleiro');
const mensagemEl = document.getElementById('mensagem');
const logEl = document.getElementById('log');
const turnoEl = document.createElement('h1');
document.body.insertBefore(turnoEl, tabuleiroEl);

function logar(msg) {
  const p = document.createElement("p");
  p.textContent = msg;
  logEl.prepend(p);
}

function criarTabuleiro() {
  tabuleiroEl.innerHTML = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const casa = document.createElement('div');
      casa.className = 'casa';
      casa.dataset.x = x;
      casa.dataset.y = y;

      if (!tabuleiro[y]) tabuleiro[y] = [];
      tabuleiro[y][x] = null;

      casa.addEventListener('click', () => cliqueNaCasa(x, y));
      tabuleiroEl.appendChild(casa);
    }
  }

  posicionarPecas();
  renderizarTabuleiro();
  turnoEl.textContent = jogadorAtual === 'A' ? '🎯 Seu Turno!' : '💀 Turno do Inimigo';
}

function posicionarPecas() {
  tabuleiro[0][2] = { tipo: 'imperador', jogador: 'B' };
  tabuleiro[0][1] = { tipo: 'magoTempo', jogador: 'B' };
  tabuleiro[0][3] = { tipo: 'magoTempo', jogador: 'B' };
  tabuleiro[0][0] = { tipo: 'mago', jogador: 'B' };
  tabuleiro[0][4] = { tipo: 'mago', jogador: 'B' };
  tabuleiro[1][2] = { tipo: 'cavaleiro', jogador: 'B', protegido: true };

  tabuleiro[4][2] = { tipo: 'imperador', jogador: 'A' };
  tabuleiro[4][1] = { tipo: 'magoTempo', jogador: 'A' };
  tabuleiro[4][3] = { tipo: 'magoTempo', jogador: 'A' };
  tabuleiro[4][0] = { tipo: 'mago', jogador: 'A' };
  tabuleiro[4][4] = { tipo: 'mago', jogador: 'A' };
  tabuleiro[3][2] = { tipo: 'cavaleiro', jogador: 'A', protegido: true };
}

function renderizarTabuleiro() {
  const casas = document.querySelectorAll('.casa');
  casas.forEach(casa => {
    const x = parseInt(casa.dataset.x);
    const y = parseInt(casa.dataset.y);
    casa.classList.remove('selecionada', 'movimento', 'cavaleiro-protegido', 'ataque');

    const peca = tabuleiro[y][x];
    casa.textContent = peca ? PECAS[peca.tipo] : '';

    if (peca && peca.tipo === 'cavaleiro' && peca.protegido) {
      casa.classList.add('cavaleiro-protegido');
    }

    if (selecao && selecao.x === x && selecao.y === y) {
      casa.classList.add('selecionada');
    } else {
    const mov = movimentosPossiveis.find(pos => pos.x === x && pos.y === y);
    if (mov) {
      if (mov.ataque) {
        casa.classList.add('ataque');
      } else {
        casa.classList.add('movimento');
      }
    }
  }
  });
}

function calcularMovimentos(tipo, x, y) {
  const movimentos = [];
  const dentro = (nx, ny) => nx >= 0 && nx < 5 && ny >= 0 && ny < 5;

  if (tipo === 'imperador') {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx !== 0 || dy !== 0) {
          const nx = x + dx;
          const ny = y + dy;
          if (dentro(nx, ny)) movimentos.push({ x: nx, y: ny });
        }
      }
    }
  } else if (tipo === 'magoTempo') {
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];
    for (let dir of dirs) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (dentro(nx, ny)) movimentos.push({ x: nx, y: ny });
    }
    for (let ny = 0; ny < 5; ny++) {
      for (let nx = 0; nx < 5; nx++) {
        const alvo = tabuleiro[ny][nx];
        if (alvo && alvo.tipo === 'imperador' && alvo.jogador === jogadorAtual) {
          movimentos.push({ x: nx, y: ny });
        }
      }
    }
  } else if (tipo === 'cavaleiro') {
    const movimentosCavalo = [
      [1, 2], [2, 1], [-1, 2], [-2, 1],
      [1, -2], [2, -1], [-1, -2], [-2, -1],
    ];
    for (let [dx, dy] of movimentosCavalo) {
      const nx = x + dx;
      const ny = y + dy;
      if (dentro(nx, ny)) movimentos.push({ x: nx, y: ny });
    }
  } else if (tipo === 'mago') {
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];
    for (let dir of dirs) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (dentro(nx, ny)) movimentos.push({ x: nx, y: ny });
    }
    // Adiciona alvos em linha para ataque visual
    for (let ny = 0; ny < 5; ny++) {
      for (let nx = 0; nx < 5; nx++) {
        if ((nx === x || ny === y) && !(nx === x && ny === y) && linhaLivre(x, y, nx, ny)) {
          const alvo = tabuleiro[ny][nx];
          if (alvo && alvo.jogador !== jogadorAtual) {
            movimentos.push({ x: nx, y: ny, ataque: true });
          }
        }
      }
    }
  }

  return movimentos.filter(pos => {
    const destino = tabuleiro[pos.y][pos.x];
    return !destino || destino.jogador !== jogadorAtual;
  });
}

function linhaLivre(x1, y1, x2, y2) {
  if (x1 !== x2 && y1 !== y2) return false;
  let dx = Math.sign(x2 - x1);
  let dy = Math.sign(y2 - y1);
  let cx = x1 + dx;
  let cy = y1 + dy;
  while (cx !== x2 || cy !== y2) {
    if (tabuleiro[cy][cx]) return false;
    cx += dx;
    cy += dy;
  }
  return true;
}

// IA do jogador B será chamada após o movimento do jogador A
function cliqueNaCasa(x, y) {
  const peca = tabuleiro[y][x];

  if (selecao) {
    if (movimentosPossiveis.some(pos => pos.x === x && pos.y === y)) {
      const origem = tabuleiro[selecao.y][selecao.x];
      const destino = tabuleiro[y][x];

      if (origem.tipo === 'magoTempo' && destino && destino.tipo === 'imperador' && destino.jogador === jogadorAtual && !habilidadesUsadas[jogadorAtual].troca) {
        tabuleiro[y][x] = origem;
        tabuleiro[selecao.y][selecao.x] = destino;
        habilidadesUsadas[jogadorAtual].troca = true;
        mensagemEl.textContent = '🔄 Troca Temporal realizada!';
        logar(`Jogador ${jogadorAtual} usou Troca Temporal com o Imperador!`);
      } else {
        tabuleiro[y][x] = origem;
        tabuleiro[selecao.y][selecao.x] = null;
        logar(`Jogador ${jogadorAtual} moveu ${origem.tipo} de (${selecao.x},${selecao.y}) para (${x},${y})`);
      }

      selecao = null;
      movimentosPossiveis = [];
      jogadorAtual = jogadorAtual === 'A' ? 'B' : 'A';
    } else {
      selecao = null;
      movimentosPossiveis = [];
    }
  } else if (peca && peca.jogador === jogadorAtual) {
    selecao = { x, y };
    movimentosPossiveis = calcularMovimentos(peca.tipo, x, y);
  } else if (selecao) {
    const origem = tabuleiro[selecao.y][selecao.x];
    if (origem.tipo === 'mago') {
      if (x === selecao.x || y === selecao.y) {
        if (linhaLivre(selecao.x, selecao.y, x, y)) {
          const alvo = tabuleiro[y][x];
          if (alvo && alvo.jogador !== jogadorAtual) {
            if (alvo.tipo === 'cavaleiro' && alvo.protegido) {
              alvo.protegido = false;
              mensagemEl.textContent = '🛡️ O Cavaleiro bloqueou a Bola de Fogo!';
              logar(`Jogador ${jogadorAtual} lançou Bola de Fogo em (${x},${y}) mas o Cavaleiro bloqueou!`);
            } else {
              if (alvo.tipo === 'imperador') {
                mensagemEl.textContent = `🏆 O Imperador foi destruído! Jogador ${jogadorAtual} vence!`;
                logar(`Jogador ${jogadorAtual} venceu destruindo o Imperador em (${x},${y})!`);
              } else {
                mensagemEl.textContent = '🔥 Bola de Fogo atingiu o inimigo!';
                logar(`Jogador ${jogadorAtual} lançou Bola de Fogo e atingiu ${alvo.tipo} em (${x},${y})`);
              }
              tabuleiro[y][x] = null;
            }
            jogadorAtual = jogadorAtual === 'A' ? 'B' : 'A';
          }
        }
      }
      selecao = null;
      movimentosPossiveis = [];
    }
  }

  renderizarTabuleiro();
  if (jogadorAtual === 'B') setTimeout(turnoIA, 500);
  else turnoEl.textContent = '🎯 Seu Turno!';
}

function turnoIA() {
  let acoes = [];
  let imperadorB, magoTempoB;
  let imperadorA;
  let pecasB = 0;
  let pecasA = 0;

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const peca = tabuleiro[y][x];
      if (peca) {
        if (peca.jogador === 'B') {
          pecasB++;
          if (peca.tipo === 'imperador') imperadorB = { x, y };
          if (peca.tipo === 'magoTempo') magoTempoB = { x, y };
          const movimentos = calcularMovimentos(peca.tipo, x, y);
          for (let mov of movimentos) {
            acoes.push({ from: { x, y }, to: mov, tipo: peca.tipo });
          }
        }
        if (peca.jogador === 'A') {
          pecasA++;
          if (peca.tipo === 'imperador') imperadorA = { x, y };
        }
      }
    }
  }

  const desvantagem = pecasB < pecasA;

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const peca = tabuleiro[y][x];
      if (peca && peca.tipo === 'mago' && peca.jogador === 'B') {
        if ((imperadorA.x === x || imperadorA.y === y) && linhaLivre(x, y, imperadorA.x, imperadorA.y)) {
          selecao = { x, y };
          cliqueNaCasa(imperadorA.x, imperadorA.y);
          return;
        }
      }
    }
  }

  if (imperadorB && magoTempoB && !habilidadesUsadas['B'].troca) {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const atacante = tabuleiro[y][x];
        if (atacante && atacante.jogador === 'A' && atacante.tipo === 'mago') {
          if ((x === imperadorB.x || y === imperadorB.y) && linhaLivre(x, y, imperadorB.x, imperadorB.y)) {
            selecao = magoTempoB;
            cliqueNaCasa(imperadorB.x, imperadorB.y);
            return;
          }
        }
      }
    }
  }

  if (desvantagem) {
    for (let acao of acoes) {
      const alvo = tabuleiro[acao.to.y][acao.to.x];
      if (alvo && alvo.jogador === 'A' && alvo.tipo === 'mago') {
        selecao = acao.from;
        cliqueNaCasa(acao.to.x, acao.to.y);
        return;
      }
    }
  }

  for (let acao of acoes) {
    const alvo = tabuleiro[acao.to.y][acao.to.x];
    if (alvo && alvo.jogador === 'A') {
      selecao = acao.from;
      cliqueNaCasa(acao.to.x, acao.to.y);
      return;
    }
  }

  for (let acao of acoes) {
    const tipo = tabuleiro[acao.from.y][acao.from.x].tipo;
    if (tipo === 'cavaleiro' || tipo === 'magoTempo') {
      selecao = acao.from;
      cliqueNaCasa(acao.to.x, acao.to.y);
      return;
    }
  }

  if (acoes.length > 0) {
    const acao = acoes[Math.floor(Math.random() * acoes.length)];
    selecao = acao.from;
    cliqueNaCasa(acao.to.x, acao.to.y);
  }
}

criarTabuleiro();
