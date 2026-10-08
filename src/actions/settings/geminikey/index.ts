import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { getUserGeminiKey, setUserGeminiKey, validateGeminiKey } from "@/service/IASettings";

// Ciclo "chave do Gemini do usuário": digitar -> validar na API -> guardar (ou remover e voltar pra chave da plataforma).
// usado em: GeminiKeyCard
export const useGeminiKey = () => {
  const { t } = useTranslation();
  const [savedKey, setSavedKey] = useState(getUserGeminiKey);
  const [key, setKey] = useState(savedKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;

    setSaving(true);
    setFeedback(null);
    try {
      await validateGeminiKey(trimmed); // 1. o Google confirma
      setUserGeminiKey(trimmed);  // 2. grava no localStorage
      setSavedKey(trimmed); // 3. coloca a chave no state para atualizar a tela
      setKey(trimmed); // 4. arruma o campo
      setFeedback({ text: t("settings.gemini.savedFeedback") });
    } catch (err) {
      const reason = err instanceof Error ? ` ${err.message}` : "";
      setFeedback({ text: `${t("settings.gemini.invalidFeedback")}${reason}`, error: true });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    setUserGeminiKey("");
    setSavedKey("");
    setKey("");
    setFeedback({ text: t("settings.gemini.removedFeedback") });
  };

  return { savedKey, key, setKey, showKey, toggleShowKey: () => setShowKey((prev) => !prev), saving, feedback, submit, remove };
};
