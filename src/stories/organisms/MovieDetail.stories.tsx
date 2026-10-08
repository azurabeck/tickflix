import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MovieDetail from "@/components/organisms/MovieDetail";

const meta = {
  title: "Organisms/MovieDetail",
  component: MovieDetail,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 640 } } },
  args: { id: 27205, mediaType: "movie", onClose: fn() },
} satisfies Meta<typeof MovieDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Movie: Story = {};
export const Series: Story = { args: { id: 1396, mediaType: "tv" } };
