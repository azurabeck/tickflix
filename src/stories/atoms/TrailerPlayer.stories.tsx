import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import TrailerPlayer from "@/components/atoms/TrailerPlayer";

const meta = {
  title: "Atoms/TrailerPlayer",
  component: TrailerPlayer,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 460 } } },
  args: { title: "Interestelar", youtubeKey: "zSWdZVtXT7E", onClose: fn() },
} satisfies Meta<typeof TrailerPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
