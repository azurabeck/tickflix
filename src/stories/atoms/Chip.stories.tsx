import type { Meta, StoryObj } from "@storybook/react-vite";
import Chip from "@/components/atoms/Chip";

const meta = {
  title: "Atoms/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { children: "Frontend" },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Lilac: Story = {};
export const Purple: Story = { args: { variant: "purple", children: "Service" } };
export const Green: Story = { args: { variant: "green", children: "Resposta visual imediata" } };
