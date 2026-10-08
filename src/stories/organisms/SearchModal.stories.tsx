import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import SearchModal from "@/components/organisms/SearchModal";

const meta = {
  title: "Organisms/SearchModal",
  component: SearchModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 520 } } },
  args: { onClose: fn() },
} satisfies Meta<typeof SearchModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
