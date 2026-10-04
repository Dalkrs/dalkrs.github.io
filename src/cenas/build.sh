#!/usr/bin/env bash
# Junta os fontes em três saídas:
#   cenas-de-urgm.html        o fragmento (para o publicador de artefatos, que aplica o próprio esqueleto)
#   test/page.html            o fragmento embrulhado nesse mesmo esqueleto: é a página que os testes abrem
#   ../../cenas/index.html    a página do site: documento HTML completo, que não depende de visualizador nenhum
set -euo pipefail
export LC_ALL=C   # ordem dos arquivos sempre a mesma (10-ui antes de 10b-tour)
cd "$(dirname "$0")"
OUT=cenas-de-urgm.html
SITE=../../cenas/index.html

# O que vai no <head>: título, fontes e o CSS.
head_parts() {
  echo '<title>Cenas · Tiny Cats</title>'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&display=swap">'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&display=swap">'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grenze:wght@500;600;700&display=swap">'
  echo '<style>'
  cat src/style.css
  echo '</style>'
}
# O que vai no <body>: a marcação e o programa (todos os módulos numa função só).
body_parts() {
  cat src/body.html
  echo '<script>'
  echo '(() => {'
  echo "'use strict';"
  cat src/js/*.js
  echo '})();'
  echo '</script>'
}

{ head_parts; body_parts; } > "$OUT"

{
  printf '%s' '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#faf9f5}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
  cat "$OUT"
  printf '%s' '</body></html>'
} > test/page.html

mkdir -p "$(dirname "$SITE")"
{
  echo '<!doctype html>'
  echo '<html lang="pt-BR">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  head_parts
  echo '</head>'
  echo '<body>'
  # só a página do site fala com a casca: mesa ao vivo, fichas da mesa, regras da ficha e dados
  echo '<script src="../tc/ponte.js?v=3"></script>'
  echo '<script src="../tc/dice.js?v=1"></script>'
  echo '<script src="../tc/rules.js?v=2"></script>'
  body_parts
  echo '</body>'
  echo '</html>'
} > "$SITE"

for f in src/js/*.js; do node --check "$f" || { echo "ERRO de sintaxe em $f"; exit 1; }; done
if grep -n '</script' src/js/*.js; then echo 'ERRO: </script dentro do JS'; exit 1; fi
wc -c "$OUT" | awk '{printf "ok: %s (%.0f KB)\n", $2, $1/1024}'
wc -c "$SITE" | awk '{printf "ok: %s (%.0f KB)\n", $2, $1/1024}'
