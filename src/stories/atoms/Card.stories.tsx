import type { Meta, StoryObj } from "@storybook/react-vite";
import Card from "@/components/atoms/Card";

const meta = {
  title: "Atoms/Card",
  component: Card,
  tags: ["autodocs"],
  args: { children: "Conteúdo do cartão", layout: "column", size: "md" },
  argTypes: { layout: { control: "inline-radio", options: ["row", "column", "between"] }, size: { control: "inline-radio", options: ["md", "lg"] } },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Column: Story = {};
export const Row: Story = { args: { layout: "row", size: "lg", children: <><strong>Avatar</strong><span>texto ao lado</span></> } };
export const Between: Story = { args: { layout: "between", children: <><span>Idioma</span><button type="button">Trocar</button></> } };
