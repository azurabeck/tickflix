import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import TimelineDetail from "@/components/organisms/TimelineDetail";
import { TIMELINES } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/TimelineDetail",
  component: TimelineDetail,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { timeline: TIMELINES[0], onClose: fn() },
} satisfies Meta<typeof TimelineDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Franchise: Story = { args: { timeline: TIMELINES[2] } };
