#!/usr/bin/env bash
# Banco local de ensaio (ver LEIA.md): um PostgreSQL daqui mesmo, com as migrações de supabase/migrations/, o
# PostgREST na frente e a "porta" local fazendo o papel do endereço do Supabase. Serve para ensaiar uma migração
# ANTES de aplicá-la no projeto de verdade, e para rodar os testes "de rede" sem tocar nos dados de ninguém.
#
#   banco.sh ligar [ate]     sobe tudo (monta o banco se ainda não existe)
#   banco.sh montar [ate]    apaga o banco local e o monta de novo, aplicando as migrações até a de número `ate`
#                            (por exemplo 0011; sem dizer, todas)
#   banco.sh aplicar <arq>   aplica um arquivo .sql no banco local (uma migração ainda por estrear, por exemplo)
#   banco.sh psql [...]      abre o psql no banco local
#   banco.sh desligar        derruba tudo (o banco fica guardado)
#   banco.sh estado          diz o que está de pé
#
# Depois de `ligar`, os testes de rede falam com ele assim:   TC_LOCAL=https://127.0.0.1:54331 node mesa.test.js
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../../.." && pwd)"
PG_PORTA="${TC_PG_PORTA:-54329}"; REST_PORTA="${TC_REST_PORTA:-54330}"; PORTA="${TC_PORTA:-54331}"
BANCO=tinycats
ENDERECO="https://127.0.0.1:$PORTA"
SEGREDO="${TC_JWT:-tinycats-banco-local-de-ensaio-isto-nao-e-segredo-0123456789}"
VERSAO_REST=v12.2.12

# onde está o PostgreSQL desta máquina
PGB="${TC_PG_BIN:-}"
if [ -z "$PGB" ]; then
  if command -v pg_config >/dev/null 2>&1 && [ -x "$(pg_config --bindir)/initdb" ]; then PGB="$(pg_config --bindir)"
  else PGB="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"; fi
fi
[ -n "$PGB" ] && [ -x "$PGB/initdb" ] || { echo "Não achei o PostgreSQL (initdb). Diga onde está: TC_PG_BIN=/caminho/bin"; exit 1; }

# onde ficam o PostgREST baixado, as configurações, os registros e os arquivos enviados nos testes
APOIO="${TC_LOCAL_APOIO:-$HOME/.cache/tinycats-local}"
mkdir -p "$APOIO"
# o PostgreSQL não roda como administrador da máquina: aí usa o usuário "postgres" (e a pasta dele)
COMO=()
if [ "$(id -u)" = 0 ]; then
  id postgres >/dev/null 2>&1 || { echo "Rodando como root e sem o usuário postgres: rode como um usuário comum."; exit 1; }
  COMO=(runuser -u postgres --)
  DIR="${TC_LOCAL_DIR:-$(getent passwd postgres | cut -d: -f6)/tinycats-local}"
else
  DIR="${TC_LOCAL_DIR:-$APOIO}"
