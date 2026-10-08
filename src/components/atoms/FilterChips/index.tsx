import type { ReactNode } from "react";
import "./style.scss";

interface FilterChip<T extends string> {
  value: T;
  label: ReactNode;
}

interface FilterChipsProps<T extends string> {
  options: FilterChip<T>[];
  active: T[];
  onToggle: (value: T) => void;
  ariaLabel?: string;
}

const FilterChips = <T extends string>({ options, active, onToggle, ariaLabel }: FilterChipsProps<T>) => (
  <div className="filter-chips" role="group" aria-label={ariaLabel}>
    {options.map((option) => {
      const isActive = active.includes(option.value);
      return (
        <button
          key={option.value}
          type="button"
          className={isActive ? "filter-chips__chip filter-chips__chip--active" : "filter-chips__chip"}
          aria-pressed={isActive}
          onClick={() => onToggle(option.value)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default FilterChips;
