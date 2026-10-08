import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import SeasonItem from "@/components/molecules/SeasonItem";
import { FOLLOWED_SERIES } from "@/stories/_support/fixtures";

const meta = {
  title: "Molecules/SeasonItem",
  component: SeasonItem,
  tags: ["autodocs"],
  args: {
    seriesId: 1396,
    seriesStatus: "Ended",
    seasonNumber: 1,
    season: FOLLOWED_SERIES.seasons["1"],
    uid: "demo",
    expanded: true,
    onToggleExpanded: fn(),
    onToggleWholeSeason: fn(),
    onToggleEpisode: fn(),
  },
} satisfies Meta<typeof SeasonItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};
export const Collapsed: Story = { args: { expanded: false } };
export const WithUnairedEpisodes: Story = { args: { seasonNumber: 2, season: FOLLOWED_SERIES.seasons["2"] } };
export const SignedOut: Story = { args: { uid: null } };
