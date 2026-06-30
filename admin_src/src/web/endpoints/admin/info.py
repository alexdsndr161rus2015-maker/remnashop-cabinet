"""Админ: редактирование контента страницы «Информация» (FAQ/Правила/
Конфиденциальность/Оферта/Статусы). Хранится в assets/info_content.json.

GET отдаёт эффективный контент (сохранённое или брендированные дефолты) — им и
наполняется форма редактора. PUT сохраняет присланный контент целиком.
"""

import json
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from src.web.endpoints.public.info_content import (
    INFO_PATH,
    TEXT_SECTIONS,
    effective_content,
)

from ._common import AdminUser

router = APIRouter(prefix="/info", tags=["Admin - Info"])

MAX_TEXT = 20000
MAX_FAQ_ITEMS = 100


class FaqItem(BaseModel):
    q: str = Field(min_length=1, max_length=300)
    a: str = Field(min_length=1, max_length=4000)


class InfoUpdate(BaseModel):
    faq: Optional[list[FaqItem]] = None
    rules: Optional[str] = None
    privacy: Optional[str] = None
    offer: Optional[str] = None
    statuses: Optional[str] = None


def _save(data: dict[str, Any]) -> None:
    try:
        INFO_PATH.parent.mkdir(parents=True, exist_ok=True)
        with INFO_PATH.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось сохранить контент: {exc}",
        )


@router.get("")
async def get_info_admin(_admin: AdminUser) -> dict[str, Any]:
    return effective_content()


@router.put("")
async def update_info_admin(body: InfoUpdate, _admin: AdminUser) -> dict[str, Any]:
    # Стартуем от текущего эффективного контента, чтобы не затирать незаданные
    # в запросе разделы (PUT может прислать только изменённое).
    data: dict[str, Any] = effective_content()

    if body.faq is not None:
        if len(body.faq) > MAX_FAQ_ITEMS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Слишком много вопросов (максимум {MAX_FAQ_ITEMS})",
            )
        data["faq"] = [{"q": i.q.strip(), "a": i.a.strip()} for i in body.faq]

    for key in TEXT_SECTIONS:
        value = getattr(body, key)
        if value is not None:
            if len(value) > MAX_TEXT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{key}: текст длиннее {MAX_TEXT} символов",
                )
            data[key] = value

    _save(data)
    return data
