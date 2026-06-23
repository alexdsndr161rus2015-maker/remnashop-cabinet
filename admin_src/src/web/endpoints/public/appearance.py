"""Публичное оформление кабинета (название бренда, цвета).

Хранится в JSON-файле в каталоге assets (он смонтирован томом и переживает
пересоздание контейнера). Не зависит от доменной модели бота, поэтому
безопасно для overlay поверх базового образа.
"""

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/appearance", tags=["Public - Appearance"])

ASSETS_DIR = Path(os.environ.get("APP_ASSETS_DIR", "/opt/remnashop/assets"))
BRANDING_PATH = ASSETS_DIR / "branding.json"

# accent / background == None → кабинет использует цвета темы по умолчанию.
DEFAULTS: dict[str, Any] = {
    "brand_name": "RemnaShop",
    "accent": None,
    "background": None,
}


def load_branding() -> dict[str, Any]:
    data = dict(DEFAULTS)
    try:
        if BRANDING_PATH.exists():
            with BRANDING_PATH.open(encoding="utf-8") as fh:
                stored = json.load(fh)
            if isinstance(stored, dict):
                for key in DEFAULTS:
                    if key in stored:
                        data[key] = stored[key]
    except Exception:
        # Битый файл не должен ронять кабинет — отдаём дефолты.
        pass
    return data


@router.get("")
async def get_appearance() -> dict[str, Any]:
    return load_branding()
