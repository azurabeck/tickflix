import type { Meta, StoryObj } from "@storybook/react-vite";
import RankSection from "@/components/organisms/RankSection";
import { MOVIES } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/RankSection",
  component: RankSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    popularityTitle: "Popularidade em 2026",
    popularity: MOVIES,
    popularityError: null,
    recentKeys: MOVIES.slice(0, 4).map((m) => "movie-" + m.id),
  },
} satisfies Meta<typeof RankSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { popularity: null } };
export const WithError: Story = { args: { popularity: null, popularityError: "Não foi possível carregar o ranking." } };
