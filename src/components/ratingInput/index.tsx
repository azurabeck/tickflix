// src/components/ratingInput/index.tsx
// "Sua nota: 8,5" do card de filme (Figma da Rebecca): uma pílula com a
// ÁREA INTEIRA arredondada numa cor (lilás) e, dentro, a área do valor
// arredondada noutra (roxo). Clicar no valor vira um campo de texto ali
// mesmo — Enter/sair do campo salva, Esc cancela, vazio apaga a nota.
// Aceita de 1 a 10 em passos de meio ponto, com vírgula ou ponto.
//
// Só faz sentido pra título já visto (a nota mora no mesmo doc do "já vi",
// ver service/WatchedSettings.ts) — fora disso `disabled` e a dica
// explica por quê.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_RATING, MIN_RATING, RATING_STEP } from "@/service/WatchedSettings";
import "./styles.scss";

// "8,5" em português, "8.5" em inglês — mesmo idioma do resto da UI.
export const formatRating = (rating: number, language: string): string =>
  rating.toLocaleString(language, { minimumFractionDigits: rating % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 });

// `null` = campo vazio (apagar a nota); "invalid" = fora de 1–10 ou não numérico.
const parseRating = (text: string): number | null | "invalid" => {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < MIN_RATING || value > MAX_RATING) return "invalid";
  return Math.round(value / RATING_STEP) * RATING_STEP;
};

interface RatingInputProps {
  rating: number | null;
  onChange: (rating: number | null) => void;
  disabled?: boolean;
  // Por que está desabilitado (vira a dica) — ex.: "marque como assistido".
  disabledHint?: string;
}

const RatingInput = ({ rating, onChange, disabled, disabledHint }: RatingInputProps) => {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEditing = () => {
    if (disabled) return;
    setDraft(rating !== null ? formatRating(rating, i18n.language) : "");
    setInvalid(false);
    setEditing(true);
  };

  const commit = (): boolean => {
    const parsed = parseRating(draft);
    if (parsed === "invalid") {
      setInvalid(true);
      return false;
    }
    setEditing(false);
    if (parsed !== rating) onChange(parsed);
    return true;
  };

  return (
    <div
      className={["rating-input", disabled && "rating-input--disabled", invalid && "rating-input--invalid"].filter(Boolean).join(" ")}
      data-tooltip={disabled ? disabledHint ?? t("rating.needWatched") : invalid ? t("rating.invalid") : t("rating.edit")}
      data-tooltip-align="start"
    >
      <span className="rating-input__label">{t("rating.label")}</span>
      {editing ? (
        <input
          ref={inputRef}
          className="rating-input__field"
          inputMode="decimal"
          value={draft}
          maxLength={4}
          aria-label={t("rating.label")}
          aria-invalid={invalid}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          // Sair do campo salva; se estiver inválido, descarta em vez de
          // prender o usuário num campo com erro.
          onBlur={() => {
            if (!commit()) setEditing(false);
          }}
        />
      ) : (
        <button type="button" className="rating-input__value" onClick={startEditing} disabled={disabled} aria-label={t("rating.edit")}>
          {rating !== null ? formatRating(rating, i18n.language) : "—"}
        </button>
      )}
    </div>
  );
};

export default RatingInput;
