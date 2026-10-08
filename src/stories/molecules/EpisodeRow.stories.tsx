import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import EpisodeRow from "@/components/molecules/EpisodeRow";
import { FOLLOWED_SERIES } from "@/stories/_support/fixtures";

const season = FOLLOWED_SERIES.seasons["1"];

const meta = {
  title: "Molecules/EpisodeRow",
  component: EpisodeRow,
  tags: ["autodocs"],
  args: {
    seriesId: 1396,
    seasonNumber: 1,
    episodeNumber: 1,
    episode: season.episodes["1"],
    airing: { aired: true, label: "" },
    disabled: false,
    onToggle: fn(),
  },
} satisfies Meta<typeof EpisodeRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Watched: Story = {};
export const NotWatched: Story = { args: { episodeNumber: 3, episode: season.episodes["3"] } };
export const NotAiredYet: Story = { args: { episode: { name: "Episódio futuro", watched: false, airDate: "2999-01-01" }, airing: { aired: false, label: "Estreia em 01/01/2999" } } };
export const Disabled: Story = { args: { disabled: true } };
