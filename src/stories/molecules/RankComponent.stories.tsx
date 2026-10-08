import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import RankComponent from "@/components/molecules/RankComponent";
import { RANK_ITEMS } from "@/stories/_support/fixtures";

const meta = {
  title: "Molecules/RankComponent",
  component: RankComponent,
  tags: ["autodocs"],
  args: { title: "Popularidade 2026", items: RANK_ITEMS, onOpen: fn(), onToggleChecked: fn(), onRate: fn() },
} satisfies Meta<typeof RankComponent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true, items: [] } };
export const WithError: Story = { args: { error: "Não foi possível carregar o ranking.", items: [] } };
export const Empty: Story = { args: { items: [], emptyMessage: "Marque filmes como vistos e dê notas para montar seu rank." } };
export const Disabled: Story = { args: { disabled: true } };
