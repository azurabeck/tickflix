import type { Meta, StoryObj } from "@storybook/react-vite";
import ProviderGroup from "@/components/atoms/ProviderGroup";

const meta = {
  title: "Atoms/ProviderGroup",
  component: ProviderGroup,
  tags: ["autodocs"],
  args: {
    label: "Assine",
    list: [
      { id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" },
      { id: 2, name: "Apple TV", logoPath: "/peURlLlr8jggOwK53fJ5wdQl05y.jpg" },
    ],
  },
} satisfies Meta<typeof ProviderGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
