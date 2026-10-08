import type { Meta, StoryObj } from "@storybook/react-vite";
import SuggestionCard from "@/components/molecules/SuggestionCard";

const meta = {
  title: "Molecules/SuggestionCard",
  component: SuggestionCard,
  tags: ["autodocs"],
  args: { id: 27205, mediaType: "movie", title: "A Origem", posterPath: "/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg" },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
} satisfies Meta<typeof SuggestionCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Movie: Story = {};
export const Series: Story = { args: { id: 1396, mediaType: "tv", title: "Breaking Bad", category: "series" } };
export const NoPoster: Story = { args: { posterPath: null } };
