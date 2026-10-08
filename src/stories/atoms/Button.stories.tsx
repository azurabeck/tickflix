import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Button from "@/components/atoms/Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Salvar", onClick: fn() },
  argTypes: { variant: { control: "inline-radio", options: ["primary", "ghost"] } },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Ghost: Story = { args: { variant: "ghost", children: "Remover" } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
