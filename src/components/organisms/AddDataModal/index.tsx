import { useState } from "react";
import { Check, Clipboard, FileJson } from "lucide-react";
import AwardButton from "@/components/atoms/AwardButton";
import Modal from "@/components/atoms/Modal";
import Spinner from "@/components/atoms/Spinner";
import StatusMessage from "@/components/atoms/StatusMessage";
import { buildExampleJson, buildResearchPrompt, saveEditionFromJson } from "@/actions/awards/adddata";
import type { AwardCategory, AwardConfig, AwardEdition } from "@/actions/awards/editions";
import "./style.scss";

interface AddDataModalProps {
  config: AwardConfig;
  edition: AwardEdition;
  onClose: () => void;
  onSaved: (headline: string, categories: AwardCategory[]) => void;
}

// Cola o JSON gerado por uma IA (prompt de pesquisa incluso) e grava os indicados da edição no Firestore.
const AddDataModal = ({ config, edition, onClose, onSaved }: AddDataModalProps) => {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildResearchPrompt(config, edition));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Erro ao copiar prompt:", err);
      setError("Não consegui copiar — copia manualmente pelo console, ou tenta de novo.");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const { headline, categories } = await saveEditionFromJson(config, edition, jsonText);
      onSaved(headline, categories);
    } catch (err) {
      console.error("Erro ao gravar dados da edição no Firestore:", err);
      setError(err instanceof Error ? err.message : "Não foi possível gravar agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} size="md" className="add-data-modal">
      <h2 className="add-data-modal__title">
        Adicionar dados{" "}
        <span>
          · {edition.ordinal}ª {config.editionNoun}, {edition.ceremonyYear}
        </span>
      </h2>
      <p className="add-data-modal__hint">
        Copia o prompt de pesquisa abaixo e cola numa IA com acesso a ferramentas (ChatGPT, Claude, Gemini...) — ela pesquisa e valida cada filme no TMDb. Cola o JSON que ela responder aqui embaixo e salva.
      </p>

      <button type="button" className="add-data-modal__copy-prompt" onClick={handleCopyPrompt}>
        {copied ? <Check size={14} /> : <Clipboard size={14} />}
        {copied ? "Prompt copiado!" : "Copiar prompt de pesquisa"}
      </button>

      <textarea className="add-data-modal__textarea" placeholder={buildExampleJson(config)} value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />

      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      <div className="add-data-modal__actions">
        <button type="button" className="add-data-modal__cancel" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <AwardButton onClick={handleSave} disabled={saving || !jsonText.trim()}>
          {saving ? <Spinner size={15} /> : <FileJson size={15} />}
          Salvar no Firestore
        </AwardButton>
      </div>
    </Modal>
  );
};

export default AddDataModal;
