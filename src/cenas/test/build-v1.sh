#!/usr/bin/env bash
# Monta a página da v1 (fontes guardados em src.v1) para testar a migração dos dados salvos.
set -euo pipefail
export LC_ALL=C
cd "$(dirname "$0")/.."
{
  printf '%s' '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#faf9f5}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
  echo '<title>Cenas de Urgm</title>'
  echo '<style>'; cat src.v1/style.css; echo '</style>'
  cat src.v1/body.html
  echo '<script>'; echo '(() => {'; echo "'use strict';"; cat src.v1/js/*.js; echo '})();'; echo '</script>'
  printf '%s' '</body></html>'
} > test/page-v1.html
wc -c test/page-v1.html
