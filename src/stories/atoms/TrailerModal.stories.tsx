import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import TrailerModal from "@/components/atoms/TrailerModal";

const meta = {
  title: "Atoms/TrailerModal",
  component: TrailerModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 460 } } },
  args: { title: "A Origem", youtubeKey: "YoHD9XEInc0", loading: false, onClose: fn() },
} satisfies Meta<typeof TrailerModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true, youtubeKey: null } };
export const NoTrailer: Story = { args: { youtubeKey: null } };
