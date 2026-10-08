import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MediaGrid from "@/components/atoms/MediaGrid";
import MediaCard from "@/components/molecules/MediaCard";
import { MEDIA_ITEMS } from "@/stories/_support/fixtures";

const cards = MEDIA_ITEMS.map((item) => <MediaCard key={item.id} item={item} isOpen={false} onSelect={fn()} />);

const meta = {
  title: "Atoms/MediaGrid",
  component: MediaGrid,
  tags: ["autodocs"],
  args: { children: cards },
  argTypes: { variant: { control: "inline-radio", options: ["default", "modal"] } },
} satisfies Meta<typeof MediaGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ModalVariant: Story = { args: { variant: "modal" } };
