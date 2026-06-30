"""Настройки отправки почты, редактируемые в рантайме (из админки).

Хранятся в assets/email.json (том переживает пересоздание контейнера) и читаются
ПРИ КАЖДОЙ отправке — поэтому смена в админке применяется сразу, без рестарта.

Если файла нет или поле пустое — берётся значение из .env (`EMAIL_*`,
`EMAIL_BREVO_API_KEY`). Так старые установки продолжают работать как раньше.

Провайдер задаётся пресетом (gmail/yandex/mailru) — host/port/TLS подставляются
автоматически; «custom» — host/port/TLS заполняются вручную; «brevo» — отправка
через HTTP API Brevo (нужен только api-ключ и адрес отправителя).
"""

import json
import os
from pathlib import Path
from typing import Any

from src.core.config import AppConfig

ASSETS_DIR = Path(os.environ.get("APP_ASSETS_DIR", "/opt/remnashop/assets"))
EMAIL_SETTINGS_PATH = ASSETS_DIR / "email.json"

# Пресеты SMTP популярных провайдеров: host/port/TLS известны заранее.
# Пароль — это пароль приложения (app password), а не основной пароль аккаунта.
PRESETS: dict[str, dict[str, Any]] = {
    "gmail":  {"host": "smtp.gmail.com", "port": 587, "use_tls": True,  "use_ssl": False},
    "yandex": {"host": "smtp.yandex.ru", "port": 465, "use_tls": False, "use_ssl": True},
    "mailru": {"host": "smtp.mail.ru",   "port": 465, "use_tls": False, "use_ssl": True},
}

# Поля, которые админка может сохранять.
FIELDS = (
    "provider", "host", "port", "use_tls", "use_ssl",
    "username", "password", "from_email", "from_name", "brevo_api_key",
)


def _load_json() -> dict[str, Any]:
    try:
        if EMAIL_SETTINGS_PATH.exists():
            with EMAIL_SETTINGS_PATH.open(encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return {}


def load_email_settings(config: AppConfig) -> dict[str, Any]:
    """Эффективные настройки: .env как дефолт, поверх — сохранённое из admin."""
    email = config.email
    eff: dict[str, Any] = {
        "enabled": bool(email.enabled),
        "provider": "custom",
        "host": (email.host or ""),
        "port": int(email.port or 587),
        "use_tls": bool(email.use_tls),
        "use_ssl": bool(email.use_ssl),
        "username": email.username.get_secret_value() or "",
        "password": email.password.get_secret_value() or "",
        "from_email": (email.from_email or "").strip(),
        "from_name": (email.from_name or "").strip(),
        "brevo_api_key": (os.environ.get("EMAIL_BREVO_API_KEY") or "").strip(),
    }

    # Дефолт провайдера из .env: задан Brevo-ключ → "brevo", иначе "custom".
    # (Сохранённый в админке provider ниже это переопределит.)
    if eff["brevo_api_key"]:
        eff["provider"] = "brevo"

    stored = _load_json()
    for key in FIELDS:
        if key in stored and stored[key] is not None and stored[key] != "":
            eff[key] = stored[key]
    if "enabled" in stored and isinstance(stored["enabled"], bool):
        eff["enabled"] = stored["enabled"]

    # Пресет провайдера принудительно задаёт host/port/TLS (админ их не вводит).
    preset = PRESETS.get(str(eff.get("provider") or "").lower())
    if preset:
        eff.update(preset)

    eff["port"] = int(eff["port"])
    return eff


def save_email_settings(values: dict[str, Any]) -> dict[str, Any]:
    """Сохраняет присланные поля поверх уже сохранённых (None — не трогаем)."""
    data = _load_json()
    for key in FIELDS:
        if key in values and values[key] is not None:
            data[key] = values[key]
    if "enabled" in values and values["enabled"] is not None:
        data["enabled"] = bool(values["enabled"])
    EMAIL_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with EMAIL_SETTINGS_PATH.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    return data
