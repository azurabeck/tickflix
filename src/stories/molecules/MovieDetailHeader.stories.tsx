import type { Meta, StoryObj } from "@storybook/react-vite";
import MovieDetailHeader from "@/components/molecules/MovieDetailHeader";
import { MOVIE_DETAIL } from "@/stories/_support/fixtures";

const meta = { title: "Molecules/MovieDetailHeader", component: MovieDetailHeader, tags: ["autodocs"], args: { detail: MOVIE_DETAIL } } satisfies Meta<typeof MovieDetailHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Movie: Story = {};
export const Series: Story = { args: { detail: { ...MOVIE_DETAIL, mediaType: "tv", title: "Breaking Bad", runtimeMinutes: null, seasons: 5, episodes: 62, directors: [] } } };
export const NoTrailer: Story = { args: { detail: { ...MOVIE_DETAIL, trailerKey: null } } };
