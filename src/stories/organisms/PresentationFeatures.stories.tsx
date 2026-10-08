import type { Meta, StoryObj } from "@storybook/react-vite";
import PresentationFeatures from "@/components/organisms/PresentationFeatures";

const meta = {
  title: "Organisms/PresentationFeatures",
  component: PresentationFeatures,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PresentationFeatures>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
