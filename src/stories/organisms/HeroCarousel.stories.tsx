import type { Meta, StoryObj } from "@storybook/react-vite";
import HeroCarousel from "@/components/organisms/HeroCarousel";
import { HERO_TRAILERS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/HeroCarousel",
  component: HeroCarousel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { items: HERO_TRAILERS },
} satisfies Meta<typeof HeroCarousel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SingleTrailer: Story = { args: { items: HERO_TRAILERS.slice(0, 1) } };
export const Loading: Story = { args: { items: [], loading: true } };
