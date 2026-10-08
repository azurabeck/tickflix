import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MediaRailSection from "@/components/organisms/MediaRailSection";
import { MEDIA_ITEMS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/MediaRailSection",
  component: MediaRailSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { title: "Últimos vistos", items: MEDIA_ITEMS, onSeeAll: fn() },
} satisfies Meta<typeof MediaRailSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { items: null, loading: true } };
export const WithError: Story = { args: { items: null, error: "Não foi possível carregar agora." } };
export const Empty: Story = { args: { items: [], emptyMessage: "Nada por aqui ainda." } };
export const HiddenWhenEmpty: Story = { args: { items: [], hideWhenEmpty: true } };
