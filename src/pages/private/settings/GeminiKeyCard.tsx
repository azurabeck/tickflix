// src/pages/private/settings/GeminiKeyCard.tsx
// Pedido explícito da Rebecca, depois de ver a tela de Configurações do
// projeto "mailbook" (livro-app): "configurações deve ser igual.. ou
// seja deve ensinar como pegar a api key do gemini, e deixar o usuário
// habilitar a propria apikey para utilizar no site". Estrutura e cópia
// (passo a passo, mensagens) seguem o mailbook de perto — mesmo pedido
// de "deixar igualzinho" já feito pro UserMenu.
//
// Por que isso importa: o Gemini é quem resolve o painel "Criar uma
// nova timeline" (service/IASettings.ts, `geminiGenerateJSON`) — hoje
// todo mundo usa a MESMA chave da plataforma (`VITE_GEMINI_API_KEY`).
// Com a própria chave, o uso conta na conta Google de quem configurou,
// não na da plataforma — a chave do usuário sempre ganha da chave da
// plataforma quando as duas existem (ver `geminiGenerateJSON`).
import { useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { getUserGeminiKey, setUserGeminiKey, validateGeminiKey } from "@/service/IASettings";
import Button from "@/components/button";

const GeminiKeyCard = () => {
  const { t } = useTranslation();
  // Chave que está valendo hoje ("" = a da plataforma).
  const [savedKey, setSavedKey] = useState(getUserGeminiKey);
  const [key, setKey] = useState(savedKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;

    setSaving(true);
    setFeedback(null);
    try {
      // Só salva se o Google aceitar a chave de verdade.
      await validateGeminiKey(trimmed);
      setUserGeminiKey(trimmed);
      setSavedKey(trimmed);
      setKey(trimmed);
      setFeedback({ text: t("settings.gemini.savedFeedback") });
    } catch (err) {
      const reason = err instanceof Error ? ` ${err.message}` : "";
      setFeedback({ text: `${t("settings.gemini.invalidFeedback")}${reason}`, error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    setUserGeminiKey("");
    setSavedKey("");
    setKey("");
    setFeedback({ text: t("settings.gemini.removedFeedback") });
  };

  return (
    <section className="settings-page__card">
      <h2 className="settings-page__card-title">{t("settings.gemini.title")}</h2>
      <p className="settings-page__card-description">{t("settings.gemini.description")}</p>

      <h3 className="settings-page__card-subtitle">{t("settings.gemini.howToTitle")}</h3>
      <ol className="settings-page__steps">
        <li>
          <Trans i18nKey="settings.gemini.step1" components={{ 1: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" /> }} />
        </li>
        <li>
          <Trans i18nKey="settings.gemini.step2" components={{ 1: <strong /> }} />
        </li>
        <li>{t("settings.gemini.step3")}</li>
        <li>
          <Trans i18nKey="settings.gemini.step4" components={{ 1: <strong /> }} />
        </li>
      </ol>

      <div className="settings-page__status">
        <KeyRound size={18} />
        <span>{savedKey ? t("settings.gemini.usingUserKey") : t("settings.gemini.usingPlatformKey")}</span>
      </div>

      <form className="settings-page__key-form" onSubmit={handleSubmit}>
        <label className="settings-page__field">
          <span className="settings-page__label">{t("settings.gemini.keyLabel")}</span>
          <div className="settings-page__key-input-wrap">
            <input
              type={showKey ? "text" : "password"}
              className="settings-page__input"
              placeholder={t("settings.gemini.keyPlaceholder")}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={saving}
            />
            <button
              type="button"
              className="settings-page__key-toggle"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? t("settings.gemini.hideKey") : t("settings.gemini.showKey")}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <div className="settings-page__key-actions">
          <Button type="submit" disabled={saving || !key.trim() || key.trim() === savedKey} loading={saving}>
            {t("settings.gemini.saveKey")}
          </Button>
          {savedKey && (
            <Button type="button" variant="ghost" onClick={handleRemove} disabled={saving}>
              {t("settings.gemini.removeKey")}
            </Button>
          )}
        </div>

        {feedback && <p className={feedback.error ? "settings-page__error" : "settings-page__success"}>{feedback.text}</p>}
      </form>

      <p className="settings-page__footnote">{t("settings.gemini.footnote")}</p>
    </section>
  );
};

export default GeminiKeyCard;
