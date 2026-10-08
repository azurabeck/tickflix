import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import NavDropdown from "@/components/molecules/NavDropdown";

const items = [
  { key: "oscar", to: "/oscar", label: "Oscar", isActive: true },
  { key: "globo", to: "/globo-de-ouro", label: "Globo de Ouro", isActive: false },
  { key: "cannes", to: "/cannes", label: "Cannes", isActive: false },
];

const Demo = ({ startOpen }: { startOpen: boolean }) => {
  const [open, setOpen] = useState(startOpen);
  return (
    <div style={{ background: "#3d2963", padding: 16, minHeight: 200 }}>
      <NavDropdown label="Premiações" items={items} isActive isOpen={open} onToggle={() => setOpen((prev) => !prev)} />
    </div>
  );
};

const meta = { title: "Molecules/NavDropdown", component: NavDropdown, tags: ["autodocs"] } satisfies Meta<typeof NavDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { render: () => <Demo startOpen={false} />, args: { label: "", items: [], isActive: false, isOpen: false, onToggle: () => undefined } };
export const Open: Story = { render: () => <Demo startOpen />, args: { label: "", items: [], isActive: false, isOpen: false, onToggle: () => undefined } };
