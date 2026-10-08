import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import DetailPanel from "@/components/atoms/DetailPanel";

const meta = {
  title: "Atoms/DetailPanel",
  component: DetailPanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 420 } } },
  args: { onClose: fn(), children: <p>Conteúdo do detalhe.</p> },
} satisfies Meta<typeof DetailPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true, children: undefined } };
export const Error: Story = { args: { error: "Não foi possível carregar os detalhes.", children: undefined } };
