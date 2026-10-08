import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import ConfirmDialog from "@/components/atoms/ConfirmDialog";

const meta = {
  title: "Atoms/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 360 } } },
  args: { title: "Marcar episódios anteriores?", message: "Os episódios 1 e 2 ainda não estão marcados. Marcar também?", confirmLabel: "Marcar todos", cancelLabel: "Só este", onResult: fn() },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Danger: Story = { args: { danger: true, title: "Excluir timeline?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", cancelLabel: "Cancelar" } };
