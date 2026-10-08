import type { Meta, StoryObj } from "@storybook/react-vite";
import SeriesRailSection from "@/components/organisms/SeriesRailSection";
import { MEDIA_ITEMS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/SeriesRailSection",
  component: SeriesRailSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { title: "Minhas séries", items: MEDIA_ITEMS.slice(0, 4), progressFilters: true },
} satisfies Meta<typeof SeriesRailSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithProgressFilters: Story = {};
export const Plain: Story = { args: { title: "Populares", progressFilters: false } };
export const Loading: Story = { args: { items: null, loading: true } };
export const Empty: Story = { args: { items: [], emptyMessage: "Você ainda não segue nenhuma série." } };