fi
DADOS="$DIR/pg"
psqlc() { psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PG_PORTA" -U postgres "$@"; }
de_pe() { psql -X -h 127.0.0.1 -p "$PG_PORTA" -U postgres -d postgres -Atc "select 1" >/dev/null 2>&1; }

ligar_pg() {
  if de_pe; then return; fi
  if [ ! -d "$DADOS" ]; then
    "${COMO[@]}" mkdir -p "$DIR"
    "${COMO[@]}" "$PGB/initdb" -D "$DADOS" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
    "${COMO[@]}" tee -a "$DADOS/postgresql.conf" >/dev/null <<EOF
port = $PG_PORTA
listen_addresses = '127.0.0.1'
unix_socket_directories = ''
fsync = off
synchronous_commit = off
full_page_writes = off
max_connections = 80
wal_level = logical
EOF
  fi
  "${COMO[@]}" "$PGB/pg_ctl" -D "$DADOS" -l "$DADOS/log.txt" -w start >/dev/null
}
montar() {
  local ate="${1:-9999}"
  ligar_pg
  desligar_rest
  psqlc -d postgres -c "drop database if exists $BANCO with (force)" -c "create database $BANCO"
  # (os papéis são do servidor inteiro, não do banco: o que eles tinham no banco antigo foi embora com ele)
  psqlc -d "$BANCO" -f "$AQUI/supabase.sql"
  local n=0
  for f in "$RAIZ"/supabase/migrations/[0-9]*.sql; do
    local num; num="$(basename "$f" | cut -c1-4)"
    if [ "$((10#$num))" -gt "$((10#$ate))" ]; then continue; fi
    psqlc -d "$BANCO" -1 -f "$f" >/dev/null || { echo "A migração $(basename "$f") não passou."; exit 1; }
    n=$((n + 1))
  done
  echo "banco local montado: $n migrações (até $(ls "$RAIZ"/supabase/migrations/[0-9]*.sql | xargs -n1 basename | cut -c1-4 | awk -v a="$ate" '$1+0 <= a+0' | tail -1))"
}
ligar_rest() {
  local bin="${TC_POSTGREST:-$APOIO/postgrest}"
  if [ ! -x "$bin" ]; then
    echo "baixando o PostgREST $VERSAO_REST…"
    local tmp; tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/p.tar.xz" "https://github.com/PostgREST/postgrest/releases/download/$VERSAO_REST/postgrest-$VERSAO_REST-linux-static-x86-64.tar.xz"
    tar -xJf "$tmp/p.tar.xz" -C "$tmp"
    install -m 755 "$tmp/postgrest" "$bin"; rm -rf "$tmp"
  fi
  cat > "$APOIO/postgrest.conf" <<EOF
db-uri = "postgres://authenticator:local@127.0.0.1:$PG_PORTA/$BANCO"
db-schemas = "public,storage,auth"
db-anon-role = "anon"
db-max-rows = 1000
jwt-secret = "$SEGREDO"
server-host = "127.0.0.1"
server-port = $REST_PORTA
log-level = "warn"
EOF
  nohup "$bin" "$APOIO/postgrest.conf" > "$APOIO/postgrest.log" 2>&1 &
  echo $! > "$APOIO/postgrest.pid"
  for _ in $(seq 1 50); do curl -fsS -o /dev/null "http://127.0.0.1:$REST_PORTA/" 2>/dev/null && return; sleep 0.2; done
  echo "O PostgREST não subiu:"; tail -5 "$APOIO/postgrest.log"; exit 1
}
desligar_rest() {
  local p pid
  for p in postgrest porta; do
    [ -f "$APOIO/$p.pid" ] || continue
    pid="$(cat "$APOIO/$p.pid")"
    # (depois de a máquina reiniciar, o número anotado pode ser de outro programa: só derruba se for mesmo o daqui)
    if [ -r "/proc/$pid/cmdline" ] && tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q -e "postgrest" -e "porta.js"; then
      kill "$pid" 2>/dev/null || true
      for _ in $(seq 1 50); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done      # (espera sair: a porta dele fica livre)
    fi
    rm -f "$APOIO/$p.pid"
  done
}
ligar_porta() {
  # um certificado só desta máquina, para a porta atender em https (os endereços das imagens ficam como os de verdade)
  if [ ! -f "$APOIO/cert.pem" ]; then
    openssl req -x509 -newkey rsa:2048 -nodes -keyout "$APOIO/chave.pem" -out "$APOIO/cert.pem" -days 3650 -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1" >/dev/null 2>&1
  fi
  TC_PORTA="$PORTA" TC_REST="http://127.0.0.1:$REST_PORTA" TC_JWT="$SEGREDO" TC_ARQUIVOS="$APOIO/arquivos" TC_CERT="$APOIO/cert.pem" TC_CHAVE="$APOIO/chave.pem" nohup node "$AQUI/porta.js" > "$APOIO/porta.log" 2>&1 &
  echo $! > "$APOIO/porta.pid"
  for _ in $(seq 1 50); do curl -kfsS -o /dev/null "$ENDERECO/saude" 2>/dev/null && return; sleep 0.2; done
  echo "A porta local não subiu:"; tail -5 "$APOIO/porta.log"; exit 1
}

case "${1:-estado}" in
  montar) montar "${2:-}"; ligar_rest; ligar_porta; echo "no ar: TC_LOCAL=$ENDERECO" ;;
  ligar)
    ligar_pg
    if ! psqlc -d postgres -Atc "select 1 from pg_database where datname = '$BANCO'" | grep -q 1; then montar "${2:-}"; else desligar_rest; fi
    ligar_rest; ligar_porta; echo "no ar: TC_LOCAL=$ENDERECO" ;;
  aplicar)
    [ -f "${2:-}" ] || { echo "Diga o arquivo .sql."; exit 1; }
    psqlc -d "$BANCO" -1 -f "$2" >/dev/null && echo "aplicado: $(basename "$2")"
    # (o PostgREST relê o que o banco oferece)
    psqlc -d "$BANCO" -c "notify pgrst, 'reload schema'" ;;
  psql) shift; psql -X -h 127.0.0.1 -p "$PG_PORTA" -U postgres -d "$BANCO" "$@" ;;
  desligar) desligar_rest; if de_pe; then "${COMO[@]}" "$PGB/pg_ctl" -D "$DADOS" -m fast -w stop >/dev/null; fi; echo "desligado" ;;
  estado)
    de_pe && echo "PostgreSQL: de pé (porta $PG_PORTA)" || echo "PostgreSQL: parado"
    curl -fsS -o /dev/null "http://127.0.0.1:$REST_PORTA/" 2>/dev/null && echo "PostgREST: de pé (porta $REST_PORTA)" || echo "PostgREST: parado"
    curl -kfsS -o /dev/null "$ENDERECO/saude" 2>/dev/null && echo "porta local: de pé — TC_LOCAL=$ENDERECO" || echo "porta local: parada" ;;
  *) sed -n '2,15p' "${BASH_SOURCE[0]}" ;;
esac
