import type { ReactNode } from "react";
import type { RailState } from "@/actions/helpers/scrollrail";
import "./style.scss";

const ScrollRail = ({ rail, children }: { rail: RailState; children: ReactNode }) => (
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

export default ScrollRail;
