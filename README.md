# Tiny Cats · Sistema de RPG

Site único com os sistemas da mesa: **Cenas** (mapa, tokens, turnos, névoa), **Fichas** (calculadora de atributos),
**Árvore de Habilidades** e **Rolador** de dados. Publicado em <https://dalkrs.github.io/>.
O **Mapa-múndi** é o mapa do mundo da campanha: marcadores, grupos viajando por rotas, regiões e facções, eventos com
data, frentes de batalha, calendário e névoa; os jogadores recebem só o que o mestre revela.

## Como está organizado

| Pasta | O que é |
|---|---|
| `index.html` | A casca: barra com a marca e as abas. Cada sistema roda na própria página, dentro de uma moldura. |
| `cenas/`, `fichas/`, `arvore/`, `rolador/` | As páginas dos sistemas (cada uma também abre sozinha, em outra janela). |
| `mundo/` | O Mapa-múndi: `nucleo.js` (regras, sem página), `tela.js` (o mapa), `painel.js` (painel e barra) e `mundo.js` (estado, desfazer, gravação no navegador ou na mesa). |
| `tc/` | Bibliotecas compartilhadas (dados, regras da ficha). |
| `src/cenas/` | Fontes da mesa de cenas. `./build.sh` gera `cenas/index.html`. Testes em `src/cenas/test/`. |
| `src/tests/` | Testes do site (casca e bibliotecas). |
| `src/legado/` | As versões originais de cada sistema, guardadas para comparação nos testes. |
| `supabase/` | Esquema do banco de dados (projeto "Tiny Cats"). |

## Dados

Enquanto não há login, cada sistema guarda os dados no próprio navegador. O Rolador continua lendo os históricos
que já existiam neste endereço.

## Testes

```
cd src/cenas && ./build.sh && cd test && node unit.js && node unit2.js && node unit3.js && node v3.js
cd src/tests && node site.test.js && node dice.test.js && node mundo-nucleo.test.js && node mundo.test.js
```
