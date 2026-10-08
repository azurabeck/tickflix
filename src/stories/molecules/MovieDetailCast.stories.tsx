import type { Meta, StoryObj } from "@storybook/react-vite";
import MovieDetailCast from "@/components/molecules/MovieDetailCast";
import { MOVIE_DETAIL } from "@/stories/_support/fixtures";

const meta = { title: "Molecules/MovieDetailCast", component: MovieDetailCast, tags: ["autodocs"], args: { cast: MOVIE_DETAIL.cast } } satisfies Meta<typeof MovieDetailCast>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { cast: [] } };
