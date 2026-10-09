import type { Meta, StoryObj } from "@storybook/react-vite";
import CreateTimelinePanel from "@/components/organisms/CreateTimelinePanel";

const meta = {
  title: "Organisms/CreateTimelinePanel",
  component: CreateTimelinePanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { uid: "demo" },
} satisfies Meta<typeof CreateTimelinePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SeriesPage: Story = { args: { categoryLock: "series", placeholder: "Descreva a timeline de séries que você quer criar" } };
export const SignedOut: Story = { args: { uid: null } };
