import type { Meta, StoryObj } from "@storybook/react-vite";
import AiSuggestionsPanel from "@/components/organisms/AiSuggestionsPanel";

const meta = {
  title: "Organisms/AiSuggestionsPanel",
  component: AiSuggestionsPanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { mediaKind: "movie" },
} satisfies Meta<typeof AiSuggestionsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Movies: Story = {};
export const Series: Story = { args: { mediaKind: "tv", category: "series" } };
