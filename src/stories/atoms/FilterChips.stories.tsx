import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import FilterChips from "@/components/atoms/FilterChips";

const options = [
  { value: "inProgress", label: "Em progresso" },
  { value: "notStarted", label: "Não iniciados" },
  { value: "soon", label: "Em breve" },
  { value: "completed", label: "Concluídos" },
];

const Demo = ({ initial }: { initial: string[] }) => {
  const [active, setActive] = useState<string[]>(initial);
  return <FilterChips options={options} active={active} onToggle={(value) => setActive((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))} />;
};

const meta = { title: "Atoms/FilterChips", component: FilterChips, tags: ["autodocs"] } satisfies Meta<typeof FilterChips>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MultiSelect: Story = { render: () => <Demo initial={["inProgress"]} />, args: { options, active: [], onToggle: () => undefined } };
export const NoneActive: Story = { render: () => <Demo initial={[]} />, args: { options, active: [], onToggle: () => undefined } };
