"""Аудит-лог админ-действий: кто/когда менял что (изменяющие админ-запросы).

Записи кладёт мидлварь (см. overlay_app), здесь — только чтение для админки.
"""

from typing import Any

from dishka import FromDishka
from dishka.integrations.fastapi import inject
from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import AdminUser

router = APIRouter(prefix="/audit", tags=["Admin - Audit"])


@router.get("")
@inject
async def list_audit(
    _admin: AdminUser,
    session: FromDishka[AsyncSession],
    limit: int = 100,
) -> dict[str, Any]:
    limit = max(1, min(limit, 500))
    rows = (
        await session.execute(
            text(
                "SELECT id, actor, method, path, status, created_at "
                "FROM admin_audit_log ORDER BY created_at DESC LIMIT :l"
            ),
            {"l": limit},
        )
    ).mappings().all()
    return {
        "items": [
            {
                "id": r["id"],
                "actor": r["actor"],
                "method": r["method"],
                "path": r["path"],
                "status": r["status"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]
    }
