"""Overlay-точка входа.

Раньше overlay цеплял admin-роутер копией base `src/web/app.py`. Это хрупко:
любое изменение base app.py (CORS, swagger, webhook, lifespan) затиралось нашей
устаревшей копией → на новой версии base приложение могло не стартовать.

Здесь base `get_app()` используется КАК ЕСТЬ (не копируется), а overlay только
ДОБАВЛЯЕТ сверху:
  • admin-роутер (`/api/v1/admin/*`);
  • дополнительные public-ручки (`/api/v1/public/*`), которых нет в base;
  • идемпотентное создание таблиц поддержки (вне alembic — см. ниже).

Таблицы поддержки создаются в обёрнутом lifespan, а НЕ alembic-миграцией:
overlay-миграция, вклинённая в линейную историю base, при каждом релизе base
ловила конфликт ревизий (дубликат id / два head у `alembic upgrade head`).
Создание `IF NOT EXISTS` при старте полностью развязывает overlay от истории
alembic — обновления base больше не ломают старт. Примирение осиротевших
`alembic_version` от прошлых overlay-ревизий делает `src/overlay_bootstrap.py`
перед запуском alembic (команда сервиса в docker-compose).
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from dishka import AsyncContainer, Scope
from dishka.integrations.aiogram import setup_dishka as setup_aiogram_dishka
from dishka.integrations.fastapi import setup_dishka as setup_fastapi_dishka
from fastapi import APIRouter, FastAPI
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import AppConfig
from src.core.constants import API_V1
from src.core.logger import setup_logger
from src.infrastructure.di import create_aiogram_container
from src.telegram.dispatcher import get_bg_manager_factory, get_dispatcher, setup_dispatcher
from src.web.app import get_app

# overlay-роутеры
from src.web.endpoints.admin import router as admin_router
from src.web.endpoints.public.appearance import router as appearance_router
from src.web.endpoints.public.balance import router as balance_router
from src.web.endpoints.public.me_role import router as me_role_router
from src.web.endpoints.public.server_stats import router as server_stats_router
from src.web.endpoints.public.set_password import router as set_password_router
from src.web.endpoints.public.support import router as support_router

# DDL таблиц поддержки. Идемпотентно (IF NOT EXISTS) — повторный старт безопасен.
_SUPPORT_TABLES_DDL = (
    """
    CREATE TABLE IF NOT EXISTS support_tickets (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject     VARCHAR(200) NOT NULL,
        status      VARCHAR(20)  NOT NULL DEFAULT 'open',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_support_tickets_user_id ON support_tickets (user_id)",
    """
    CREATE TABLE IF NOT EXISTS support_messages (
        id          SERIAL PRIMARY KEY,
        ticket_id   INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender      VARCHAR(10) NOT NULL,
        body        TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_support_messages_ticket_id ON support_messages (ticket_id)",
)


def _overlay_public_router() -> APIRouter:
    """Дополнительные public-ручки overlay (base про них не знает).

    subscription/plans/auth/referral остаются за base (его public-роутер уже их
    подключает; файл subscription.py overlay переопределяет точечно).
    """
    router = APIRouter(prefix=API_V1 + "/public")
    router.include_router(balance_router)
    router.include_router(me_role_router)
    router.include_router(set_password_router)
    router.include_router(support_router)
    router.include_router(server_stats_router)
    router.include_router(appearance_router)
    return router


def _wrap_lifespan_with_support_tables(app: FastAPI, container: AsyncContainer) -> None:
    """Оборачивает base lifespan: перед ним создаёт таблицы поддержки.

    base lifespan НЕ копируется — берём тот, что выставил `get_app`, и вызываем
    его внутри. Контейнер dishka уже привязан (setup_fastapi_dishka выше).
    """
    base_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        try:
            async with container(scope=Scope.REQUEST) as request_container:
                session = await request_container.get(AsyncSession)
                for stmt in _SUPPORT_TABLES_DDL:
                    await session.execute(text(stmt))
                await session.commit()
            logger.info("Overlay: таблицы поддержки готовы (IF NOT EXISTS)")
        except Exception as exc:  # не валим старт из-за overlay-таблиц
            logger.exception(f"Overlay: не удалось создать таблицы поддержки: {exc}")

        async with base_lifespan(app):
            yield

    app.router.lifespan_context = lifespan


def application() -> FastAPI:
    config = AppConfig.get()
    setup_logger(config)

    dispatcher = get_dispatcher(config)
    bg_manager_factory = get_bg_manager_factory(dispatcher)
    setup_dispatcher(dispatcher)

    app = get_app(config, dispatcher)
    container = create_aiogram_container(config, bg_manager_factory)

    setup_aiogram_dishka(container, dispatcher, auto_inject=True)
    setup_fastapi_dishka(container, app)

    # ── overlay: добавляем роуты поверх нетронутого base app ──
    app.include_router(admin_router)
    if config.web_enabled:
        app.include_router(_overlay_public_router())

    _wrap_lifespan_with_support_tables(app, container)

    return app


if __name__ == "__main__":
    uvicorn.run(
        app=application,
        host="0.0.0.0",
        port=8000,
        factory=True,
    )
