import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import TimelineCard from "@/components/molecules/TimelineCard";
import { TIMELINES, watchedKeysOf } from "@/stories/_support/fixtures";

const meta = {
  title: "Molecules/TimelineCard",
  component: TimelineCard,
  tags: ["autodocs"],
  args: {
    timeline: TIMELINES[0],
    watchedMap: watchedKeysOf(TIMELINES[0]),
    disabled: false,
    deleting: false,
    onOpen: fn(),
    onToggleFollow: fn(),
    onDelete: fn(),
  },
  decorators: [(Story) => <div style={{ maxWidth: 420 }}><Story /></div>],
} satisfies Meta<typeof TimelineCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Followed: Story = {};
export const NotFollowed: Story = { args: { timeline: TIMELINES[1], watchedMap: watchedKeysOf(TIMELINES[1]) } };
export const Deleting: Story = { args: { deleting: true } };
export const Disabled: Story = { args: { disabled: true } };
