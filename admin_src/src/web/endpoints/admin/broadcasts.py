from typing import Any

from dishka import FromDishka
from dishka.integrations.fastapi import inject
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.application.common.dao import BroadcastDao
from src.core.enums import BroadcastAudience

from ._common import AdminUser

router = APIRouter(prefix="/broadcasts", tags=["Admin - Broadcasts"])


def _broadcast_to_dict(b: Any) -> dict[str, Any]:
    return {
        "task_id": str(b.task_id),
        "status": b.status.value if hasattr(b.status, "value") else str(b.status),
        "audience": b.audience.value if hasattr(b.audience, "value") else str(b.audience),
        "total_count": b.total_count,
        "success_count": b.success_count,
        "failed_count": b.failed_count,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("")
@inject
async def list_broadcasts(
    _admin: AdminUser,
    broadcast_dao: FromDishka[BroadcastDao],
) -> dict[str, Any]:
    broadcasts = await broadcast_dao.get_all()
    return {"items": [_broadcast_to_dict(b) for b in broadcasts], "total": len(broadcasts)}


@router.get("/{task_id}")
@inject
async def get_broadcast(
    task_id: str,
    _admin: AdminUser,
    broadcast_dao: FromDishka[BroadcastDao],
) -> dict[str, Any]:
    from uuid import UUID
    try:
        uid = UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid task_id")

    b = await broadcast_dao.get_by_task_id(uid)
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast not found")
    return _broadcast_to_dict(b)
