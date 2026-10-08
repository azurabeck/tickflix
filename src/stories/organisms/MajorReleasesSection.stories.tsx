import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MajorReleasesSection from "@/components/organisms/MajorReleasesSection";
import { RELEASES } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/MajorReleasesSection",
  component: MajorReleasesSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { movies: RELEASES, error: null, onSeeAll: fn() },
} satisfies Meta<typeof MajorReleasesSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { movies: null } };
export const WithError: Story = { args: { movies: null, error: "Não foi possível carregar os lançamentos." } };
