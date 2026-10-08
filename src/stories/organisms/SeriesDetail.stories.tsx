import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import SeriesDetail from "@/components/organisms/SeriesDetail";
import { FOLLOWED_SERIES } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/SeriesDetail",
  component: SeriesDetail,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 700 } } },
  args: { series: FOLLOWED_SERIES, uid: "demo", onClose: fn(), onToggleEpisode: fn(), onToggleSeason: fn() },
} satisfies Meta<typeof SeriesDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SignedOut: Story = { args: { uid: null } };
