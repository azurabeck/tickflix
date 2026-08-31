// src/pages/private/series/ScrollableRow.tsx
// Mecânica de scroll (chevron dos dois lados, "página" por clique,
// centraliza quando cabe tudo) extraída de SeriesRow.tsx pra reuso —
// pedido explícito da Rebecca: "na parte minhas séries vamos fazer que
// nem nos outros blocos, cards menores, com arrows para rotacionar os
// cards" — mesmo comportamento das fileiras de streaming, só que pra
// grade "Minhas séries" (cards com botão de apagar/progresso, markup
// diferente dos itens de SeriesRow). Fica com o CONTEÚDO — cada card é
// responsabilidade de quem chama, esse componente só sabe rolar.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScrollableRowProps {
  children: ReactNode;
  // Recalcula o estado de scroll (overflow, pode rolar pra onde) quando
  // isso muda — geralmente o array de itens renderizados como children,
  // já que o próprio `children` (elemento React) não é uma dependência
  // estável pro useEffect.
  itemsKey: unknown;
}

// Quanto da largura visível anda por clique na seta — menos que 100% pra
// sempre sobrar um pedaço do item anterior visível.
const SCROLL_STEP_RATIO = 0.85;

const ScrollableRow = ({ children, itemsKey }: ScrollableRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    setHasOverflow(el.scrollWidth > el.clientWidth + 4);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    updateScrollState();
  }, [itemsKey]);

  useEffect(() => {
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, []);

  const scrollByStep = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP_RATIO, behavior: "smooth" });
  };

  return (
    <div className="series-page__row-content">
      <button
        type="button"
        className="series-page__row-chevron series-page__row-chevron--left"
        onClick={() => scrollByStep(-1)}
        disabled={!canScrollLeft}
        aria-label="Ver anteriores"
      >
        <ChevronLeft size={22} />
      </button>

      <div
        className={hasOverflow ? "series-page__row-posters" : "series-page__row-posters series-page__row-posters--centered"}
        ref={scrollRef}
        onScroll={updateScrollState}
      >
        {children}
      </div>

      <button
        type="button"
        className="series-page__row-chevron series-page__row-chevron--right"
        onClick={() => scrollByStep(1)}
        disabled={!canScrollRight}
        aria-label="Ver próximos"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
};

export default ScrollableRow;
