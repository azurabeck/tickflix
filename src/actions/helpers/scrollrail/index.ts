import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";

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

// Estado de uma fileira rolável: setas, arrastar com o mouse e se dá para rolar para cada lado.
// usado em: MediaRailSection
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

  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

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

      if ((e.target as HTMLElement).closest(".media-card__panel, input")) return;
      drag.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },

    onClickCapture: (e: ReactMouseEvent<HTMLDivElement>) => {
      if (drag.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        drag.current.moved = false;
      }
    },

    onDragStart: (e: ReactMouseEvent<HTMLDivElement>) => e.preventDefault(),
  };

  return { trackRef, canScrollLeft, canScrollRight, dragging, trackHandlers, update, scrollByStep };
};
