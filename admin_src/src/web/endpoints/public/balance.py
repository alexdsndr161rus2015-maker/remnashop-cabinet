from typing import Any

from dishka import FromDishka
from dishka.integrations.fastapi import inject
from fastapi import APIRouter, Query

from src.application.common.dao import TransactionDao
from src.application.dto import UserDto
from src.core.enums import TransactionStatus
from src.web.endpoints.public._common import CurrentUser

router = APIRouter(prefix="/balance", tags=["Public - Balance"])


def _fmt(value: Any) -> str:
    try:
        from decimal import Decimal
        d = Decimal(str(value))
        if d == d.to_integral():
            return str(int(d))
        return format(d.normalize(), "f")
    except Exception:
        return str(value)


@router.get("")
@inject
async def get_balance(
    user: CurrentUser,
    transaction_dao: FromDishka[TransactionDao],
) -> dict[str, Any]:
    transactions = await transaction_dao.get_by_user(user.id)
    completed = [t for t in transactions if t.status == TransactionStatus.COMPLETED]

    total_spent = sum(
        float(t.pricing.final_amount)
        for t in completed
        if not t.pricing.is_free
    )

    return {
        "points": user.points,
        "total_spent": total_spent,
        "total_purchases": len(completed),
    }


@router.get("/transactions")
@inject
async def get_transactions(
    user: CurrentUser,
    transaction_dao: FromDishka[TransactionDao],
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    transactions = await transaction_dao.get_by_user(user.id)

    total = len(transactions)
    page = transactions[offset: offset + limit]

    items = []
    for t in page:
        items.append({
            "payment_id": str(t.payment_id),
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "gateway_type": t.gateway_type.value if hasattr(t.gateway_type, "value") else str(t.gateway_type),
            "gateway_display_name": t.gateway_display_name,
            "purchase_type": t.purchase_type.value if hasattr(t.purchase_type, "value") else str(t.purchase_type),
            "plan_name": t.plan_snapshot.name if t.plan_snapshot else None,
            "original_amount": _fmt(t.pricing.original_amount),
            "discount_percent": t.pricing.discount_percent,
            "final_amount": _fmt(t.pricing.final_amount),
            "currency": t.currency.value if hasattr(t.currency, "value") else str(t.currency),
            "is_free": t.pricing.is_free,
            "is_test": t.is_test,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
    }
