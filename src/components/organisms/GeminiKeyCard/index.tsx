import { Trans, useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import Button from "@/components/atoms/Button";
import Card from "@/components/atoms/Card";
import StatusMessage from "@/components/atoms/StatusMessage";
import { useGeminiKey } from "@/actions/settings/geminikey";
import "./style.scss";

// Cartão de Configurações onde o usuário cola a própria chave do Gemini (sem ela, usa a da plataforma).
const GeminiKeyCard = () => {
  const { t } = useTranslation();
  const gemini = useGeminiKey();
  const { savedKey, key, saving, feedback } = gemini;

  return (
    <Card className="gemini-key-card">
      <h2 className="gemini-key-card__title">{t("settings.gemini.title")}</h2>
      <p className="gemini-key-card__description">{t("settings.gemini.description")}</p>

      <h3 className="gemini-key-card__subtitle">{t("settings.gemini.howToTitle")}</h3>
      <ol className="gemini-key-card__steps">
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

      <div className="gemini-key-card__status">
        <KeyRound size={18} />
        <span>{savedKey ? t("settings.gemini.usingUserKey") : t("settings.gemini.usingPlatformKey")}</span>
      </div>

      <form className="gemini-key-card__form" onSubmit={gemini.submit}>
        <label className="gemini-key-card__field">
          <span className="gemini-key-card__label">{t("settings.gemini.keyLabel")}</span>
          <div className="gemini-key-card__key-input-wrap">
            <input
              type={gemini.showKey ? "text" : "password"}
              className="gemini-key-card__input"
              placeholder={t("settings.gemini.keyPlaceholder")}
              value={key}
              onChange={(e) => gemini.setKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={saving}
            />
            <button
              type="button"
              className="gemini-key-card__key-toggle"
              onClick={gemini.toggleShowKey}
              aria-label={gemini.showKey ? t("settings.gemini.hideKey") : t("settings.gemini.showKey")}
            >
              {gemini.showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <div className="gemini-key-card__actions">
          <Button type="submit" disabled={saving || !key.trim() || key.trim() === savedKey} loading={saving}>
            {t("settings.gemini.saveKey")}
          </Button>
          {savedKey && (
            <Button type="button" variant="ghost" onClick={gemini.remove} disabled={saving}>
              {t("settings.gemini.removeKey")}
            </Button>
          )}
        </div>

        {feedback && (
          <StatusMessage variant={feedback.error ? "error" : "success"} compact>
            {feedback.text}
          </StatusMessage>
        )}
      </form>

      <p className="gemini-key-card__footnote">{t("settings.gemini.footnote")}</p>
    </Card>
  );
};

export default GeminiKeyCard;
