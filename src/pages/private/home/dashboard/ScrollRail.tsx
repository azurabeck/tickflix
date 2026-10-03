// src/pages/private/home/dashboard/ScrollRail.tsx
// Fileira horizontal com rolagem suave. Os controles `◀ [ver todos] ▶`
// (Figma da Rebecca) ficam no TOPO da seção, na linha do título e à
// direita (HomeSection `actions`) — por isso a lógica de rolagem mora num
// hook (`useScrollRail`) que a seção usa pra ligar as duas pontas: a
// fileira (`ScrollRail`, o track) e os controles (`RailControls`).
//
// Mesma mecânica de setas do antigo MovieRow: uma "página" de cards por
// clique (85% da largura visível, sobra um pedaço do anterior como pista
// visual), seta desabilitada quando não tem mais pra aquele lado.
//
// Clicar e ARRASTAR com o mouse também rola a fileira (pedido da Rebecca).
// Só mouse — no toque o navegador já rola sozinho. Um arrasto de verdade
// (passou de DRAG_THRESHOLD_PX) não pode virar clique no card em que o
// mouse foi solto, então o clique seguinte é engolido.
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { PlayIcon } from "@heroicons/react/24/solid";

const SCROLL_STEP_RATIO = 0.85;
const DRAG_THRESHOLD_PX = 5;

export interface RailState {
  trackRef: RefObject<HTMLDivElement>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  dragging: boolean;
  trackHandlers: {
    onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
    onClickCapture: (e: ReactMouseEvent<HTMLDivElement>) => void;
    onDragStart: (e: ReactMouseEvent<HTMLDivElement>) => void;
  };
  update: () => void;
  scrollByStep: (direction: 1 | -1) => void;
}

// `itemsKey`: qualquer valor que mude quando os cards mudam — recalcula
// quais setas estão habilitadas (imagem carregada muda o scrollWidth).
export const useScrollRail = (itemsKey: unknown): RailState => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
  }, [itemsKey]);

  useEffect(() => {
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scrollByStep = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP_RATIO, behavior: "smooth" });
  };

  // --- Arrastar com o mouse -------------------------------------------------
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

  // Listeners na janela (não no track): o mouse sai da fileira durante o
  // arrasto e a rolagem tem que continuar até soltar.
  const handleMouseMove = (e: MouseEvent) => {
    const el = trackRef.current;
    if (!drag.current.active || !el) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    drag.current.moved = true;
    setDragging(true);
    el.scrollLeft = drag.current.startScroll - dx;
  };

  const handleMouseUp = () => {
    drag.current.active = false;
    setDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    // `moved` fica verdadeiro até o clique que vem logo depois do mouseup
    // ser engolido (onClickCapture); se não vier clique nenhum (soltou fora
    // de um elemento), zera no próximo ciclo.
    window.setTimeout(() => {
      drag.current.moved = false;
    }, 0);
  };

  useEffect(
    () => () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const trackHandlers = {
    onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = trackRef.current;
      if (e.button !== 0 || !el) return;
      // Controles do painel do card (ícones, campo de nota) não iniciam
      // arrasto — senão não dá pra clicar/digitar neles.
      if ((e.target as HTMLElement).closest(".media-card__panel, input")) return;
      drag.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    // Fase de captura: roda antes do onClick do card, que não deve abrir
    // nada quando o mouse só foi arrastado.
    onClickCapture: (e: ReactMouseEvent<HTMLDivElement>) => {
      if (drag.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        drag.current.moved = false;
      }
    },
    // Sem isso o navegador começa a arrastar a IMAGEM (fantasma) em vez de
    // rolar a fileira.
    onDragStart: (e: ReactMouseEvent<HTMLDivElement>) => e.preventDefault(),
  };

  return { trackRef, canScrollLeft, canScrollRight, dragging, trackHandlers, update, scrollByStep };
};

export const ScrollRail = ({ rail, children }: { rail: RailState; children: ReactNode }) => (
  <div className="scroll-rail">
    <div
      className={rail.dragging ? "scroll-rail__track scroll-rail__track--dragging" : "scroll-rail__track"}
      ref={rail.trackRef}
      onScroll={rail.update}
      {...rail.trackHandlers}
    >
      {children}
    </div>
  </div>
);

interface RailControlsProps {
  rail: RailState;
  seeAllLabel?: string;
  onSeeAll?: () => void;
}

// `◀ [ver todos] ▶` — botão ENTRE as setas (triângulos cheios do heroicons;
// a "anterior" é o mesmo ícone girado).
export const RailControls = ({ rail, seeAllLabel, onSeeAll }: RailControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="rail-controls">
      <button type="button" className="rail-controls__arrow rail-controls__arrow--prev" onClick={() => rail.scrollByStep(-1)} disabled={!rail.canScrollLeft} aria-label={t("dashboard.prevItems")}>
        <PlayIcon />
      </button>
      {onSeeAll && (
        <button type="button" className="rail-controls__see-all" onClick={onSeeAll}>
          {seeAllLabel ?? t("dashboard.seeAllShort")}
        </button>
      )}
      <button type="button" className="rail-controls__arrow" onClick={() => rail.scrollByStep(1)} disabled={!rail.canScrollRight} aria-label={t("dashboard.nextItems")}>
        <PlayIcon />
      </button>
    </div>
  );
};
