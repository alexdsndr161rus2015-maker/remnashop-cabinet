"""Админ: изменение оформления кабинета (название, акцент, фон)."""

import json
import re
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.web.endpoints.public.appearance import BRANDING_PATH, load_branding

from ._common import AdminUser

router = APIRouter(prefix="/appearance", tags=["Admin - Appearance"])

_HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _valid_color(value: Optional[str]) -> bool:
    return value is None or value == "" or bool(_HEX.match(value))


class AppearanceUpdate(BaseModel):
    brand_name: Optional[str] = None
    accent: Optional[str] = None      # hex (#rgb/#rrggbb) или "" чтобы сбросить
    background: Optional[str] = None  # hex или "" чтобы сбросить


@router.get("")
async def get_appearance(_admin: AdminUser) -> dict[str, Any]:
    return load_branding()


@router.put("")
async def update_appearance(body: AppearanceUpdate, _admin: AdminUser) -> dict[str, Any]:
    data = load_branding()

    if body.brand_name is not None:
        name = body.brand_name.strip()
        if not (1 <= len(name) <= 40):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Название должно быть от 1 до 40 символов",
            )
        data["brand_name"] = name

    for field in ("accent", "background"):
        value = getattr(body, field)
        if value is not None:
            if not _valid_color(value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{field}: ожидается hex-цвет (#RRGGBB) или пустая строка",
                )
            data[field] = value or None

    try:
        BRANDING_PATH.parent.mkdir(parents=True, exist_ok=True)
        with BRANDING_PATH.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось сохранить оформление: {exc}",
        )

    return data
