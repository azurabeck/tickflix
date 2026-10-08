import type { Meta, StoryObj } from "@storybook/react-vite";
import AiSuggestionsPanel from "@/components/organisms/AiSuggestionsPanel";
import { MOVIES } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/AiSuggestionsPanel",
  component: AiSuggestionsPanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { recentKeys: MOVIES.slice(0, 4).map((m) => "movie-" + m.id) },
} satisfies Meta<typeof AiSuggestionsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Movies: Story = {};
export const Series: Story = { args: { mediaKind: "tv", category: "series" } };
export const NoHistory: Story = { args: { recentKeys: [] } };
