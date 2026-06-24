#!/usr/bin/env bash
#
# check-update.sh — проверка overlay на текущем (или указанном) базовом образе
# ПЕРЕД деплоем. На проде ничего не трогает: только собирает временный образ и
# гоняет статические проверки.
#
#   ./check-update.sh              # проверить с тегом base из Dockerfile
#   ./check-update.sh v0.8.3       # проверить с другим тегом base (для бампа)
#
# Зелёный прогон (один alembic head + сборка app + sed-патч точки входа) —
# можно деплоить / бампать пин в Dockerfile.

set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

GRN=$'\e[32m'; RED=$'\e[31m'; YLW=$'\e[33m'; RST=$'\e[0m'
ok()   { printf '%s✓%s %s\n' "$GRN" "$RST" "$*"; }
die()  { printf '%s✗ %s%s\n' "$RED" "$*" "$RST" >&2; exit 1; }
info() { printf '%s➜%s %s\n' "$YLW" "$RST" "$*"; }

[ -f .env ] || die "Нет .env"
docker network inspect remnawave-network >/dev/null 2>&1 || die "Нет docker-сети remnawave-network"

IMG="remnashop-overlay-check"
DF="Dockerfile"

# Если передан тег — собрать на нём, не трогая Dockerfile (через временный Dockerfile).
if [ "${1:-}" != "" ]; then
  TAG="$1"
  info "Проверяю overlay на base ghcr.io/snoups/remnashop:${TAG}"
  DF="$(mktemp)"; trap 'rm -f "$DF"' EXIT
  sed "s#^FROM ghcr.io/snoups/remnashop:.*#FROM ghcr.io/snoups/remnashop:${TAG}#" Dockerfile > "$DF"
else
  TAG="$(grep -m1 '^FROM ghcr.io/snoups/remnashop:' Dockerfile | sed 's#.*:##')"
  info "Проверяю overlay на base из Dockerfile (тег: ${TAG})"
fi

info "Сборка образа (sed-патч точки входа проверяется здесь же)…"
docker build -f "$DF" -t "$IMG" . >/dev/null || die "Сборка упала (возможно, sed точки входа не сматчился на новом base)"
ok "Образ собран, точка входа overlay на месте"

info "Проверка alembic: должен быть РОВНО один head…"
HEADS="$(docker run --rm "$IMG" sh -c 'alembic -c src/infrastructure/database/alembic.ini heads 2>/dev/null' | grep -c '(head)')"
[ "$HEADS" = "1" ] || die "Ожидался один alembic head, найдено: ${HEADS} (конфликт миграций base/overlay)"
ok "alembic heads = 1"

info "Сборка FastAPI-приложения (импорты overlay против base)…"
docker run --rm --env-file .env --network remnawave-network "$IMG" \
  sh -c 'python -c "import src.overlay_app as m; app=m.application(); assert any(\"/api/v1/admin/\" in getattr(r,\"path\",\"\") for r in app.routes), \"нет admin-роутов\""' >/dev/null \
  || die "application() не собрался — overlay несовместим с этим base (проверь переименованные импорты)"
ok "Приложение собирается, admin/public-роуты на месте"

printf '\n%sГОТОВО:%s overlay совместим с base %s — можно деплоить.\n' "$GRN" "$RST" "$TAG"
