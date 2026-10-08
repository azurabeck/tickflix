import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import RecentlyWatchedModal from "@/components/organisms/RecentlyWatchedModal";

const meta = {
  title: "Organisms/RecentlyWatchedModal",
  component: RecentlyWatchedModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { onClose: fn() },
} satisfies Meta<typeof RecentlyWatchedModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
