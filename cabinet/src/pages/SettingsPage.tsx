import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api/auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { ApiError } from "@/types/api";
import type { TelegramAuthRequest } from "@/types/api";

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

function EmailVerificationBlock() {
  const { user, refreshMe } = useAuth();
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [codeSent, setCodeSent] = useState(false);

  // TG-пользователи без email не должны видеть этот блок — у них нет почты для верификации.
  if (!user || user.is_email_verified || user.auth_type === "TELEGRAM") return null;

  const handleSendCode = async () => {
    setIsSending(true);
    setMessage(null);
    try {
      await authApi.requestEmailVerification();
      setCodeSent(true);
      setMessage({ type: "success", text: "Код отправлен на почту" });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof ApiError ? e.detail : "Не удалось отправить код",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
    setMessage(null);
    try {
      await authApi.confirmEmailVerification({ code });
      await refreshMe();
      setMessage({ type: "success", text: "Email подтверждён!" });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof ApiError ? e.detail : "Неверный код",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card variant="bordered">
      <CardHeader
        title="Email не подтверждён"
        subtitle="Подтвердите почту, чтобы покупать и продлевать подписку"
      />
      {!codeSent ? (
        <Button size="sm" variant="secondary" onClick={handleSendCode} isLoading={isSending}>
          Отправить код подтверждения
        </Button>
      ) : (
        <form onSubmit={handleConfirm} className="flex gap-2">
          <Input
            name="code"
            placeholder="123456"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="flex-1"
          />
          <Button type="submit" size="sm" isLoading={isConfirming}>
            Подтвердить
          </Button>
        </form>
      )}
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.type === "success" ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}

function ChangePasswordBlock() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ type: "success", text: "Пароль изменён" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof ApiError ? e.detail : "Не удалось изменить пароль",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="bordered">
      <CardHeader title="Смена пароля" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          type="password"
          label="Текущий пароль"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          type="password"
          label="Новый пароль"
          autoComplete="new-password"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-success" : "text-danger"
            }`}
          >
            {message.text}
          </p>
        )}
        <Button type="submit" isLoading={isLoading} className="self-start">
          Сохранить
        </Button>
      </form>
    </Card>
  );
}

function TelegramLinkBlock() {
  const { user, refreshMe } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!user || user.telegram_id) {
    return (
      <Card variant="bordered">
        <CardHeader title="Telegram" />
        <p className="text-sm text-fg-muted">
          {user?.telegram_id
            ? `Аккаунт привязан (ID: ${user.telegram_id})`
            : "Загрузка..."}
        </p>
      </Card>
    );
  }

  const handleLink = async (data: TelegramAuthRequest) => {
    setError(null);
    try {
      await authApi.linkTelegram(data);
      await refreshMe();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Не удалось привязать Telegram");
    }
  };

  return (
    <Card variant="bordered">
      <CardHeader title="Привязать Telegram" subtitle="Для быстрого входа и уведомлений" />
      {TELEGRAM_BOT_USERNAME && (
        <TelegramLoginButton botUsername={TELEGRAM_BOT_USERNAME} onAuth={handleLink} />
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-fg">Настройки</h1>

      <Card>
        <CardHeader title="Профиль" />
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-fg-subtle">Имя</span>
            <span className="text-fg">{user?.name}</span>
          </div>
          {user?.email && (
            <div className="flex justify-between">
              <span className="text-fg-subtle">Email</span>
              <span className="text-fg">{user.email}</span>
            </div>
          )}
          {user?.username && (
            <div className="flex justify-between">
              <span className="text-fg-subtle">Telegram</span>
              <span className="text-fg">@{user.username}</span>
            </div>
          )}
        </div>
      </Card>

      <EmailVerificationBlock />

      <Card variant="bordered">
        <CardHeader title="Тема оформления" subtitle="Выберите, как должен выглядеть кабинет" />
        <ThemeSwitcher />
      </Card>

      {user?.auth_type === "EMAIL" && <ChangePasswordBlock />}
      {user?.auth_type === "EMAIL" && <TelegramLinkBlock />}
    </div>
  );
}
