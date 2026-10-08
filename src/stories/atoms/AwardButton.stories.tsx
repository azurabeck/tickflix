import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import AwardButton from "@/components/atoms/AwardButton";

const meta = {
  title: "Atoms/AwardButton",
  component: AwardButton,
  tags: ["autodocs"],
  args: { children: "Editar dados", onClick: fn() },
  decorators: [(Story) => <div style={{ "--awards-accent": "#d4af37", background: "#242329", padding: 24 } as React.CSSProperties}><Story /></div>],
} satisfies Meta<typeof AwardButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
