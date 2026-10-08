import { useLayoutEffect, useState, type RefObject } from "react";

const EDGE_MARGIN = 8;

// Desloca um menu aberto na horizontal o quanto precisar pra caber na tela
// (medido antes de pintar, por isso useLayoutEffect).
// usado em: AddToTimelineButton
export const useMenuViewportOffset = (menuRef: RefObject<HTMLElement>, open: boolean): number => {
  const [offsetX, setOffsetX] = useState(0);

  useLayoutEffect(() => {
    if (!open) {
      setOffsetX(0);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;

    let offset = 0;
    if (rect.right > window.innerWidth - EDGE_MARGIN) offset = window.innerWidth - EDGE_MARGIN - rect.right;
    else if (rect.left < EDGE_MARGIN) offset = EDGE_MARGIN - rect.left;
    if (offset !== 0) setOffsetX(offset);
  }, [open, menuRef]);

  return offsetX;
};
