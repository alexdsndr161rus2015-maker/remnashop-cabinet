"""Примирение alembic перед миграциями base (best-effort, запускается до alembic).

История: overlay-миграция таблиц поддержки жила в линейной истории alembic и при
бампах base переименовывалась (0040_support_tickets → 0041_support_tickets). У уже
развёрнутых установок в `alembic_version` остался id ПРОШЛОЙ overlay-ревизии,
которой больше нет в скриптах → `alembic upgrade head` падает с
«Can't locate revision ...».

Теперь таблицы поддержки создаются вне alembic (см. src/__main__.py), а этот шаг
сбрасывает осиротевший `alembic_version` на текущий head base (`0040`), чтобы
`alembic upgrade head` снова проходил. Идемпотентно и безопасно:
  • если таблицы alembic_version нет (свежая установка) — ничего не делает;
  • если версия не из overlay — не трогает;
  • любые ошибки логируются, но НЕ роняют старт (worst case — поведение как раньше).

Запускается командой сервиса remnashop в docker-compose ДО docker-entrypoint.sh.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# id прошлых overlay-ревизий, которые надо «свести» к head base.
_ORPHAN_REVISIONS = ("0040_support_tickets", "0041_support_tickets")
# текущий head base (последняя базовая миграция). При бампе base — обновить.
_BASE_HEAD = "0040"


async def _reconcile() -> None:
    from src.core.config import AppConfig

    config = AppConfig.get()
    engine = create_async_engine(config.database.dsn)
    try:
        async with engine.begin() as conn:
            has_table = await conn.scalar(text("SELECT to_regclass('public.alembic_version')"))
            if not has_table:
                return
            current = await conn.scalar(text("SELECT version_num FROM alembic_version LIMIT 1"))
            if current in _ORPHAN_REVISIONS:
                await conn.execute(
                    text("UPDATE alembic_version SET version_num = :head"),
                    {"head": _BASE_HEAD},
                )
                print(
                    f"[overlay_bootstrap] alembic_version {current!r} → {_BASE_HEAD!r} "
                    "(осиротевшая overlay-ревизия сведена к head base)"
                )
    finally:
        await engine.dispose()


def main() -> None:
    try:
        asyncio.run(_reconcile())
    except Exception as exc:  # best-effort: не блокируем запуск контейнера
        print(f"[overlay_bootstrap] пропущено (не критично): {exc}")


if __name__ == "__main__":
    main()
