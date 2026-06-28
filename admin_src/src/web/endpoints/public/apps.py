"""Публичная конфигурация приложений для подключения.

Сам каталог приложений (deep-link'и, ссылки установки) живёт во фронте кабинета
(cabinet/src/data/apps.ts). Здесь хранится только ВЫБОР администратора:
  • priority — id приоритетного приложения (показывается первым, «Рекомендуем»);
  • enabled  — список id приложений, которые показывать (null = показывать все).

Хранится в assets/apps.json (том переживает пересоздание контейнера).
"""

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/apps", tags=["Public - Apps"])

ASSETS_DIR = Path(os.environ.get("APP_ASSETS_DIR", "/opt/remnashop/assets"))
APPS_PATH = ASSETS_DIR / "apps.json"


def load_apps_config() -> dict[str, Any]:
    """priority: str|None, enabled: list[str]|None (None = все приложения)."""
    data: dict[str, Any] = {"priority": None, "enabled": None}
    try:
        if APPS_PATH.exists():
            with APPS_PATH.open(encoding="utf-8") as fh:
                stored = json.load(fh)
            if isinstance(stored, dict):
                pr = stored.get("priority")
                if pr is None or isinstance(pr, str):
                    data["priority"] = pr
                en = stored.get("enabled")
                if isinstance(en, list):
                    data["enabled"] = [str(x) for x in en]
    except Exception:
        # Битый файл не должен ронять кабинет — отдаём дефолт (все приложения).
        pass
    return data


@router.get("")
async def get_apps_config() -> dict[str, Any]:
    return load_apps_config()
