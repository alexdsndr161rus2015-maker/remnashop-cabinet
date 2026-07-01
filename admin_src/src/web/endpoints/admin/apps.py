"""Админ: выбор приложений для подключения (приоритетное + включённые).

Каталог приложений — во фронте (cabinet/src/data/apps.ts). Тут сохраняем выбор
администратора в assets/apps.json (см. public/apps.py).
"""

import json
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.web.endpoints.public.apps import (
    APPS_PATH,
    load_apps_config,
    sanitize_custom_apps,
)

from ._common import AdminUser

router = APIRouter(prefix="/apps", tags=["Admin - Apps"])


class AppsConfigUpdate(BaseModel):
    priority: Optional[str] = None      # id приоритетного приложения ("" → сброс)
    enabled: Optional[list[str]] = None  # список id (None — не менять)
    custom: Optional[list[dict[str, Any]]] = None  # свои приложения (None — не менять)


@router.get("")
async def get_apps(_admin: AdminUser) -> dict[str, Any]:
    return load_apps_config()


@router.put("")
async def update_apps(body: AppsConfigUpdate, _admin: AdminUser) -> dict[str, Any]:
    data = load_apps_config()

    if body.enabled is not None:
        # ограничиваем разумным числом id, нормализуем в строки
        data["enabled"] = [str(x) for x in body.enabled][:100]
    if body.priority is not None:
        data["priority"] = body.priority.strip() or None
    if body.custom is not None:
        data["custom"] = sanitize_custom_apps(body.custom)

    try:
        APPS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with APPS_PATH.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось сохранить список приложений: {exc}",
        )

    return data
