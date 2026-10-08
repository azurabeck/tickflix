import type { Meta, StoryObj } from "@storybook/react-vite";
import StatusMessage from "@/components/atoms/StatusMessage";

const meta = {
  title: "Atoms/StatusMessage",
  component: StatusMessage,
  tags: ["autodocs"],
  args: { variant: "loading", children: "Carregando..." },
  argTypes: { variant: { control: "inline-radio", options: ["loading", "error", "empty", "success"] } },
} satisfies Meta<typeof StatusMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { spinner: true } };
export const Error: Story = { args: { variant: "error", children: "Não foi possível carregar agora." } };
export const Empty: Story = { args: { variant: "empty", children: "Nada por aqui ainda." } };
export const Success: Story = { args: { variant: "success", children: "Salvo com sucesso!", compact: true } };
