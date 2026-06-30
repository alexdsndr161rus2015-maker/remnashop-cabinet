"""Конфиг состава и ПОРЯДКА кнопок главного меню (редактируется из админки).

Хранится в assets/menu.json (том переживает пересоздание контейнера). Читается
геттером меню НА КАЖДЫЙ рендер, поэтому изменения из админки применяются сразу,
без перезапуска бота.

Приоритет значений: значения из menu.json → переменные окружения BOT_MENU_*
(обратная совместимость) → дефолты ниже. Порядок (`order`) — только в menu.json;
если его нет, берётся DEFAULT_ORDER.
"""

import json
import os
from pathlib import Path
from typing import Any

ASSETS_DIR = Path(os.environ.get("APP_ASSETS_DIR", "/opt/remnashop/assets"))
MENU_PATH = ASSETS_DIR / "menu.json"

# Ключи = идентификаторы кнопок. Дефолт: кабинет (Mini App) + кабинет (браузер)
# + сабка Remnawave. Кнопки «Подключиться» (→ /devices) по умолчанию выключены.
MENU_DEFAULTS: dict[str, bool] = {
    "cabinet_miniapp": True,
    "cabinet_url": True,
    "connect_miniapp": False,
    "connect_url": False,
    "remna_sub": True,
}

# Порядок кнопок в меню по умолчанию (как было зашито в dialog.py).
DEFAULT_ORDER: list[str] = [
    "cabinet_miniapp",
    "cabinet_url",
    "connect_miniapp",
    "connect_url",
    "remna_sub",
]


def _normalize_order(order: Any) -> list[str]:
    """Только известные ключи, без дублей; недостающие добиваем в дефолтном порядке."""
    result: list[str] = []
    if isinstance(order, list):
        for k in order:
            if k in MENU_DEFAULTS and k not in result:
                result.append(k)
    for k in DEFAULT_ORDER:
        if k not in result:
            result.append(k)
    return result


def _env_bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None or not v.strip():
        return default
    return v.strip().lower() in ("1", "true", "yes", "on", "да")


def load_menu_config() -> dict[str, Any]:
    """Текущий состав+порядок кнопок: defaults → env (BOT_MENU_*) → menu.json."""
    data: dict[str, Any] = {
        k: _env_bool("BOT_MENU_" + k.upper(), v) for k, v in MENU_DEFAULTS.items()
    }
    order: Any = DEFAULT_ORDER
    try:
        if MENU_PATH.exists():
            with MENU_PATH.open(encoding="utf-8") as fh:
                stored = json.load(fh)
            if isinstance(stored, dict):
                for k in MENU_DEFAULTS:
                    if k in stored:
                        data[k] = bool(stored[k])
                if "order" in stored:
                    order = stored["order"]
    except Exception:
        # Битый файл не должен ронять меню — отдаём defaults/env.
        pass
    data["order"] = _normalize_order(order)
    return data


def save_menu_config(values: dict[str, Any]) -> dict[str, Any]:
    data = load_menu_config()
    for k in MENU_DEFAULTS:
        if values.get(k) is not None:
            data[k] = bool(values[k])
    if values.get("order") is not None:
        data["order"] = _normalize_order(values["order"])
    MENU_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MENU_PATH.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    return data
