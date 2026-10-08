import type { Meta, StoryObj } from "@storybook/react-vite";
import PresentationStructure from "@/components/organisms/PresentationStructure";

const meta = {
  title: "Organisms/PresentationStructure",
  component: PresentationStructure,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ background: "#e9f0f4", padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PresentationStructure>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
