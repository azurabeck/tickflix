import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_RATING, MIN_RATING, RATING_STEP } from "@/actions/helpers/watched";
import "./style.scss";

const formatRating = (rating: number, language: string): string =>
  rating.toLocaleString(language, { minimumFractionDigits: rating % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 });

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
