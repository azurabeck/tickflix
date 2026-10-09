import type { Meta, StoryObj } from "@storybook/react-vite";
import RankSection from "@/components/organisms/RankSection";
import { RANK_ITEMS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/RankSection",
  component: RankSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    popularityTitle: "Popularidade em 2026",
    popularity: { items: RANK_ITEMS, loading: false, error: null },
    myNotes: { items: RANK_ITEMS.slice(0, 2), loading: false },
  },
} satisfies Meta<typeof RankSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { popularity: { items: null, loading: true, error: null }, myNotes: { items: [], loading: true } } };
export const WithError: Story = { args: { popularity: { items: null, loading: false, error: "Não foi possível carregar o ranking." } } };
