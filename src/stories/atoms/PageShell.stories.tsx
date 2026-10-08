import type { Meta, StoryObj } from "@storybook/react-vite";
import PageShell from "@/components/atoms/PageShell";

const meta = {
  title: "Atoms/PageShell",
  component: PageShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { title: "Perfil", children: <p>Conteúdo da página.</p> },
  argTypes: { variant: { control: "inline-radio", options: ["light", "dark"] }, width: { control: "inline-radio", options: ["default", "narrow"] } },
} satisfies Meta<typeof PageShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { args: { variant: "dark", title: "Marvel", subtitle: "Todos os filmes e séries — marque o que você já viu." } };
export const Narrow: Story = { args: { variant: "dark", width: "narrow", title: "Franquia" } };
