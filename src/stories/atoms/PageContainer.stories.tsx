import type { Meta, StoryObj } from "@storybook/react-vite";
import PageContainer from "@/components/atoms/PageContainer";

const meta = { title: "Atoms/PageContainer", component: PageContainer, tags: ["autodocs"], args: { children: <p>Conteúdo com largura máxima e margens padrão.</p> } } satisfies Meta<typeof PageContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
