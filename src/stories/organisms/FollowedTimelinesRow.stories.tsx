import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import FollowedTimelinesRow from "@/components/organisms/FollowedTimelinesRow";
import { TIMELINES, watchedKeysOf } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/FollowedTimelinesRow",
  component: FollowedTimelinesRow,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { timelines: TIMELINES.filter((t) => t.followed), watchedMap: watchedKeysOf(TIMELINES[0]), onSelect: fn() },
} satisfies Meta<typeof FollowedTimelinesRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { timelines: [] } };
