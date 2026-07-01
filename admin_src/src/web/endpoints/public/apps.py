"""Публичная конфигурация приложений для подключения.

Сам каталог приложений (deep-link'и, ссылки установки) живёт во фронте кабинета
(cabinet/src/data/apps.ts). Здесь хранится только ВЫБОР администратора:
  • priority — id приоритетного приложения (показывается первым, «Рекомендуем»);
  • enabled  — список id приложений, которые показывать (null = показывать все).

Хранится в assets/apps.json (том переживает пересоздание контейнера).
"""

import json
import os
import re
import secrets
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/apps", tags=["Public - Apps"])

ASSETS_DIR = Path(os.environ.get("APP_ASSETS_DIR", "/opt/remnashop/assets"))
APPS_PATH = ASSETS_DIR / "apps.json"

_PLATFORMS = {"ios", "android", "windows", "macos", "androidtv"}


def sanitize_custom_apps(raw: Any) -> list[dict[str, Any]]:
    """Свои приложения админа → безопасный вид. deep_link — шаблон с {sub}."""
    out: list[dict[str, Any]] = []
    if not isinstance(raw, list):
        return out
    for item in raw[:50]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()[:60]
        deep = str(item.get("deep_link") or "").strip()[:300]
        if not name or not deep:
            continue
        plats = [p for p in (item.get("platforms") or []) if p in _PLATFORMS]
        if not plats:
            plats = sorted(_PLATFORMS)
        cid = str(item.get("id") or "").strip()[:40]
        if not cid:
            slug = re.sub(r"[^a-z0-9]+", "", name.lower())[:20]
            cid = f"custom_{slug or secrets.token_hex(4)}"
        out.append({
            "id": cid,
            "name": name,
            "desc": str(item.get("desc") or "").strip()[:120],
            "platforms": plats,
            "deep_link": deep,
            "install_url": (str(item.get("install_url") or "").strip()[:300] or None),
        })
    return out


def load_apps_config() -> dict[str, Any]:
    """priority: str|None, enabled: list[str]|None (None = все), custom: list."""
    data: dict[str, Any] = {"priority": None, "enabled": None, "custom": []}
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
                data["custom"] = sanitize_custom_apps(stored.get("custom"))
    except Exception:
        # Битый файл не должен ронять кабинет — отдаём дефолт (все приложения).
        pass
    return data


@router.get("")
async def get_apps_config() -> dict[str, Any]:
    return load_apps_config()
