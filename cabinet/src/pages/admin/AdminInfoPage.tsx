import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { infoAdminApi, type InfoContent } from "@/api/info";
import { ApiError } from "@/types/api";

const SECTIONS = [
  { id: "faq", label: "FAQ" },
  { id: "rules", label: "Правила" },
  { id: "privacy", label: "Конфиденциальность" },
  { id: "offer", label: "Оферта" },
  { id: "statuses", label: "Статусы" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type TextSection = Exclude<SectionId, "faq">;

const textInput =
  "w-full rounded-lg border border-[var(--border)] bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent";

export default function AdminInfoPage() {
  const [content, setContent] = useState<InfoContent | null>(null);
  const [active, setActive] = useState<SectionId>("faq");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    infoAdminApi
      .get()
      .then(setContent)
      .catch((e) => setMsg({ type: "error", text: e instanceof ApiError ? e.detail : "Ошибка" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!content) return;
    setSaving(true);
    setMsg(null);
    try {
      const saved = await infoAdminApi.update(content);
      setContent(saved);
      setMsg({ type: "success", text: "Сохранено" });
    } catch (e) {
      setMsg({ type: "error", text: e instanceof ApiError ? e.detail : "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  };

  const setText = (key: TextSection, value: string) =>
    setContent((c) => (c ? { ...c, [key]: value } : c));

  const setFaq = (i: number, field: "q" | "a", value: string) =>
    setContent((c) =>
      c ? { ...c, faq: c.faq.map((it, j) => (j === i ? { ...it, [field]: value } : it)) } : c,
    );

  const addFaq = () =>
    setContent((c) => (c ? { ...c, faq: [...c.faq, { q: "", a: "" }] } : c));

  const removeFaq = (i: number) =>
    setContent((c) => (c ? { ...c, faq: c.faq.filter((_, j) => j !== i) } : c));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Информация</h1>
        <Button onClick={save} isLoading={saving} disabled={!content}>
          <Save className="mr-1.5 h-4 w-4" />
          Сохранить
        </Button>
      </div>
      <p className="text-sm text-fg-muted">
        Контент страницы «Информация» в кабинете. Тексты — в формате markdown:{" "}
        <code>## Заголовок</code>, <code>- пункт списка</code>, <code>**жирный**</code>, пустая
        строка — новый абзац. Вкладка «Серверы» формируется автоматически из Remnawave.
      </p>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Section tabs */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`flex-shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              active === s.id
                ? "border-accent bg-accent text-accent-fg"
                : "border-[var(--border)] bg-bg-subtle text-fg-muted hover:bg-bg-raised hover:text-fg"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {content && active === "faq" && (
        <div className="space-y-3">
          {content.faq.map((item, i) => (
            <Card key={i} variant="bordered">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-subtle">Вопрос {i + 1}</span>
                  <button
                    onClick={() => removeFaq(i)}
                    className="flex items-center gap-1 rounded-lg border border-danger/20 bg-danger/8 px-2 py-1 text-xs text-danger hover:bg-danger/15"
                  >
                    <Trash2 className="h-3 w-3" />
                    Удалить
                  </button>
                </div>
                <input
                  className={textInput}
                  placeholder="Вопрос"
                  value={item.q}
                  onChange={(e) => setFaq(i, "q", e.target.value)}
                />
                <textarea
                  className={`${textInput} min-h-[80px] resize-y`}
                  placeholder="Ответ"
                  value={item.a}
                  onChange={(e) => setFaq(i, "a", e.target.value)}
                />
              </div>
            </Card>
          ))}
          <Button variant="secondary" onClick={addFaq}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить вопрос
          </Button>
        </div>
      )}

      {content && active !== "faq" && (
        <Card variant="bordered">
          <CardHeader title={SECTIONS.find((s) => s.id === active)?.label ?? ""} />
          <textarea
            className={`${textInput} min-h-[420px] resize-y font-mono leading-relaxed`}
            value={content[active as TextSection]}
            onChange={(e) => setText(active as TextSection, e.target.value)}
          />
        </Card>
      )}
    </div>
  );
}
