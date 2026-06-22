from typing import Any, Optional

from dishka import FromDishka
from dishka.integrations.fastapi import inject
from fastapi import APIRouter

from src.application.common.dao import SubscriptionDao, TransactionDao, UserDao
from src.application.dto.statistics import GatewayStatsDto, SubscriptionStatsDto

from ._common import AdminUser

router = APIRouter(prefix="/statistics", tags=["Admin - Statistics"])


def _gateway_stats_to_dict(g: GatewayStatsDto) -> dict[str, Any]:
    return {
        "gateway_type": g.gateway_type,
        "total_income": float(g.total_income),
        "daily_income": float(g.daily_income),
        "weekly_income": float(g.weekly_income),
        "monthly_income": float(g.monthly_income),
        "last_month_income": float(g.last_month_income),
        "paid_count": g.paid_count,
        "total_transactions": g.total_transactions,
        "completed_transactions": g.completed_transactions,
        "free_transactions": g.free_transactions,
        "total_discounts": float(g.total_discounts),
    }


@router.get("/overview")
@inject
async def get_overview(
    _admin: AdminUser,
    user_dao: FromDishka[UserDao],
    transaction_dao: FromDishka[TransactionDao],
    subscription_dao: FromDishka[SubscriptionDao],
) -> dict[str, Any]:
    total_users = await user_dao.count()
    active_users = await user_dao.count_active_non_blocked()
    blocked_users = await user_dao.count_blocked()
    new_users_today = await user_dao.count_new(days=1)
    new_users_week = await user_dao.count_new(days=7)
    new_users_month = await user_dao.count_new(days=30)
    users_with_subscription = await user_dao.count_with_active_subscription()
    users_with_expired = await user_dao.count_with_expired_subscription()
    users_without_subscription = await user_dao.count_without_subscription()
    users_with_trial = await user_dao.count_with_trial_subscription()

    total_transactions = await transaction_dao.count_total()
    completed_transactions = await transaction_dao.count_completed()
    paying_users = await transaction_dao.count_paying_users()
    gateway_stats = await transaction_dao.get_gateway_stats()

    sub_stats = await subscription_dao.get_stats()

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "blocked": blocked_users,
            "new_today": new_users_today,
            "new_week": new_users_week,
            "new_month": new_users_month,
            "with_active_subscription": users_with_subscription,
            "with_expired_subscription": users_with_expired,
            "without_subscription": users_without_subscription,
            "with_trial": users_with_trial,
            "paying": paying_users,
        },
        "transactions": {
            "total": total_transactions,
            "completed": completed_transactions,
            "gateways": [_gateway_stats_to_dict(g) for g in gateway_stats],
        },
        "subscriptions": {
            "total": sub_stats.total,
            "active": sub_stats.total_active,
            "expired": sub_stats.total_expired,
            "disabled": sub_stats.total_disabled,
            "limited": sub_stats.total_limited,
            "trial": sub_stats.active_trial,
            "expiring_soon": sub_stats.expiring_soon,
            "unlimited": sub_stats.total_unlimited,
        },
    }


@router.get("/transactions")
@inject
async def get_transaction_stats(
    _admin: AdminUser,
    transaction_dao: FromDishka[TransactionDao],
) -> dict[str, Any]:
    gateway_stats = await transaction_dao.get_gateway_stats()
    plan_income = await transaction_dao.get_plan_income()
    total = await transaction_dao.count_total()
    completed = await transaction_dao.count_completed()
    free = await transaction_dao.count_free()

    return {
        "total": total,
        "completed": completed,
        "free": free,
        "paid": completed - free,
        "gateways": [_gateway_stats_to_dict(g) for g in gateway_stats],
        "plan_income": [
            {
                "plan_id": p.plan_id,
                "currency": p.currency,
                "total_income": float(p.total_income),
            }
            for p in plan_income
        ],
    }
