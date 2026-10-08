import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MediaCard from "@/components/molecules/MediaCard";
import { MEDIA_ITEMS } from "@/stories/_support/fixtures";

const meta = {
  title: "Molecules/MediaCard",
  component: MediaCard,
  tags: ["autodocs"],
  args: { item: MEDIA_ITEMS[0], isOpen: false, onSelect: fn(), onOpen: fn() },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
} satisfies Meta<typeof MediaCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { isOpen: true } };
export const Available: Story = { args: { item: { ...MEDIA_ITEMS[0], available: true }, isOpen: true } };
export const WithBadgeAndSubtitle: Story = { args: { badge: "Vencedor", subtitle: "Christopher Nolan" } };
export const Series: Story = { args: { item: { id: 1396, mediaType: "tv", title: "Breaking Bad", posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg" }, isOpen: true } };
export const ModalSize: Story = { args: { isModal: true, isOpen: true } };
